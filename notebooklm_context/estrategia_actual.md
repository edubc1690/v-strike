# Documento de Contexto: Estrategia Actual V-STRIKE (v3.3)

Este documento describe la lógica algorítmica actual utilizada en V-STRIKE para generar predicciones deportivas automatizadas.

## 1. Fuentes de Datos
- **Proveedor**: The-Odds-API
- **Mercados**: Head-to-Head (Moneyline/Ganador), Spreads (Hándicap).
- **Casas de Apuestas**: Se priorizan líneas de Pinnacle, DraftKings, FanDuel y WilliamHill.

## 2. Motor de Recomendación (Recommendation Engine)

El sistema analiza los eventos del día local (00:00 a 23:59) y clasifica las apuestas en tres categorías de riesgo basadas estrictamente en las cuotas (Odds Americanas).

### A. Selecciones de Bajo Riesgo ("Parley Leg")
Ideales para combinar en parlays debido a su mayor probabilidad teórica.
- **Criterio**: Favoritos en Moneyline.
- **Rango de Cuotas**: Entre `-130` y `-900`.
- **Lógica**: Se busca un favorito claro pero con cierto valor (evitando favoritos extremos de -1000+ que no aportan valor).

### B. Selecciones de Alto Riesgo ("High Risk")
Apuestas de valor en "underdogs" (no favoritos) que el mercado podría estar subestimando.
- **Criterio**: Underdogs en Moneyline.
- **Rango de Cuotas**: Entre `+110` y `+450`.
- **Lógica**: Buscamos sorpresas rentables donde el pago potencial justifica el riesgo.

### C. Selecciones de Riesgo Medio ("Straight / Spread")
Apuestas basadas en líneas de hándicap.
- **Criterio**: Favoritos en Spread.
- **Rango de Puntos**: Spreads entre `-1` y `-14`.
- **Lógica**: Equipos que deben ganar por un margen específico.

## 3. Construcción de Parlays (Combinadas)

El sistema genera automáticamente dos tipos de parlays diarios si hay suficientes eventos:

### 💎 Parley Seguro (Daily Safe Parley)
- **Composición**: 3 selecciones únicas de **Bajo Riesgo**.
- **Objetivo**: Alta tasa de acierto, ganancia moderada.

### 🔥 Bombazo (High Risk Parley)
- **Composición**: 3 selecciones únicas del pool de **Alto Riesgo** o **Riesgo Medio**.
- **Objetivo**: Alto retorno con baja inversión (lottery ticket).

## 4. Gestión de Bankroll (Stake)
- **Unidad Base**: Definida por el usuario (Default: $20).
- **Control**: Se sugiere un "BCV Rate" para usuarios en economías con múltiples tasas de cambio.

## 5. Análisis de Sentimiento (Simulado)
Actualmente, el sistema genera "razones" simuladas basadas en rangos estadísticos (e.g., "Flujo de dinero inteligente", "Ventaja estadística"), pero **no realiza un análisis real de noticias, lesiones o clima**.

---

## Áreas de Mejora Solicitadas a NotebookLM
Queremos evolucionar esta lógica puramente matemática (basada en cuotas) hacia algo más sofisticado. Buscamos estrategias para:
1.  **Filtrado de Valor**: ¿Cómo identificar "falsos favoritos"?
2.  **Correlación**: ¿Cómo evitar combinar eventos negativamente correlacionados?
3.  **Bankroll Dinámico**: ¿Cómo ajustar el tamaño de la apuesta según la confianza real (Kelly Criterion)?
4.  **Nuevos Mercados**: ¿Deberíamos incluir Over/Under? ¿Cómo analizarlos sin datos de puntos por partido?
