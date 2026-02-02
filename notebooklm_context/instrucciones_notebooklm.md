# Protocolo de Enlace: V-STRIKE <-> NotebookLM

Este protocolo te permite utilizar la IA de Google (NotebookLM) como el "Cerebro Estratégico" para V-STRIKE.

## Paso 1: Carga de Información
1.  Ve a [NotebookLM](https://notebooklm.google.com/).
2.  Crea un **Nuevo Cuaderno** llamado "V-STRIKE Brain".
3.  Sube el archivo `estrategia_actual.md` que acabo de generar en la carpeta `v-strike/notebooklm_context`.
4.  (Opcional) Si tienes PDFs de estrategias de apuestas o libros de trading deportivo, súbelos también.

## Paso 2: La Consulta Maestra (Prompt)
Copia y pega el siguiente prompt en el chat de NotebookLM para iniciar el análisis:

> "Actúa como un Analista Deportivo Senior y Experto en Algoritmos de Apuestas. Analiza mi estrategia actual (documento 'Estrategia Actual V-STRIKE').
>
> Identifica 3 debilidades críticas en mi lógica actual basada solo en cuotas.
> Luego, propón **3 Normas Algorítmicas Concretas** (en pseudocódigo o lógica "If-Then") que pueda implementar programáticamente para aumentar la rentabilidad (Profit).
>
> Enfócate en:
> 1. Detectar valor real vs. trampa de las casas de apuestas.
> 2. Una mejor fórmula para construir los Parlays (no solo elegir 3 al azar).
> 3. Gestión de riesgo (Staking plan).
>
> Dame la respuesta en formato técnico para que mi desarrollador pueda implementarlo."

## Paso 3: Retorno del Conocimiento
1.  NotebookLM te dará una respuesta detallada.
2.  **Copia esa respuesta.**
3.  Vuelve aquí a nuestro chat y **pega la respuesta**.
4.  Yo (Antigravity) traduciré esas estrategias en código JavaScript para la próxima versión de V-STRIKE (v3.4).
