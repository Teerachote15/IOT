import { database } from '../firebase';
import { ref, set } from 'firebase/database';

// Script สำหรับเพิ่ม Mock Data เข้า Firebase
export const initMockData = async () => {
  try {
    console.log('🔄 กำลังเพิ่ม Mock Data...');

    // Mock Devices Data
    const devicesData = {
      IOT001: {
        name: 'Room 1',
        room: 'Room 1',
        last: {
          humidity: 74.4,
          temperature: 28.2,
          power: 3.21,
          ts: Date.now(),
        },
        history: {
          ts1: { temperature: 26.5, humidity: 68, power: 3.1, timestamp: Date.now() - 3600000 },
          ts2: { temperature: 27.2, humidity: 70, power: 3.15, timestamp: Date.now() - 2400000 },
          ts3: { temperature: 28.0, humidity: 72, power: 3.18, timestamp: Date.now() - 1200000 },
        },
      },
      IOT002: {
        name: 'Room 2',
        room: 'Room 2',
        last: {
          humidity: 54.2,
          temperature: 24.5,
          power: 2.67,
          ts: Date.now(),
        },
        history: {
          ts1: { temperature: 22.8, humidity: 50, power: 2.5, timestamp: Date.now() - 3600000 },
          ts2: { temperature: 23.5, humidity: 52, power: 2.58, timestamp: Date.now() - 2400000 },
          ts3: { temperature: 24.2, humidity: 53.5, power: 2.63, timestamp: Date.now() - 1200000 },
        },
      },
      IOT003: {
        name: 'Room 3',
        room: 'Room 3',
        last: {
          humidity: 62.1,
          temperature: 26.8,
          power: 3.45,
          ts: Date.now(),
        },
      },
      IOT004: {
        name: 'Room 4',
        room: 'Room 4',
        last: {
          humidity: 48.5,
          temperature: 25.3,
          power: 2.89,
          ts: Date.now(),
        },
      },
      IOT005: {
        name: 'Common Area',
        room: 'Common Area',
        last: {
          humidity: 65.8,
          temperature: 27.5,
          power: 7.5,
          ts: Date.now(),
        },
      },
    };

    await set(ref(database, 'devices'), devicesData);
    console.log('✅ Devices data เพิ่มสำเร็จ');

    // Mock Alerts Data
    const alertsData = {
      alert001: {
        deviceId: 'IOT001',
        ruleId: 'rule001',
        metric: 'temperature',
        value: 28.2,
        threshold: 28,
        timestamp: Date.now(),
        resolved: false,
        severity: 'warning',
      },
      alert002: {
        deviceId: 'IOT002',
        ruleId: 'rule002',
        metric: 'humidity',
        value: 54.2,
        threshold: 65,
        timestamp: Date.now() - 600000,
        resolved: true,
        severity: 'info',
      },
    };

    await set(ref(database, 'alerts'), alertsData);
    console.log('✅ Alerts data เพิ่มสำเร็จ');

    // Mock Rules Data
    const rulesData = {
      rule001: {
        deviceId: 'IOT001',
        metric: 'temperature',
        comparator: 'greater_than',
        threshold: 28,
        severity: 'warning',
        displayName: 'อุณหภูมิ IOT001 สูงเกินไป',
      },
      rule002: {
        deviceId: 'IOT002',
        metric: 'humidity',
        comparator: 'less_than',
        threshold: 40,
        severity: 'info',
        displayName: 'ความชื้น IOT002 ต่ำเกินไป',
      },
    };

    await set(ref(database, 'rules'), rulesData);
    console.log('✅ Rules data เพิ่มสำเร็จ');

    console.log('🎉 Mock Data ทั้งหมดเพิ่มเสร็จแล้ว!');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
};
