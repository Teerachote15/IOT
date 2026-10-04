import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole, LogIn, Mail, Wifi } from 'lucide-react';
import { loginWithEmail } from '../services/auth';
import '../styles/auth.css';

function getAuthErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (code === 'auth/user-not-found') return 'ไม่พบบัญชีผู้ใช้นี้';
  if (code === 'auth/too-many-requests') return 'ลองเข้าสู่ระบบใหม่ภายหลัง';
  return 'ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบข้อมูลอีกครั้ง';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password);
      navigate('/', { replace: true });
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel auth-brand-panel">
        <div className="auth-brand-mark"><Wifi size={28} /></div>
        <p className="auth-kicker">SMART BUILDING CONTROL</p>
        <h1>IoT Monitor</h1>
        <p>จัดการอุปกรณ์ เซ็นเซอร์ และข้อมูลอาคารของคุณในที่เดียว</p>
      </section>

      <section className="auth-panel auth-form-panel">
        <div className="auth-form-heading">
          <h2>เข้าสู่ระบบ</h2>
          <p>เข้าสู่ระบบผู้ดูแลเพื่อจัดการ IoT Monitor</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>อีเมล</span>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" required />
            </div>
          </label>

          <label>
            <span>รหัสผ่าน</span>
            <div className="auth-input-wrap">
              <LockKeyhole size={18} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="กรอกรหัสผ่าน" required minLength={6} />
            </div>
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            <LogIn size={18} />
            {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </section>
    </main>
  );
}
