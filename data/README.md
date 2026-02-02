# Datos Históricos de V-STRIKE

Esta carpeta contiene los datos históricos exportados de V-STRIKE para análisis a largo plazo.

## Estructura de Archivos

### Historial Completo
- `vstrike_history_YYYY-MM-DD.json` - Exportación completa de todos los datos

### Resúmenes Semanales
- `vstrike_weekly_summary_YYYY-MM-DD.json` - Resumen de la semana

## Formato de Datos

### Historial Completo
```json
{
  "version": "3.6.0",
  "exportDate": "2026-02-02T18:50:00.000Z",
  "totalDays": 15,
  "data": {
    "2026-02-01": [
      {
        "id": "...",
        "type": "parley_leg",
        "sport": "basketball_nba",
        "match": "Lakers vs Warriors",
        "pick": "Lakers ML",
        "odds": -150,
        "result": "WIN",
        "confidenceScore": 75
      }
    ]
  }
}
```

### Resumen Semanal
```json
{
  "period": "2026-01-26 a 2026-02-02",
  "totalDays": 7,
  "totalPicks": 42,
  "totalWins": 25,
  "totalLosses": 17,
  "winRate": 0.595,
  "dailyBreakdown": [...]
}
```

## Cómo Usar

### Exportar Datos
1. Ve a **Configuración** (⚙️)
2. Click en **"💾 Exportar Historial (JSON)"**
3. Guarda el archivo en esta carpeta
4. Haz commit a Git

### Importar Datos
1. Ve a **Configuración** (⚙️)
2. Click en **"📥 Importar Historial"**
3. Selecciona el archivo JSON

### Generar Resumen Semanal
1. Ve a **Configuración** (⚙️)
2. Click en **"📈 Resumen Semanal"**
3. Guarda el archivo en esta carpeta

## Workflow Recomendado

```bash
# Cada semana
1. Exportar historial completo
2. Generar resumen semanal
3. git add data/
4. git commit -m "Datos semana del YYYY-MM-DD"
5. git push
```

## Análisis Histórico

Con estos datos puedes:
- Comparar win rates entre semanas
- Identificar tendencias a largo plazo
- Validar ajustes de parámetros
- Entrenar modelos de ML (futuro)
