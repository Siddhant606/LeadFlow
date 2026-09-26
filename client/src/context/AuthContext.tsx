import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Brokerage } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  brokerage: Brokerage | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User, brokerage?: Brokerage) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('leadflow_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [brokerage, setBrokerage] = useState<Brokerage | null>(() => {
    const saved = localStorage.getItem('leadflow_brokerage');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('leadflow_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = (newToken: string, newUser: User, newBrokerage?: Brokerage) => {
    localStorage.setItem('leadflow_token', newToken);
    localStorage.setItem('leadflow_user', JSON.stringify(newUser));
    if (newBrokerage) {
      localStorage.setItem('leadflow_brokerage', JSON.stringify(newBrokerage));
      setBrokerage(newBrokerage);
    }
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('leadflow_token');
    localStorage.removeItem('leadflow_user');
    localStorage.removeItem('leadflow_brokerage');
    setToken(null);
    setUser(null);
    setBrokerage(null);
  };

  const refreshProfile = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/profile');
      if (res.data?.data) {
        const u = res.data.data.user;
        const b = res.data.data.brokerage;
        const mappedUser: User = {
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          brokerageId: u.brokerageId,
        };
        setUser(mappedUser);
        localStorage.setItem('leadflow_user', JSON.stringify(mappedUser));

        if (b) {
          const mappedBrokerage: Brokerage = {
            id: b._id,
            name: b.name,
            slug: b.slug,
            apiKey: b.apiKey,
          };
          setBrokerage(mappedBrokerage);
          localStorage.setItem('leadflow_brokerage', JSON.stringify(mappedBrokerage));
        }
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        brokerage,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
