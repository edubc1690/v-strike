// ================================================
// V-STRIKE ADVANCED MODULE v1.0
// Equipos Trampa, Value, Resultados Automáticos
// ================================================

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

// 🔍 GET TEAM ADJUSTMENT
function getTeamAdjustment(teamName, isFavorite) {
    // Si es favorito y está en lista trampa, penalizar
    if (isFavorite && TRAP_TEAMS[teamName]) {
        return {
            adjustment: TRAP_TEAMS[teamName].penalty,
            reason: `⚠️ Trampa: ${TRAP_TEAMS[teamName].reason}`
        };
    }

    // Si está en lista value, bonificar
    if (VALUE_TEAMS[teamName]) {
        return {
            adjustment: VALUE_TEAMS[teamName].bonus,
            reason: `✅ Value: ${VALUE_TEAMS[teamName].reason}`
        };
    }

    return { adjustment: 0, reason: null };
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
window.getTeamAdjustment = getTeamAdjustment;
window.fetchYesterdayScores = fetchYesterdayScores;
window.calculateOptimalParleySize = calculateOptimalParleySize;
