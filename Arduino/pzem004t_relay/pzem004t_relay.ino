#include <ESP8266WiFi.h>
#include <time.h>
#include <SoftwareSerial.h>
#include <PZEM004Tv30.h>
#include <Firebase_ESP_Client.h>
#include "config.h"

FirebaseData firebaseData;
FirebaseAuth firebaseAuth;
FirebaseConfig firebaseConfig;
SoftwareSerial pzemSerial(PZEM_RX_PIN, PZEM_TX_PIN);
PZEM004Tv30 pzem(pzemSerial);

unsigned long lastReadingAt = 0;
unsigned long lastControlAt = 0;
bool relayEnabled = false;

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Wi-Fi connected. IP: ");
  Serial.println(WiFi.localIP());
}

void setupFirebase() {
  firebaseConfig.api_key = FIREBASE_API_KEY;
  firebaseConfig.database_url = FIREBASE_DATABASE_URL;
  firebaseAuth.user.email = FIREBASE_USER_EMAIL;
  firebaseAuth.user.password = FIREBASE_USER_PASSWORD;

  Firebase.begin(&firebaseConfig, &firebaseAuth);
  Firebase.reconnectWiFi(true);
}

void setRelay(bool enabled) {
  relayEnabled = enabled;
  bool output = RELAY_ACTIVE_LOW ? !enabled : enabled;
  digitalWrite(RELAY_PIN, output ? HIGH : LOW);

  String devicePath = String("devices/") + DEVICE_ID;
  Firebase.RTDB.setBool(&firebaseData, (devicePath + "/enabled").c_str(), enabled);
  Firebase.RTDB.setString(&firebaseData, (devicePath + "/status").c_str(), enabled ? "online" : "offline");

  Serial.print("Relay: ");
  Serial.println(enabled ? "ON" : "OFF");
}

void readRelayCommand() {
  String enabledPath = String("devices/") + DEVICE_ID + "/enabled";
  if (!Firebase.RTDB.getBool(&firebaseData, enabledPath.c_str())) {
    Serial.print("Failed to read relay command: ");
    Serial.println(firebaseData.errorReason());
    return;
  }

  bool requested = firebaseData.to<bool>();
  if (requested != relayEnabled) {
    setRelay(requested);
  }
}

void savePowerReading() {
  pzemSerial.listen();
  delay(50);
  float voltage = pzem.voltage();
  float current = pzem.current();
  float power = pzem.power();
  float energy = pzem.energy();
  float frequency = pzem.frequency();
  float pf = pzem.pf();

  if (isnan(voltage) || isnan(current) || isnan(power) || isnan(energy)) {
    Serial.printf("Failed to read PZEM-004T (V=%.2f, A=%.2f, W=%.2f, kWh=%.3f)\n", voltage, current, power, energy);
    Serial.println("Check PZEM 5V/GND, crossed TX/RX, and AC input wiring");
    return;
  }

  time_t currentTime = time(nullptr);
  if (currentTime < 1000000000) {
    Serial.println("Waiting for synchronized time");
    return;
  }

  double timestamp = static_cast<double>(currentTime) * 1000.0;
  String sensorPath = String("devices/") + DEVICE_ID + "/sensors/pzem";

  FirebaseJson latest;
  latest.set("voltage", voltage);
  latest.set("current", current);
  latest.set("power", power);
  latest.set("energy", energy);
  latest.set("frequency", frequency);
  latest.set("powerFactor", pf);
  latest.set("relay", relayEnabled);
  latest.set("timestamp", timestamp);

  if (!Firebase.RTDB.setJSON(&firebaseData, (sensorPath + "/last").c_str(), &latest)) {
    Serial.print("Failed to save PZEM latest data: ");
    Serial.println(firebaseData.errorReason());
    return;
  }

  FirebaseJson history;
  history.set("voltage", voltage);
  history.set("current", current);
  history.set("power", power);
  history.set("energy", energy);
  history.set("frequency", frequency);
  history.set("powerFactor", pf);
  history.set("relay", relayEnabled);
  history.set("timestamp", timestamp);
  Firebase.RTDB.pushJSON(&firebaseData, (sensorPath + "/history").c_str(), &history);

  Firebase.RTDB.setString(&firebaseData, (String("devices/") + DEVICE_ID + "/name").c_str(), DEVICE_NAME);
  Firebase.RTDB.setString(&firebaseData, (String("devices/") + DEVICE_ID + "/room").c_str(), DEVICE_ROOM);
  Firebase.RTDB.setString(&firebaseData, (String("devices/") + DEVICE_ID + "/status").c_str(), relayEnabled ? "online" : "offline");

  Serial.printf("PZEM: %.1f V, %.2f A, %.1f W, %.3f kWh\n", voltage, current, power, energy);
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW);
  pzemSerial.begin(9600);
  connectWiFi();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  setupFirebase();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!Firebase.ready()) {
    delay(100);
    return;
  }

  if (millis() - lastControlAt >= CONTROL_INTERVAL_MS || lastControlAt == 0) {
    lastControlAt = millis();
    readRelayCommand();
  }

  if (millis() - lastReadingAt >= SENSOR_INTERVAL_MS || lastReadingAt == 0) {
    lastReadingAt = millis();
    savePowerReading();
  }

  delay(100);
}
