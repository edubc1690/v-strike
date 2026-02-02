// ==========================================
// V-STRIKE BACKUP MANAGER v3.6
// Auto-export historical data to JSON files
// ==========================================

/**
 * Export all historical data to downloadable JSON file
 * This can be committed to Git for long-term tracking
 */
window.exportHistoryToFile = function () {
    const allData = {};

    // Get all recommendation data from localStorage
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('vstrike_recs_')) {
            const date = key.replace('vstrike_recs_', '');
            allData[date] = JSON.parse(localStorage.getItem(key));
        }
    });

    // Add metadata
    const exportData = {
        version: '3.6.0',
        exportDate: new Date().toISOString(),
        totalDays: Object.keys(allData).length,
        data: allData
    };

    // Create downloadable file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vstrike_history_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`✅ Historial exportado: ${Object.keys(allData).length} días de datos`);
};

/**
 * Import historical data from JSON file
 */
window.importHistoryFromFile = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);

            if (!imported.data) {
                alert('❌ Archivo inválido');
                return;
            }

            let imported_count = 0;
            Object.keys(imported.data).forEach(date => {
                const key = `vstrike_recs_${date}`;
                localStorage.setItem(key, JSON.stringify(imported.data[date]));
                imported_count++;
            });

            alert(`✅ Importados ${imported_count} días de historial`);
            renderReviewMode();
        } catch (err) {
            alert('❌ Error al importar: ' + err.message);
        }
    };
    reader.readAsText(file);
};

/**
 * Generate weekly summary report
 */
window.generateWeeklySummary = function () {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekData = [];

    // Collect last 7 days
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toLocaleDateString('en-CA');
        const key = `vstrike_recs_${dateKey}`;
        const data = JSON.parse(localStorage.getItem(key) || '[]');

        if (data.length > 0) {
            const resolved = data.filter(r => r.result === 'WIN' || r.result === 'LOSS');
            const wins = resolved.filter(r => r.result === 'WIN').length;

            weekData.push({
                date: dateKey,
                total: resolved.length,
                wins: wins,
                losses: resolved.length - wins,
                winRate: resolved.length > 0 ? (wins / resolved.length) : 0
            });
        }
    }

    if (weekData.length === 0) {
        alert('⚠️ No hay datos de la última semana');
        return;
    }

    // Calculate aggregates
    const totalPicks = weekData.reduce((sum, day) => sum + day.total, 0);
    const totalWins = weekData.reduce((sum, day) => sum + day.wins, 0);
    const avgWinRate = totalWins / totalPicks;

    const summary = {
        period: `${weekData[weekData.length - 1].date} a ${weekData[0].date}`,
        totalDays: weekData.length,
        totalPicks: totalPicks,
        totalWins: totalWins,
        totalLosses: totalPicks - totalWins,
        winRate: avgWinRate,
        dailyBreakdown: weekData
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vstrike_weekly_summary_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`✅ Resumen semanal generado\n\nWin Rate: ${(avgWinRate * 100).toFixed(1)}%\nTotal: ${totalWins}/${totalPicks}`);
};
