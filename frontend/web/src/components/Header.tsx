import { Bell, User } from 'lucide-react';
import '../styles/header.css';

export default function Header() {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear() % 100;

  return (
    <div className="header">
      <div className="header-title">
        <h1>Dashboard</h1>
      </div>

      <div className="header-right">
        <div className="status-indicator">
          <div className="status-dot"></div>
          <span>Live 5g</span>
        </div>

        <div className="header-date">
          <span>{day}วม / {month}เดือน / {year}</span>
        </div>

        <div className="header-icons">
          <button className="icon-btn">
            <Bell size={20} />
          </button>
          <button className="icon-btn">
            <User size={20} />
          </button>
        </div>

        <div className="user-profile">
          <span className="user-name">สนามข้างเคียง</span>
          <span className="user-role">ผู้ดูแลระบบ</span>
        </div>
      </div>
    </div>
  );
}
