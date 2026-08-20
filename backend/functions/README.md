Firebase Functions (moved into backend)

This folder contains the Cloud Functions code for the IoT project. Use the same build/deploy steps as before but run them here.

Quick start:
```
cd backend/functions
npm install
npm run build
firebase deploy --only functions --project iot1-d86f0
```

To run locally with emulator:
```
firebase emulators:start --only functions,database --project iot1-d86f0
```
