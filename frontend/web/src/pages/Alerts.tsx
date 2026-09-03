import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell } from 'lucide-react';
import { useAllDevices } from '../services/hooks';
import { subscribeToAlerts, updateAlertRecord } from '../services/database';
import '../styles/alerts.css';

function formatMetric(metric?: string) {
  if (!metric) return 'ค่า';
  if (metric === 'temperature') return 'อุณหภูมิ';
  if (metric === 'humidity') return 'ความชื้น';
  if (metric === 'power') return 'พลังงาน';
  return metric;
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
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { devices } = useAllDevices();

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
    const latestByDeviceAndRule = new Map<string, any>();

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

  const markResolved = async (id?: string) => {
    if (!id) return;
    await updateAlertRecord(id, { resolved: true });
  };

  return (
    <div className="alerts-page">
      <header className="alerts-topbar">
        <div className="alerts-brand">การแจ้งเตือน</div>
        <div className="alerts-topbar-right">
          <div className="live-pill">
            <span className="live-dot" />
            Live 5/7
          </div>
          <div className="date-pill">วัน / เดือน / ปี</div>
          <div className="profile-box">
            <span>สมชาย</span>
            <div className="profile-avatar">ส</div>
          </div>
        </div>
      </header>

      <div className="alerts-content">
        <div className="alerts-header-row">
          <div>
            <h1>การแจ้งเตือน</h1>
            <p>การแจ้งเตือนเมื่อค่าเซ็นเซอร์เกินเงื่อนไข</p>
          </div>
        </div>

        {loading && <div className="alerts-state">กำลังโหลดการแจ้งเตือน...</div>}
        {error && <div className="alerts-state error">{error}</div>}

        <div className="alerts-list">
          {activeAlerts.map((alert) => {
            const device = devices.find((item) => item.id === alert.deviceId);
            const metricText = formatMetric(alert.metric);
            const metricUnit = alert.metric === 'temperature' ? '°C' : alert.metric === 'humidity' ? '%' : 'kWh';
            const isWarning = alert.severity === 'warning' || alert.severity === 'critical';
            const resolved = !!alert.resolved;

            return (
              <div
                key={alert.id}
                className={resolved ? 'alert-item resolved' : 'alert-item'}
                style={{ borderColor: isWarning ? '#ef4444' : '#f59e0b' }}
              >
                <div className="alert-left">
                  <div className={`alert-icon ${isWarning ? 'warning' : 'info'}`}>
                    {isWarning ? <AlertTriangle size={18} /> : <Bell size={18} />}
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
                  >
                    {resolved ? 'รีเซ็ต' : 'ยืนยัน'}
                  </button>
                  <div className="alert-time">{formatTime(alert.timestamp)}</div>
                </div>
              </div>
            );
          })}

          {!loading && activeAlerts.length === 0 && (
            <div className="alerts-empty">ไม่มีการแจ้งเตือนที่ต้องตรวจสอบ</div>
          )}
        </div>
      </div>
    </div>
  );
}
