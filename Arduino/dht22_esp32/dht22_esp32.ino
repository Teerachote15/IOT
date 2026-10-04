#include <ESP8266WiFi.h>
#include <time.h>
#include <DHT.h>
#include <Firebase_ESP_Client.h>
#include "config.h"

FirebaseData firebaseData;
FirebaseAuth firebaseAuth;
FirebaseConfig firebaseConfig;
DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastReadingAt = 0;
unsigned long lastRuleCheckAt = 0;
float latestTemperature = NAN;
float latestHumidity = NAN;

void connectToWiFi() {
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Wi-Fi connected. IP: ");
  Serial.println(WiFi.localIP());
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

void setupFirebase() {
  firebaseConfig.api_key = FIREBASE_API_KEY;
  firebaseConfig.database_url = FIREBASE_DATABASE_URL;
  firebaseAuth.user.email = FIREBASE_USER_EMAIL;
  firebaseAuth.user.password = FIREBASE_USER_PASSWORD;

  Firebase.begin(&firebaseConfig, &firebaseAuth);
  Firebase.reconnectWiFi(true);
}

bool writeSensorReading(float temperature, float humidity) {
  String devicePath = String("devices/") + DEVICE_ID;
  String lastPath = devicePath + "/sensors/dht22/last";
  String historyPath = devicePath + "/sensors/dht22/history";
  double timestamp = static_cast<double>(time(nullptr)) * 1000.0;

  if (timestamp < 1000000000000.0) {
    Serial.println("Time is not synchronized yet");
    return false;
  }

  FirebaseJson lastJson;
  lastJson.set("temperature", temperature);
  lastJson.set("humidity", humidity);
  lastJson.set("power", 0);
  lastJson.set("timestamp", timestamp);

  if (!Firebase.RTDB.setJSON(&firebaseData, lastPath.c_str(), &lastJson)) {
    Serial.print("Failed to write latest reading: ");
    Serial.println(firebaseData.errorReason());
    return false;
  }

  FirebaseJson historyJson;
  historyJson.set("temperature", temperature);
  historyJson.set("humidity", humidity);
  historyJson.set("power", 0);
  historyJson.set("timestamp", timestamp);

  if (!Firebase.RTDB.pushJSON(
        &firebaseData,
        historyPath.c_str(),
        &historyJson)) {
    Serial.print("Failed to write history: ");
    Serial.println(firebaseData.errorReason());
    return false;
  }

  if (!Firebase.RTDB.setString(
        &firebaseData,
        (devicePath + "/name").c_str(),
        DEVICE_NAME)) {
    Serial.print("Failed to write device name: ");
    Serial.println(firebaseData.errorReason());
    return false;
  }
  if (!Firebase.RTDB.setString(
        &firebaseData,
        (devicePath + "/room").c_str(),
        DEVICE_ROOM)) {
    Serial.print("Failed to write device room: ");
    Serial.println(firebaseData.errorReason());
    return false;
  }
  if (!Firebase.RTDB.setString(
        &firebaseData,
        (devicePath + "/status").c_str(),
        "online")) {
    Serial.print("Failed to write device status: ");
    Serial.println(firebaseData.errorReason());
    return false;
  }
  Serial.println("Sensor reading sent to Firebase");
  return true;
}

bool isRuleEnabled(FirebaseJson &rule) {
  FirebaseJsonData enabledData;
  if (!rule.get(enabledData, "enabled")) return true;
  if (enabledData.typeNum == FirebaseJson::JSON_BOOL) return enabledData.boolValue;
  return enabledData.stringValue != "false";
}

bool ruleMatchesRoom(FirebaseJson &rule) {
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
    String room = value;
    room.replace("\"", "");
    if (room == DEVICE_ROOM) matches = true;
  }

  rule.iteratorEnd();
  return !hasRooms || matches;
}

void upsertAlert(const String &ruleId, FirebaseJson &rule, float value, double timestamp) {
  FirebaseJson alert;
  FirebaseJsonData metricData;
  FirebaseJsonData thresholdData;
  rule.get(metricData, "metric");
  rule.get(thresholdData, "threshold");
  String metric = metricData.to<String>();
  float threshold = thresholdData.to<float>();

  alert.set("deviceId", DEVICE_ID);
  alert.set("deviceName", DEVICE_NAME);
  alert.set("room", DEVICE_ROOM);
  alert.set("ruleId", ruleId);
  alert.set("metric", metric);
  alert.set("value", value);
  alert.set("threshold", threshold);
  alert.set("severity", "warning");
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
  }

  bool success = existingAlertPath.length() > 0
    ? Firebase.RTDB.setJSON(&firebaseData, existingAlertPath.c_str(), &alert)
    : Firebase.RTDB.pushJSON(&firebaseData, "/alerts", &alert);

  if (success) {
    Serial.println(
      existingAlertPath.length() > 0
        ? "Alert updated in Firebase"
        : "Alert created in Firebase"
    );
  } else {
    Serial.print("Failed to upsert alert: ");
    Serial.println(firebaseData.errorReason());
  }
}

void evaluateRules() {
  if (!Firebase.RTDB.getJSON(&firebaseData, "/rules")) {
    Serial.print("Failed to read rules: ");
    Serial.println(firebaseData.errorReason());
    return;
  }

  FirebaseJson rules;
  rules.setJsonData(firebaseData.jsonString());
  size_t count = rules.iteratorBegin();
  time_t currentTime = time(nullptr);
  if (currentTime < 1000000000) {
    rules.iteratorEnd();
    Serial.println("Waiting for synchronized time before evaluating rules");
    return;
  }
  double timestamp = static_cast<double>(currentTime) * 1000.0;

  for (size_t index = 0; index < count; index++) {
    int type;
    String key;
    String jsonValue;
    rules.iteratorGet(index, type, key, jsonValue);
    if (key.indexOf("/") >= 0) continue;

    FirebaseJson rule;
    rule.setJsonData(jsonValue);
    if (!isRuleEnabled(rule) || !ruleMatchesRoom(rule)) continue;

    FirebaseJsonData metricData;
    FirebaseJsonData comparatorData;
    FirebaseJsonData thresholdData;
    rule.get(metricData, "metric");
    rule.get(comparatorData, "comparator");
    rule.get(thresholdData, "threshold");
    String metric = metricData.to<String>();
    String comparator = comparatorData.to<String>();
    if (comparator.length() == 0) {
      FirebaseJsonData operatorData;
      rule.get(operatorData, "operator");
      String operatorName = operatorData.to<String>();
      comparator = operatorName == "less_than" ? "<" : operatorName == "equal" ? "=" : ">";
    }

    float threshold = thresholdData.to<float>();
    float sensorValue = metric == "temperature" ? latestTemperature : metric == "humidity" ? latestHumidity : 0;
    if (metric == "power") continue;

    bool triggered = comparator == "<" ? sensorValue < threshold : comparator == "=" ? sensorValue == threshold : sensorValue > threshold;
    Serial.printf("Rule %s: %s %s %.2f, value %.2f, triggered %s\n", key.c_str(), metric.c_str(), comparator.c_str(), threshold, sensorValue, triggered ? "YES" : "NO");
    if (!triggered) continue;

    upsertAlert(key, rule, sensorValue, timestamp);
  }

  rules.iteratorEnd();
}

void readAndSendSensor() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read DHT22");
    return;
  }

  latestTemperature = temperature;
  latestHumidity = humidity;

  Serial.print("Temperature: ");
  Serial.print(temperature, 1);
  Serial.print(" C, Humidity: ");
  Serial.print(humidity, 1);
  Serial.println(" %");

  writeSensorReading(temperature, humidity);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  dht.begin();
  connectToWiFi();
  setupFirebase();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  if (Firebase.ready() && (lastReadingAt == 0 || millis() - lastReadingAt >= SENSOR_INTERVAL_MS)) {
    lastReadingAt = millis();
    readAndSendSensor();
  }

  if (Firebase.ready() && (lastRuleCheckAt == 0 || millis() - lastRuleCheckAt >= 10000UL)) {
    lastRuleCheckAt = millis();
    evaluateRules();
  }

  delay(100);
}
