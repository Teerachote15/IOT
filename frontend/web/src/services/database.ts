import { database } from '../firebase';
import { ref, onValue, get, push, set, update, remove } from 'firebase/database';

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
  timestamp?: number;
}

export interface Device {
  id: string;
  name: string;
  room: string;
  status: 'online' | 'offline' | 'problem';
  temperature: number;
  humidity: number;
  power: number;
  lastSeen: number;
  history?: Record<string, DeviceHistoryPoint>;
}

export interface DeviceRecord {
  id?: string;
  name: string;
  room: string;
  status?: 'online' | 'offline' | 'problem';
  enabled?: boolean;
  last?: {
    temperature?: number;
    humidity?: number;
    power?: number;
    timestamp?: number;
  };
}

export const createDeviceRecord = async (device: DeviceRecord) => {
  const devicesRef = ref(database, 'devices');
  const newRef = await push(devicesRef);
  const devicePayload = {
    ...device,
    status: device.status || 'online',
    last: {
      temperature: device.last?.temperature ?? 0,
      humidity: device.last?.humidity ?? 0,
      power: device.last?.power ?? 0,
      timestamp: device.last?.timestamp ?? Date.now(),
    },
  };
  await set(newRef, devicePayload);
  return { id: newRef.key || undefined, ...devicePayload } as DeviceRecord;
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
    const sensorRef = ref(database, `devices/${deviceId}/last`);
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
        if (snapshot.exists()) {
          const devices: Device[] = [];
          snapshot.forEach((childSnapshot) => {
            const deviceId = childSnapshot.key || '';
            const data = childSnapshot.val();
            if (data.last || data.history) {
              const resolvedStatus =
                (data.status as 'online' | 'offline' | 'problem') ||
                (data.enabled === false ? 'offline' : data.last?.temperature ? 'online' : 'offline');

              devices.push({
                id: deviceId,
                name: data.name || `Device ${deviceId}`,
                room: data.room || 'Unknown',
                status: resolvedStatus,
                temperature: data.last?.temperature || 0,
                humidity: data.last?.humidity || 0,
                power: data.last?.power || 0,
                lastSeen: data.last?.timestamp || Date.now(),
                history: data.history || {},
              });
            }
          });
          callback(devices);
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

// ดึงค่าเฉลี่ยของเซนเซอร์
export const getAverageSensorData = async (
  deviceIds: string[]
): Promise<{ temperature: number; humidity: number; power: number }> => {
  try {
    let totalTemp = 0;
    let totalHumidity = 0;
    let totalPower = 0;

    for (const deviceId of deviceIds) {
      const sensorRef = ref(database, `devices/${deviceId}/last`);
      const snapshot = await get(sensorRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        totalTemp += data.temperature || 0;
        totalHumidity += data.humidity || 0;
        totalPower += data.power || 0;
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
    const historyRef = ref(database, `devices/${deviceId}/history`);
    const snapshot = await get(historyRef);
    
    if (snapshot.exists()) {
      const history: Array<{ time: string; temp: number }> = [];
      const data = snapshot.val();
      
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

export const updateRoomRecord = async (id: string, room: Partial<RoomRecord>) => {
  const roomRef = ref(database, `rooms/${id}`);
  await update(roomRef, room);
};

export const deleteRoomRecord = async (id: string) => {
  const roomRef = ref(database, `rooms/${id}`);
  await remove(roomRef);
};

// ---------------- Rules CRUD ----------------
export interface RuleRecord {
  id?: string;
  name: string;
  metric: 'temperature' | 'humidity' | 'power';
  operator: 'greater_than' | 'less_than' | 'equal';
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
    enabled: rule.enabled ?? true,
    rooms: rule.rooms || [],
    createdAt: Date.now(),
  });
  return { id: newRef.key, ...rule, enabled: rule.enabled ?? true, rooms: rule.rooms || [], createdAt: Date.now() } as RuleRecord;
};

export const updateRuleRecord = async (id: string, rule: Partial<RuleRecord>) => {
  const ruleRef = ref(database, `rules/${id}`);
  await update(ruleRef, rule);
};

export const deleteRuleRecord = async (id: string) => {
  const ruleRef = ref(database, `rules/${id}`);
  await remove(ruleRef);
};

// ---------------- Alerts CRUD ----------------
export interface AlertRecord {
  id?: string;
  deviceId?: string;
  deviceName?: string;
  room?: string;
  metric?: string;
  threshold?: number;
  value?: number;
  timestamp?: number;
  severity?: 'info' | 'warning' | 'critical';
  resolved?: boolean;
}

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

