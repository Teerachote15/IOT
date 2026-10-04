import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { User } from 'firebase/auth';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import RoomsPage from './pages/Rooms';
import UsersPage from './pages/Users';
import DevicesPage from './pages/Devices';
import HistoryPage from './pages/History';
import RulesPage from './pages/Rules';
import AlertsPage from './pages/Alerts';
import LoginPage from './pages/Login';
import { getUserRole, isAdminRole, logout, subscribeToAuth } from './services/auth';
import './styles.css';
import './styles/layout.css';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    return subscribeToAuth(async (currentUser) => {
      setUser(currentUser);
      setIsAdmin(false);
      if (!currentUser) {
        setRoleLoading(false);
        setAuthLoading(false);
        return;
      }

      setRoleLoading(true);
      try {
        const role = await getUserRole(currentUser.uid);
        setIsAdmin(isAdminRole(role));
      } catch {
        setIsAdmin(false);
      } finally {
        setRoleLoading(false);
      }
      setAuthLoading(false);
    });
  }, []);

  if (authLoading) {
    return <div className="app-loading">กำลังตรวจสอบการเข้าสู่ระบบ...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  if (roleLoading) {
    return <div className="app-loading">กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...</div>;
  }

  if (!isAdmin) {
    return (
      <main className="access-denied">
        <div className="access-denied-card">
          <h1>ไม่มีสิทธิ์เข้าถึง</h1>
          <p>หน้านี้อนุญาตเฉพาะผู้ดูแลระบบเท่านั้น</p>
          <button type="button" onClick={logout}>ออกจากระบบ</button>
        </div>
      </main>
    );
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Routes>
      </div>
    </div>
  );
}
