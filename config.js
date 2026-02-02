// CONFIGURACIÓN AVANZADA
// Puedes editar este archivo si prefieres no usar el menú de ajustes de la App.

const DEFAULT_CONFIG = {
    // Array de API Keys para rotación automática
    // Puedes agregar tantas como quieras separadas por coma
    API_KEYS: [
        '08affce486b5eca89463bb516279e948', // Default Key
        // 'tu_segunda_key_aqui',
        // 'tu_tercera_key_aqui'
    ],

    // Tasa Dólar BCV Inicial (Se sobreescribe si la cambias en la App)
    INITIAL_BCV: 36.50,

    // Configuración Técnica
    CACHE_DURATION_MS: 43200000, // 12 Horas
    CURRENCY: 'USD',

    // Configuración de Rotación
    ROTATION: {
        last_reset: Date.now(), // Timestamp del último reset mensual
        current_index: 0        // Índice de la llave actual
    }
};

window.DEFAULT_CONFIG = DEFAULT_CONFIG;
