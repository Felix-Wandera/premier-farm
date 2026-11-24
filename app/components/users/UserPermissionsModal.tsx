"use client";

import React, { useState, useMemo } from "react";
import { Save, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  AppRole,
  PERMISSION_DEFINITIONS,
  PermissionKey,
  ROLE_DEFAULT_PERMISSIONS,
  resolvePermissionMap,
} from "@/lib/permissions";
import { updateUserAccess } from "@/actions/user.actions";
import { useToast } from "../ui/Toast";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";

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

function PermissionsForm({
  onClose,
  member,
}: {
  onClose: () => void;
  member: NonNullable<UserPermissionsModalProps["member"]>;
}) {
  const toast = useToast();
  const [role, setRole] = useState<AppRole>(() => member.role);
  const [permMap, setPermMap] = useState<Record<PermissionKey, boolean>>(() =>
    member.permissionMap
      ? { ...member.permissionMap }
      : resolvePermissionMap(member.role, member.customPermissions)
  );
  const [isSaving, setIsSaving] = useState(false);

  const groupedDefinitions = useMemo(() => {
    const groups: Record<string, typeof PERMISSION_DEFINITIONS> = {};
    for (const def of PERMISSION_DEFINITIONS) {
      if (!groups[def.group]) groups[def.group] = [];
      groups[def.group].push(def);
    }
    return Object.entries(groups);
  }, []);

  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[role];
  const hasAnyDiff = Object.keys(roleDefaults).some(
    (k) => permMap[k as PermissionKey] !== roleDefaults[k as PermissionKey]
  );

  const handleRoleSelect = (newRole: AppRole) => {
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

      if (nextVal && def?.requires) {
        next[def.requires] = true;
      }

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
    <ResponsiveSheet
      isOpen={true}
      onClose={onClose}
      size="lg"
      zIndex={400}
      disableClose={isSaving}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={20} color="var(--color-primary)" />
          <span>Role &amp; Permissions</span>
        </span>
      }
      subtitle={`${member.name} • ${member.email}`}
      footer={
        <div style={{ display: "flex", gap: "0.65rem" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={sheetStyles.secondaryBtn}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={sheetStyles.primaryBtn}
            style={{ flex: 1.6 }}
          >
            <Save size={17} />
            <span>{isSaving ? "Saving..." : "Save Access"}</span>
          </button>
        </div>
      }
    >
      {/* Base Role Selector */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.4rem",
            marginBottom: "0.55rem",
          }}
        >
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--color-text-sub)",
            }}
          >
            Base Role Preset
          </span>
          {hasAnyDiff && (
            <button
              type="button"
              onClick={handleResetDefaults}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                fontSize: "0.78rem",
                fontWeight: 700,
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(115px, 1fr))",
            gap: "0.5rem",
          }}
        >
          {(
            [
              { value: "WORKER", title: "Worker", desc: "Field & Milk Entry" },
              { value: "MANAGER", title: "Manager", desc: "Ops & Reports" },
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
                  padding: "0.75rem 0.7rem",
                  borderRadius: "12px",
                  border: selected
                    ? "2px solid var(--color-primary)"
                    : "1px solid var(--color-border)",
                  backgroundColor: selected ? "var(--color-primary-light)" : "var(--color-bg)",
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
            border: "1px solid var(--color-border)",
            borderRadius: "14px",
            overflow: "hidden",
            backgroundColor: "var(--color-bg)",
          }}
        >
          <div
            style={{
              padding: "0.65rem 1rem",
              borderBottom: "1px solid var(--color-border)",
              fontSize: "0.76rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--color-text-sub)",
              backgroundColor: "var(--color-surface)",
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
                    gap: "0.85rem",
                    padding: "0.85rem 1rem",
                    borderBottom:
                      idx < items.length - 1 ? "1px solid var(--color-border)" : "none",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{perm.label}</span>
                      {perm.optInOnly && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            fontSize: "0.67rem",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "99px",
                            backgroundColor: "rgba(239, 68, 68, 0.14)",
                            color: "#ef4444",
                          }}
                        >
                          <ShieldAlert size={11} /> Explicit Grant
                        </span>
                      )}
                      {isCustomOverride && (
                        <span
                          style={{
                            fontSize: "0.67rem",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "99px",
                            backgroundColor: "rgba(59, 130, 246, 0.14)",
                            color: "#3b82f6",
                          }}
                        >
                          Override
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--color-text-sub)",
                        marginTop: "2px",
                        lineHeight: 1.4,
                      }}
                    >
                      {perm.description}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleTogglePermission(perm.key)}
                    style={{
                      width: "22px",
                      height: "22px",
                      accentColor: perm.optInOnly ? "#ef4444" : "var(--color-primary)",
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
    </ResponsiveSheet>
  );
}

export default function UserPermissionsModal({
  isOpen,
  onClose,
  member,
}: UserPermissionsModalProps) {
  if (!isOpen || !member) return null;
  return <PermissionsForm key={member.id} onClose={onClose} member={member} />;
}
