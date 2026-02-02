// ==========================================
// V-STRIKE ANALYTICS ENGINE v3.6
// Post-Mortem Analysis & Auto-Adjustment
// ==========================================

/**
 * Analyze yesterday's results and generate insights
 * @returns {Object|null} Analysis object with metrics and insights
 */
function analyzeYesterday() {
    const yesterday = getYesterdayKey();
    const recs = JSON.parse(localStorage.getItem(`vstrike_recs_${yesterday}`) || '[]');

    if (recs.length === 0) return null;

    // Filter only resolved picks
    const resolved = recs.filter(r => r.result === 'WIN' || r.result === 'LOSS');
    if (resolved.length === 0) return null;

    // Calculate metrics by risk category
    const byRisk = {
        low: { total: 0, wins: 0, picks: [] },
        mid: { total: 0, wins: 0, picks: [] },
        high: { total: 0, wins: 0, picks: [] }
    };

    resolved.forEach(pick => {
        const risk = pick.risk || 'mid';
        byRisk[risk].total++;
        byRisk[risk].picks.push(pick);
        if (pick.result === 'WIN') byRisk[risk].wins++;
    });

    // Calculate win rates
    Object.keys(byRisk).forEach(risk => {
        byRisk[risk].winRate = byRisk[risk].total > 0
            ? (byRisk[risk].wins / byRisk[risk].total)
            : 0;
    });

    // Detect patterns and generate insights
    const insights = detectPatterns(resolved, byRisk);

    return {
        date: yesterday,
        metrics: {
            total: resolved.length,
            wins: resolved.filter(r => r.result === 'WIN').length,
            losses: resolved.filter(r => r.result === 'LOSS').length,
            winRate: resolved.filter(r => r.result === 'WIN').length / resolved.length,
            byRisk
        },
        insights
    };
}

/**
 * Detect patterns in results and generate actionable insights
 */
function detectPatterns(resolved, byRisk) {
    const insights = [];

    // Pattern 1: Heavy favorites (-300+) underperforming
    const heavyFavs = resolved.filter(p => p.odds < -300);
    if (heavyFavs.length >= 3) {
        const heavyFavWinRate = heavyFavs.filter(p => p.result === 'WIN').length / heavyFavs.length;
        if (heavyFavWinRate < 0.6) {
            insights.push({
                type: 'warning',
                icon: '⚠️',
                message: `Favoritos pesados (-300+) ganaron solo ${(heavyFavWinRate * 100).toFixed(0)}% (${heavyFavs.filter(p => p.result === 'WIN').length}/${heavyFavs.length})`,
                suggestion: 'Reducir límite superior de favoritos a -250',
                action: {
                    param: 'favOddsMax',
                    currentValue: -900,
                    newValue: -250,
                    impact: 'Evitará favoritos con muy poco valor'
                }
            });
        }
    }

    // Pattern 2: Moderate underdogs (+150 to +250) performing well
    const modDogs = resolved.filter(p => p.odds >= +150 && p.odds <= +250);
    if (modDogs.length >= 3) {
        const modDogWinRate = modDogs.filter(p => p.result === 'WIN').length / modDogs.length;
        if (modDogWinRate > 0.35) {
            insights.push({
                type: 'success',
                icon: '✅',
                message: `Underdogs moderados (+150 a +250) ganaron ${(modDogWinRate * 100).toFixed(0)}% (${modDogs.filter(p => p.result === 'WIN').length}/${modDogs.length})`,
                suggestion: 'Reducir penalización de confianza para este rango',
                action: {
                    param: 'moderateDogPenalty',
                    currentValue: -20,
                    newValue: -10,
                    impact: 'Aumentará stake sugerido en underdogs moderados'
                }
            });
        }
    }

    // Pattern 3: High risk picks performing better than expected
    if (byRisk.high.total >= 3 && byRisk.high.winRate > 0.4) {
        insights.push({
            type: 'success',
            icon: '🎯',
            message: `Picks arriesgados ganaron ${(byRisk.high.winRate * 100).toFixed(0)}% (${byRisk.high.wins}/${byRisk.high.total})`,
            suggestion: 'Aumentar confianza base en picks de alto riesgo',
            action: {
                param: 'highRiskPenalty',
                currentValue: -15,
                newValue: -10,
                impact: 'Aumentará stake en parleys sorpresa'
            }
        });
    }

    // Pattern 4: Low risk picks underperforming
    if (byRisk.low.total >= 3 && byRisk.low.winRate < 0.6) {
        insights.push({
            type: 'warning',
            icon: '⚠️',
            message: `Picks seguros ganaron solo ${(byRisk.low.winRate * 100).toFixed(0)}% (${byRisk.low.wins}/${byRisk.low.total})`,
            suggestion: 'Aumentar filtro de calidad para picks "seguros"',
            action: {
                param: 'lowRiskBonus',
                currentValue: 10,
                newValue: 15,
                impact: 'Solo seleccionará favoritos con mejor edge'
            }
        });
    }

    // Pattern 5: Home advantage correlation
    const homeTeams = resolved.filter(p => p.isHome === true);
    if (homeTeams.length >= 3) {
        const homeWinRate = homeTeams.filter(p => p.result === 'WIN').length / homeTeams.length;
        if (homeWinRate > 0.65) {
            insights.push({
                type: 'success',
                icon: '🏠',
                message: `Equipos locales ganaron ${(homeWinRate * 100).toFixed(0)}% (${homeTeams.filter(p => p.result === 'WIN').length}/${homeTeams.length})`,
                suggestion: 'Aumentar bonus de ventaja local',
                action: {
                    param: 'homeBonus',
                    currentValue: 5,
                    newValue: 8,
                    impact: 'Priorizará más picks de equipos locales'
                }
            });
        }
    }

    return insights;
}

/**
 * Get yesterday's date key
 */
function getYesterdayKey() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toLocaleDateString('en-CA');
}

/**
 * Apply parameter adjustment from insight
 */
window.applyParameterAdjustment = function (action) {
    const confirmMsg = `¿Aplicar ajuste?\n\n${action.param}: ${action.currentValue} → ${action.newValue}\n\nImpacto: ${action.impact}`;

    if (!confirm(confirmMsg)) return;

    // Get current strategy params
    const config = JSON.parse(localStorage.getItem('vstrike_strategy_params') || '{}');

    // Apply adjustment
    config[action.param] = action.newValue;
    config.lastUpdated = new Date().toISOString();
    config.adjustmentHistory = config.adjustmentHistory || [];
    config.adjustmentHistory.push({
        date: new Date().toISOString(),
        param: action.param,
        oldValue: action.currentValue,
        newValue: action.newValue
    });

    // Save
    localStorage.setItem('vstrike_strategy_params', JSON.stringify(config));

    alert('✅ Parámetro actualizado. Se aplicará en las próximas recomendaciones.');

    // Reload analysis view
    renderReviewMode();
};
