"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setCookie, deleteCookie } from "cookies-next";

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo credentials
const DEMO_USER = {
  email: "demo@example.com",
  password: "password123",
  name: "Demo User"
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    setIsLoading(true);
    
    return new Promise((resolve) => {
      // Simulate network delay
      setTimeout(() => {
        if (email === DEMO_USER.email && password === DEMO_USER.password) {
          const userData = { email, name: DEMO_USER.name };
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
          
          // Set a cookie for the middleware
          setCookie('auth', 'true', { 
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/' 
          });
          
          setIsLoading(false);
          resolve(true);
        } else {
          setIsLoading(false);
          resolve(false);
        }
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    
    // Remove the auth cookie
    deleteCookie('auth', { path: '/' });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 