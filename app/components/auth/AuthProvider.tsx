"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type User = {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
};

export type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  location?: string;
  currencySymbol?: string;
  status: string;
};

export type TenantMembership = {
  tenantId: string;
  name: string;
  slug: string;
  role: string;
  status: string;
};

export type AuthContextType = {
  user: User | null;
  activeTenant: TenantInfo | null;
  tenantRole: string | null;
  memberships: TenantMembership[];
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  activeTenant: null,
  tenantRole: null,
  memberships: [],
  isLoading: true,
  isAuthenticated: false,
  refreshSession: async () => {},
  switchTenant: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeTenant, setActiveTenant] = useState<TenantInfo | null>(null);
  const [tenantRole, setTenantRole] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setActiveTenant(data.activeTenant || null);
        setTenantRole(data.tenantRole || data.user?.role || null);
        setMemberships(data.memberships || []);
      } else {
        setUser(null);
        setActiveTenant(null);
        setTenantRole(null);
        setMemberships([]);
      }
    } catch (error) {
      setUser(null);
      setActiveTenant(null);
      setTenantRole(null);
      setMemberships([]);
    } finally {
      setIsLoading(false);
    }
  };

  const switchTenant = async (tenantId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        await refreshSession();
        window.location.reload();
        return true;
      }
      return false;
    } catch (error) {
      console.error("switchTenant error:", error);
      return false;
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeTenant,
        tenantRole,
        memberships,
        isLoading,
        isAuthenticated: !!user,
        refreshSession,
        switchTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
