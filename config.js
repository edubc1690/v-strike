// ================================================
// V-STRIKE CONFIGURACIÓN AVANZADA v3.9
// Puedes editar este archivo para agregar tus API Keys
// ================================================

const DEFAULT_CONFIG = {
    // ================================================
    // 🎰 API KEYS - THE ODDS API (Obligatorio)
    // Obtener gratis en: https://the-odds-api.com/#get-access
    // Cada cuenta = 500 solicitudes/mes
    // ================================================
    API_KEYS: [
        '08affce486b5eca89463bb516279e948', // Key #1
        // 'PEGA_TU_SEGUNDA_KEY_AQUI',       // Key #2
        // 'PEGA_TU_TERCERA_KEY_AQUI',       // Key #3
    ],

    // ================================================
    // 🏥 API KEYS - LESIONES (Opcional pero recomendado)
    // Opciones gratuitas:
    // 1. SportsData.io - https://sportsdata.io/developers/api-documentation
    // 2. API-Sports - https://api-sports.io/ (Gratis hasta 100 requests/día)
    // ================================================
    INJURIES_API: {
        enabled: true,            // ✅ HABILITADO con tu key
        provider: 'apisports',    // 'sportsdata' o 'apisports'
        keys: [
            '6a3ec20638426323af402be37fbc58f0', // Tu API-Sports Key (100 req/día)
        ]
    },

    // ================================================
    // 🌦️ API KEY - CLIMA (Opcional, útil para MLB/NFL)
    // OpenWeatherMap gratis: https://openweathermap.org/api
    // 1000 llamadas/día gratis
    // ================================================
    WEATHER_API: {
        enabled: false,           // Cambia a true cuando tengas una key
        provider: 'openweather',
        key: '',                  // 'TU_OPENWEATHER_KEY_AQUI'
    },

    // ================================================
    // ⚙️ CONFIGURACIÓN TÉCNICA
    // ================================================

    // Tasa Dólar BCV Inicial (Se sobreescribe desde la App)
    INITIAL_BCV: 36.50,

    // Duración del caché (12 horas por defecto)
    CACHE_DURATION_MS: 43200000,

    // Moneda principal
    CURRENCY: 'USD',

    // ================================================
    // 🔄 ROTACIÓN DE KEYS (No editar manualmente)
    // ================================================
    ROTATION: {
        last_reset: Date.now(),
        current_index: 0
    }
};

window.DEFAULT_CONFIG = DEFAULT_CONFIG;

