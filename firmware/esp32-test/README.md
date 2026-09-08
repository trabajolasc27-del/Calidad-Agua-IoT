# Firmware de prueba de conectividad (ESP32)

Este sketch **no mide calidad del agua real todavía**. Sirve únicamente para comprobar que un ESP32 físico puede autenticarse y enviar datos a la Edge Function `ingest-measurement` del proyecto real, y que esas mediciones aparecen en la base de datos con fecha/hora reales. Ver el comentario al inicio de [`esp32-test.ino`](esp32-test.ino) y [docs/DECISIONS.md](../../docs/DECISIONS.md) D-002.

## Qué necesitas

- Arduino IDE con el paquete de placas **ESP32 (by Espressif Systems)** instalado (Preferencias → URLs adicionales de gestor de tarjetas → `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`, luego Gestor de placas → instalar "esp32").
- No hace falta instalar ninguna librería adicional: `WiFi`, `WiFiClientSecure` y `HTTPClient` vienen incluidas con el paquete de ESP32.

## Preparar los secretos

1. Copia `secrets.h.example` como `secrets.h` (en esta misma carpeta). `secrets.h` está en `.gitignore`, nunca se sube a Git.
2. Pon tu SSID y contraseña de WiFi.
3. Pon el `DEVICE_SECRET` que te dieron para `NODO-ESP32-01` (se emite una sola vez; si lo pierdes hay que rotar la credencial en la base de datos, no hay forma de recuperarlo).

## Cableado esperado

| Componente | Pin ESP32 |
|---|---|
| HC-SR04 `TRIG` | GPIO 5 |
| HC-SR04 `ECHO` | GPIO 18 |
| LDR (salida analógica) | GPIO 34 |
| LED (ánodo, con resistencia en serie) | GPIO 2 |

Si tu cableado usa otros pines, ajusta las constantes `PIN_*` al inicio de `esp32-test.ino`.

## Qué esperar

- El LED parpadea brevemente en cada envío exitoso (HTTP 201); se queda encendido fijo si algo falla.
- Por el Monitor Serie (115200 baudios) se ve el JSON enviado y la respuesta HTTP completa — útil para depurar sin tener que ver la base de datos directamente.
- Acerca la mano al HC-SR04 para que la "turbidez" de prueba suba (para ver una alerta real en el Historial); cubre el LDR para que la "temperatura" de prueba baje.

## Siguiente paso

Cuando llegue el hardware real (sensor de oxígeno disuelto, sensor de temperatura, sonda de pH, sensor de turbidez calibrado), se reemplaza únicamente el bloque `LECTURA DE SENSORES` dentro de `sendReading()` — el resto del sketch (WiFi, hora, autenticación, envío) no cambia.
