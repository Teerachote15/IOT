import { useEffect, useMemo, useState } from 'react';
import { Droplets, Thermometer, Zap, Bell } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAllDevices, useRooms } from '../services/hooks';
import { AlertRecord, subscribeToAlerts, updateAlertRecord } from '../services/database';
import '../styles/alerts.css';

function formatMetric(metric?: string) {
  if (!metric) return 'ค่า';
  if (metric === 'temperature') return 'อุณหภูมิ';
  if (metric === 'humidity') return 'ความชื้น';
  if (metric === 'power') return 'กำลังไฟ';
  return metric;
}

function metricStyle(metric?: string) {
  if (metric === 'power') {
    return { className: 'power', color: '#f59e0b', icon: <Zap size={18} /> };
  }
  if (metric === 'temperature') {
    return { className: 'temperature', color: '#3b82f6', icon: <Thermometer size={18} /> };
  }
  if (metric === 'humidity') {
    return { className: 'humidity', color: '#10b981', icon: <Droplets size={18} /> };
  }
  return { className: 'other', color: '#64748b', icon: <Bell size={18} /> };
}

function formatTime(dateValue?: number) {
  if (!dateValue) return 'เมื่อสักครู่';
  const diff = Date.now() - dateValue;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'resolved' | 'all'>('active');
  const { devices } = useAllDevices();
  const { rooms } = useRooms();

  useEffect(() => {
    const unsubscribe = subscribeToAlerts(
      (list) => {
        const sorted = [...list].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setAlerts(sorted);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const activeAlerts = useMemo(() => {
    const latestByDeviceAndRule = new Map<string, AlertRecord>();

    alerts
      .filter((item) => !item.resolved)
      .forEach((item) => {
        const key = `${item.deviceId || 'unknown'}:${item.ruleId || item.metric || 'alert'}`;
        const current = latestByDeviceAndRule.get(key);
        if (!current || (item.timestamp || 0) > (current.timestamp || 0)) {
          latestByDeviceAndRule.set(key, item);
        }
      });

    return Array.from(latestByDeviceAndRule.values()).sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
    );
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const source = statusFilter === 'active'
      ? activeAlerts
      : alerts.filter((alert) =>
          statusFilter === 'all' || (statusFilter === 'resolved' && alert.resolved),
        );
    const keyword = search.trim().toLowerCase();
    return source.filter((alert) => {
      const device = devices.find((item) => item.id === alert.deviceId);
      const roomName = alert.room || device?.room || '';
      const room = rooms.find((item) => item.id === roomFilter);
      const roomMatches = !roomFilter || (
        room
          ? device?.roomId === room.id || roomName === room.name
          : roomName === roomFilter
      );
      const searchMatches = !keyword || [
        alert.deviceName,
        device?.name,
        alert.deviceId,
        roomName,
        formatMetric(alert.metric),
      ].some((field) => field?.toLowerCase().includes(keyword));
      return roomMatches && searchMatches;
    });
  }, [activeAlerts, alerts, devices, roomFilter, rooms, search, statusFilter]);

  const markResolved = async (id?: string) => {
    if (!id) return;
    try {
      await updateAlertRecord(id, { resolved: true });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'ไม่สามารถยืนยันการแจ้งเตือนได้');
    }
  };

  return (
    <div className="alerts-page">
      <PageHeader title="การแจ้งเตือน" />

      <div className="alerts-content">
        <div className="alerts-header-row">
          <div>
            <h1>การแจ้งเตือน</h1>
            <p>การแจ้งเตือนเมื่อค่าเซ็นเซอร์เกินเงื่อนไข</p>
          </div>
        </div>

        <div className="alerts-filters">
          <input
            aria-label="ค้นหาการแจ้งเตือน"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาอุปกรณ์ ห้อง หรือเซนเซอร์"
          />
          <select aria-label="กรองตามห้อง" value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}>
            <option value="">ทุกห้อง</option>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
          <select
            aria-label="กรองตามสถานะ"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="active">ต้องตรวจสอบ</option>
            <option value="resolved">ยืนยันแล้ว</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>

        {loading && <div className="alerts-state">กำลังโหลดการแจ้งเตือน...</div>}
        {error && <div className="alerts-state error">{error}</div>}

        <div className="alerts-list">
          {filteredAlerts.map((alert) => {
            const device = devices.find((item) => item.id === alert.deviceId);
            const metricText = formatMetric(alert.metric);
            const metricUnit = alert.metric === 'temperature' ? '°C' : alert.metric === 'humidity' ? '%' : 'W';
            const style = metricStyle(alert.metric);
            const resolved = !!alert.resolved;

            return (
              <div
                key={alert.id}
                className={`alert-item metric-${style.className}${resolved ? ' resolved' : ''}`}
              >
                <div className="alert-left">
                  <div className={`alert-icon metric-${style.className}`}>
                    {style.icon}
                  </div>

                  <div className="alert-copy">
                    <div className="alert-text">
                      {alert.deviceName || device?.name || alert.deviceId || 'อุปกรณ์'} {alert.metric ? `เกินค่าที่กำหนด` : 'แจ้งเตือน'} - {alert.room || device?.room || 'ห้อง'}
                    </div>
                    <div className="alert-detail">
                      ค่า{metricText} {alert.value ?? 0}{metricUnit} / เกณฑ์ {alert.threshold ?? 0}{metricUnit}
                    </div>
                  </div>
                </div>

                <div className="alert-right">
                  <button
                    type="button"
                    className={resolved ? 'resolve-btn resolved' : 'resolve-btn'}
                    onClick={() => markResolved(alert.id)}
                    disabled={resolved}
                  >
                    {resolved ? 'ยืนยันแล้ว' : 'ยืนยัน'}
                  </button>
                  <div className="alert-time">{formatTime(alert.timestamp)}</div>
                </div>
              </div>
            );
          })}

          {!loading && filteredAlerts.length === 0 && (
            <div className="alerts-empty">ไม่พบการแจ้งเตือนที่ตรงกับตัวกรอง</div>
          )}
        </div>
      </div>
    </div>
  );
}
