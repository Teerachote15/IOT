#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <DHT.h>
#include "config.h"

DHT dht(DHT_PIN, DHT_TYPE);

float temperature = 0;
float humidity = 0;

void initSensor()
{
    dht.begin();
}

bool readSensor()
{
    temperature = dht.readTemperature();
    humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity))
        return false;

    return true;
}

#endif