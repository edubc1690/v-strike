// ================================================
// V-STRIKE ADVANCED MODULE v2.0
// Equipos Trampa, Value, Lesiones, Fatiga, Datos Históricos
// ================================================

// 📊 HISTORICAL DATABASE
let HISTORICAL_DATA = null;

// Load historical data on init
async function loadHistoricalData() {
    try {
        const response = await fetch('./data/historical_stats.json');
        if (response.ok) {
            HISTORICAL_DATA = await response.json();
            console.log('📊 Datos históricos cargados:', HISTORICAL_DATA.metadata.last_updated);
            return HISTORICAL_DATA;
        }
    } catch (err) {
        console.warn('⚠️ Error loading historical data:', err);
    }
    return null;
}

// 🏟️ DIVISIONAL MATCHUP CHECK
function checkDivisionalMatchup(team1, team2, sport) {
    if (!HISTORICAL_DATA?.divisional_matchups?.[sport]) return null;

    const divisions = HISTORICAL_DATA.divisional_matchups[sport];

    for (const [divName, teams] of Object.entries(divisions)) {
        if (teams.includes(team1) && teams.includes(team2)) {
            return {
                isDivisional: true,
                division: divName,
                adjustment: -3, // Divisional games are more competitive
                reason: `🏟️ Divisional: ${divName} - Más competitivo`
            };
        }
    }

    return { isDivisional: false, adjustment: 0, reason: null };
}

// 📈 GET TEAM HISTORICAL STATS
function getTeamHistoricalStats(teamName, sport) {
    if (!HISTORICAL_DATA?.team_historical?.[sport]?.[teamName]) return null;
    return HISTORICAL_DATA.team_historical[sport][teamName];
}

// ⭐ GET STAR PLAYER IMPACT
function getStarPlayerImpact(playerName, sport) {
    if (!HISTORICAL_DATA?.star_player_impact?.[sport]?.[playerName]) return null;
    return HISTORICAL_DATA.star_player_impact[sport][playerName];
}


// 🚫 EQUIPOS TRAMPA (evitar como favoritos - históricamente no cubren)
const TRAP_TEAMS = {
    // NBA - Equipos que no cubren como favoritos
    'Cleveland Cavaliers': { penalty: -15, reason: '1-9 ATS como favoritos' },
    'Toronto Raptors': { penalty: -12, reason: '2-10 ATS reciente' },
    'Milwaukee Bucks': { penalty: -10, reason: 'Inconsistentes sin Giannis' },

    // MLB - Equipos overrated por bookmakers
    'New York Yankees': { penalty: -15, reason: '-21.1 unidades temporada 2025' },
    'Atlanta Braves': { penalty: -18, reason: '-42.5 unidades temporada 2025' },
    'Colorado Rockies': { penalty: -20, reason: '-30 unidades, 30-82 récord' },

    // NHL - Equipos inconsistentes
    'Chicago Blackhawks': { penalty: -12, reason: 'En reconstrucción' }
};

// ✅ EQUIPOS VALUE (buenos como underdogs o favoritos ligeros)
const VALUE_TEAMS = {
    // NBA - Buenos cubriendo como underdogs
    'Charlotte Hornets': { bonus: 12, reason: '16-11 ATS como underdogs' },
    'Miami Heat': { bonus: 8, reason: 'Consistentes en playoffs' },
    'Detroit Pistons': { bonus: 8, reason: 'Upsets frecuentes' },

    // MLB - Rentables históricamente
    'Milwaukee Brewers': { bonus: 15, reason: '+20.2 unidades, 68-44' },
    'Toronto Blue Jays': { bonus: 12, reason: '+14.4 unidades, World Series 2025' },
    'Miami Marlins': { bonus: 10, reason: '+13.1 unidades como underdogs' },
    'Philadelphia Phillies': { bonus: 8, reason: '66.3% home win rate' },
    'Los Angeles Dodgers': { bonus: 10, reason: 'Campeones 2025' },

    // NHL - Consistentes
    'Colorado Avalanche': { bonus: 10, reason: '67.3% win rate' },
    'Tampa Bay Lightning': { bonus: 8, reason: '65.4% win rate' },
    'Dallas Stars': { bonus: 8, reason: '57.4% win rate, buenos en OT' }
};

// ⭐ JUGADORES ESTRELLA POR EQUIPO (si están out = penalización grave)
const STAR_PLAYERS = {
    // NBA
    'Los Angeles Lakers': ['LeBron James', 'Anthony Davis'],
    'Milwaukee Bucks': ['Giannis Antetokounmpo', 'Damian Lillard'],
    'Boston Celtics': ['Jayson Tatum', 'Jaylen Brown'],
    'Denver Nuggets': ['Nikola Jokic', 'Jamal Murray'],
    'Phoenix Suns': ['Kevin Durant', 'Devin Booker'],
    'Philadelphia 76ers': ['Joel Embiid', 'Tyrese Maxey'],
    'Golden State Warriors': ['Stephen Curry', 'Draymond Green'],
    'Dallas Mavericks': ['Luka Doncic', 'Kyrie Irving'],
    'Miami Heat': ['Jimmy Butler', 'Bam Adebayo'],
    'Cleveland Cavaliers': ['Donovan Mitchell', 'Jarrett Allen'],

    // NHL
    'Edmonton Oilers': ['Connor McDavid', 'Leon Draisaitl'],
    'Colorado Avalanche': ['Nathan MacKinnon', 'Cale Makar'],
    'Tampa Bay Lightning': ['Nikita Kucherov', 'Steven Stamkos'],
    'Toronto Maple Leafs': ['Auston Matthews', 'Mitch Marner'],

    // MLB
    'Los Angeles Dodgers': ['Shohei Ohtani', 'Mookie Betts'],
    'New York Yankees': ['Aaron Judge', 'Juan Soto'],
    'Philadelphia Phillies': ['Bryce Harper', 'Trea Turner'],
    'Atlanta Braves': ['Ronald Acuña Jr.', 'Matt Olson']
};

// 🏥 LESIONES CONOCIDAS (actualizar manualmente o vía API)
let CURRENT_INJURIES = JSON.parse(localStorage.getItem('vstrike_injuries') || '{}');

// Penalizaciones por lesión de estrella
const INJURY_PENALTY = {
    'OUT': -25,      // Confirmado fuera
    'DOUBTFUL': -15, // Probablemente no juega
    'QUESTIONABLE': -8, // 50/50
    'PROBABLE': -3   // Probablemente juega
};

// 🔍 CHECK INJURIES FOR TEAM
function checkTeamInjuries(teamName) {
    const stars = STAR_PLAYERS[teamName] || [];
    let totalPenalty = 0;
    let injuredPlayers = [];

    stars.forEach(player => {
        const injuryStatus = CURRENT_INJURIES[player];
        if (injuryStatus && INJURY_PENALTY[injuryStatus]) {
            totalPenalty += INJURY_PENALTY[injuryStatus];
            injuredPlayers.push(`${player} (${injuryStatus})`);
        }
    });

    return {
        penalty: totalPenalty,
        players: injuredPlayers,
        reason: injuredPlayers.length > 0
            ? `🏥 Lesiones: ${injuredPlayers.join(', ')}`
            : null
    };
}

// 📡 FETCH INJURIES FROM API (if enabled)
async function fetchInjuries() {
    const config = window.DEFAULT_CONFIG?.INJURIES_API;

    if (!config || !config.enabled || !config.keys || config.keys.length === 0) {
        console.log('ℹ️ API de lesiones no configurada - usando datos manuales');
        return null;
    }

    console.log('🏥 Buscando lesiones actuales...');

    try {
        // API-Sports endpoint (ejemplo para NBA)
        if (config.provider === 'apisports') {
            const key = config.keys[0];
            const response = await fetch('https://v2.nba.api-sports.io/players/injuries', {
                headers: {
                    'x-apisports-key': key
                }
            });

            if (response.ok) {
                const data = await response.json();

                // Parse injuries into our format
                const injuries = {};
                data.response?.forEach(injury => {
                    if (injury.player?.name) {
                        injuries[injury.player.name] = injury.status?.toUpperCase() || 'OUT';
                    }
                });

                // Cache for 6 hours
                CURRENT_INJURIES = injuries;
                localStorage.setItem('vstrike_injuries', JSON.stringify(injuries));
                localStorage.setItem('vstrike_injuries_updated', Date.now().toString());

                console.log(`✅ ${Object.keys(injuries).length} lesiones actualizadas`);
                return injuries;
            }
        }
    } catch (err) {
        console.warn('⚠️ Error fetching injuries:', err);
    }

    return null;
}

// 📝 MANUAL INJURY UPDATE (for UI)
function updateInjury(playerName, status) {
    if (!status || status === 'ACTIVE') {
        delete CURRENT_INJURIES[playerName];
    } else {
        CURRENT_INJURIES[playerName] = status;
    }
    localStorage.setItem('vstrike_injuries', JSON.stringify(CURRENT_INJURIES));
    console.log(`🏥 ${playerName} actualizado a ${status || 'ACTIVE'}`);
}

// 🔍 GET TEAM ADJUSTMENT (now includes injuries)
function getTeamAdjustment(teamName, isFavorite) {
    let totalAdjustment = 0;
    let reasons = [];

    // Check trap teams
    if (isFavorite && TRAP_TEAMS[teamName]) {
        totalAdjustment += TRAP_TEAMS[teamName].penalty;
        reasons.push(`⚠️ Trampa: ${TRAP_TEAMS[teamName].reason}`);
    }

    // Check value teams
    if (VALUE_TEAMS[teamName]) {
        totalAdjustment += VALUE_TEAMS[teamName].bonus;
        reasons.push(`✅ Value: ${VALUE_TEAMS[teamName].reason}`);
    }

    // Check injuries (CRITICAL)
    const injuries = checkTeamInjuries(teamName);
    if (injuries.penalty !== 0) {
        totalAdjustment += injuries.penalty;
        reasons.push(injuries.reason);
    }

    // Check back-to-back fatigue
    const fatigue = checkBackToBack(teamName);
    if (fatigue.penalty !== 0) {
        totalAdjustment += fatigue.penalty;
        reasons.push(fatigue.reason);
    }

    return {
        adjustment: totalAdjustment,
        reason: reasons.length > 0 ? reasons.join(' | ') : null
    };
}

// 🏃 BACK-TO-BACK DETECTION
// Teams playing on consecutive days have ~10% lower win rate
let RECENT_GAMES = JSON.parse(localStorage.getItem('vstrike_recent_games') || '{}');

function checkBackToBack(teamName) {
    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toLocaleDateString('en-CA');

    // Check if team played yesterday
    const playedYesterday = RECENT_GAMES[yesterdayKey]?.includes(teamName);

    if (playedYesterday) {
        return {
            penalty: -10,
            reason: `🏃 Back-to-Back: Jugó ayer, fatiga -10`
        };
    }

    return { penalty: 0, reason: null };
}

// Track games when processing odds
function trackGameForBackToBack(homeTeam, awayTeam) {
    const today = new Date().toLocaleDateString('en-CA');

    if (!RECENT_GAMES[today]) {
        RECENT_GAMES[today] = [];
    }

    if (!RECENT_GAMES[today].includes(homeTeam)) {
        RECENT_GAMES[today].push(homeTeam);
    }
    if (!RECENT_GAMES[today].includes(awayTeam)) {
        RECENT_GAMES[today].push(awayTeam);
    }

    // Clean old entries (keep only last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoff = threeDaysAgo.toLocaleDateString('en-CA');

    Object.keys(RECENT_GAMES).forEach(key => {
        if (key < cutoff) delete RECENT_GAMES[key];
    });

    localStorage.setItem('vstrike_recent_games', JSON.stringify(RECENT_GAMES));
}

// 📊 AUTO-FETCH YESTERDAY'S RESULTS
async function fetchYesterdayScores() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toLocaleDateString('en-CA');

    // Check if already processed today
    const processedKey = `vstrike_scores_processed_${yesterdayKey}`;
    if (localStorage.getItem(processedKey)) {
        console.log('✅ Scores de ayer ya procesados');
        return;
    }

    console.log('🔄 Buscando resultados de ayer automáticamente...');

    const results = [];

    for (const sport of API_CONFIG.SPORTS) {
        try {
            const currentKey = KeyManager.getCurrentKey();
            const url = `${API_CONFIG.BASE_URL}/${sport.key}/scores/?apiKey=${currentKey}&daysFrom=1&dateFormat=iso`;

            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 401 || response.status === 429) {
                    KeyManager.rotate();
                    continue;
                }
                continue;
            }

            const games = await response.json();

            games.forEach(game => {
                if (game.completed && game.scores) {
                    const homeScore = game.scores.find(s => s.name === game.home_team)?.score || 0;
                    const awayScore = game.scores.find(s => s.name === game.away_team)?.score || 0;

                    results.push({
                        id: game.id,
                        homeTeam: game.home_team,
                        awayTeam: game.away_team,
                        homeScore: parseInt(homeScore),
                        awayScore: parseInt(awayScore),
                        winner: parseInt(homeScore) > parseInt(awayScore) ? game.home_team : game.away_team,
                        sport: sport.name
                    });
                }
            });
        } catch (err) {
            console.warn(`⚠️ Error fetching scores for ${sport.key}:`, err);
        }
    }

    if (results.length > 0) {
        // Auto-mark picks based on results
        autoMarkResults(yesterdayKey, results);
        localStorage.setItem(processedKey, 'true');
        console.log(`✅ ${results.length} resultados procesados automáticamente`);
    }

    return results;
}

// 🎯 AUTO-MARK RESULTS
function autoMarkResults(dateKey, scores) {
    const recsKey = `vstrike_recs_${dateKey}`;
    const recs = JSON.parse(localStorage.getItem(recsKey) || '[]');

    if (recs.length === 0) return;

    let marked = 0;

    recs.forEach(rec => {
        if (rec.result && rec.result !== 'PENDING') return; // Already marked

        // Find matching game
        const game = scores.find(s =>
            rec.match && (rec.match.includes(s.homeTeam) || rec.match.includes(s.awayTeam))
        );

        if (!game) return;

        // Determine if pick won
        const pickTeam = rec.pick.replace(' ML', '').replace(/\s*[+-][\d.]+/, '').trim();

        if (rec.pick.includes('ML')) {
            // Moneyline pick
            rec.result = (game.winner === pickTeam) ? 'WIN' : 'LOSS';
            marked++;
        } else if (rec.pick.includes('+') || rec.pick.includes('-')) {
            // Spread pick - more complex
            const spreadMatch = rec.pick.match(/([+-][\d.]+)/);
            if (spreadMatch) {
                const spread = parseFloat(spreadMatch[1]);
                const isHome = pickTeam === game.homeTeam;
                const teamScore = isHome ? game.homeScore : game.awayScore;
                const oppScore = isHome ? game.awayScore : game.homeScore;
                const coverScore = teamScore + spread;

                rec.result = coverScore > oppScore ? 'WIN' : 'LOSS';
                marked++;
            }
        }
    });

    if (marked > 0) {
        localStorage.setItem(recsKey, JSON.stringify(recs));
        console.log(`🎯 ${marked} picks marcados automáticamente`);
    }
}

// 📈 DYNAMIC PARLEY SIZE
function calculateOptimalParleySize(picks) {
    // Count high-confidence picks
    const highConf = picks.filter(p => p.confidenceScore >= 75).length;
    const medConf = picks.filter(p => p.confidenceScore >= 65 && p.confidenceScore < 75).length;

    // Filter out trap teams
    const cleanPicks = picks.filter(p => {
        const teamName = p.pick.replace(' ML', '').replace(/\s*[+-][\d.]+/, '').trim();
        return !TRAP_TEAMS[teamName];
    });

    const cleanHighConf = cleanPicks.filter(p => p.confidenceScore >= 70).length;

    if (cleanHighConf >= 5) return { legs: 4, reason: '5+ picks de alta confianza' };
    if (cleanHighConf >= 4) return { legs: 3, reason: '4 picks de alta confianza' };
    if (cleanHighConf >= 3) return { legs: 3, reason: '3 picks sólidos' };
    if (cleanHighConf >= 2) return { legs: 2, reason: 'Solo 2 picks buenos - parley conservador' };

    return { legs: 0, reason: 'No suficientes picks de calidad para parley' };
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Fetch injuries first (critical for recommendations)
    setTimeout(() => {
        if (typeof fetchInjuries === 'function') {
            fetchInjuries();
        }
    }, 1000);

    // Auto-fetch scores after 3 seconds (let other things load first)
    setTimeout(() => {
        if (typeof fetchYesterdayScores === 'function') {
            fetchYesterdayScores();
        }
    }, 3000);
});

// Export for use in main app
window.TRAP_TEAMS = TRAP_TEAMS;
window.VALUE_TEAMS = VALUE_TEAMS;
window.STAR_PLAYERS = STAR_PLAYERS;
window.CURRENT_INJURIES = CURRENT_INJURIES;
window.RECENT_GAMES = RECENT_GAMES;
window.HISTORICAL_DATA = HISTORICAL_DATA;
window.getTeamAdjustment = getTeamAdjustment;
window.checkTeamInjuries = checkTeamInjuries;
window.checkBackToBack = checkBackToBack;
window.trackGameForBackToBack = trackGameForBackToBack;
window.fetchInjuries = fetchInjuries;
window.updateInjury = updateInjury;
window.fetchYesterdayScores = fetchYesterdayScores;
window.calculateOptimalParleySize = calculateOptimalParleySize;
window.loadHistoricalData = loadHistoricalData;
window.checkDivisionalMatchup = checkDivisionalMatchup;
window.getTeamHistoricalStats = getTeamHistoricalStats;
window.getStarPlayerImpact = getStarPlayerImpact;

// Auto-load historical data
loadHistoricalData();



