import { Device } from '../services/database';
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
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'เมื่อสักครู่';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff / 86400000)} วันที่แล้ว`;
}

export default function DeviceTable({ devices }: DeviceTableProps) {
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
          ไม่มีข้อมูลอุปกรณ์ กำลังเพิ่ม Mock Data...
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
            <th>พลังงาน</th>
            <th>อื่นๆ</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.id}>
              <td>{device.name}</td>
              <td>{device.room}</td>
              <td>{getStatusBadge(device.status)}</td>
              <td>{device.temperature.toFixed(1)}°C</td>
              <td>{device.humidity.toFixed(1)}%</td>
              <td>{device.power.toFixed(2)} kWh</td>
              <td>{getLastSeenText(device.lastSeen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
