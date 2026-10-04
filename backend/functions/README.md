The current IoT alert flow does not require Cloud Functions:

- The DHT22 ESP32 checks temperature and humidity rules and writes alerts
  directly to Realtime Database.
- The PZEM ESP32 checks power rules and writes alerts directly to Realtime
  Database.
- The web app listens to `/alerts` and `/rules` directly.

This keeps in-app rule alerts on the Firebase Spark plan. Do not deploy these
legacy Cloud Functions for the current alert workflow; deploying Cloud
Functions requires a billing-enabled Firebase project. The source remains here
for reference and is not used by the web app or the device alert flow.

The Firebase project must have Realtime Database and Email/Password
Authentication enabled. Realtime Database rules must allow authenticated
device accounts to read `/rules` and read/write `/alerts`, and must allow the
admin web account the appropriate reads and writes. Keep access authenticated;
do not make the database public.
