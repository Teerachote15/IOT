import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Home,
  Wifi,
  TrendingUp,
  Bell,
  Settings,
  Users,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { subscribeToAlerts } from '../services/database';
import { logout } from '../services/auth';
import '../styles/sidebar.css';

export default function Sidebar() {
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToAlerts((alerts) => {
      const unread = alerts.filter((alert) => !alert.resolved).length;
      setAlertCount(unread);
    });

    return () => unsubscribe();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">
          <Wifi size={20} />
        </div>
        <div className="logo-text">
          <h2>IoT Monitor</h2>
          <p>v1.1.0</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Link
          to="/"
          className={`nav-item ${isActive('/') ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/rooms"
          className={`nav-item ${isActive('/rooms') ? 'active' : ''}`}
        >
          <Home size={20} />
          <span>ห้อง/อาคาร</span>
        </Link>

        <Link
          to="/devices"
          className={`nav-item ${isActive('/devices') ? 'active' : ''}`}
        >
          <TrendingUp size={20} />
          <span>อุปกรณ์ IoT</span>
        </Link>

        <Link
          to="/history"
          className={`nav-item ${isActive('/history') ? 'active' : ''}`}
        >
          <TrendingUp size={20} />
          <span>ข้อมูลย้อนหลัง</span>
        </Link>

        <Link
          to="/alerts"
          className={`nav-item ${isActive('/alerts') ? 'active' : ''}`}
        >
          <Bell size={20} />
          <span>การแจ้งเตือน</span>
          {alertCount > 0 && <span className="alert-badge">{alertCount}</span>}
        </Link>

        <Link
          to="/rules"
          className={`nav-item ${isActive('/rules') ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span>Rule Conditions</span>
        </Link>

        <Link
          to="/users"
          className={`nav-item ${isActive('/users') ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>จัดการผู้ใช้</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="footer-section">
          <Link to="/guide" className="footer-link">
            <HelpCircle size={16} />
            ผู้แนะนำ
          </Link>
          <Link to="/help" className="footer-link">
            <HelpCircle size={16} />
            ผู้ขอความช่วยเหลือ
          </Link>
          <button className="footer-link footer-logout" type="button" onClick={logout}>
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
