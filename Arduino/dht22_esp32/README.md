# ESP32 + DHT22 Firebase Sensor

## Wiring

- DHT22 VCC -> ESP32 3V3
- DHT22 GND -> ESP32 GND
- DHT22 DATA -> ESP32 GPIO 4
- Add a 4.7k-10k pull-up resistor between DATA and 3V3 when using a bare DHT22 sensor.

## Arduino IDE libraries

Install these libraries from the Arduino Library Manager:

1. DHT sensor library by Adafruit
2. Adafruit Unified Sensor
3. Firebase Arduino Client Library for ESP8266 and ESP32 by Mobizt

Select an ESP32 board, for example `DOIT ESP32 DEVKIT V1`.

## Configuration

Open `config.h` and replace:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `FIREBASE_API_KEY`
- `FIREBASE_USER_EMAIL`
- `FIREBASE_USER_PASSWORD`

The Firebase account must exist in Authentication with Email/Password enabled. Use a dedicated device account rather than the administrator account.

## Firebase data

The sketch writes:

- `devices/{DEVICE_ID}/name`
- `devices/{DEVICE_ID}/room`
- `devices/{DEVICE_ID}/status`
- `devices/{DEVICE_ID}/enabled`
- `devices/{DEVICE_ID}/sensors/dht22/last`
- `devices/{DEVICE_ID}/sensors/dht22/history/{generatedId}`

The future PZEM controller should use the same `DEVICE_ID`, but write only to
`devices/{DEVICE_ID}/sensors/pzem/last` and
`devices/{DEVICE_ID}/sensors/pzem/history/{generatedId}`. It must not replace the
whole `devices/{DEVICE_ID}` node or the DHT22 values.

The web history page reads the nested DHT22 history path. The device sends one reading every 60 seconds.

## Upload

1. Open `dht22_esp32.ino` in Arduino IDE.
2. Update `config.h`.
3. Select the ESP32 board and COM port.
4. Upload and open Serial Monitor at `115200` baud.
