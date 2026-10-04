# ESP32 + PZEM-004T + Relay

Install these Arduino IDE libraries:

- Firebase Arduino Client Library for ESP8266 and ESP32 by Mobizt
- PZEM-004T v30 library providing `PZEM004Tv30.h`

The sketch uses `WiFi.h`, `Firebase_ESP_Client.h`, and `PZEM004Tv30.h`.

Default low-voltage wiring:

- PZEM TX -> ESP32 GPIO16 (UART2 RX)
- PZEM RX -> ESP32 GPIO17 (UART2 TX)
- PZEM GND -> ESP32 GND
- Relay IN -> ESP32 GPIO14
- Relay VCC/GND -> as specified by the relay module

The web app's Devices page writes the requested outlet state to
`devices/{DEVICE_ID}/enabled`. The ESP32 polls this value every 3 seconds,
switches the relay, and reports the resulting command state to
`devices/{DEVICE_ID}/relayState`. It also registers
`devices/{DEVICE_ID}/capabilities/relay` so the web app can show the outlet
switch. Set `RELAY_ACTIVE_LOW` in `config.h` to `false` if the relay module
uses active-high logic.

The ESP32 also reads `/rules` after each valid PZEM reading and writes matching
power alerts directly to `/alerts`. Power rule thresholds are in watts (W).
This in-device alert processing does not require deploying Firebase Cloud
Functions or upgrading the Firebase plan.

This controller uses the same device ID as DHT22. Its PZEM measurements are
stored at:

```text
devices/{DEVICE_ID}/sensors/pzem/last
devices/{DEVICE_ID}/sensors/pzem/history/{generatedId}
```

It reads the web switch command from:

```text
devices/{DEVICE_ID}/enabled
```

Open `pzem004t_relay.ino` in Arduino IDE, configure `config.h`, select an ESP32
board and COM port, then upload.

PZEM-004T and relay mains wiring can cause severe injury or death. Test the serial and relay-control side at low voltage first and have a qualified electrician handle AC mains wiring.
