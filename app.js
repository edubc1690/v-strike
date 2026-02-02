// ==========================================
// V-STRIKE CORE v3.5 (AI Enhanced)
// ==========================================

// --- 1. FORCE UPDATE & CACHE CONTROL ---
// Detect version change -> Wipe Cache -> Reload
const CURRENT_VERSION = 'v3.5.2';
if (localStorage.getItem('vstrike_version') !== CURRENT_VERSION) {
    console.log(`✨ New Version ${CURRENT_VERSION} detected. Cleaning up...`);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (let registration of registrations) {
                registration.unregister();
            }
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
            });

            // WIPE OLD DATA TO FORCE RE-GENERATION
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('vstrike_recs_')) localStorage.removeItem(key);
            });

            // Update version and hard reload
            localStorage.setItem('vstrike_version', CURRENT_VERSION);
            window.location.reload(true);
        });
    } else {
        // Fallback for non-SW browsers
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('vstrike_recs_')) localStorage.removeItem(key);
        });
        localStorage.setItem('vstrike_version', CURRENT_VERSION);
        window.location.reload();
    }
}

// --- 2. CONFIGURATION & STATE ---
const savedBCV = parseFloat(localStorage.getItem('vstrike_bcv_manual'));

const API_CONFIG = {
    BASE_URL: 'https://api.the-odds-api.com/v4/sports',
    SPORTS: [
        { key: 'basketball_nba', name: '🏀 NBA' },
        { key: 'icehockey_nhl', name: '❄️ NHL' },
        { key: 'soccer_uefa_champs_league', name: '⚽ Champions' },
        { key: 'soccer_epl', name: '🇬🇧 Premier' },
        { key: 'soccer_spain_la_liga', name: '🇪🇸 La Liga' },
        { key: 'soccer_italy_serie_a', name: '🇮🇹 Serie A' },
        { key: 'soccer_germany_bundesliga', name: '🇩🇪 Bundesliga' },
        { key: 'baseball_mlb', name: '⚾ MLB' }
    ],
    CACHE_DURATION: window.DEFAULT_CONFIG.CACHE_DURATION_MS
};

let state = {
    bankroll: parseFloat(localStorage.getItem('vstrike_bankroll')) || 20.00,
    totalProfit: parseFloat(localStorage.getItem('vstrike_profit')) || 0.00,
    history: JSON.parse(localStorage.getItem('vstrike_history')) || [],
    bcv: savedBCV || window.DEFAULT_CONFIG.INITIAL_BCV
};

// --- 3. HELPERS: KEY MANAGER ---
const KeyManager = {
    getKeys: () => {
        const stored = localStorage.getItem('vstrike_api_keys');
        return stored ? JSON.parse(stored) : window.DEFAULT_CONFIG.API_KEYS;
    },

    getIndex: () => {
        return parseInt(localStorage.getItem('vstrike_key_index') || 0);
    },

    getCurrentKey: function () {
        const keys = this.getKeys();
        const index = this.getIndex();
        if (index >= keys.length) {
            this.setIndex(0);
            return keys[0];
        }
        return keys[index];
    },

    setIndex: (idx) => {
        localStorage.setItem('vstrike_key_index', idx);
        console.log(`🔑 Key Index set to: ${idx}`);
    },

    setKeys: (keysRaw) => {
        const keyArray = keysRaw.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 5);
        if (keyArray.length > 0) {
            localStorage.setItem('vstrike_api_keys', JSON.stringify(keyArray));
            return true;
        }
        return false;
    },

    rotate: function () {
        const keys = this.getKeys();
        let idx = this.getIndex();
        idx++;

        if (idx >= keys.length) {
            console.warn('⚠️ All API Keys exhausted.');
            return false;
        }

        this.setIndex(idx);
        console.log(`🔄 Rotating to Key #${idx + 1}`);
        return true;
    },

    checkMonthlyReset: function () {
        const lastCheck = localStorage.getItem('vstrike_last_month_check');
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;

        if (lastCheck !== currentMonth && now.getDate() === 1) {
            console.log('📅 Monthly Key Reset.');
            this.setIndex(0);
            localStorage.setItem('vstrike_last_month_check', currentMonth);
        }
    }
};

KeyManager.checkMonthlyReset();

// --- 4. DOM ELEMENTS ---
const elements = {
    balance: document.getElementById('current-balance'),
    profit: document.getElementById('total-profit'),
    bcvDisplay: document.getElementById('bcv-rate-display'),
    modalOverlay: document.getElementById('modal-overlay'),
    feed: document.getElementById('recommendations-feed'),

    // UI Sections
    sectDashboard: document.getElementById('bankroll-section'),
    sectActive: document.querySelector('.active-bets-section'),
    sectScanner: document.querySelector('.feed-section'),
    sectResults: document.getElementById('results-section'),
    sectSettings: document.getElementById('settings-view'),

    // Inputs
    inputApiKeys: document.getElementById('setting-api-keys'),
    inputBcvRate: document.getElementById('setting-bcv-rate'),
    inputAmount: document.getElementById('bet-amount'),
    inputOdds: document.getElementById('bet-odds'),
    inputDesc: document.getElementById('bet-desc'),

    activeBetsList: document.getElementById('active-bets-list')
};

// --- 5. DATA LOGIC (FETCHER) ---
async function getSmartData(sportKey, retryCount = 0) {
    const cacheKey = `vstrike_cache_${sportKey}`;
    const cached = localStorage.getItem(cacheKey);

    // Try Cache
    if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        if (now - data.timestamp < API_CONFIG.CACHE_DURATION) {
            console.log(`⚡ Cache Hit: ${sportKey}`);
            return data.events;
        }
    }

    // Try Fetch
    try {
        const currentKey = KeyManager.getCurrentKey();
        console.log(`🌐 API Call: ${sportKey} (Key Ending: ...${currentKey.slice(-4)})`);

        const response = await fetch(
            `${API_CONFIG.BASE_URL}/${sportKey}/odds/?apiKey=${currentKey}&regions=us&markets=h2h,spreads&oddsFormat=american`
        );

        // Handle 429
        if (response.status === 429) {
            console.warn(`⚠️ 429 Limit on current key for ${sportKey}`);

            const rotated = KeyManager.rotate();
            if (rotated && retryCount < 3) {
                return await getSmartData(sportKey, retryCount + 1);
            } else {
                console.error('❌ Keys exhausted.');
                return cached ? JSON.parse(cached).events : [];
            }
        }

        if (!response.ok) throw new Error(`API Error ${response.status}`);

        const events = await response.json();

        // Save Cache
        localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            events: events
        }));

        return events;

    } catch (error) {
        console.error('Fetch error:', error);
        return cached ? JSON.parse(cached).events : [];
    }
}

// 🧠 ANALYSIS ENGINE (ENHANCED WITH NOTEBOOKLM LOGIC)
function generateAnalysis(type, odds, team, opponent, isValueBet = false, sharpOdds = 0) {
    // 1. Calculate Implied Probability
    let prob = 0;
    if (odds < 0) prob = (-odds) / (-odds + 100);
    else prob = 100 / (odds + 100);
    const probPct = (prob * 100).toFixed(1);

    // 2. Market Sentiment Simulation (Now aware of Value)
    const sentiments = [
        "Flujo de dinero inteligente detectado.",
        "Ajuste de línea favorable en las últimas horas.",
        "Ventaja estadística en enfrentamientos directos.",
        "El mercado respalda fuertemente esta selección.",
        "Valor matemático superior al promedio de la liga."
    ];

    // Select sentiment based on odds range
    let sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];

    if (isValueBet) {
        return `💎 SMART VALUE: Detectamos ineficiencia. Pinnacle marca ${sharpOdds}, aqui ${odds}. ¡Aprovechar!`;
    }

    if (type === 'parley_leg') {
        if (odds < -200) return `🔒 Probabilidad Implícita del ${probPct}%. ${team} muestra dominancia clara. Base sólida.`;
        return `✅ Favorito con valor (${probPct}% prob). ${sentiment}`;
    }

    if (type === 'high_risk') {
        return `🧨 PARLEY SORPRESA: El mercado subestima a ${team}. Retorno potencial ${probPct}% vs Riesgo.`;
    }

    if (type === 'straight') {
        return `⚖️ Línea ajustada. ${sentiment} Oportunidad técnica.`;
    }

    return `Análisis técnico favorable para ${team}.`;
}

// 🧠 RECOMMENDATION ENGINE (THE BRAIN v3.4)
function processOddsToRecommendations(events, sportName) {
    const recommendations = [];
    const now = new Date();
    const limitDate = new Date(now);
    limitDate.setHours(23, 59, 59, 999); // Force end of CURRENT local day

    events.forEach(event => {
        const eventDate = new Date(event.commence_time);
        if (eventDate < now || eventDate > limitDate) return;

        // FIND SHARP BOOKMAKER (PINNACLE) FOR REFERENCE
        const pinnacle = event.bookmakers.find(b => b.key === 'pinnacle');

        // USE USER BOOKMAKERS (Prioritizing US ones for actual betting)
        const bookmaker = event.bookmakers.find(b =>
            ['draftkings', 'fanduel', 'williamhill', 'mgm', 'bovada'].includes(b.key)
        ) || event.bookmakers[0];

        if (!bookmaker) return;

        // Format Time
        const eventTime = new Date(event.commence_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const h2h = bookmaker.markets.find(m => m.key === 'h2h');
        const spread = bookmaker.markets.find(m => m.key === 'spreads');

        // Logic 1: Favorites (Safe/Parley)
        if (h2h) {
            const fav = h2h.outcomes.find(o => o.price < -130 && o.price > -900);
            if (fav) {
                const opponent = h2h.outcomes.find(o => o.name !== fav.name).name;

                // SMART VALUE CHECK
                let isValue = false;
                let sharpPrice = 0;

                if (pinnacle) {
                    const tick = pinnacle.markets.find(m => m.key === 'h2h');
                    if (tick) {
                        const sharpOutcome = tick.outcomes.find(o => o.name === fav.name);
                        if (sharpOutcome) {
                            sharpPrice = sharpOutcome.price;
                            // If our bookie pays BETTER than Pinnacle (e.g. -130 vs -150), it is HUGE value
                            // Note: American odds reverse logic. -130 > -150 in value (returns more)
                            if (fav.price > sharpPrice + 10) isValue = true;
                        }
                    }
                }

                // Detect home advantage
                const isHomeTeam = (fav.name === event.home_team);
                const sharpDiff = sharpPrice ? fav.price - sharpPrice : 0;

                recommendations.push({
                    id: event.id,
                    type: 'parley_leg',
                    sport: sportName,
                    match: `${event.home_team} vs ${event.away_team}`,
                    time: eventTime,
                    pick: `${fav.name} ML`,
                    odds: fav.price,
                    risk: 'low',
                    isValue: isValue,
                    isHome: isHomeTeam,
                    sharpDiff: sharpDiff,
                    analysis: generateAnalysis('parley_leg', fav.price, fav.name, opponent, isValue, sharpPrice)
                });
            }

            // Logic 2: High Risk (PARLEY SORPRESA)
            // Expanded range for "Surprise" potential
            const dog = h2h.outcomes.find(o => o.price > +125 && o.price < +550);
            if (dog) {
                const opponent = h2h.outcomes.find(o => o.name !== dog.name).name;
                const isHomeTeam = (dog.name === event.home_team);
                recommendations.push({
                    id: event.id + '_hr',
                    type: 'high_risk',
                    sport: sportName,
                    match: `${event.home_team} vs ${event.away_team}`,
                    time: eventTime,
                    pick: `${dog.name} ML`,
                    odds: dog.price,
                    risk: 'high',
                    isValue: false,
                    isHome: isHomeTeam,
                    sharpDiff: 0,
                    analysis: generateAnalysis('high_risk', dog.price, dog.name, opponent)
                });
            }
        }

        if (spread) {
            const spreadOutcome = spread.outcomes.find(o => o.point < -1 && o.point > -14);
            if (spreadOutcome) {
                const isHomeTeam = (spreadOutcome.name === event.home_team);
                recommendations.push({
                    id: event.id + '_spread',
                    type: 'straight',
                    sport: sportName,
                    match: `${event.home_team} vs ${event.away_team}`,
                    time: eventTime,
                    pick: `${spreadOutcome.name} ${spreadOutcome.point > 0 ? '+' : ''}${spreadOutcome.point}`,
                    odds: spreadOutcome.price,
                    risk: 'mid',
                    isValue: false,
                    isHome: isHomeTeam,
                    sharpDiff: 0,
                    analysis: generateAnalysis('straight', spreadOutcome.price, spreadOutcome.name, '')
                });
            }
        }
    });

    return recommendations;
}

// Helper to convert American odds to decimal
function americanToDecimal(americanOdds) {
    if (americanOdds > 0) {
        return (americanOdds / 100) + 1;
    } else {
        return (100 / Math.abs(americanOdds)) + 1;
    }
}

// Helper to convert decimal odds to American
function decimalToAmerican(decimalOdds) {
    if (decimalOdds >= 2) {
        return Math.round((decimalOdds - 1) * 100);
    } else {
        return Math.round(-100 / (decimalOdds - 1));
    }
}

// Helper to calculate parley odds
function calculateParleyOdds(legs) {
    let decimalProduct = 1;
    for (const leg of legs) {
        decimalProduct *= americanToDecimal(leg.odds);
    }
    return decimalToAmerican(decimalProduct);
}

// Helper to calculate correct payout from American odds
function calculatePayout(amount, americanOdds) {
    if (americanOdds > 0) {
        // Positive odds: +150 means $100 bet wins $150
        return amount + (amount * (americanOdds / 100));
    } else {
        // Negative odds: -150 means $150 bet wins $100
        return amount + (amount * (100 / Math.abs(americanOdds)));
    }
}

// 🧠 CONFIDENCE SCORE (0-100) based on multiple factors
function calculateConfidence(pick) {
    let score = 50; // Base score

    // Factor 1: Edge vs Pinnacle (+0 to +20)
    if (pick.isValue && pick.sharpDiff > 0) {
        score += Math.min(pick.sharpDiff, 20);
    }

    // Factor 2: Favorable odds range for favorites (+5 to +15)
    if (pick.odds < -130 && pick.odds > -200) score += 15; // Sweet spot
    else if (pick.odds < -200 && pick.odds > -300) score += 10;
    else if (pick.odds < -300) score += 5; // Too heavy favorite

    // Factor 3: Home advantage (+5)
    if (pick.isHome) score += 5;

    // Factor 4: PENALTY for underdogs (positive odds = higher risk = lower confidence)
    if (pick.odds > 0 && pick.odds <= +150) score -= 10; // Light underdog
    else if (pick.odds > +150 && pick.odds <= +250) score -= 20; // Moderate underdog
    else if (pick.odds > +250 && pick.odds <= +350) score -= 30; // Risky underdog
    else if (pick.odds > +350) score -= 40; // Extreme longshot

    // Factor 5: PENALTY for high-risk type (-15)
    if (pick.risk === 'high') score -= 15;

    // Factor 6: Bonus for mid-risk spreads (+3)
    if (pick.type === 'straight' && pick.risk === 'mid') score += 3;

    // Factor 7: Bonus for low-risk parley legs (+10)
    if (pick.risk === 'low') score += 10;

    return Math.min(Math.max(score, 10), 100); // Min 10% to avoid $0 stakes
}

// 💰 DYNAMIC STAKING (Simplified Kelly Criterion)
function suggestStake(bankroll, confidence) {
    // Kelly simplified with scaled output
    // Base unit = 10% of bankroll for high confidence (100%)
    // Scales down proportionally with lower confidence
    const baseUnitPercent = 0.10; // 10% max for 100% confidence
    const minStakePercent = 0.01; // 1% min for lowest confidence

    // Calculate stake as percentage of bankroll based on confidence
    const stakePercent = minStakePercent + ((confidence / 100) * (baseUnitPercent - minStakePercent));
    const stake = bankroll * stakePercent;

    // Minimum $0.50 to see differences, but never more than 10% of bankroll
    return Math.min(Math.max(0.50, stake), bankroll * 0.10).toFixed(2);
}

// 🔄 MAIN GENERATOR & HISTORY SAVER
async function checkAndGenerateDaily() {
    // Use local date for key to match user's wall clock based on BROWSER locale
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD Local
    const todayKey = todayStr;
    const recsKey = `vstrike_recs_${todayKey}`;

    // Check if we already have data for TODAY stored
    const storedRecs = localStorage.getItem(recsKey);

    if (storedRecs && JSON.parse(storedRecs).length > 0) {
        console.log('✅ Loading today\'s saved data.');
        const parsed = JSON.parse(storedRecs);
        state.currentRecs = parsed;
        renderFeed(parsed);
        renderDashboardParleys(parsed); // Render on Dashboard too
        return;
    }

    // UI Loading State
    elements.feed.innerHTML = `
            <div class="empty-state-sm" style="display:flex; flex-direction:column; align-items:center; gap:10px">
                <div class="spinner"></div>
                <div>🔄 Sincronizando Estrategia Cognitiva...</div>
            </div>
        `;

    // Ensure style for spinner
    if (!document.getElementById('spin-style')) {
        const s = document.createElement('style');
        s.id = 'spin-style';
        s.innerHTML = `.spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: var(--primary); animation: spin 1s infinite linear; } @keyframes spin { 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(s);
    }

    let allRecs = [];

    // Serial Fetching to avoid flooding network
    for (const sport of API_CONFIG.SPORTS) {
        const events = await getSmartData(sport.key);
        const recs = processOddsToRecommendations(events, sport.name);
        allRecs = [...allRecs, ...recs];
    }

    if (allRecs.length === 0) {
        elements.feed.innerHTML = '<div class="empty-state">No se encontraron jugadas con los criterios actuales. Intenta mas tarde.</div>';
        return;
    }

    // --- PARLEY BUILDER (NOTEBOOKLM STRATEGY) ---
    const finalFeed = [];

    // Strategy: DIVERSE LEGS (1 NBA, 1 NHL, 1 Football, etc)
    const getDiverseLegs = (pool, count) => {
        const selected = [];
        const usedSports = new Set();
        const usedGames = new Set();

        // Pass 1: Try to find different sports first
        for (const pick of pool) {
            const gameId = pick.id.toString().split('_')[0];
            if (usedGames.has(gameId)) continue;

            if (!usedSports.has(pick.sport)) {
                selected.push(pick);
                usedSports.add(pick.sport);
                usedGames.add(gameId);
            }
            if (selected.length >= count) break;
        }

        // Pass 2: Fill if not enough, but still avoid same game
        if (selected.length < count) {
            for (const pick of pool) {
                const gameId = pick.id.toString().split('_')[0];
                if (usedGames.has(gameId)) continue;

                selected.push(pick);
                usedGames.add(gameId);
                if (selected.length >= count) break;
            }
        }

        return selected;
    };

    // 1. 💎 PARLEY SEGURO (Smart Value & Diversity)
    // Add confidence scores to all picks and sort by confidence
    allRecs.forEach(r => {
        r.confidenceScore = calculateConfidence(r);
        r.suggestedStake = suggestStake(state.bankroll, r.confidenceScore);
    });

    // Pool sorted by confidence (highest first)
    const safePool = allRecs
        .filter(c => c.risk === 'low')
        .sort((a, b) => b.confidenceScore - a.confidenceScore);

    const safeLegs = getDiverseLegs(safePool, 3);

    if (safeLegs.length >= 2) {
        const parleyOdds = calculateParleyOdds(safeLegs);
        finalFeed.push({
            id: 'daily_safe_parley',
            type: 'parley_card',
            subtype: 'safe',
            title: '💎 PARLEY INTELIGENTE',
            risk: 'low',
            odds: parleyOdds,
            legs: safeLegs,
            sport: 'Mix',
            match: `${safeLegs.length} Deportes`,
            pick: 'Combinada de Valor',
            analysis: 'Diversificación estratégica con validación de líneas Pinnacle.',
            result: 'PENDING'
        });
    }

    // 2. 🐉 PARLEY SORPRESA (High Risk / High Reward)
    // Sorted by confidence instead of random
    const surprisePool = allRecs
        .filter(c => c.risk === 'high')
        .sort((a, b) => b.confidenceScore - a.confidenceScore);
    const surpriseLegs = getDiverseLegs(surprisePool, 3);

    if (surpriseLegs.length >= 2) {
        const bombOdds = calculateParleyOdds(surpriseLegs);
        finalFeed.push({
            id: 'daily_surprise_parley',
            type: 'parley_card',
            subtype: 'risk',
            title: '🐉 PARLEY SORPRESA',
            risk: 'high',
            odds: bombOdds,
            legs: surpriseLegs,
            sport: 'Mix',
            match: `${surpriseLegs.length} Sorpresas`,
            pick: 'Alto Impacto',
            analysis: 'Buscando el fallo en la matriz. Alta volatilidad, retorno masivo.',
            result: 'PENDING'
        });
    }

    // 3. Individual Picks
    const MAX_PER_SPORT = 4;
    const sportCounts = {};
    const individuals = [];

    // Sort by confidence score (highest first)
    const sortedRecs = allRecs.sort((a, b) => b.confidenceScore - a.confidenceScore);

    sortedRecs.forEach(c => {
        if (c.risk === 'high') return; // Hide surprises from feed, keep inside parley

        const sKey = c.sport;
        if (!sportCounts[sKey]) sportCounts[sKey] = 0;

        if (sportCounts[sKey] < MAX_PER_SPORT) {
            individuals.push({ ...c, result: 'PENDING' });
            sportCounts[sKey]++;
        }
    });

    // Combine
    const fullList = [...finalFeed, ...individuals];

    // Metadata
    fullList.forEach(r => {
        if (!r.dateGenerated) r.dateGenerated = todayKey;
        if (!r.result) r.result = 'PENDING';
    });

    // Save to History File used by Review Mode
    localStorage.setItem(recsKey, JSON.stringify(fullList));
    state.currentRecs = fullList;

    renderFeed(fullList);
    renderDashboardParleys(fullList);
}

function renderDashboardParleys(recs) {
    const dashContainer = document.getElementById('dashboard-parleys-list');
    const dashSection = document.getElementById('dashboard-parleys-section');
    if (!dashContainer || !dashSection) return;

    dashContainer.innerHTML = '';
    const parleys = recs.filter(r => r.type === 'parley_card');

    if (parleys.length > 0) {
        dashSection.style.display = 'block';
        parleys.forEach(req => {
            const card = document.createElement('div');
            card.className = 'recommendation-card';
            const isRisk = req.subtype === 'risk';
            card.style.borderLeft = isRisk ? '4px solid #f59e0b' : '4px solid #3b82f6';
            card.style.background = isRisk ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)';

            // Calculate average confidence for parley stake suggestion
            const avgConfidence = req.legs.reduce((sum, l) => sum + (l.confidenceScore || 50), 0) / req.legs.length;
            const parleyStake = suggestStake(state.bankroll, avgConfidence);

            // Build list of games WITH LEAGUE INFO
            const legsHtml = req.legs.map(l => `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.08); color:var(--text-main)">
                    <div style="display:flex; flex-direction:column; gap:2px">
                        <span style="font-weight:600">${l.pick}</span>
                        <span style="font-size:0.7rem; color:#60a5fa; opacity:0.9">📍 ${l.sport}</span>
                    </div>
                    <span style="opacity:0.7; font-size:0.75rem">${l.time || ''}</span>
                </div>
            `).join('');

            // Create a clean summary string for the bet description
            const summary = req.legs.map(l => l.pick).join(' + ').replace(/'/g, "");

            card.innerHTML = `
                <div class="rec-top">
                    <span class="badge-type" style="background:${isRisk ? '#f59e0b' : '#3b82f6'}; color:white">${req.title}</span>
                    <span style="font-weight:bold; color:${isRisk ? '#f59e0b' : '#60a5fa'}">${req.odds}</span>
                </div>
                
                <div style="margin:8px 0; padding:8px; background:rgba(0,0,0,0.2); border-radius:6px">
                    ${legsHtml}
                </div>

                <!-- Stake Sugerido para Parley -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding:8px 12px; background:rgba(16,185,129,0.1); border-radius:8px; border:1px dashed rgba(16,185,129,0.3)">
                    <span style="font-size:0.75rem; color:var(--text-muted)">💰 Stake Sugerido:</span>
                    <span style="font-weight:700; color:#10b981">$${parleyStake}</span>
                </div>

                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px">
                    ${req.analysis}
                </div>

                <button class="btn-xs" style="margin-top:10px; width:100%; border:1px solid ${isRisk ? '#f59e0b' : '#3b82f6'}" 
                    onclick="useRecommendation('${req.title}', '${req.odds}', '${summary}')">
                    Copiar Jugada
                </button>
            `;
            dashContainer.appendChild(card);
        });
    } else {
        dashSection.style.display = 'none';
    }
}

// Global filter state
let currentFilter = 'all';

window.filterFeed = function (sport) {
    currentFilter = sport;

    // Update Buttons
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(sport === 'all' ? 'todo' : sport)) {
            btn.classList.add('active');
        }
    });

    if (!state.currentRecs) {
        const todayKey = new Date().toLocaleDateString('en-CA');
        const stored = localStorage.getItem(`vstrike_recs_${todayKey}`);
        if (stored) state.currentRecs = JSON.parse(stored);
        else return;
    }

    const filtered = state.currentRecs.filter(item => {
        if (sport === 'all') return true;

        // Helper to check string matches safely
        const check = (str, keys) => keys.some(k => str.toLowerCase().includes(k));

        const s = item.sport.toLowerCase();

        // 1. Check Parleys (Included if ANY leg matches the sport)
        if (item.type === 'parley_card') {
            return item.legs.some(l => {
                const ls = l.sport.toLowerCase();
                if (sport === 'nba') return check(ls, ['nba', 'basketball']);
                if (sport === 'soccer') return check(ls, ['soccer', 'liga', 'premier', 'serie', 'champs', 'uefa']);
                if (sport === 'nhl') return check(ls, ['nhl', 'hockey']);
                if (sport === 'mlb') return check(ls, ['mlb', 'baseball']);
                return false;
            });
        }

        // 2. Individual Cards
        if (sport === 'nba') return check(s, ['nba', 'basketball']);
        if (sport === 'soccer') return check(s, ['soccer', 'liga', 'premier', 'serie', 'bundesliga', 'champs', 'uefa']);
        if (sport === 'nhl') return check(s, ['nhl', 'hockey', 'ice']);
        if (sport === 'mlb') return check(s, ['mlb', 'baseball']);

        return false;
    });

    renderFeed(filtered);
}

function renderFeed(recs) {
    elements.feed.innerHTML = '';

    if (!recs || recs.length === 0) {
        elements.feed.innerHTML = '<div class="empty-state">No hay juegos para este filtro.</div>';
        return;
    }

    recs.forEach(req => {
        const card = document.createElement('div');
        card.className = 'recommendation-card';

        // PARLEY CARD RENDER -> MOVED TO DASHBOARD ONLY
        if (req.type === 'parley_card') {
            return; // Skip rendering in main feed
        }

        let badgeText = req.sport;
        let borderStyle = '4px solid #334155'; // Neutral
        let textColor = 'white';

        if (req.risk === 'high') {
            borderStyle = '4px solid #f59e0b'; // Amber
            badgeText += ' 🔥';
            textColor = '#f59e0b';
        } else if (req.risk === 'low') {
            borderStyle = '4px solid #10b981'; // Greenish
        } else if (req.risk === 'mid') {
            borderStyle = '4px solid #a855f7';
        }

        card.style.borderLeft = borderStyle;

        const oddsDisplay = req.odds > 0 ? `+${req.odds}` : req.odds;

        card.innerHTML = `
            <div class="rec-top">
                <span class="badge-type" style="font-size:0.75em">${badgeText} • ${req.time || ''}</span>
                <span style="font-weight:bold; color:${textColor}">${oddsDisplay}</span>
            </div>
            <div class="rec-match" style="margin-top:0.5rem; font-size:1rem; line-height:1.2">${req.match}</div>
            <div class="rec-pick" style="color:var(--text-main); margin:5px 0; font-weight:600">🎯 ${req.pick}</div>
            
            <!-- Confidence Score Bar -->
            <div style="display:flex; align-items:center; gap:8px; margin:8px 0">
                <span style="font-size:0.7rem; color:var(--text-muted)">Confianza:</span>
                <div style="flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden">
                    <div style="width:${req.confidenceScore || 50}%; height:100%; background:${req.confidenceScore >= 70 ? '#10b981' : req.confidenceScore >= 50 ? '#f59e0b' : '#ef4444'}; border-radius:3px"></div>
                </div>
                <span style="font-size:0.75rem; font-weight:700; color:${req.confidenceScore >= 70 ? '#10b981' : req.confidenceScore >= 50 ? '#f59e0b' : '#ef4444'}">${req.confidenceScore || 50}%</span>
            </div>
            
            <div class="rec-analysis" style="font-size:0.8rem; color:var(--text-muted)">${req.analysis}</div>
            
            <!-- Suggested Stake -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding:6px 10px; background:rgba(16,185,129,0.1); border-radius:8px; border:1px dashed rgba(16,185,129,0.3)">
                <span style="font-size:0.75rem; color:var(--text-muted)">💰 Stake Sugerido:</span>
                <span style="font-weight:700; color:#10b981">$${req.suggestedStake || '1.00'}</span>
            </div>
            
            <button class="btn-secondary" style="margin-top:10px; width:100%; padding:6px; font-size:0.8rem; opacity:0.8" 
                onclick="useRecommendation('${req.pick}', '${req.odds}', '${req.match}')">
                Usar
            </button>
        `;

        elements.feed.appendChild(card);
    });
}

// --- 8. UI INTERACTIONS & HISTORY ---
window.useRecommendation = function (pick, odds, desc) {
    openModal('add-bet');
    elements.inputDesc.value = `${desc} - ${pick}`;
    elements.inputOdds.value = odds;
    setTimeout(() => elements.inputAmount.focus(), 100);
}

window.saveSettings = function () {
    const keysRaw = elements.inputApiKeys.value;
    const newBcv = parseFloat(elements.inputBcvRate.value);

    // Save Keys
    const keysSaved = KeyManager.setKeys(keysRaw);

    // Save BCV
    if (newBcv > 0) {
        state.bcv = newBcv;
        localStorage.setItem('vstrike_bcv_manual', newBcv);
    }

    if (keysSaved) {
        alert('✅ Configuración guardada. Reiniciando...');
        window.location.reload();
    } else {
        alert('⚠️ Error en las llaves. Asegúrate de separarlas por comas o saltos de línea.');
    }
}

// History / Review
let reviewOffset = -1; // -1 = Yesterday

window.changeReviewDate = function (delta) {
    reviewOffset += delta;
    if (reviewOffset > 0) reviewOffset = 0;
    renderReviewMode();
}

function renderReviewMode() {
    const feed = document.getElementById('results-feed');
    feed.innerHTML = '';

    const date = new Date();
    date.setDate(date.getDate() + reviewOffset);
    const dateKey = date.toLocaleDateString('en-CA');

    const dateLabel = reviewOffset === 0 ? 'HOY (En Curso)' :
        reviewOffset === -1 ? 'AYER' : dateKey;
    document.getElementById('review-date-display').textContent = dateLabel;

    const key = `vstrike_recs_${dateKey}`;
    const data = JSON.parse(localStorage.getItem(key) || '[]');

    if (data.length === 0) {
        feed.innerHTML = '<div class="empty-state-sm">Sin registros para esta fecha.</div>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'recommendation-card';

        let statusColor = '#94a3b8'; // Pending
        let statusText = 'PENDING';
        if (item.result === 'WIN') { statusColor = '#10b981'; statusText = 'WIN'; }
        if (item.result === 'LOSS') { statusColor = '#ef4444'; statusText = 'LOSS'; }

        card.style.borderLeft = `4px solid ${statusColor}`;

        let actions = '';
        if (item.result === 'PENDING') {
            actions = `
                <div style="margin-top:10px; display:flex; gap:5px; border-top:1px dashed #333; padding-top:8px">
                    <button class="btn-xs" style="flex:1; background:#065f46" onclick="setHistoryResult('${dateKey}', '${item.id}', 'WIN')">✅ Ganó</button>
                    <button class="btn-xs" style="flex:1; background:#7f1d1d" onclick="setHistoryResult('${dateKey}', '${item.id}', 'LOSS')">❌ Perdió</button>
                </div>
            `;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px">
                <span class="badge-type">${item.sport}</span>
                <span style="background:${statusColor}; padding:2px 6px; border-radius:4px; font-size:0.7em; color:white">${statusText}</span>
            </div>
            <div>${item.match}</div>
            <div style="font-weight:bold; color:var(--accent)">${item.pick} (${item.odds})</div>
            ${actions}
        `;

        feed.appendChild(card);
    });
}

window.setHistoryResult = function (dateKey, id, status) {
    const key = `vstrike_recs_${dateKey}`;
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    const index = data.findIndex(i => i.id === id);
    if (index !== -1) {
        data[index].result = status;
        localStorage.setItem(key, JSON.stringify(data));
        renderReviewMode();
    }
}

// --- 9. VIEW NAVIGATION ---
window.switchTab = function (tab) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (document.getElementById(`nav-${tab}`)) document.getElementById(`nav-${tab}`).classList.add('active');

    elements.sectDashboard.classList.add('hidden');
    elements.sectScanner.classList.add('hidden');
    elements.sectResults.classList.add('hidden');
    elements.sectSettings.classList.add('hidden');

    if (tab === 'dashboard') {
        elements.sectDashboard.classList.remove('hidden');
        elements.sectActive.classList.remove('hidden');
    }
    if (tab === 'scanner') elements.sectScanner.classList.remove('hidden');
    if (tab === 'results') {
        elements.sectResults.classList.remove('hidden');
        renderReviewMode();
    }
    if (tab === 'settings') elements.sectSettings.classList.remove('hidden');
}

// --- 10. BANKROLL / BETS LOGIC (LEGACY) ---
function updateUI() {
    let totalInvested = 0;
    let totalReturned = 0;
    state.history.forEach(bet => {
        totalInvested += bet.amount;
        if (bet.status === 'won') totalReturned += bet.potentialWin;
    });

    const profitBS = totalReturned - totalInvested;
    const profitUSD = state.bcv > 0 ? profitBS / state.bcv : 0;

    elements.balance.textContent = `${profitBS >= 0 ? '+' : ''}${profitBS.toFixed(2)} Bs`;
    elements.profit.innerHTML = `${profitUSD >= 0 ? '+' : ''}$${profitUSD.toFixed(2)} USD`;
    elements.profit.className = profitBS >= 0 ? 'stat-value profit' : 'stat-value loss';
    if (elements.bcvDisplay) elements.bcvDisplay.textContent = state.bcv.toFixed(2);
}

function renderActiveBets() {
    const list = elements.activeBetsList;
    list.innerHTML = '';
    const active = state.history.filter(b => b.status === 'pending');
    if (active.length === 0) {
        list.innerHTML = '<div class="empty-state-sm">No hay apuestas activas.</div>';
        return;
    }
    active.forEach(bet => {
        const card = document.createElement('div');
        card.className = 'bet-card pending';
        card.innerHTML = `
            <div class="bet-header"><span>Ticket #${bet.id.toString().slice(-4)}</span></div>
            <div>${bet.desc}</div>
            <div class="bet-stats">
               <span>$${bet.amount}</span> 
               <span>Ganancia: $${(bet.potentialWin - bet.amount).toFixed(2)}</span>
            </div>
            <div class="bet-actions">
                <button class="btn-action btn-win" onclick="resolveBet(${bet.id}, 'won')">Ganada</button>
                <button class="btn-action btn-loss" onclick="resolveBet(${bet.id}, 'lost')">Perdida</button>
            </div>
        `;
        list.appendChild(card);
    });
}

window.submitBet = function () {
    const amount = parseFloat(elements.inputAmount.value);
    const odds = parseFloat(elements.inputOdds.value);
    const desc = elements.inputDesc.value;
    if (!amount || !odds || !desc) return alert('Datos incompletos');

    state.history.unshift({
        id: Date.now(),
        date: new Date().toISOString(),
        amount, odds, desc, status: 'pending',
        potentialWin: calculatePayout(amount, odds) // Fixed: now handles negative American odds correctly
    });
    saveState();
    closeModals();
    updateUI();
    renderActiveBets();
}

window.resolveBet = function (id, res) {
    if (!confirm('¿Confirmar resultado?')) return;
    const idx = state.history.findIndex(b => b.id === id);
    if (idx === -1) return;
    state.history[idx].status = res;
    saveState();
    updateUI();
    renderActiveBets();
}

function saveState() {
    localStorage.setItem('vstrike_bankroll', state.bankroll);
    localStorage.setItem('vstrike_history', JSON.stringify(state.history));
}

// Modals
window.openModal = (id) => {
    elements.modalOverlay.classList.remove('hidden');
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    document.getElementById(id === 'add-bet' ? 'modal-add-bet' : 'modal-analysis').style.display = 'block';
}
window.closeModals = () => elements.modalOverlay.classList.add('hidden');

async function fetchAutomaticBCV() {
    try {
        const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        const data = await res.json();
        if (data.promedio > 0) {
            state.bcv = parseFloat(data.promedio);
            localStorage.setItem('vstrike_bcv_manual', state.bcv);
            updateUI();
        }
    } catch (e) { console.warn('BCV Auto fail', e); }
}

// Backup logic
window.exportData = function () {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
}
window.importData = function (input) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            state = JSON.parse(e.target.result);
            saveState();
            updateUI();
            renderActiveBets();
            alert('OK');
        } catch (err) { alert('Error'); }
    };
    reader.readAsText(file);
}

// --- 11. INITIALIZATION ---
function init() {
    // Fill Settings
    if (elements.inputApiKeys) {
        const keys = KeyManager.getKeys();
        elements.inputApiKeys.value = keys.join('\n');
    }
    if (elements.inputBcvRate) elements.inputBcvRate.value = state.bcv;

    // Start Tab
    switchTab('dashboard');

    renderActiveBets();
    updateUI();

    // Auto-Generate logic
    checkAndGenerateDaily();

    // Auto-Update BCV
    fetchAutomaticBCV();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error('SW Error:', err));
    }
}

// Start App
init();
