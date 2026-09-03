"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.addOrUpdateRule = exports.markAlertRead = exports.onSensorWrite = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// Helper to create an alert entry and optionally notify via FCM topic
async function createAlert(alert, topic) {
    const db = admin.database();
    const alertsRef = db.ref('/alerts');
    const newAlertRef = alertsRef.push();
    await newAlertRef.set(alert);
    if (topic) {
        const payload = {
            notification: {
                title: alert.title || `Alert: ${alert.metric}`,
                body: alert.body || `${alert.deviceId} ${alert.metric}=${alert.value}`,
            },
            topic,
        };
        try {
            await admin.messaging().send(payload);
        }
        catch (e) {
            console.error('FCM send error', e);
        }
    }
    return newAlertRef.key;
}
// Trigger: when device last values are written to RTDB at /devices/{deviceId}/last
exports.onSensorWrite = functions.database
    .ref('/devices/{deviceId}/last')
    .onWrite(async (change, ctx) => {
    const deviceId = ctx.params.deviceId;
    const after = change.after.val();
    if (!after)
        return null;
    const db = admin.database();
    const deviceRoomSnap = await db.ref(`/devices/${deviceId}/room`).once('value');
    const deviceRoom = deviceRoomSnap.val();
    const rulesSnap = await db.ref('/rules').once('value');
    const rules = rulesSnap.val() || {};
    const now = Date.now();
    const writes = [];
    Object.keys(rules).forEach(ruleId => {
        const r = rules[ruleId];
        if (!r || !r.metric || r.enabled === false)
            return;
        if (Array.isArray(r.rooms) && r.rooms.length > 0 && !r.rooms.includes(deviceRoom))
            return;
        const metricVal = r.metric === 'temperature'
            ? after.temperature
            : r.metric === 'humidity'
                ? after.humidity
                : undefined;
        if (metricVal == null)
            return;
        const comparator = r.comparator || '>';
        const triggered = comparator === '>'
            ? metricVal > r.threshold
            : comparator === '<'
                ? metricVal < r.threshold
                : metricVal === r.threshold;
        if (triggered) {
            const alert = {
                deviceId,
                ruleId,
                metric: r.metric,
                value: metricVal,
                threshold: r.threshold,
                severity: r.severity || 'medium',
                timestamp: now,
                resolved: false,
                title: r.title || `${r.metric} threshold exceeded`,
                body: `${r.displayName || deviceId} ${r.metric}=${metricVal}`,
            };
            writes.push(createAlert(alert, r.topic));
        }
    });
    return Promise.all(writes);
});
// HTTP function: mark an alert read/unread for a user
exports.markAlertRead = functions.https.onRequest(async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        const { alertId, uid, read } = req.body;
        if (!alertId || !uid) {
            res.status(400).send('missing alertId or uid');
            return;
        }
        const db = admin.database();
        await db.ref(`/user-alerts/${uid}/${alertId}`).set({ read: !!read, readAt: read ? Date.now() : null });
        res.status(200).send('ok');
        return;
    }
    catch (e) {
        console.error(e);
        res.status(500).send('error');
        return;
    }
});
// HTTP Callable for admin to manage rules (simple example)
exports.addOrUpdateRule = functions.https.onRequest(async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        const rule = req.body;
        if (!rule || !rule.metric) {
            res.status(400).send('invalid rule');
            return;
        }
        const db = admin.database();
        const rulesRef = db.ref('/rules');
        if (rule.id) {
            await rulesRef.child(rule.id).set(rule);
            res.status(200).send({ ok: true, id: rule.id });
            return;
        }
        else {
            const newRef = rulesRef.push();
            await newRef.set(rule);
            res.status(200).send({ ok: true, id: newRef.key });
            return;
        }
    }
    catch (e) {
        console.error(e);
        res.status(500).send('error');
        return;
    }
});
//# sourceMappingURL=index.js.map