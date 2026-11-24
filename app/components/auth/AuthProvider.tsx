"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { PermissionKey, resolveEffectivePermissions } from "@/lib/permissions";

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
  permissions?: PermissionKey[];
};

export type AuthContextType = {
  user: User | null;
  activeTenant: TenantInfo | null;
  tenantRole: string | null;
  permissions: PermissionKey[];
  hasPermission: (key: PermissionKey) => boolean;
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
  permissions: [],
  hasPermission: () => false,
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
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const role = data.tenantRole || data.user?.role || null;
        setUser(data.user);
        setActiveTenant(data.activeTenant || null);
        setTenantRole(role);
        setPermissions(
          Array.isArray(data.permissions)
            ? data.permissions
            : resolveEffectivePermissions(role, null)
        );
        setMemberships(data.memberships || []);
      } else {
        setUser(null);
        setActiveTenant(null);
        setTenantRole(null);
        setPermissions([]);
        setMemberships([]);
      }
    } catch {
      setUser(null);
      setActiveTenant(null);
      setTenantRole(null);
      setPermissions([]);
      setMemberships([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchTenant = useCallback(async (tenantId: string): Promise<boolean> => {
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
  }, [refreshSession]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const permissionSet = useMemo(() => new Set<PermissionKey>(permissions), [permissions]);
  const hasPermission = useCallback(
    (key: PermissionKey) => permissionSet.has(key),
    [permissionSet]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        activeTenant,
        tenantRole,
        permissions,
        hasPermission,
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
