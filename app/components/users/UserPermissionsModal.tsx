"use client";

import React, { useState, useMemo } from "react";
import {
  Save,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  X,
  Plus,
  Minus,
} from "lucide-react";
import {
  ALL_PERMISSION_KEYS,
  AppRole,
  PERMISSION_DEFINITIONS,
  PermissionDefinition,
  PermissionKey,
  ROLE_DEFAULT_PERMISSIONS,
  resolvePermissionMap,
} from "@/lib/permissions";
import { updateUserAccess } from "@/actions/user.actions";
import { useToast } from "../ui/Toast";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";

export function applyPermissionToggle(
  prev: Record<PermissionKey, boolean>,
  key: PermissionKey,
  explicitValue?: boolean
): Record<PermissionKey, boolean> {
  const nextVal = explicitValue !== undefined ? explicitValue : !prev[key];
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
}

export function PermissionMatrixEditor({
  role,
  permMap,
  onChangePermMap,
  onResetDefaults,
}: {
  role: AppRole;
  permMap: Record<PermissionKey, boolean>;
  onChangePermMap: React.Dispatch<React.SetStateAction<Record<PermissionKey, boolean>>>;
  onResetDefaults: () => void;
}) {
  const groupedDefinitions = useMemo(() => {
    const groups: Record<string, PermissionDefinition[]> = {};
    for (const def of PERMISSION_DEFINITIONS) {
      if (!groups[def.group]) groups[def.group] = [];
      groups[def.group].push(def);
    }
    return Object.entries(groups);
  }, []);

  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[role];

  const { addedList, removedList, activeCount } = useMemo(() => {
    const added: PermissionDefinition[] = [];
    const removed: PermissionDefinition[] = [];
    let count = 0;

    for (const def of PERMISSION_DEFINITIONS) {
      const active = Boolean(permMap[def.key]);
      const base = Boolean(roleDefaults[def.key]);
      if (active) count++;
      if (active && !base) added.push(def);
      if (!active && base) removed.push(def);
    }

    return { addedList: added, removedList: removed, activeCount: count };
  }, [permMap, roleDefaults]);

  const hasAnyDiff = addedList.length > 0 || removedList.length > 0;

  const handleToggle = (key: PermissionKey, explicitValue?: boolean) => {
    onChangePermMap((prev) => applyPermissionToggle(prev, key, explicitValue));
  };

  const handleGrantGroup = (items: PermissionDefinition[]) => {
    onChangePermMap((prev) => {
      let next = { ...prev };
      for (const item of items) {
        if (item.optInOnly) continue;
        next = applyPermissionToggle(next, item.key, true);
      }
      return next;
    });
  };

  const handleRevokeGroup = (items: PermissionDefinition[]) => {
    onChangePermMap((prev) => {
      let next = { ...prev };
      for (const item of items) {
        next = applyPermissionToggle(next, item.key, false);
      }
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      {/* Live Summary & Quick Remove/Restore Override Chips */}
      <div
        style={{
          padding: "0.85rem 1rem",
          borderRadius: "14px",
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg)",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--color-text-main)" }}>
            Active Access:{" "}
            <span style={{ color: "var(--color-primary)" }} className="tabular-nums">
              {activeCount} / {ALL_PERMISSION_KEYS.length}
            </span>{" "}
            permissions
          </div>
          {hasAnyDiff ? (
            <button
              type="button"
              onClick={onResetDefaults}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "99px",
                padding: "0.28rem 0.7rem",
                color: "var(--color-text-main)",
                fontSize: "0.75rem",
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <RotateCcw size={12} /> Reset to {role} Defaults
            </button>
          ) : (
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-sub)", fontWeight: 600 }}>
              Using standard {role} preset
            </span>
          )}
        </div>

        {addedList.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "#059669",
              }}
            >
              + Added Beyond {role} ({addedList.length}) — tap to remove
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {addedList.map((perm) => (
                <button
                  key={perm.key}
                  type="button"
                  onClick={() => handleToggle(perm.key, false)}
                  title={`Remove ${perm.label}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "0.26rem 0.6rem",
                    borderRadius: "99px",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                    color: "#059669",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <span>{perm.label}</span>
                  <X size={12} />
                </button>
              ))}
            </div>
          </div>
        )}

        {removedList.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "#d97706",
              }}
            >
              &minus; Removed From {role} ({removedList.length}) — tap to restore
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {removedList.map((perm) => (
                <button
                  key={perm.key}
                  type="button"
                  onClick={() => handleToggle(perm.key, true)}
                  title={`Restore ${perm.label}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "0.26rem 0.6rem",
                    borderRadius: "99px",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    backgroundColor: "rgba(245, 158, 11, 0.12)",
                    color: "#d97706",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <span>{perm.label}</span>
                  <RotateCcw size={11} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Granular Permission Groups */}
      {groupedDefinitions.map(([groupName, items]) => {
        const standardItems = items.filter((i) => !i.optInOnly);
        const activeInGroup = items.filter((i) => permMap[i.key]).length;
        const allStandardGranted = standardItems.every((i) => permMap[i.key]);
        const anyGranted = activeInGroup > 0;

        return (
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
                padding: "0.6rem 0.95rem",
                borderBottom: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span
                  style={{
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "var(--color-text-sub)",
                  }}
                >
                  {groupName}
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "1px 7px",
                    borderRadius: "99px",
                    backgroundColor:
                      activeInGroup > 0 ? "var(--color-primary-light)" : "var(--color-bg)",
                    color:
                      activeInGroup > 0 ? "var(--color-primary)" : "var(--color-text-sub)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {activeInGroup}/{items.length}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                {!allStandardGranted && (
                  <button
                    type="button"
                    onClick={() => handleGrantGroup(items)}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      padding: "2px 8px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      fontFamily: "inherit",
                      color: "var(--color-primary)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <Plus size={11} /> Add All
                  </button>
                )}
                {anyGranted && (
                  <button
                    type="button"
                    onClick={() => handleRevokeGroup(items)}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      padding: "2px 8px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      fontFamily: "inherit",
                      color: "var(--color-text-sub)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <Minus size={11} /> Remove All
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {items.map((perm, idx) => {
                const checked = Boolean(permMap[perm.key]);
                const baseVal = Boolean(roleDefaults[perm.key]);
                const isAdded = checked && !baseVal;
                const isRemoved = !checked && baseVal;
                const parentLabel = perm.requires
                  ? PERMISSION_DEFINITIONS.find((d) => d.key === perm.requires)?.label
                  : null;

                const switchColor = perm.optInOnly ? "#ef4444" : "var(--color-primary)";

                return (
                  <div
                    key={perm.key}
                    onClick={() => handleToggle(perm.key)}
                    role="switch"
                    aria-checked={checked}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        handleToggle(perm.key);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.85rem",
                      padding: "0.85rem 0.95rem",
                      borderBottom:
                        idx < items.length - 1 ? "1px solid var(--color-border)" : "none",
                      cursor: "pointer",
                      backgroundColor: checked ? "transparent" : "rgba(100, 116, 139, 0.03)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            color: checked ? "var(--color-text-main)" : "var(--color-text-sub)",
                          }}
                        >
                          {perm.label}
                        </span>
                        {perm.optInOnly && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              fontSize: "0.66rem",
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
                        {isAdded && (
                          <span
                            style={{
                              fontSize: "0.66rem",
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: "99px",
                              backgroundColor: "rgba(16, 185, 129, 0.14)",
                              color: "#059669",
                            }}
                          >
                            + Added
                          </span>
                        )}
                        {isRemoved && (
                          <span
                            style={{
                              fontSize: "0.66rem",
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: "99px",
                              backgroundColor: "rgba(245, 158, 11, 0.16)",
                              color: "#d97706",
                            }}
                          >
                            &minus; Removed
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
                        {parentLabel ? ` (Requires: ${parentLabel})` : ""}
                      </div>
                    </div>

                    {/* Custom Tactile Switch */}
                    <span
                      aria-hidden="true"
                      style={{
                        width: "44px",
                        height: "25px",
                        borderRadius: "99px",
                        backgroundColor: checked ? switchColor : "var(--color-border)",
                        padding: "2px",
                        display: "inline-flex",
                        alignItems: "center",
                        transition: "background-color 0.18s ease",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: "21px",
                          height: "21px",
                          borderRadius: "50%",
                          backgroundColor: "#ffffff",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.25)",
                          transform: checked ? "translateX(19px)" : "translateX(0px)",
                          transition: "transform 0.18s ease",
                        }}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
          <span>Manage Staff Access</span>
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
            <span>{isSaving ? "Saving Access..." : "Save Permissions"}</span>
          </button>
        </div>
      }
    >
      {/* Base Role Selector */}
      <div>
        <div
          style={{
            fontSize: "0.78rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--color-text-sub)",
            marginBottom: "0.55rem",
          }}
        >
          1. Base Role Preset
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
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{opt.title}</div>
                <div
                  style={{ fontSize: "0.73rem", color: "var(--color-text-sub)", marginTop: "2px" }}
                >
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "0.78rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--color-text-sub)",
            marginBottom: "0.55rem",
          }}
        >
          2. Add, Edit, or Remove Specific Permissions
        </div>

        <PermissionMatrixEditor
          role={role}
          permMap={permMap}
          onChangePermMap={setPermMap}
          onResetDefaults={handleResetDefaults}
        />
      </div>
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
