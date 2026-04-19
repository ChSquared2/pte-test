import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type UserId = 'nicole' | 'asly';

export const USER_LABELS: Record<UserId, string> = {
  nicole: 'Nicole <3',
  asly: 'Asly',
};

const STORAGE_KEY = 'pte_current_user';

interface UserContextValue {
  currentUser: UserId | null;
  setCurrentUser: (u: UserId | null) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<UserId | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'nicole' || stored === 'asly' ? stored : null;
  });

  useEffect(() => {
    if (currentUser) localStorage.setItem(STORAGE_KEY, currentUser);
    else localStorage.removeItem(STORAGE_KEY);
  }, [currentUser]);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser: setCurrentUserState }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}

export function getStoredUserId(): UserId {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'asly' ? 'asly' : 'nicole';
}
