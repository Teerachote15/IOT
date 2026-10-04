import { useEffect, useState } from 'react';
import { Device, isDeviceDataStale } from '../services/database';
import '../styles/device-table.css';

interface DeviceTableProps {
  devices: Device[];
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { class: string; label: string }> = {
    online: { class: 'status-online', label: 'ออนไลน์' },
    offline: { class: 'status-offline', label: 'ออฟไลน์' },
    problem: { class: 'status-problem', label: 'ปัญหา' },
  };
  const s = statusMap[status];
  return <span className={`status-badge ${s.class}`}>{s.label}</span>;
}

function getLastSeenText(timestamp: number): string {
  if (!timestamp) return 'ไม่เคยเชื่อมต่อ';
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 0) return 'เวลาไม่ถูกต้อง';
  if (diff < 60000) return 'เมื่อสักครู่';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff / 86400000)} วันที่แล้ว`;
}

export default function DeviceTable({ devices }: DeviceTableProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  if (devices.length === 0) {
    return (
      <div className="device-table-container">
        <div className="table-header">
          <h3>สถานะอุปกรณ์</h3>
        </div>
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#999',
          }}
        >
          ไม่มีข้อมูลอุปกรณ์ในระบบ
        </div>
      </div>
    );
  }

  return (
    <div className="device-table-container">
      <div className="table-header">
        <h3>สถานะอุปกรณ์</h3>
        <button className="refresh-btn">↻ รีเฟรช</button>
      </div>
      <table className="device-table">
        <thead>
          <tr>
            <th>ชื่ออุปกรณ์</th>
            <th>ห้อง</th>
            <th>สถานะ</th>
            <th>อุณหภูมิ</th>
            <th>ความชื้น</th>
            <th>กำลังไฟ</th>
            <th>อัปเดตล่าสุด</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.id}>
              <td>{device.name}</td>
              <td>{device.room}</td>
              <td>
                {device.status === 'online' && isDeviceDataStale(device, now)
                  ? <span className="status-badge status-offline">ข้อมูลล่าช้า</span>
                  : getStatusBadge(device.status)}
              </td>
              <td>{device.sensors?.dht22?.temperature == null ? '—' : `${device.sensors.dht22.temperature.toFixed(1)}°C`}</td>
              <td>{device.sensors?.dht22?.humidity == null ? '—' : `${device.sensors.dht22.humidity.toFixed(1)}%`}</td>
              <td>{device.sensors?.pzem?.power == null ? '—' : `${device.sensors.pzem.power.toFixed(1)} W`}</td>
              <td>{device.lastSeen ? getLastSeenText(device.lastSeen) : 'ยังไม่มีข้อมูล'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
