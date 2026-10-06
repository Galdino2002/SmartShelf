/*
 * SmartShelf - ESP32 + HX711 -> Supabase REST
 * DT/DOUT: GPIO 4 | SCK/CLK: GPIO 5
 *
 * Antes de gravar:
 * 1) Preencha Wi-Fi e chave publishable.
 * 2) Confirme os UUIDs da prateleira/produto no Supabase.
 * 3) Calibre a célula de carga e informe CALIBRATION_FACTOR.
 * 4) Ajuste UNIT_WEIGHT_KG ao produto cadastrado.
 *
 * TLS usa setInsecure() apenas para o protótipo de laboratório.
 * Para produção, valide o certificado raiz do endpoint.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include "HX711.h"
#include <math.h>

const char* WIFI_SSID = "NOME_DA_REDE_WIFI";
const char* WIFI_PASSWORD = "SENHA_DA_REDE_WIFI";

const char* SUPABASE_URL = "https://jcobchoqoahrecsyshtk.supabase.co";
const char* SUPABASE_PUBLISHABLE_KEY = "COLE_SUA_CHAVE_PUBLISHABLE_AQUI";

// UUIDs do protótipo cadastrados no banco atual.
const char* PRATELEIRA_ID = "8a073a67-1778-422b-89d7-290b7892df05";
const char* PRODUTO_ID = "8b4a1468-9c34-48d2-b85d-edd86965cfc7";

constexpr int HX711_DT_PIN = 4;
constexpr int HX711_SCK_PIN = 5;
constexpr float CALIBRATION_FACTOR = 0.0f; // Configure após calibrar; zero bloqueia envios.
constexpr float UNIT_WEIGHT_KG = 0.200f;   // Deve corresponder a produtos.peso_unitario_kg.
constexpr unsigned long SEND_INTERVAL_MS = 5000;

HX711 scale;
unsigned long lastSendAt = 0;

String readingsEndpoint() {
  return String(SUPABASE_URL) + "/rest/v1/leituras";
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando ao Wi-Fi");

  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 30000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Wi-Fi conectado. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("Wi-Fi não conectado; tentarei novamente no próximo ciclo.");
  }
}

bool sendReading(float weightKg, int estimatedQuantity) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return false;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Somente protótipo; valide o certificado em produção.

  HTTPClient http;
  if (!http.begin(client, readingsEndpoint())) {
    Serial.println("Não foi possível iniciar a requisição HTTPS.");
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
    Serial.printf("Leitura enviada: %.3f kg | quantidade estimada: %d\n",
                  weightKg, estimatedQuantity);
    return true;
  }

  Serial.printf("Falha ao enviar leitura. HTTP %d: %s\n",
                statusCode, response.c_str());
  Serial.println("Confira a chave publishable, UUIDs, Data API e política INSERT de leituras.");
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("SmartShelf - inicialização");

  scale.begin(HX711_DT_PIN, HX711_SCK_PIN);
  if (!scale.is_ready()) {
    Serial.println("HX711 não detectado. Confira VCC, GND, DT GPIO 4 e SCK GPIO 5.");
  }

  if (CALIBRATION_FACTOR == 0.0f) {
    Serial.println("ATENÇÃO: CALIBRATION_FACTOR está em zero. Calibre a balança antes de enviar dados.");
  } else {
    scale.set_scale(CALIBRATION_FACTOR);
    scale.tare();
    Serial.println("HX711 calibrado e tara realizada.");
  }

  connectWiFi();
}

void loop() {
  if (CALIBRATION_FACTOR == 0.0f) {
    delay(1000);
    return;
  }

  if (!scale.is_ready()) {
    Serial.println("Aguardando o HX711 ficar pronto...");
    delay(1000);
    return;
  }

  if (millis() - lastSendAt < SEND_INTERVAL_MS) {
    delay(50);
    return;
  }
  lastSendAt = millis();

  float weightKg = scale.get_units(5);
  if (!isfinite(weightKg)) {
    Serial.println("Leitura inválida; verifique o fator de calibração.");
    return;
  }

  if (weightKg < 0.0f) weightKg = 0.0f;
  const int estimatedQuantity = UNIT_WEIGHT_KG > 0.0f
      ? (int)floorf(weightKg / UNIT_WEIGHT_KG)
      : 0;

  Serial.printf("Peso: %.3f kg | quantidade estimada: %d\n",
                weightKg, estimatedQuantity);
  sendReading(weightKg, estimatedQuantity);
}
