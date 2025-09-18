'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface TravelerUser {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  is_verified: boolean;
  created_at: string;
}

interface TravelerContextType {
  user: TravelerUser | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const TravelerContext = createContext<TravelerContextType | undefined>(undefined);

export const useTraveler = () => {
  const context = useContext(TravelerContext);
  if (context === undefined) {
    throw new Error('useTraveler must be used within a TravelerProvider');
  }
  return context;
};

export const TravelerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<TravelerUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('traveler_token');
    if (storedToken) {
      setToken(storedToken);
      fetchUserProfile(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async (authToken: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/travelers/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token might be invalid
        localStorage.removeItem('traveler_token');
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      localStorage.removeItem('traveler_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (newToken: string) => {
    localStorage.setItem('traveler_token', newToken);
    setToken(newToken);
    await fetchUserProfile(newToken);
  };

  const logout = () => {
    localStorage.removeItem('traveler_token');
    setToken(null);
    setUser(null);
  };

  return (
    <TravelerContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </TravelerContext.Provider>
  );
};