'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface ProfileContextType {
  isProfileOpen: boolean;
  openProfile: () => void;
  closeProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const openProfile = () => {
    setIsProfileOpen(true);
    // body overflow를 안전하게 설정
    if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden';
    }
  };

  const closeProfile = () => {
    setIsProfileOpen(false);
    // body overflow를 안전하게 복원
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  };

  // 컴포넌트 언마운트 시 안전하게 복원
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, []);

  // 프로필이 닫힐 때도 안전하게 복원
  useEffect(() => {
    if (!isProfileOpen && typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }, [isProfileOpen]);

  return (
    <ProfileContext.Provider value={{ isProfileOpen, openProfile, closeProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
} 