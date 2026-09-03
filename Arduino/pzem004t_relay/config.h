#pragma once

// Wi-Fi
#define WIFI_SSID "IMOS"
#define WIFI_PASSWORD "11559911"

// Firebase
#define FIREBASE_API_KEY "AIzaSyColQ1y1QBjCSVM9beOGh5ao8W6wDKZIso"
#define FIREBASE_DATABASE_URL "https://iot1-d86f0-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_USER_EMAIL "emp1@iot.com"
#define FIREBASE_USER_PASSWORD "123456"

// Same device ID as the DHT22 controller.
#define DEVICE_ID "-P-UIjh4iFMvw5EzIJP_"
#define DEVICE_NAME "IOT ROOM1"
#define DEVICE_ROOM "Room1"

// NodeMCU ESP8266 SoftwareSerial pins connected to PZEM TX/RX.
// D6/D7 are used instead of D0 because GPIO16 is not a reliable UART RX pin.
#define PZEM_RX_PIN 12
#define PZEM_TX_PIN 13

// Relay control pin and electrical logic.
#define RELAY_PIN 14
#define RELAY_ACTIVE_LOW true

#define SENSOR_INTERVAL_MS 60000UL
#define CONTROL_INTERVAL_MS 3000UL
