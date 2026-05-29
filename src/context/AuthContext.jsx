import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, ADMIN_UID } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u || null));
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const userRef = ref(db, `users/${user.uid}`);
    return onValue(userRef, snap => {
      setProfile(snap.exists() ? { uid: user.uid, ...snap.val() } : null);
    });
  }, [user]);

  const isAdmin = user?.uid === ADMIN_UID;
  if (user === undefined) return null; // loading
  return <AuthContext.Provider value={{ user, profile, isAdmin }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
