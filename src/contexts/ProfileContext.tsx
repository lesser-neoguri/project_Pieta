'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

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
    document.body.style.overflow = 'hidden';
  };

  const closeProfile = () => {
    setIsProfileOpen(false);
    document.body.style.overflow = 'auto';
  };

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