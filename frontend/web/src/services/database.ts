import { database } from '../firebase';
import {
  ref,
  onValue,
  get,
  push,
  set,
  update,
  remove,
  runTransaction,
  limitToLast,
  orderByChild,
  query,
} from 'firebase/database';

export interface SensorData {
  temperature: number;
  humidity: number;
  power: number;
  timestamp: number;
}

export interface DeviceHistoryPoint {
  temperature?: number;
  humidity?: number;
  power?: number;
  energy?: number;
  timestamp?: number;
}

export interface SensorSnapshot {
  temperature?: number;
  humidity?: number;
  voltage?: number;
  current?: number;
  power?: number;
  energy?: number;
  timestamp?: number;
}

export interface Device {
  id: string;
  name: string;
  room: string;
  roomId?: string;
  building?: string;
  status: 'online' | 'offline' | 'problem';
  enabled?: boolean;
  hasRelay: boolean;
  temperature: number;
  humidity: number;
  power: number;
  lastSeen: number;
  history?: Record<string, DeviceHistoryPoint>;
  sensors?: {
    dht22?: SensorSnapshot;
    pzem?: SensorSnapshot;
  };
}

export const DEVICE_STALE_AFTER_MS = 2 * 60 * 1000;

export function isDeviceDataStale(device: Pick<Device, 'lastSeen'>, now = Date.now()) {
  return !device.lastSeen ||
    now - device.lastSeen > DEVICE_STALE_AFTER_MS ||
    device.lastSeen > now + 60_000;
}

export interface DeviceRecord {
  id?: string;
  name: string;
  room: string;
  roomId?: string;
  building?: string;
  status?: 'online' | 'offline' | 'problem';
  enabled?: boolean;
  last?: {
    temperature?: number;
    humidity?: number;
    power?: number;
    timestamp?: number;
  };
}

export const createDeviceRecord = async (device: Omit<DeviceRecord, 'id' | 'name'>) => {
  const devicesSnapshot = await get(ref(database, 'devices'));
  let highestExistingId = 0;
  devicesSnapshot.forEach((deviceSnapshot) => {
    const identifiers = [deviceSnapshot.key, deviceSnapshot.child('name').val()];
    identifiers.forEach((identifier) => {
      if (typeof identifier !== 'string') return;
      const match = /^IOT(\d+)$/i.exec(identifier);
      if (match) highestExistingId = Math.max(highestExistingId, Number(match[1]));
    });
  });

  const sequenceResult = await runTransaction(
    ref(database, 'counters/deviceSequence'),
    (currentValue) => Math.max(Number(currentValue) || 0, highestExistingId) + 1,
    { applyLocally: false }
  );
  if (!sequenceResult.committed) {
    throw new Error('ไม่สามารถจอง ID อุปกรณ์ได้');
  }

  const name = `IOT${String(sequenceResult.snapshot.val()).padStart(3, '0')}`;
  const devicePayload = {
    ...device,
    name,
    status: device.status || 'online',
  };
  await set(ref(database, `devices/${name}`), devicePayload);
  return { id: name, ...devicePayload } as DeviceRecord;
};

export const updateDeviceRecord = async (id: string, device: Partial<DeviceRecord>) => {
  const deviceRef = ref(database, `devices/${id}`);
  await update(deviceRef, device);
};

export const deleteDeviceRecord = async (id: string) => {
  const deviceRef = ref(database, `devices/${id}`);
  await remove(deviceRef);
};

// ดึงข้อมูลเซนเซอร์ทั้งหมด
export const subscribeToSensorData = (
  deviceId: string,
  callback: (data: SensorData) => void,
  errorCallback?: (error: Error) => void
) => {
  try {
    const sensorRef = ref(database, `devices/${deviceId}/sensors/dht22/last`);
    const unsubscribe = onValue(
      sensorRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val());
        }
      },
      (error) => {
        if (errorCallback) errorCallback(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    if (errorCallback) errorCallback(error as Error);
    return () => {};
  }
};

// ดึงข้อมูลอุปกรณ์ทั้งหมด
export const subscribeToAllDevices = (
  callback: (devices: Device[]) => void,
  errorCallback?: (error: Error) => void
) => {
  try {
    const devicesRef = ref(database, 'devices');
    const unsubscribe = onValue(
      devicesRef,
      (snapshot) => {
        const devices: Device[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const deviceId = childSnapshot.key || '';
            const data = childSnapshot.val();
            if (!data || typeof data !== 'object') return;
            const dhtLast = data.sensors?.dht22?.last || data.last || {};
            const pzemLast = data.sensors?.pzem?.last || {};
            const dhtHistory = data.sensors?.dht22?.history || data.history || {};
            const pzemHistory = data.sensors?.pzem?.history || {};
            const history = {
              ...dhtHistory,
              ...Object.fromEntries(
                Object.entries(pzemHistory).map(([key, value]) => [`pzem_${key}`, value])
              ),
            };
            const resolvedStatus =
              (data.status as 'online' | 'offline' | 'problem') ||
              (dhtLast.temperature ? 'online' : 'offline');

            devices.push({
              id: deviceId,
              name: data.name || `Device ${deviceId}`,
              room: data.room || 'Unknown',
              roomId: data.roomId,
              building: data.building,
              status: resolvedStatus,
              enabled: data.enabled === true,
              hasRelay: data.capabilities?.relay === true || Boolean(data.sensors?.pzem),
              temperature: dhtLast.temperature || 0,
              humidity: dhtLast.humidity || 0,
              power: pzemLast.power || dhtLast.power || 0,
              lastSeen: Math.max(dhtLast.timestamp || 0, pzemLast.timestamp || 0),
              history,
              sensors: {
                dht22: dhtLast,
                pzem: pzemLast,
              },
            });
          });
        }
        callback(devices);
      },
      (error) => {
        if (errorCallback) errorCallback(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    if (errorCallback) errorCallback(error as Error);
    return () => {};
  }
};

// ดึงค่าเฉลี่ยของเซนเซอร์
export const getAverageSensorData = async (
  deviceIds: string[]
): Promise<{ temperature: number; humidity: number; power: number }> => {
  try {
    let totalTemp = 0;
    let totalHumidity = 0;
    let totalPower = 0;

    for (const deviceId of deviceIds) {
      const deviceRef = ref(database, `devices/${deviceId}`);
      const snapshot = await get(deviceRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const dht = data.sensors?.dht22?.last || data.last || {};
        const pzem = data.sensors?.pzem?.last || {};
        totalTemp += dht.temperature || 0;
        totalHumidity += dht.humidity || 0;
        totalPower += pzem.power || 0;
      }
    }

    const count = deviceIds.length || 1;
    return {
      temperature: parseFloat((totalTemp / count).toFixed(1)),
      humidity: parseFloat((totalHumidity / count).toFixed(1)),
      power: parseFloat((totalPower / count).toFixed(1)),
    };
  } catch (error) {
    console.error('Error getting average sensor data:', error);
    return { temperature: 0, humidity: 0, power: 0 };
  }
};

// ดึงประวัติอุณหภูมิ
export const getTemperatureHistory = async (
  deviceId: string,
  hours: number = 24
): Promise<Array<{ time: string; temp: number }>> => {
  try {
    const nestedHistoryRef = ref(database, `devices/${deviceId}/sensors/dht22/history`);
    const snapshot = await get(nestedHistoryRef);
    const legacySnapshot = snapshot.exists()
      ? snapshot
      : await get(ref(database, `devices/${deviceId}/history`));
    
    if (legacySnapshot.exists()) {
      const history: Array<{ time: string; temp: number }> = [];
      const data = legacySnapshot.val();
      
      Object.values(data).forEach((entry: any) => {
        if (entry.temperature) {
          const date = new Date(entry.timestamp);
          history.push({
            time: date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            temp: entry.temperature,
          });
        }
      });
      
      return history.slice(-hours);
    }
    return [];
  } catch (error) {
    console.error('Error getting temperature history:', error);
    return [];
  }
};

// ---------------- Users CRUD ----------------
export interface UserRecord {
  id?: string;
  name: string;
  email?: string;
  role?: string;
  rooms?: string[];
}

const normalizeUserRecord = (id: string | undefined, value: unknown): UserRecord => {
  const record =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  const rawRooms = record.rooms;
  const rooms = Array.isArray(rawRooms)
    ? rawRooms.filter((room): room is string => typeof room === 'string')
    : rawRooms && typeof rawRooms === 'object'
      ? Object.values(rawRooms).filter(
          (room): room is string => typeof room === 'string'
        )
      : [];

  return {
    id,
    name:
      typeof record.name === 'string' && record.name.trim()
        ? record.name.trim()
        : 'ไม่ระบุชื่อ',
    email: typeof record.email === 'string' ? record.email : undefined,
    role: typeof record.role === 'string' ? record.role : 'พนักงาน',
    rooms,
  };
};

export const subscribeToUsers = (
  callback: (users: UserRecord[]) => void,
  errorCallback?: (err: Error) => void
) => {
  try {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const list: UserRecord[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            list.push(normalizeUserRecord(child.key || undefined, child.val()));
          });
        }
        callback(list);
      },
      (err) => {
        if (errorCallback) errorCallback(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (errorCallback) errorCallback(err as Error);
    return () => {};
  }
};

export const createUserRecord = async (user: UserRecord) => {
  const usersRef = ref(database, 'users');
  const newRef = await push(usersRef);
  await set(newRef, user);
  return { id: newRef.key, ...user } as UserRecord;
};

export const updateUserRecord = async (id: string, user: Partial<UserRecord>) => {
  const userRef = ref(database, `users/${id}`);
  await update(userRef, user);
};

export const deleteUserRecord = async (id: string) => {
  const userRef = ref(database, `users/${id}`);
  await remove(userRef);
};

// ---------------- Rooms CRUD ----------------
export interface RoomRecord {
  id?: string;
  name: string;
  building?: string;
  floor?: string;
  createdAt?: number;
}

export const subscribeToRooms = (
  callback: (rooms: RoomRecord[]) => void,
  errorCallback?: (err: Error) => void
) => {
  try {
    const roomsRef = ref(database, 'rooms');
    const unsubscribe = onValue(
      roomsRef,
      (snapshot) => {
        const list: RoomRecord[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const val = child.val();
            list.push({ id: child.key || undefined, ...val });
          });
        }
        callback(list);
      },
      (err) => {
        if (errorCallback) errorCallback(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (errorCallback) errorCallback(err as Error);
    return () => {};
  }
};

export const createRoomRecord = async (room: RoomRecord) => {
  const roomsRef = ref(database, 'rooms');
  const newRef = await push(roomsRef);
  await set(newRef, {
    ...room,
    createdAt: Date.now(),
  });
  return { id: newRef.key, ...room, createdAt: Date.now() } as RoomRecord;
};

export const updateRoomRecord = async (
  id: string,
  room: Partial<RoomRecord>,
  previousName?: string
) => {
  const updates: Record<string, unknown> = {};
  Object.entries(room).forEach(([key, value]) => {
    if (value !== undefined) updates[`rooms/${id}/${key}`] = value;
  });

  if (room.name !== undefined || room.building !== undefined) {
    const devicesSnapshot = await get(ref(database, 'devices'));
    devicesSnapshot.forEach((deviceSnapshot) => {
      const deviceRoomId = deviceSnapshot.child('roomId').val();
      const legacyRoomMatch =
        !deviceRoomId && previousName && deviceSnapshot.child('room').val() === previousName;
      if (deviceRoomId !== id && !legacyRoomMatch) return;
      const devicePath = `devices/${deviceSnapshot.key}`;
      if (room.name !== undefined) updates[`${devicePath}/room`] = room.name;
      if (room.building !== undefined) updates[`${devicePath}/building`] = room.building;
      if (legacyRoomMatch) updates[`${devicePath}/roomId`] = id;
    });
  }

  await update(ref(database), updates);
};

export const deleteRoomRecord = async (id: string, roomName?: string) => {
  const devicesSnapshot = await get(ref(database, 'devices'));
  let assignedDevice = false;
  devicesSnapshot.forEach((deviceSnapshot) => {
    const deviceRoomId = deviceSnapshot.child('roomId').val();
    const legacyRoomMatch =
      !deviceRoomId && roomName && deviceSnapshot.child('room').val() === roomName;
    if (deviceRoomId === id || legacyRoomMatch) assignedDevice = true;
  });
  if (assignedDevice) {
    throw new Error('ย้ายอุปกรณ์ออกจากห้องนี้ก่อนลบห้อง');
  }
  await remove(ref(database, `rooms/${id}`));
};

// ---------------- Rules CRUD ----------------
export interface RuleRecord {
  id?: string;
  name: string;
  metric: 'temperature' | 'humidity' | 'power';
  operator?: 'greater_than' | 'less_than' | 'equal';
  comparator?: '>' | '<' | '=';
  threshold: number;
  rooms?: string[];
  enabled?: boolean;
  createdAt?: number;
}

export const subscribeToRules = (
  callback: (rules: RuleRecord[]) => void,
  errorCallback?: (err: Error) => void
) => {
  try {
    const rulesRef = ref(database, 'rules');
    const unsubscribe = onValue(
      rulesRef,
      (snapshot) => {
        const list: RuleRecord[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const val = child.val();
            list.push({ id: child.key || undefined, ...val });
          });
        }
        callback(list);
      },
      (err) => {
        if (errorCallback) errorCallback(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (errorCallback) errorCallback(err as Error);
    return () => {};
  }
};

export const createRuleRecord = async (rule: RuleRecord) => {
  const rulesRef = ref(database, 'rules');
  const newRef = await push(rulesRef);
  await set(newRef, {
    ...rule,
    comparator: rule.comparator || (rule.operator === 'less_than' ? '<' : rule.operator === 'equal' ? '=' : '>'),
    enabled: rule.enabled ?? true,
    rooms: rule.rooms || [],
    createdAt: Date.now(),
  });
  return { id: newRef.key, ...rule, enabled: rule.enabled ?? true, rooms: rule.rooms || [], createdAt: Date.now() } as RuleRecord;
};

export const updateRuleRecord = async (id: string, rule: Partial<RuleRecord>) => {
  const ruleRef = ref(database, `rules/${id}`);
  const normalizedRule = rule.operator
    ? {
        ...rule,
        comparator: rule.operator === 'less_than' ? '<' : rule.operator === 'equal' ? '=' : '>',
      }
    : rule;
  await update(ruleRef, normalizedRule);
};

export const deleteRuleRecord = async (id: string) => {
  const ruleRef = ref(database, `rules/${id}`);
  await remove(ruleRef);
};

// ---------------- Alerts CRUD ----------------
export interface AlertRecord {
  id?: string;
  deviceId?: string;
  ruleId?: string;
  deviceName?: string;
  title?: string;
  room?: string;
  metric?: string;
  threshold?: number;
  value?: number;
  timestamp?: number;
  severity?: 'info' | 'warning' | 'critical';
  resolved?: boolean;
}

export interface DeviceControlLog {
  id?: string;
  deviceId: string;
  deviceName: string;
  requestedState: boolean;
  outcome: 'pending' | 'sent' | 'failed';
  actorUid?: string;
  actorEmail?: string;
  actorName?: string;
  requestedAt: number;
  completedAt?: number;
  error?: string;
}

export const createDeviceControlLog = async (
  log: Omit<DeviceControlLog, 'id'>,
) => {
  const logRef = push(ref(database, 'deviceControlLogs'));
  await set(logRef, log);
  if (!logRef.key) throw new Error('ไม่สามารถสร้างบันทึกคำสั่งอุปกรณ์ได้');
  return logRef.key;
};

export const updateDeviceControlLog = async (
  id: string,
  updateFields: Partial<DeviceControlLog>,
) => {
  await update(ref(database, `deviceControlLogs/${id}`), updateFields);
};

export const subscribeToDeviceControlLogs = (
  callback: (logs: DeviceControlLog[]) => void,
  errorCallback?: (error: Error) => void,
) => {
  const logsQuery = query(
    ref(database, 'deviceControlLogs'),
    orderByChild('requestedAt'),
    limitToLast(100),
  );
  return onValue(
    logsQuery,
    (snapshot) => {
      const logs: DeviceControlLog[] = [];
      snapshot.forEach((child) => {
        const value = child.val();
        if (value && typeof value === 'object') {
          logs.push({ id: child.key || undefined, ...value });
        }
      });
      callback(logs.sort((a, b) => b.requestedAt - a.requestedAt));
    },
    (error) => errorCallback?.(error),
  );
};

export const subscribeToAlerts = (
  callback: (alerts: AlertRecord[]) => void,
  errorCallback?: (err: Error) => void
) => {
  try {
    const alertsRef = ref(database, 'alerts');
    const unsubscribe = onValue(
      alertsRef,
      (snapshot) => {
        const list: AlertRecord[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const val = child.val();
            list.push({ id: child.key || undefined, ...val });
          });
        }
        callback(list);
      },
      (err) => {
        if (errorCallback) errorCallback(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    if (errorCallback) errorCallback(err as Error);
    return () => {};
  }
};

export const updateAlertRecord = async (id: string, alert: Partial<AlertRecord>) => {
  const alertRef = ref(database, `alerts/${id}`);
  await update(alertRef, alert);
};
