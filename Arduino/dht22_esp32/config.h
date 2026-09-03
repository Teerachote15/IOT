#pragma once

// Wi-Fi settings
#define WIFI_SSID "IMOS"
#define WIFI_PASSWORD "11559911"

// Firebase project settings
#define FIREBASE_API_KEY "AIzaSyColQ1y1QBjCSVM9beOGh5ao8W6wDKZIso"
#define FIREBASE_DATABASE_URL "https://iot1-d86f0-default-rtdb.asia-southeast1.firebasedatabase.app"

// Firebase Authentication account for this device.
// Enable Email/Password in Firebase Authentication first.
#define FIREBASE_USER_EMAIL "emp1@iot.com"
#define FIREBASE_USER_PASSWORD "123456"

// Device identity and DHT22 wiring
#define DEVICE_ID "-P-UIjh4iFMvw5EzIJP_"
#define DEVICE_NAME "IOT ROOM1"
#define DEVICE_ROOM "Room1"
#define DHT_PIN 4
#define DHT_TYPE DHT22

// Send one reading every 60 seconds.
#define SENSOR_INTERVAL_MS 60000UL
