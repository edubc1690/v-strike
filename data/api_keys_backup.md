# 🔑 Backup de API Keys - V-STRIKE

## API Keys Registradas

Las siguientes API keys están configuradas para rotación automática:

### Lista Enumerada:

1. `08affce486b5eca89463bb516279e948` - Key Principal (Default)

---

## Estado Actual

- **Total de keys:** 1
- **Solicitudes gratuitas por key/mes:** 500
- **Total disponible:** 500 solicitudes/mes
- **Estado:** ⚠️ Posiblemente agotada (error 401)

---

## Cómo Añadir Más Keys

1. Ir a [the-odds-api.com](https://the-odds-api.com/)
2. Crear cuenta gratuita
3. Copiar la API key
4. En V-STRIKE: **Configuración** → Añadir key en el campo de texto
5. O editar `config.js` directamente añadiendo:

```javascript
API_KEYS: [
    '08affce486b5eca89463bb516279e948', // Key 1
    'tu_nueva_key_aqui',                 // Key 2
    'otra_key_mas',                      // Key 3
],
```

---

## Recomendación

Con **3-4 keys** tendrías aproximadamente **1500-2000 solicitudes/mes**, suficiente para uso diario intensivo.

---

*Backup generado: 2026-02-03*
