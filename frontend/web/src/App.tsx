import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import RoomsPage from './pages/Rooms';
import UsersPage from './pages/Users';
import DevicesPage from './pages/Devices';
import HistoryPage from './pages/History';
import RulesPage from './pages/Rules';
import AlertsPage from './pages/Alerts';
import './styles.css';
import './styles/layout.css';

export default function App() {
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
