#pragma once

// Wi-Fi
#define WIFI_SSID "IMOS"
#define WIFI_PASSWORD "11559911"

// Firebase
#define FIREBASE_API_KEY "AIzaSyColQ1y1QBjCSVM9beOGh5ao8W6wDKZIso"
#define FIREBASE_DATABASE_URL "https://iot1-d86f0-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_USER_EMAIL "emp1@iot.com"
#define FIREBASE_USER_PASSWORD "123456"

// Device
#define DEVICE_ID "-P-UIjh4iFMvw5EzIJP_"
#define DEVICE_NAME "IOT ROOM1"
#define DEVICE_ROOM "Room1"

// PZEM-004T -> ESP32 DevKit V1
// PZEM TX -> GPIO16
// PZEM RX -> GPIO17
#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17

// Relay
#define RELAY_PIN 14
#define RELAY_ACTIVE_LOW true

#define SENSOR_INTERVAL_MS 60000UL
#define CONTROL_INTERVAL_MS 3000UL