/*
 * SmartShelf - ESP32 + HX711 -> Supabase REST
 * DT/DOUT: GPIO 4 | SCK/CLK: GPIO 5
 *
 * Antes de gravar:
 * 1) Preencha Wi-Fi e chave publishable.
 * 2) Confirme os UUIDs da prateleira/produto cadastrados no Supabase.
 * 3) Calibre com peso conhecido. O fator abaixo e provisório para leitura em gramas.
 * 4) UNIT_WEIGHT_KG deve corresponder a produtos.peso_unitario_kg.
 *
 * IMPORTANTE:
 * - CALIBRATION_FACTOR 413.7 foi estimado usando o peso de 7 g na montagem atual.
 *   Valide com pesos maiores antes de confiar no estoque calculado.
 * - setInsecure() serve somente para protótipo de laboratório; em produção,
 *   valide o certificado TLS e use uma autenticação própria para o dispositivo.
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

// Registros existentes no Supabase do SmartShelf.
const char* PRATELEIRA_ID = "8a073a67-1778-422b-89d7-290b7892df05";
const char* PRODUTO_ID = "8b4a1468-9c34-48d2-b85d-edd86965cfc7";

constexpr int HX711_DT_PIN = 4;
constexpr int HX711_SCK_PIN = 5;

// O fator atual faz get_units() retornar gramas. Convertemos para kg antes do POST.
constexpr float CALIBRATION_FACTOR = 413.7f;
constexpr float UNIT_WEIGHT_KG = 0.200f;
constexpr unsigned long SEND_INTERVAL_MS = 5000;
constexpr float ZERO_THRESHOLD_G = 0.5f;

HX711 scale;
unsigned long lastSendAt = 0;

String readingsEndpoint() {
  return String(SUPABASE_URL) + "/rest/v1/leituras";
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando ao Wi-Fi");

  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Wi-Fi conectado. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("Wi-Fi indisponível; nova tentativa no próximo envio.");
  }
}

bool sendReading(float weightKg, int estimatedQuantity) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return false;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Protótipo somente; validar TLS antes de produção.

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
    Serial.printf("OK Supabase | %.3f kg | quantidade estimada: %d\n",
                  weightKg, estimatedQuantity);
    return true;
  }

  Serial.printf("ERRO Supabase HTTP %d: %s\n", statusCode, response.c_str());
  Serial.println("Confira a chave publishable, os UUIDs, a Data API e a política INSERT de leituras.");
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("SmartShelf - ESP32 + HX711 + Supabase");

  scale.begin(HX711_DT_PIN, HX711_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);

  Serial.println("Aguardando HX711...");
  const unsigned long startedAt = millis();
  while (!scale.is_ready() && millis() - startedAt < 10000) {
    delay(100);
  }

  if (!scale.is_ready()) {
    Serial.println("ERRO: HX711 não detectado. Confira 3V3, GND, DT GPIO 4 e SCK GPIO 5.");
    return;
  }

  Serial.println("Remova qualquer peso da plataforma. Fazendo tara...");
  delay(1500);
  scale.tare(15);
  Serial.println("Tara concluída.");

  if (String(SUPABASE_PUBLISHABLE_KEY) == "COLE_SUA_CHAVE_PUBLISHABLE_AQUI") {
    Serial.println("ATENÇÃO: preencha SUPABASE_PUBLISHABLE_KEY antes de enviar leituras.");
  }
  connectWiFi();
}

void loop() {
  if (!scale.is_ready()) {
    delay(100);
    return;
  }

  if (millis() - lastSendAt < SEND_INTERVAL_MS) {
    delay(25);
    return;
  }
  lastSendAt = millis();

  // get_units() está em gramas com o fator calibrado acima.
  float weightGrams = scale.get_units(5);
  if (!isfinite(weightGrams)) {
    Serial.println("Leitura inválida; verifique a calibração.");
    return;
  }

  if (fabsf(weightGrams) < ZERO_THRESHOLD_G) weightGrams = 0.0f;
  if (weightGrams < 0.0f) weightGrams = 0.0f;

  const float weightKg = weightGrams / 1000.0f;
  const int estimatedQuantity = UNIT_WEIGHT_KG > 0.0f
      ? (int)floorf(weightKg / UNIT_WEIGHT_KG)
      : 0;

  Serial.printf("Peso: %.1f g (%.3f kg) | quantidade estimada: %d\n",
                weightGrams, weightKg, estimatedQuantity);

  if (String(SUPABASE_PUBLISHABLE_KEY) == "COLE_SUA_CHAVE_PUBLISHABLE_AQUI") {
    Serial.println("Envio ignorado: configure a chave publishable no firmware.");
    return;
  }

  sendReading(weightKg, estimatedQuantity);
}
