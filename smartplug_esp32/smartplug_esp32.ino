#include "config.h"
#include "wifi_manager.h"
#include "sensor_manager.h"

#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

String idToken = "";

void firebaseSignIn()
{
    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient https;
    String url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + String(API_KEY);

    StaticJsonDocument<256> doc;

    String payload;
    {
        DynamicJsonDocument p(256);
        p["email"] = USER_EMAIL;
        p["password"] = USER_PASSWORD;
        p["returnSecureToken"] = true;
        serializeJson(p, payload);
    }

    if (https.begin(client, url))
    {
        https.addHeader("Content-Type", "application/json");
        int httpCode = https.POST(payload);
        if (httpCode == HTTP_CODE_OK)
        {
            String resp = https.getString();
            DeserializationError err = deserializeJson(doc, resp);
            if (!err && doc.containsKey("idToken"))
            {
                idToken = doc["idToken"].as<String>();
                Serial.println("Firebase sign-in success");
            }
            else
            {
                Serial.println("Failed parse sign-in response");
            }
        }
        else
        {
            Serial.print("Sign-in failed, code: ");
            Serial.println(httpCode);
        }
        https.end();
    }
}

void sendSensorData()
{
    if (idToken == "")
    {
        firebaseSignIn();
        if (idToken == "")
            return;
    }

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient https;

    String url = String(DATABASE_URL) + "/devices/" + String(DEVICE_ID) + "/last.json?auth=" + idToken;

    DynamicJsonDocument payload(256);
    payload["temperature"] = temperature;
    payload["humidity"] = humidity;
    payload["ts"] = millis();

    String body;
    serializeJson(payload, body);

    if (https.begin(client, url))
    {
        https.addHeader("Content-Type", "application/json");
        int httpCode = https.PUT(body);
        if (httpCode == HTTP_CODE_OK)
        {
            Serial.println("Sent sensor data to RTDB");
        }
        else
        {
            Serial.print("Send data failed, code: ");
            Serial.println(httpCode);
            if (httpCode == 401)
            {
                // token expired or invalid
                idToken = "";
            }
        }
        https.end();
    }
}

void checkRelayCommand()
{
    if (idToken == "")
        return;

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient https;

    String url = String(DATABASE_URL) + "/devices/" + String(DEVICE_ID) + "/command.json?auth=" + idToken;

    if (https.begin(client, url))
    {
        int httpCode = https.GET();
        if (httpCode == HTTP_CODE_OK)
        {
            String resp = https.getString();
            if (resp.length() > 0 && resp != "null")
            {
                StaticJsonDocument<128> doc;
                DeserializationError err = deserializeJson(doc, resp);
                if (!err && doc.containsKey("action"))
                {
                    String action = doc["action"].as<String>();
                    if (action == "on")
                        digitalWrite(RELAY_PIN, HIGH);
                    else if (action == "off")
                        digitalWrite(RELAY_PIN, LOW);

                    // acknowledge
                    String ackUrl = String(DATABASE_URL) + "/devices/" + String(DEVICE_ID) + "/last_command.json?auth=" + idToken;
                    DynamicJsonDocument ack(128);
                    ack["action"] = action;
                    ack["ts"] = millis();
                    String ackBody;
                    serializeJson(ack, ackBody);
                    HTTPClient https2;
                    if (https2.begin(client, ackUrl))
                    {
                        https2.addHeader("Content-Type", "application/json");
                        https2.PUT(ackBody);
                        https2.end();
                    }
                }
            }
        }
        else if (httpCode == 401)
        {
            idToken = ""; // force re-auth
        }
        https.end();
    }
}

void setup()
{
    Serial.begin(115200);

    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);

    connectWiFi();

    initSensor();

    // try sign-in at startup
    firebaseSignIn();
}

unsigned long lastSend = 0;
const unsigned long sendInterval = 5000;

void loop()
{
    if (readSensor())
    {
        Serial.print("Temperature : ");
        Serial.println(temperature);

        Serial.print("Humidity : ");
        Serial.println(humidity);

        if (millis() - lastSend > sendInterval)
        {
            sendSensorData();
            lastSend = millis();
        }
    }
    else
    {
        Serial.println("Read Sensor Failed");
    }

    checkRelayCommand();

    delay(500);
}