import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  User,
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { get, ref, set } from 'firebase/database';
import { auth, database, firebaseConfig } from '../firebase';

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getUserRole = async (uid: string) => {
  const snapshot = await get(ref(database, `users/${uid}/role`));
  return snapshot.exists() ? String(snapshot.val()) : null;
};

export const isAdminRole = (role: string | null) => {
  return role === 'admin' || role === 'ผู้ดูแลระบบ';
};

export const loginWithEmail = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const createAdminAccount = async (
  name: string,
  email: string,
  password: string
) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await set(ref(database, `users/${credential.user.uid}`), {
    name,
    email,
    role: 'ผู้ดูแลระบบ',
    rooms: [],
    createdAt: Date.now(),
  });
  return credential.user;
};

export const createManagedUser = async (
  name: string,
  email: string,
  password: string,
  role: string,
  rooms: string[]
) => {
  const secondaryApp = initializeApp(firebaseConfig, `managed-user-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);

  await set(ref(database, `users/${credential.user.uid}`), {
    name,
    email,
    role,
    rooms,
    createdAt: Date.now(),
  });

  return credential.user;
};

export const changeCurrentUserPassword = (password: string) => {
  if (!auth.currentUser) {
    throw new Error('ไม่พบผู้ใช้ที่เข้าสู่ระบบ');
  }
  return updatePassword(auth.currentUser, password);
};

export const logout = () => signOut(auth);
