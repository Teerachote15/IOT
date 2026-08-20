import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

type SensorRecord = {
  temperature?: number;
  humidity?: number;
  timestamp?: number;
};

// Helper to create an alert entry and optionally notify via FCM topic
async function createAlert(alert: any, topic?: string) {
  const db = admin.database();
  const alertsRef = db.ref('/alerts');
  const newAlertRef = alertsRef.push();
  await newAlertRef.set(alert);

  if (topic) {
    const payload: admin.messaging.Message = {
      notification: {
        title: alert.title || `Alert: ${alert.metric}`,
        body: alert.body || `${alert.deviceId} ${alert.metric}=${alert.value}`,
      },
      topic,
    };
    try {
      await admin.messaging().send(payload);
    } catch (e) {
      console.error('FCM send error', e);
    }
  }
  return newAlertRef.key;
}

// Trigger: when device last values are written to RTDB at /devices/{deviceId}/last
export const onSensorWrite = functions.database
  .ref('/devices/{deviceId}/last')
  .onWrite(async (change, ctx) => {
    const deviceId = ctx.params.deviceId as string;
    const after = change.after.val() as SensorRecord | null;
    if (!after) return null;

    const db = admin.database();
    const rulesSnap = await db.ref('/rules').once('value');
    const rules = rulesSnap.val() || {};
    const now = Date.now();
    const writes: Promise<any>[] = [];

    Object.keys(rules).forEach(ruleId => {
      const r = rules[ruleId];
      if (!r || !r.metric) return;
      const metricVal = r.metric === 'temperature' ? after.temperature : after.humidity;
      if (metricVal == null) return;
      const comparator = r.comparator || '>';
      const triggered = comparator === '>' ? metricVal > r.threshold : metricVal < r.threshold;
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
export const markAlertRead = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
    const { alertId, uid, read } = req.body;
    if (!alertId || !uid) { res.status(400).send('missing alertId or uid'); return; }

    const db = admin.database();
    await db.ref(`/user-alerts/${uid}/${alertId}`).set({ read: !!read, readAt: read ? Date.now() : null });
    res.status(200).send('ok');
    return;
  } catch (e) {
    console.error(e);
    res.status(500).send('error');
    return;
  }
});

// HTTP Callable for admin to manage rules (simple example)
export const addOrUpdateRule = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
    const rule = req.body;
    if (!rule || !rule.metric) { res.status(400).send('invalid rule'); return; }
    const db = admin.database();
    const rulesRef = db.ref('/rules');
    if (rule.id) {
      await rulesRef.child(rule.id).set(rule);
      res.status(200).send({ ok: true, id: rule.id });
      return;
    } else {
      const newRef = rulesRef.push();
      await newRef.set(rule);
      res.status(200).send({ ok: true, id: newRef.key });
      return;
    }
  } catch (e) {
    console.error(e);
    res.status(500).send('error');
    return;
  }
});
