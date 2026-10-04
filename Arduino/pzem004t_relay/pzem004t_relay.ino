#include <WiFi.h>
#include <time.h>
#include <PZEM004Tv30.h>
#include <Firebase_ESP_Client.h>
#include "config.h"

// =========================
// Firebase
// =========================
FirebaseData firebaseData;
FirebaseAuth firebaseAuth;
FirebaseConfig firebaseConfig;

// =========================
// PZEM-004T
// ESP32 UART2
// RX = GPIO16
// TX = GPIO17
// =========================
HardwareSerial pzemSerial(2);

PZEM004Tv30 pzem(
  pzemSerial,
  PZEM_RX_PIN,
  PZEM_TX_PIN
);

// =========================
// Timing
// =========================
unsigned long lastReadingAt = 0;
unsigned long lastControlAt = 0;
unsigned long lastCapabilityAttemptAt = 0;

bool relayEnabled = false;
bool relayCapabilityRegistered = false;


// ======================================================
// WiFi
// ======================================================
void connectWiFi() {

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected");

  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}


// ======================================================
// Firebase
// ======================================================
void setupFirebase() {

  firebaseConfig.api_key = FIREBASE_API_KEY;
  firebaseConfig.database_url = FIREBASE_DATABASE_URL;

  firebaseAuth.user.email = FIREBASE_USER_EMAIL;
  firebaseAuth.user.password = FIREBASE_USER_PASSWORD;

  Firebase.begin(&firebaseConfig, &firebaseAuth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase initialized");
}


// ======================================================
// Relay
// ======================================================
void setRelay(bool enabled) {

  relayEnabled = enabled;

  bool output = RELAY_ACTIVE_LOW ? !enabled : enabled;

  digitalWrite(RELAY_PIN, output ? HIGH : LOW);

  String devicePath =
    String("devices/") + DEVICE_ID;

  if (!Firebase.RTDB.setBool(
        &firebaseData,
        (devicePath + "/enabled").c_str(),
        enabled)) {
    Serial.print("Failed to save relay command: ");
    Serial.println(firebaseData.errorReason());
  }

  if (!Firebase.RTDB.setBool(
        &firebaseData,
        (devicePath + "/relayState").c_str(),
        enabled)) {
    Serial.print("Failed to update relay state: ");
    Serial.println(firebaseData.errorReason());
  }

  Serial.print("Relay: ");
  Serial.println(enabled ? "ON" : "OFF");
}

void registerRelayCapability() {
  String capabilityPath =
    String("devices/") + DEVICE_ID + "/capabilities/relay";

  if (!Firebase.RTDB.setBool(
        &firebaseData,
        capabilityPath.c_str(),
        true)) {
    Serial.print("Failed to register relay capability: ");
    Serial.println(firebaseData.errorReason());
    return;
  }

  String statePath =
    String("devices/") + DEVICE_ID + "/relayState";

  if (!Firebase.RTDB.setBool(
        &firebaseData,
        statePath.c_str(),
        relayEnabled)) {
    Serial.print("Failed to initialize relay state: ");
    Serial.println(firebaseData.errorReason());
    return;
  }

  relayCapabilityRegistered = true;
}


// ======================================================
// Read Relay command from Firebase
// ======================================================
void readRelayCommand() {

  String enabledPath =
    String("devices/") +
    DEVICE_ID +
    "/enabled";

  if (!Firebase.RTDB.getBool(
        &firebaseData,
        enabledPath.c_str())) {

    Serial.print("Failed to read relay command: ");
    Serial.println(firebaseData.errorReason());

    return;
  }

  bool requested = firebaseData.to<bool>();

  if (requested != relayEnabled) {
    setRelay(requested);
  }
}

bool isPowerRuleEnabled(FirebaseJson &rule) {
  FirebaseJsonData enabledData;
  if (!rule.get(enabledData, "enabled")) return true;
  if (enabledData.typeNum == FirebaseJson::JSON_BOOL) return enabledData.boolValue;
  return enabledData.stringValue != "false";
}

bool powerRuleMatchesRoom(FirebaseJson &rule) {
  size_t count = rule.iteratorBegin();
  bool hasRooms = false;
  bool matches = false;

  for (size_t index = 0; index < count; index++) {
    int type;
    String key;
    String value;
    rule.iteratorGet(index, type, key, value);
    if (!key.startsWith("rooms/")) continue;
    hasRooms = true;
    value.replace("\"", "");
    if (value == DEVICE_ROOM) matches = true;
  }

  rule.iteratorEnd();
  return !hasRooms || matches;
}

void savePowerAlert(
  const String &ruleId,
  FirebaseJson &rule,
  float value,
  double timestamp
) {
  FirebaseJsonData thresholdData;
  FirebaseJsonData nameData;
  rule.get(thresholdData, "threshold");
  rule.get(nameData, "name");
  float threshold = thresholdData.to<float>();

  FirebaseJson alert;
  alert.set("deviceId", DEVICE_ID);
  alert.set("deviceName", DEVICE_NAME);
  alert.set("room", DEVICE_ROOM);
  alert.set("ruleId", ruleId);
  alert.set("metric", "power");
  alert.set("value", value);
  alert.set("threshold", threshold);
  alert.set("severity", "warning");
  alert.set("title", nameData.to<String>());
  alert.set("timestamp", timestamp);
  alert.set("resolved", false);

  String existingAlertPath;
  if (Firebase.RTDB.getJSON(&firebaseData, "/alerts")) {
    FirebaseJson alerts;
    alerts.setJsonData(firebaseData.jsonString());
    size_t alertCount = alerts.iteratorBegin();

    for (size_t index = 0; index < alertCount; index++) {
      int type;
      String alertId;
      String jsonValue;
      alerts.iteratorGet(index, type, alertId, jsonValue);
      if (alertId.indexOf("/") >= 0) continue;

      FirebaseJson existingAlert;
      existingAlert.setJsonData(jsonValue);
      FirebaseJsonData deviceData;
      FirebaseJsonData ruleData;
      FirebaseJsonData resolvedData;
      existingAlert.get(deviceData, "deviceId");
      existingAlert.get(ruleData, "ruleId");
      existingAlert.get(resolvedData, "resolved");

      if (deviceData.to<String>() == DEVICE_ID &&
          ruleData.to<String>() == ruleId &&
          resolvedData.to<bool>() == false) {
        existingAlertPath = String("/alerts/") + alertId;
        break;
      }
    }

    alerts.iteratorEnd();
  } else if (firebaseData.errorReason() != "path not exist") {
    Serial.print("Failed to read existing alerts: ");
    Serial.println(firebaseData.errorReason());
    return;
  }

  bool success = existingAlertPath.length() > 0
    ? Firebase.RTDB.setJSON(&firebaseData, existingAlertPath.c_str(), &alert)
    : Firebase.RTDB.pushJSON(&firebaseData, "/alerts", &alert);

  if (success) {
    Serial.println(existingAlertPath.length() > 0
      ? "Power alert updated in Firebase"
      : "Power alert created in Firebase");
  } else {
    Serial.print("Failed to save power alert: ");
    Serial.println(firebaseData.errorReason());
  }
}

void evaluatePowerRules(double timestamp, float power) {
  if (!Firebase.RTDB.getJSON(&firebaseData, "/rules")) {
    if (firebaseData.errorReason() != "path not exist") {
      Serial.print("Failed to read rules: ");
      Serial.println(firebaseData.errorReason());
    }
    return;
  }

  FirebaseJson rules;
  rules.setJsonData(firebaseData.jsonString());
  size_t count = rules.iteratorBegin();

  for (size_t index = 0; index < count; index++) {
    int type;
    String ruleId;
    String jsonValue;
    rules.iteratorGet(index, type, ruleId, jsonValue);
    if (ruleId.indexOf("/") >= 0) continue;

    FirebaseJson rule;
    rule.setJsonData(jsonValue);
    if (!isPowerRuleEnabled(rule) || !powerRuleMatchesRoom(rule)) continue;

    FirebaseJsonData metricData;
    FirebaseJsonData comparatorData;
    FirebaseJsonData thresholdData;
    rule.get(metricData, "metric");
    if (metricData.to<String>() != "power") continue;
    rule.get(comparatorData, "comparator");
    rule.get(thresholdData, "threshold");

    String comparator = comparatorData.to<String>();
    if (comparator.length() == 0) {
      FirebaseJsonData operatorData;
      rule.get(operatorData, "operator");
      String operatorName = operatorData.to<String>();
      comparator = operatorName == "less_than" ? "<"
        : operatorName == "equal" ? "="
        : operatorName == "greater_than" ? ">"
        : "";
    }

    if (comparator != ">" && comparator != "<" && comparator != "=") {
      Serial.printf("Skipping rule %s: invalid comparator\n", ruleId.c_str());
      continue;
    }

    float threshold = thresholdData.to<float>();
    bool triggered = comparator == "<" ? power < threshold
      : comparator == "=" ? power == threshold
      : power > threshold;

    Serial.printf(
      "Power rule %s: %.2f W %s %.2f W, triggered %s\n",
      ruleId.c_str(),
      power,
      comparator.c_str(),
      threshold,
      triggered ? "YES" : "NO"
    );
    if (triggered) savePowerAlert(ruleId, rule, power, timestamp);
  }

  rules.iteratorEnd();
}


// ======================================================
// Read PZEM and save to Firebase
// ======================================================
void savePowerReading() {

  float voltage = pzem.voltage();
  float current = pzem.current();
  float power = pzem.power();
  float energy = pzem.energy();
  float frequency = pzem.frequency();
  float pf = pzem.pf();


  // --------------------------------------
  // Check PZEM
  // --------------------------------------

  if (isnan(voltage) ||
      isnan(current) ||
      isnan(power) ||
      isnan(energy) ||
      isnan(frequency) ||
      isnan(pf)) {

    Serial.println("Failed to read PZEM-004T");

    Serial.printf(
      "V=%.2f, A=%.2f, W=%.2f, kWh=%.3f, Hz=%.1f, PF=%.2f\n",
      voltage,
      current,
      power,
      energy,
      frequency,
      pf
    );

    Serial.println(
      "Check PZEM TX/RX, GND and AC wiring"
    );

    return;
  }


  // --------------------------------------
  // Check time
  // --------------------------------------

  time_t currentTime = time(nullptr);

  if (currentTime < 1000000000) {

    Serial.println(
      "Waiting for synchronized time"
    );

    return;
  }


  // --------------------------------------
  // Timestamp
  // --------------------------------------

  double timestamp =
    static_cast<double>(currentTime) * 1000.0;


  // --------------------------------------
  // Firebase path
  // --------------------------------------

  String sensorPath =
    String("devices/") +
    DEVICE_ID +
    "/sensors/pzem";


  // ==================================================
  // Latest data
  // ==================================================

  FirebaseJson latest;

  latest.set("voltage", voltage);
  latest.set("current", current);
  latest.set("power", power);
  latest.set("energy", energy);
  latest.set("frequency", frequency);
  latest.set("powerFactor", pf);
  latest.set("relay", relayEnabled);
  latest.set("timestamp", timestamp);


  if (!Firebase.RTDB.setJSON(
        &firebaseData,
        (sensorPath + "/last").c_str(),
        &latest)) {

    Serial.print(
      "Failed to save PZEM latest data: "
    );

    Serial.println(
      firebaseData.errorReason()
    );

    return;
  }

  evaluatePowerRules(timestamp, power);


  // ==================================================
  // History
  // ==================================================

  FirebaseJson history;

  history.set("voltage", voltage);
  history.set("current", current);
  history.set("power", power);
  history.set("energy", energy);
  history.set("frequency", frequency);
  history.set("powerFactor", pf);
  history.set("relay", relayEnabled);
  history.set("timestamp", timestamp);


  if (!Firebase.RTDB.pushJSON(
        &firebaseData,
        (sensorPath + "/history").c_str(),
        &history)) {

    Serial.print(
      "Failed to save PZEM history: "
    );

    Serial.println(
      firebaseData.errorReason()
    );
  }


  // ==================================================
  // Device information
  // ==================================================

  String devicePath =
    String("devices/") + DEVICE_ID;


  Firebase.RTDB.setString(
    &firebaseData,
    (devicePath + "/name").c_str(),
    DEVICE_NAME
  );


  Firebase.RTDB.setString(
    &firebaseData,
    (devicePath + "/room").c_str(),
    DEVICE_ROOM
  );


  Firebase.RTDB.setString(
    &firebaseData,
    (devicePath + "/status").c_str(),
    "online"
  );


  // ==================================================
  // Serial output
  // ==================================================

  Serial.println();
  Serial.println("========== PZEM ==========");

  Serial.printf(
    "Voltage   : %.2f V\n",
    voltage
  );

  Serial.printf(
    "Current   : %.2f A\n",
    current
  );

  Serial.printf(
    "Power     : %.2f W\n",
    power
  );

  Serial.printf(
    "Energy    : %.3f kWh\n",
    energy
  );

  Serial.printf(
    "Frequency : %.1f Hz\n",
    frequency
  );

  Serial.printf(
    "PF        : %.2f\n",
    pf
  );

  Serial.println("==========================");
}


// ======================================================
// SETUP
// ======================================================
void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("==============================");
  Serial.println("ESP32 + PZEM + Relay + Firebase");
  Serial.println("==============================");


  // --------------------------------------
  // Relay
  // --------------------------------------

  pinMode(RELAY_PIN, OUTPUT);

  digitalWrite(
    RELAY_PIN,
    RELAY_ACTIVE_LOW ? HIGH : LOW
  );


  // --------------------------------------
  // PZEM UART2
  // --------------------------------------

  pzemSerial.begin(
    9600,
    SERIAL_8N1,
    PZEM_RX_PIN,
    PZEM_TX_PIN
  );

  Serial.println("PZEM Serial started");


  // --------------------------------------
  // WiFi
  // --------------------------------------

  connectWiFi();


  // --------------------------------------
  // NTP Time
  // --------------------------------------

  configTime(
    0,
    0,
    "pool.ntp.org",
    "time.nist.gov"
  );

  Serial.println("NTP started");


  // --------------------------------------
  // Firebase
  // --------------------------------------

  setupFirebase();
}


// ======================================================
// LOOP
// ======================================================
void loop() {

  // --------------------------------------
  // Reconnect WiFi
  // --------------------------------------

  if (WiFi.status() != WL_CONNECTED) {

    connectWiFi();
  }
  // --------------------------------------
  // Firebase not ready
  // --------------------------------------
  if (!Firebase.ready()) {

    delay(100);
    return;
  }
  if (!relayCapabilityRegistered &&
      (lastCapabilityAttemptAt == 0 ||
       millis() - lastCapabilityAttemptAt >= CONTROL_INTERVAL_MS)) {
    lastCapabilityAttemptAt = millis();
    registerRelayCapability();
  }
  // --------------------------------------
  // Relay control
  // --------------------------------------
  if (
    millis() - lastControlAt >=
    CONTROL_INTERVAL_MS ||
    lastControlAt == 0
  ) {

    lastControlAt = millis();

    readRelayCommand();
  }
  // --------------------------------------
  // PZEM reading
  // --------------------------------------
  if (
    millis() - lastReadingAt >=
    SENSOR_INTERVAL_MS ||
    lastReadingAt == 0
  ) {

    lastReadingAt = millis();

    savePowerReading();
  }
  delay(100);
}