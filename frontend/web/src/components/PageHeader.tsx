import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { auth, database } from '../firebase';
import '../styles/page-header.css';

interface PageHeaderProps {
  title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
  const user = auth.currentUser;
  const fallbackName = user?.displayName || user?.email?.split('@')[0] || 'ผู้ดูแลระบบ';
  const [adminName, setAdminName] = useState(fallbackName);
  const today = new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  useEffect(() => {
    if (!user) {
      setAdminName('ผู้ดูแลระบบ');
      return;
    }

    setAdminName(fallbackName);
    return onValue(
      ref(database, `users/${user.uid}/name`),
      (snapshot) => {
        const name = snapshot.val();
        setAdminName(typeof name === 'string' && name.trim() ? name.trim() : fallbackName);
      },
      (error) => {
        console.error('Failed to load administrator name:', error);
      }
    );
  }, [fallbackName, user]);

  const avatar = Array.from(adminName.trim())[0] || 'A';

  return (
    <header className="page-header">
      <h1 className="page-header-title">{title}</h1>
      <div className="page-header-details">
        <time className="page-header-date" dateTime={new Date().toISOString()}>
          {today}
        </time>
        <div className="page-header-admin">
          <span className="page-header-admin-name">{adminName}</span>
          <span className="page-header-avatar" aria-hidden="true">{avatar}</span>
        </div>
      </div>
    </header>
  );
}
