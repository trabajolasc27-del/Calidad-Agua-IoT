/*
  ESP32 - Prueba de conectividad con la Edge Function ingest-measurement
  ============================================================================
  Este firmware NO usa sensores reales de calidad del agua todavia -- no se
  han adquirido los sensores de pH, oxigeno disuelto, turbidez ni
  temperatura calibrados (ver docs/DECISIONS.md D-002 y
  docs/MANUAL_ACTIONS.md accion #3 en el repositorio). Los 4 valores que se
  envian son de PRUEBA, derivados de:
    - Sensor ultrasonico HC-SR04 (distancia)  -> "turbidez" de prueba
      (acerca la mano al sensor para que suba, como si el agua se
      enturbiara; sirve para ver una alerta real en el Historial)
    - Fotorresistor / LDR (luz ambiental)      -> "temperatura" de prueba
    - pH y oxigeno disuelto: variacion aleatoria pequena alrededor de un
      valor base, sin ningun sensor real detras.

  El unico objetivo de este sketch es comprobar que un ESP32 fisico le
  habla bien a la Edge Function real (autenticacion, formato del JSON,
  numero de secuencia, hora) y que la lectura llega a la base de datos y
  se ve en el Historial con fecha/hora reales (sincronizadas por NTP).
  Cuando lleguen los sensores reales, se reemplaza unicamente el bloque
  "LECTURA DE SENSORES" de la funcion sendReading().
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>

#include "secrets.h" // WIFI_SSID, WIFI_PASSWORD, DEVICE_SECRET (no se sube a Git)

// --- Identidad de este dispositivo (dado de alta en la base de datos) ---
const char* DEVICE_ID = "NODO-ESP32-01";
const char* INGEST_URL = "https://zeoedihibvbkclqsqhrf.supabase.co/functions/v1/ingest-measurement";

// --- Pines: ajusta estos numeros si tu cableado usa otros GPIO ---
const int PIN_TRIG = 5;
const int PIN_ECHO = 18;
const int PIN_LDR = 34;  // pin ADC1 (seguro de usar con WiFi activo)
const int PIN_LED = 2;

const unsigned long INTERVAL_MS = 15000; // una lectura cada 15 segundos

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println(" conectado.");
  Serial.println(WiFi.localIP());
}

void syncTime() {
  // UTC (sin horario de verano): measured_at se guarda y se muestra en UTC.
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Sincronizando hora por NTP");
  time_t now = time(nullptr);
  while (now < 1700000000) { // espera hasta tener una fecha real, no 1970
    delay(400);
    Serial.print(".");
    now = time(nullptr);
  }
  Serial.println(" listo.");
}

float readDistanceCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long duration = pulseIn(PIN_ECHO, HIGH, 30000); // timeout 30 ms (~5 m)
  if (duration == 0) return 400.0;                // sin eco: se asume "lejos"
  return duration * 0.0343 / 2.0;
}

float clampf(float v, float lo, float hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

float mapf(float x, float inMin, float inMax, float outMin, float outMax) {
  return (x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

void buildIsoTimestamp(char* buffer, size_t size) {
  time_t now = time(nullptr);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  strftime(buffer, size, "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
}

bool sendReading() {
  // ---- LECTURA DE SENSORES (de prueba, ver comentario al inicio) ----
  float distanceCm = clampf(readDistanceCm(), 2.0, 400.0);
  int ldrRaw = analogRead(PIN_LDR); // 0-4095

  float turbidity = mapf(distanceCm, 2.0, 400.0, 8.0, 0.5);     // mas cerca = "mas turbio"
  float temperature = mapf((float)ldrRaw, 0.0, 4095.0, 20.0, 35.0);
  float ph = 7.0 + (random(-30, 31) / 100.0);
  float dissolvedOxygen = 7.0 + (random(-40, 41) / 100.0);
  // ---- FIN LECTURA DE SENSORES ----

  time_t nowEpoch = time(nullptr);
  char measuredAt[25];
  buildIsoTimestamp(measuredAt, sizeof(measuredAt));

  char body[400];
  snprintf(
    body, sizeof(body),
    "{\"device_id\":\"%s\",\"sequence\":%lu,\"measured_at\":\"%s\","
    "\"values\":{\"ph\":%.2f,\"dissolved_oxygen\":%.2f,\"turbidity\":%.2f,\"temperature\":%.2f}}",
    DEVICE_ID, (unsigned long)nowEpoch, measuredAt, ph, dissolvedOxygen, turbidity, temperature
  );

  WiFiClientSecure client;
  client.setInsecure(); // prueba de conectividad; el firmware final debe validar el certificado

  HTTPClient http;
  http.begin(client, INGEST_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_SECRET);

  Serial.println("Enviando:");
  Serial.println(body);

  int statusCode = http.POST(body);
  String response = http.getString();
  http.end();

  Serial.printf("HTTP %d\n", statusCode);
  Serial.println(response);

  return statusCode == 201;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  connectWiFi();
  syncTime();
  randomSeed(esp_random());
}

void loop() {
  bool ok = sendReading();

  if (ok) {
    digitalWrite(PIN_LED, HIGH);
    delay(150);
    digitalWrite(PIN_LED, LOW);
  } else {
    digitalWrite(PIN_LED, HIGH); // se queda encendido si algo fallo
  }

  delay(INTERVAL_MS);
}
