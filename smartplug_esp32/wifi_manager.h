#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <WiFi.h>
#include "config.h"

void connectWiFi()
{
    WiFi.mode(WIFI_STA);
    WiFi.disconnect(true);
    delay(1000);

    Serial.print("Connecting WiFi");

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    while (WiFi.status() != WL_CONNECTED)
    {
        Serial.print(".");
        delay(500);
    }

    Serial.println();
    Serial.println("WiFi Connected!");
    Serial.print("IP : ");
    Serial.println(WiFi.localIP());
}

#endif