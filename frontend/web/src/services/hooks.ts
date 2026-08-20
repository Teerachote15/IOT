import { useState, useEffect } from 'react';
import {
  subscribeToSensorData,
  subscribeToAllDevices,
  getAverageSensorData,
  SensorData,
  Device,
  subscribeToUsers,
  UserRecord,
  subscribeToRooms,
  RoomRecord,
} from './database';

// Hook สำหรับดึงข้อมูลเซนเซอร์ของอุปกรณ์เดียว
export const useSensorData = (deviceId: string) => {
  const [data, setData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToSensorData(
      deviceId,
      (sensorData) => {
        setData(sensorData);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [deviceId]);

  return { data, loading, error };
};

// Hook สำหรับดึงข้อมูลอุปกรณ์ทั้งหมด
export const useAllDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAllDevices(
      (devicesList) => {
        setDevices(devicesList);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return { devices, loading, error };
};

// Hook สำหรับดึงค่าเฉลี่ยของเซนเซอร์
export const useAverageSensorData = (deviceIds: string[]) => {
  const [data, setData] = useState<{ temperature: number; humidity: number; power: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAverageData = async () => {
      try {
        setLoading(true);
        const averageData = await getAverageSensorData(deviceIds);
        setData(averageData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (deviceIds.length > 0) {
      fetchAverageData();
      // อัปเดตทุก 5 วินาที
      const interval = setInterval(fetchAverageData, 5000);
      return () => clearInterval(interval);
    }
  }, [deviceIds]);

  return { data, loading, error };
};

// Hook สำหรับดึงรายชื่อผู้ใช้
export const useUsers = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToUsers(
      (list) => {
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { users, loading, error };
};

export const useRooms = () => {
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToRooms(
      (list) => {
        setRooms(list);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { rooms, loading, error };
};
