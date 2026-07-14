"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, tokenStorage, registerAuthFailureHandler } from "@/lib/api/client";

interface UserProfile {
  name: string;
  email: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const accessToken = tokenStorage.getAccessToken();
    const storedUser = localStorage.getItem("user_profile");
    
    if (accessToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // Clear corrupt data
        tokenStorage.clearTokens();
        localStorage.removeItem("user_profile");
      }
    }
    setIsLoading(false);

    // Register 401 failure handler to log out automatically
    registerAuthFailureHandler(() => {
      logout();
    });
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });

      if (data.access_token && data.refresh_token) {
        tokenStorage.setTokens(data.access_token, data.refresh_token);
        
        const nameFallback = email.split("@")[0];
        const profile: UserProfile = {
          name: nameFallback.charAt(0).toUpperCase() + nameFallback.slice(1),
          email,
        };
        
        localStorage.setItem("user_profile", JSON.stringify(profile));
        setUser(profile);
        router.push("/dashboard");
      } else {
        throw new Error("Resposta de autenticação inválida");
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
        skipAuth: true,
      });
      // Registration successful, redirect to login
      router.push("/login");
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    tokenStorage.clearTokens();
    localStorage.removeItem("user_profile");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
