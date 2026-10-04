import { Edit2, Trash2 } from 'lucide-react';
import '../styles/users.css';

interface UserProps {
  id?: string;
  name: string;
  email?: string;
  role?: string;
  rooms?: string[];
  onEdit?: (id?: string) => void;
  onDelete?: (id?: string) => void;
}

export default function UserCard({ id, name, email, role = 'พนักงาน', rooms = [], onEdit, onDelete }: UserProps) {
  const displayName = typeof name === 'string' && name.trim() ? name.trim() : 'ไม่ระบุชื่อ';
  const assignedRooms = Array.isArray(rooms)
    ? rooms.filter((room): room is string => typeof room === 'string')
    : [];

  return (
    <div className="user-card">
      <div className="user-left">
        <div className="user-avatar">{Array.from(displayName)[0]}</div>
        <div className="user-info">
          <div className="user-name">{displayName}</div>
          {email && <div className="user-email">{email}</div>}
        </div>
      </div>

      <div className="user-right">
        <div className="user-badges">
          <span className={`role-badge ${role === 'ผู้ดูแลระบบ' ? 'admin' : 'staff'}`}>{role}</span>
          <button className="status-btn">ใช้งาน</button>
        </div>

        <div className="rooms-line">
          {assignedRooms.length === 0 ? (
            <span className="rooms-empty">ห้องที่มอบหมาย - คลิกเพื่อเพิ่ม/ถอน</span>
          ) : (
            assignedRooms.map((r) => (
              <span key={r} className="room-pill">{r}</span>
            ))
          )}
        </div>

        <div className="user-actions">
          <button className="icon-btn" title="แก้ไข" onClick={() => onEdit && onEdit(id)}>
            <Edit2 size={16} />
          </button>
          <button className="icon-btn danger" title="ลบ" onClick={() => onDelete && onDelete(id)}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
