"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Save, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  AppRole,
  PERMISSION_DEFINITIONS,
  PermissionKey,
  ROLE_DEFAULT_PERMISSIONS,
  resolvePermissionMap,
} from "@/lib/permissions";
import { updateUserAccess } from "@/actions/user.actions";
import { useToast } from "../ui/Toast";

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    email: string;
    role: AppRole;
    customPermissions?: Partial<Record<PermissionKey, boolean>>;
    permissionMap?: Record<PermissionKey, boolean>;
  } | null;
}

export default function UserPermissionsModal({
  isOpen,
  onClose,
  member,
}: UserPermissionsModalProps) {
  const toast = useToast();
  const [role, setRole] = useState<AppRole>("WORKER");
  const [permMap, setPermMap] = useState<Record<PermissionKey, boolean>>(
    () => resolvePermissionMap("WORKER", null)
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setRole(member.role);
      setPermMap(
        member.permissionMap
          ? { ...member.permissionMap }
          : resolvePermissionMap(member.role, member.customPermissions)
      );
    }
  }, [member]);

  const groupedDefinitions = useMemo(() => {
    const groups: Record<string, typeof PERMISSION_DEFINITIONS> = {};
    for (const def of PERMISSION_DEFINITIONS) {
      if (!groups[def.group]) groups[def.group] = [];
      groups[def.group].push(def);
    }
    return Object.entries(groups);
  }, []);

  if (!isOpen || !member) return null;

  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[role];
  const hasAnyDiff = Object.keys(roleDefaults).some(
    (k) => permMap[k as PermissionKey] !== roleDefaults[k as PermissionKey]
  );

  const handleRoleSelect = (newRole: AppRole) => {
    // Keep explicit opt-in herd:delete if already granted, while applying the new role's base preset
    const keepDelete = permMap["herd:delete"];
    const nextMap = { ...ROLE_DEFAULT_PERMISSIONS[newRole] };
    if (keepDelete) {
      nextMap["herd:delete"] = true;
      nextMap["herd:view"] = true;
    }
    setRole(newRole);
    setPermMap(nextMap);
  };

  const handleTogglePermission = (key: PermissionKey) => {
    setPermMap((prev) => {
      const nextVal = !prev[key];
      const next = { ...prev, [key]: nextVal };
      const def = PERMISSION_DEFINITIONS.find((d) => d.key === key);

      // If turning ON a permission that requires a parent view permission, turn ON parent too
      if (nextVal && def?.requires) {
        next[def.requires] = true;
      }

      // If turning OFF a parent view permission, turn OFF any child permissions requiring it
      if (!nextVal) {
        for (const childDef of PERMISSION_DEFINITIONS) {
          if (childDef.requires === key) {
            next[childDef.key] = false;
          }
        }
      }

      return next;
    });
  };

  const handleResetDefaults = () => {
    setPermMap({ ...ROLE_DEFAULT_PERMISSIONS[role] });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await updateUserAccess(member.id, {
      role,
      permissionMap: permMap,
    });
    setIsSaving(false);

    if (res.success) {
      toast(res.message, "success");
      onClose();
    } else {
      toast(res.message, "error");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "620px",
          maxHeight: "90vh",
          backgroundColor: "var(--color-surface, #ffffff)",
          color: "var(--color-text-main, #0f172a)",
          borderRadius: "20px",
          border: "1px solid var(--color-border, #e2e8f0)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={20} color="var(--color-primary, #047857)" />
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                Role &amp; Granular Permissions
              </h2>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--color-text-sub, #64748b)" }}>
              {member.name} ({member.email})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-sub)" }}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Base Role Selector */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-sub)" }}>
                Base Role Preset
              </label>
              {hasAnyDiff && (
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <RotateCcw size={13} /> Reset to {role} Defaults
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
              {(
                [
                  { value: "WORKER", title: "Worker", desc: "Field & Milk Entry" },
                  { value: "MANAGER", title: "Manager", desc: "Operations & Reports" },
                  { value: "ADMIN", title: "Admin", desc: "Full Org Control" },
                ] as const
              ).map((opt) => {
                const selected = role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleRoleSelect(opt.value)}
                    style={{
                      padding: "0.7rem 0.6rem",
                      borderRadius: "12px",
                      border: selected
                        ? "2px solid var(--color-primary, #047857)"
                        : "1px solid var(--color-border, #cbd5e1)",
                      backgroundColor: selected ? "rgba(16, 185, 129, 0.1)" : "var(--color-bg, #f8fafc)",
                      color: "var(--color-text-main)",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{opt.title}</div>
                    <div style={{ fontSize: "0.73rem", color: "var(--color-text-sub)", marginTop: "2px" }}>
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Granular Permission Groups */}
          {groupedDefinitions.map(([groupName, items]) => (
            <div
              key={groupName}
              style={{
                border: "1px solid var(--color-border, #e2e8f0)",
                borderRadius: "14px",
                overflow: "hidden",
                backgroundColor: "var(--color-bg, #f8fafc)",
              }}
            >
              <div
                style={{
                  padding: "0.65rem 1rem",
                  borderBottom: "1px solid var(--color-border, #e2e8f0)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--color-text-sub)",
                  backgroundColor: "var(--color-surface, #ffffff)",
                }}
              >
                {groupName}
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {items.map((perm, idx) => {
                  const checked = permMap[perm.key];
                  const isCustomOverride = checked !== roleDefaults[perm.key];

                  return (
                    <label
                      key={perm.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "1rem",
                        padding: "0.85rem 1rem",
                        borderBottom: idx < items.length - 1 ? "1px solid var(--color-border, #e2e8f0)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{perm.label}</span>
                          {perm.optInOnly && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "99px",
                                backgroundColor: "rgba(239, 68, 68, 0.12)",
                                color: "#dc2626",
                              }}
                            >
                              <ShieldAlert size={11} /> Explicit Grant Only
                            </span>
                          )}
                          {isCustomOverride && (
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "99px",
                                backgroundColor: "rgba(59, 130, 246, 0.12)",
                                color: "#2563eb",
                              }}
                            >
                              Custom Override
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--color-text-sub)", marginTop: "2px" }}>
                          {perm.description}
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleTogglePermission(perm.key)}
                        style={{
                          width: "20px",
                          height: "20px",
                          accentColor: perm.optInOnly ? "#dc2626" : "var(--color-primary, #047857)",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--color-border, #e2e8f0)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            backgroundColor: "var(--color-surface, #ffffff)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: "0.7rem 1.2rem",
              borderRadius: "10px",
              border: "1px solid var(--color-border, #cbd5e1)",
              background: "transparent",
              color: "var(--color-text-main)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: "0.7rem 1.4rem",
              borderRadius: "10px",
              border: "none",
              background: "var(--color-primary, #047857)",
              color: "#ffffff",
              fontWeight: 600,
              cursor: isSaving ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            <Save size={17} />
            <span>{isSaving ? "Saving..." : "Save Access"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
