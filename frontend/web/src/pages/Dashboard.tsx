import { Thermometer, Droplets, Zap, Wifi } from 'lucide-react';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import TemperatureChart from '../components/TemperatureChart';
import PowerChart from '../components/PowerChart';
import DeviceTable from '../components/DeviceTable';
import { useAllDevices, useAverageSensorData } from '../services/hooks';
import '../styles/dashboard.css';

export default function Dashboard() {
  const { devices, loading, error } = useAllDevices();
  const onlineDeviceList = devices.filter((d) => d.status === 'online');
  const deviceIds = onlineDeviceList.map((d) => d.id);
  const { data: averageData } = useAverageSensorData(deviceIds);
  const onlineDevices = onlineDeviceList.length;
  const offlineDevices = devices.filter((d) => d.status === 'offline').length;

  return (
    <div className="dashboard-container">
      <Header />

      <div className="dashboard-content">
        {/* Status Messages */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: '#fee2e2',
              color: '#7f1d1d',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
            }}
          >
            ⚠️ เกิดข้อผิดพลาด: {error.message}
          </div>
        )}

        {loading && devices.length === 0 && (
          <div
            style={{
              padding: '12px 16px',
              background: '#dbeafe',
              color: '#1e40af',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
            }}
          >
            ⏳ กำลังโหลดข้อมูล...
          </div>
        )}

        {/* Stat Cards Row */}
        <div className="stats-grid">
          <StatCard
            icon={Thermometer}
            title="อุณหภูมิเฉลี่ย"
            value={averageData?.temperature || 0}
            unit="°C"
            subtitle="อุณหภูมิเฉลี่ยรวมทั้งห้อง"
          />
          <StatCard
            icon={Droplets}
            title="ความชื้นเฉลี่ย"
            value={averageData?.humidity || 0}
            unit="%"
            subtitle="ค่าอ้างอิง 40-65%"
          />
          <StatCard
            icon={Zap}
            title="พลังงานรวม"
            value={devices.length ? (averageData?.power || 0) : '-'}
            unit="kWh"
            subtitle="ยังไม่มีตัววัดพลังงาน"
          />
          <StatCard
            icon={Wifi}
            title="สถานะอุปกรณ์"
            value={`${onlineDevices}/${devices.length}`}
            unit="Online"
            subtitle={`${offlineDevices} ออฟไลน์`}
          />
        </div>

        {/* Charts Row */}
        <div className="charts-grid">
          <TemperatureChart devices={devices} />
          <PowerChart devices={devices} />
        </div>

        {/* Device Table */}
        <DeviceTable devices={devices} />
      </div>
    </div>
  );
}
