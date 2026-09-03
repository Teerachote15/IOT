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

bool relayEnabled = false;


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

  Firebase.RTDB.setBool(
    &firebaseData,
    (devicePath + "/enabled").c_str(),
    enabled
  );

  Firebase.RTDB.setString(
    &firebaseData,
    (devicePath + "/status").c_str(),
    enabled ? "online" : "offline"
  );

  Serial.print("Relay: ");
  Serial.println(enabled ? "ON" : "OFF");
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
    relayEnabled ? "online" : "offline"
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