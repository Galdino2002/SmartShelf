/*
 * SmartShelf - ESP32 + HX711 -> Supabase REST
 * DT/DOUT: GPIO 4 | SCK/CLK: GPIO 5
 *
 * Para configurar credenciais sem publicá-las:
 * 1) Copie secrets.h.example para secrets.h na mesma pasta.
 * 2) Preencha Wi-Fi e chave publishable em secrets.h.
 * 3) Nunca faça commit de secrets.h.
 *
 * Calibração provisória: 413.7 (get_units retorna gramas nesta montagem).
 * Valide com pesos conhecidos antes de confiar na quantidade calculada.
 * setInsecure() é somente para o protótipo da apresentação; não use em produção.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include "HX711.h"
#include <math.h>

#if __has_include("secrets.h")
  #include "secrets.h"
#else
  #define SMARTSHELF_WIFI_SSID "PREENCHA_SEU_WIFI"
  #define SMARTSHELF_WIFI_PASSWORD "PREENCHA_SUA_SENHA"
  #define SMARTSHELF_SUPABASE_PUBLISHABLE_KEY "PREENCHA_SUA_CHAVE_PUBLISHABLE"
#endif

const char* WIFI_SSID = SMARTSHELF_WIFI_SSID;
const char* WIFI_PASSWORD = SMARTSHELF_WIFI_PASSWORD;
const char* SUPABASE_URL = "https://jcobchoqoahrecsyshtk.supabase.co";
const char* SUPABASE_PUBLISHABLE_KEY = SMARTSHELF_SUPABASE_PUBLISHABLE_KEY;

const char* PRATELEIRA_ID = "8a073a67-1778-422b-89d7-290b7892df05";
const char* PRODUTO_ID = "8b4a1468-9c34-48d2-b85d-edd86965cfc7";

constexpr int HX711_DT_PIN = 4;
constexpr int HX711_SCK_PIN = 5;
constexpr float CALIBRATION_FACTOR = 413.7f;
constexpr float UNIT_WEIGHT_KG = 0.200f;
constexpr unsigned long SEND_INTERVAL_MS = 5000;
constexpr unsigned long SENSOR_RETRY_MS = 3000;
constexpr float ZERO_THRESHOLD_G = 0.5f;

HX711 scale;
unsigned long lastSendAt = 0;
unsigned long lastSensorRetryAt = 0;
bool sensorReady = false;
bool sensorErrorShown = false;

bool configurationIsValid() {
  const bool wifiConfigured =
      String(WIFI_SSID).length() > 0 &&
      String(WIFI_SSID) != "PREENCHA_SEU_WIFI" &&
      String(WIFI_PASSWORD).length() > 0 &&
      String(WIFI_PASSWORD) != "PREENCHA_SUA_SENHA";
  const bool keyConfigured =
      String(SUPABASE_PUBLISHABLE_KEY).length() > 0 &&
      String(SUPABASE_PUBLISHABLE_KEY) != "PREENCHA_SUA_CHAVE_PUBLISHABLE";
  if (!wifiConfigured) Serial.println("CONFIG: preencha SSID e senha em secrets.h.");
  if (!keyConfigured) Serial.println("CONFIG: preencha a chave publishable em secrets.h.");
  return wifiConfigured && keyConfigured;
}

String readingsEndpoint() {
  return String(SUPABASE_URL) + "/rest/v1/leituras";
}

bool initializeScale() {
  Serial.println("Verificando HX711 nos pinos DT=4 e SCK=5...");
  scale.begin(HX711_DT_PIN, HX711_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);

  const unsigned long startedAt = millis();
  while (!scale.is_ready() && millis() - startedAt < 5000) {
    delay(100);
  }

  if (!scale.is_ready()) {
    sensorReady = false;
    if (!sensorErrorShown) {
      Serial.println("ERRO: HX711 não detectado. Confira VCC 3V3, GND, DT GPIO 4 e SCK GPIO 5.");
      sensorErrorShown = true;
    }
    return false;
  }

  Serial.println("Remova qualquer peso da plataforma. Fazendo tara...");
  delay(1200);
  scale.tare(15);
  sensorReady = true;
  sensorErrorShown = false;
  Serial.println("HX711 pronto; tara concluída.");
  return true;
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (String(WIFI_SSID) == "PREENCHA_SEU_WIFI" ||
      String(WIFI_PASSWORD) == "PREENCHA_SUA_SENHA") {
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando ao Wi-Fi");

  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Wi-Fi conectado. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("Wi-Fi ainda indisponível; tentarei novamente.");
  }
}

bool sendReading(float weightKg, int estimatedQuantity) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Envio pendente: ESP32 sem Wi-Fi.");
      return false;
    }
  }

  WiFiClientSecure client;
  client.setInsecure(); // Apenas para demonstração em rede confiável.
  HTTPClient http;
  http.setTimeout(8000);

  if (!http.begin(client, readingsEndpoint())) {
    Serial.println("ERRO: não foi possível iniciar a requisição HTTPS.");
    return false;
  }

  http.addHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_PUBLISHABLE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  String payload = "{";
  payload += "\"prateleira_id\":\"" + String(PRATELEIRA_ID) + "\",";
  payload += "\"produto_id\":\"" + String(PRODUTO_ID) + "\",";
  payload += "\"peso_kg\":" + String(weightKg, 3) + ",";
  payload += "\"quantidade_estimada\":" + String(estimatedQuantity);
  payload += "}";

  const int statusCode = http.POST(payload);
  const String response = http.getString();
  http.end();

  if (statusCode >= 200 && statusCode < 300) {
    Serial.printf("OK SUPABASE | %.3f kg | quantidade estimada: %d\n",
                  weightKg, estimatedQuantity);
    return true;
  }

  Serial.printf("ERRO SUPABASE HTTP %d: %s\n", statusCode, response.c_str());
  Serial.println("Confira chave publishable, UUIDs, Data API e política INSERT da tabela leituras.");
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(700);
  Serial.println();
  Serial.println("================================");
  Serial.println(" SmartShelf - inicializando");
  Serial.println("================================");

  configurationIsValid();
  initializeScale();
  connectWiFi();
}

void loop() {
  if (!sensorReady) {
    if (millis() - lastSensorRetryAt >= SENSOR_RETRY_MS) {
      lastSensorRetryAt = millis();
      initializeScale();
    }
    delay(50);
    return;
  }

  if (millis() - lastSendAt < SEND_INTERVAL_MS) {
    delay(25);
    return;
  }
  lastSendAt = millis();

  if (!scale.is_ready()) {
    Serial.println("HX711 temporariamente indisponível; verificarei novamente.");
    sensorReady = false;
    return;
  }

  float weightGrams = scale.get_units(5);
  if (!isfinite(weightGrams)) {
    Serial.println("Leitura inválida; confira a ligação e a calibração.");
    return;
  }

  if (fabsf(weightGrams) < ZERO_THRESHOLD_G) weightGrams = 0.0f;
  if (weightGrams < 0.0f) weightGrams = 0.0f;

  const float weightKg = weightGrams / 1000.0f;
  const int estimatedQuantity = UNIT_WEIGHT_KG > 0.0f
      ? (int)floorf(weightKg / UNIT_WEIGHT_KG)
      : 0;

  Serial.printf("PESO: %.1f g (%.3f kg) | quantidade estimada: %d\n",
                weightGrams, weightKg, estimatedQuantity);

  if (String(SUPABASE_PUBLISHABLE_KEY) == "PREENCHA_SUA_CHAVE_PUBLISHABLE") {
    Serial.println("Leitura local OK; envio ignorado até configurar secrets.h.");
    return;
  }

  sendReading(weightKg, estimatedQuantity);
}
