# NodeMCU ESP8266 + PZEM-004T + Relay

Install these Arduino IDE libraries:

- Firebase Arduino Client Library for ESP8266 and ESP32 by Mobizt v4.x
- PZEM-004T v30 library providing `PZEM004Tv30.h`

The sketch uses `ESP8266WiFi.h`, `SoftwareSerial.h`, `Firebase_ESP_Client.h`, and `PZEM004Tv30.h`.

Default low-voltage wiring:

- PZEM TX -> NodeMCU D6 / GPIO12
- PZEM RX -> NodeMCU D7 / GPIO13
- PZEM GND -> NodeMCU GND
- Relay IN -> NodeMCU D5 / GPIO14

If the relay logic is reversed, change `RELAY_ACTIVE_LOW` in `config.h` to `false`.

This controller uses the same device ID as DHT22 and writes only to:

```text
devices/{DEVICE_ID}/sensors/pzem/last
devices/{DEVICE_ID}/sensors/pzem/history/{generatedId}
```

It reads the web switch command from:

```text
devices/{DEVICE_ID}/enabled
```

Open `pzem004t_relay.ino` in Arduino IDE, edit `config.h`, select the ESP32 board and COM port, then upload.

PZEM-004T and relay mains wiring can cause severe injury or death. Test the serial and relay-control side at low voltage first and have a qualified electrician handle AC mains wiring.
