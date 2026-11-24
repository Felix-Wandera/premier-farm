"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../../(dashboard)/users/page.module.css";
import {
  Plus,
  Shield,
  User,
  Clock,
  MoreHorizontal,
  Search,
  Info,
  Mail,
  Link as LinkIcon,
  Send,
  Settings,
  Trash2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  UserCheck,
} from "lucide-react";
import EmptyState from "../ui/EmptyState";
import { useToast } from "../ui/Toast";
import {
  inviteUser,
  removeUser,
  resendInvitation,
  getInviteLinkByUserId,
} from "@/actions/user.actions";
import UserPermissionsModal, { PermissionMatrixEditor } from "./UserPermissionsModal";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";
import ConfirmationModal from "../ui/ConfirmationModal";
import PasswordInput from "../ui/PasswordInput";
import {
  ALL_PERMISSION_KEYS,
  AppRole,
  PermissionKey,
  ROLE_DEFAULT_PERMISSIONS,
  resolvePermissionMap,
} from "@/lib/permissions";
import { useAuth } from "../auth/AuthProvider";
import { QUICK_ACTION_EVENT, QuickActionId } from "@/lib/quick-actions";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#f43f5e",
  MANAGER: "#3b82f6",
  WORKER: "#64748b",
};

const MODULE_BADGE_SUMMARY: Array<{ label: string; keys: PermissionKey[] }> = [
  { label: "Herd", keys: ["herd:view", "herd:create", "herd:edit"] },
  { label: "Milk", keys: ["milk:view", "milk:log", "milk:manage_history"] },
  { label: "Breeding & Health", keys: ["health:view", "health:manage"] },
  { label: "Finances", keys: ["finances:view", "finances:manage"] },
  { label: "Inventory", keys: ["inventory:view", "inventory:transact", "inventory:manage"] },
  { label: "Analytics", keys: ["analytics:view", "exports:download"] },
  { label: "Admin", keys: ["users:manage", "settings:manage"] },
];

export interface TeamMemberRow {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: AppRole;
  lastActive: string;
  isPending?: boolean;
  isExpired?: boolean;
  expiryText?: string | null;
  hasCustomPermissions?: boolean;
  customPermissions?: Partial<Record<PermissionKey, boolean>>;
  permissionMap?: Record<PermissionKey, boolean>;
}

export default function ClientUserManagement({
  initialUsers,
}: {
  initialUsers: TeamMemberRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [isInviteOpen, setIsInviteOpen] = useState(
    () => searchParams.get("action") === "invite-member"
  );
  const [provisionMode, setProvisionMode] = useState<"invite" | "direct">("invite");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("WORKER");
  const [showInvitePerms, setShowInvitePerms] = useState(false);
  const [invitePermMap, setInvitePermMap] = useState<Record<PermissionKey, boolean>>(
    () => ({ ...ROLE_DEFAULT_PERMISSIONS.WORKER })
  );
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [actionMember, setActionMember] = useState<TeamMemberRow | null>(null);
  const isMobile = useIsMobile();
  const [backupInviteInfo, setBackupInviteInfo] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<TeamMemberRow | null>(null);

  const [editingMember, setEditingMember] = useState<TeamMemberRow | null>(null);
  const toast = useToast();

  useEffect(() => {
    const handleQuickAction = (e: Event) => {
      const detail = (e as CustomEvent<{ action: QuickActionId }>).detail;
      if (detail?.action === "invite-member") {
        setIsInviteOpen(true);
      }
    };
    window.addEventListener(QUICK_ACTION_EVENT, handleQuickAction);
    return () => window.removeEventListener(QUICK_ACTION_EVENT, handleQuickAction);
  }, []);

  const pendingCount = initialUsers.filter((m) => m.isPending).length;

  const filtered = initialUsers.filter((member) => {
    const matchesSearch =
      !searchQuery.trim() ||
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === "Pending") {
      return member.isPending;
    }
    const filterRole = activeFilter.toUpperCase();
    return activeFilter === "All" || member.role === filterRole;
  });

  const handleInviteRoleChange = (r: AppRole) => {
    const keepDelete = invitePermMap["herd:delete"];
    const next = { ...ROLE_DEFAULT_PERMISSIONS[r] };
    if (keepDelete) {
      next["herd:delete"] = true;
      next["herd:view"] = true;
    }
    setInviteRole(r);
    setInvitePermMap(next);
  };

  const resetInviteForm = () => {
    setInviteFirstName("");
    setInviteLastName("");
    setInviteEmail("");
    setInvitePassword("");
    setInviteRole("WORKER");
    setInvitePermMap({ ...ROLE_DEFAULT_PERMISSIONS.WORKER });
    setShowInvitePerms(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return toast("Email address is required.", "error");
    if (provisionMode === "direct") {
      if (!inviteFirstName.trim()) {
        return toast("First name is required when creating an account directly.", "error");
      }
      if (invitePassword.length < 6) {
        return toast("Password must be at least 6 characters.", "error");
      }
    }

    setIsInviting(true);
    setBackupInviteInfo(null);

    const res = await inviteUser({
      email: inviteEmail.trim(),
      firstName: inviteFirstName.trim() || undefined,
      lastName: inviteLastName.trim() || undefined,
      role: inviteRole,
      mode: provisionMode,
      password: provisionMode === "direct" ? invitePassword : undefined,
      permissionMap: invitePermMap,
    });

    setIsInviting(false);

    if (res.success) {
      toast(res.message, res.message.includes("failed") ? "warning" : "success");
      if (provisionMode === "direct") {
        resetInviteForm();
        setIsInviteOpen(false);
      } else {
        setBackupInviteInfo(res.backupInvite ?? null);
        resetInviteForm();
      }
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  };

  const copyInviteToClipboard = () => {
    if (backupInviteInfo) {
      navigator.clipboard.writeText(backupInviteInfo);
      toast("Invite details copied to clipboard!", "success");
    }
  };

  const confirmRemoveUser = async () => {
    if (!deletingUser) return;
    setIsRemoving(true);
    const res = await removeUser(deletingUser.id);
    setIsRemoving(false);
    toast(res.message, res.success ? "success" : "error");
    setDeletingUser(null);
    router.refresh();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Team &amp; Permissions</h1>
          <p className={styles.subtitle}>
            {initialUsers.length} ranch members • assign roles or customize individual access
          </p>
        </div>
        <button
          type="button"
          className={styles.desktopInviteBtn}
          onClick={() => setIsInviteOpen(true)}
        >
          <Plus size={18} strokeWidth={2.4} />
          <span>Add Staff Member</span>
        </button>
      </header>

      <div className={styles.searchBox}>
        <Search className={styles.searchIcon} size={18} />
        <input
          type="text"
          placeholder="Search team by name or email..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.filters} role="tablist">
        {["All", "Admin", "Manager", "Worker"].map((f) => (
          <button
            key={f}
            type="button"
            className={`${styles.filterPill} ${activeFilter === f ? styles.activePill : ""}`}
            onClick={() => setActiveFilter(f)}
            role="tab"
            aria-selected={activeFilter === f}
          >
            {f}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.filterPill} ${activeFilter === "Pending" ? styles.activePill : ""}`}
          onClick={() => setActiveFilter("Pending")}
          role="tab"
          aria-selected={activeFilter === "Pending"}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          Pending
          {pendingCount > 0 && (
            <span className={`${styles.pendingCountPill} tabular-nums`}>{pendingCount}</span>
          )}
        </button>
      </div>

      <div className={styles.teamList}>
        {filtered.length > 0 ? (
          filtered.map((member) => {
            const effectiveMap =
              member.permissionMap ||
              resolvePermissionMap(member.role, member.customPermissions);
            const roleDefaults = ROLE_DEFAULT_PERMISSIONS[member.role];

            let addedCount = 0;
            let removedCount = 0;
            let activePermCount = 0;
            for (const key of ALL_PERMISSION_KEYS) {
              if (effectiveMap[key]) activePermCount++;
              if (effectiveMap[key] && !roleDefaults[key]) addedCount++;
              if (!effectiveMap[key] && roleDefaults[key]) removedCount++;
            }

            const hasDeletePerm = effectiveMap["herd:delete"];
            const activeModules = MODULE_BADGE_SUMMARY.filter((mod) =>
              mod.keys.some((k) => effectiveMap[k])
            );

            return (
              <div key={member.id} className={styles.memberCard}>
                <div className={styles.avatarCircle}>
                  <User size={20} />
                </div>

                <div className={styles.memberInfo}>
                  <div className={styles.nameBadgeRow}>
                    <h3>{member.name}</h3>
                    {member.isPending && (
                      <span
                        className={
                          member.isExpired ? styles.badgeExpired : styles.badgePending
                        }
                      >
                        {member.isExpired ? "EXPIRED" : member.expiryText || "PENDING"}
                      </span>
                    )}
                    {addedCount > 0 && (
                      <span className={styles.badgeAdded}>+{addedCount} Added</span>
                    )}
                    {removedCount > 0 && (
                      <span className={styles.badgeRemoved}>
                        &minus;{removedCount} Restricted
                      </span>
                    )}
                    {hasDeletePerm && (
                      <span className={styles.badgeDeleteGrant}>
                        <ShieldAlert size={11} /> Delete Animals
                      </span>
                    )}
                  </div>

                  <p className={styles.emailLine}>
                    <Mail size={12} /> <span>{member.email}</span>
                  </p>

                  {/* Module Access Chips */}
                  <div className={styles.moduleChipsRow}>
                    {activeModules.map((mod) => (
                      <span key={mod.label} className={styles.moduleChip}>
                        {mod.label}
                      </span>
                    ))}
                    <span className={`${styles.permCountLabel} tabular-nums`}>
                      {activePermCount}/{ALL_PERMISSION_KEYS.length} capabilities
                    </span>
                  </div>

                  <div className={styles.metaFooterRow}>
                    <span className={styles.rolePill} style={{ color: ROLE_COLORS[member.role] }}>
                      {member.role}
                    </span>
                    <span className={styles.dotSep}>•</span>
                    <span className={styles.lastActiveText}>
                      <Clock size={11} />{" "}
                      {member.isPending ? `Invited ${member.lastActive}` : member.lastActive}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingMember(member)}
                      className={styles.permsLinkBtn}
                    >
                      <Shield size={12} />
                      <span>Manage Access</span>
                    </button>
                  </div>
                </div>

                <div className={styles.menuWrapper}>
                  <button
                    type="button"
                    className={styles.moreBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMobile) {
                        setActionMember(member);
                      } else {
                        setOpenMenuId(openMenuId === member.id ? null : member.id);
                      }
                    }}
                    aria-label="Member actions"
                  >
                    <MoreHorizontal size={20} />
                  </button>

                  {!isMobile && openMenuId === member.id && (
                    <div className={styles.dropdown}>
                      {member.isPending && (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              setOpenMenuId(null);
                              const res = await resendInvitation(member.id);
                              toast(res.message, res.success ? "success" : "error");
                              router.refresh();
                            }}
                          >
                            <Send size={14} />{" "}
                            {member.isExpired ? "Renew & Resend" : "Resend Invite"}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setOpenMenuId(null);
                              const res = await getInviteLinkByUserId(member.id);
                              if (res.success && res.link) {
                                navigator.clipboard.writeText(res.link);
                                toast("Setup link copied to clipboard!", "success");
                              } else {
                                toast(res.message || "Failed to copy link.", "error");
                              }
                            }}
                          >
                            <LinkIcon size={14} /> Copy Setup Link
                          </button>
                          <hr
                            style={{
                              margin: "4px 0",
                              border: "none",
                              borderTop: "1px solid var(--color-border)",
                            }}
                          />
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMember(member);
                          setOpenMenuId(null);
                        }}
                      >
                        <Shield size={14} /> Manage Access &amp; Role
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => {
                          setDeletingUser(member);
                          setOpenMenuId(null);
                        }}
                      >
                        <Trash2 size={14} /> Remove User
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={<Info size={36} />}
            title="No members found"
            description={
              searchQuery
                ? `No team members matched "${searchQuery}".`
                : "You haven't added any team members yet."
            }
            actionLabel="Add Staff Member"
            onAction={() => setIsInviteOpen(true)}
          />
        )}
      </div>

      {/* Add / Invite Staff Member Sheet */}
      <ResponsiveSheet
        isOpen={isInviteOpen}
        onClose={() => {
          setIsInviteOpen(false);
          setBackupInviteInfo(null);
        }}
        size="lg"
        title="Add Staff Member"
        subtitle="Send an email setup link or create an active account immediately"
        disableClose={isInviting}
        footer={
          !backupInviteInfo ? (
            <div style={{ display: "flex", gap: "0.65rem" }}>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                disabled={isInviting}
                className={sheetStyles.secondaryBtn}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={isInviting}
                className={sheetStyles.primaryBtn}
                style={{ flex: 1.7 }}
              >
                {provisionMode === "direct" ? <UserCheck size={18} /> : <Mail size={18} />}
                <span>
                  {isInviting
                    ? provisionMode === "direct"
                      ? "Creating Account..."
                      : "Sending Invite..."
                    : provisionMode === "direct"
                      ? "Create Staff Account"
                      : "Send Email Invite"}
                </span>
              </button>
            </div>
          ) : undefined
        }
      >
        {backupInviteInfo ? (
          <div className={sheetStyles.cardBox} style={{ borderColor: "var(--color-primary)" }}>
            <h3 style={{ margin: "0 0 0.4rem", color: "var(--color-primary)", fontSize: "1rem" }}>
              Invitation Generated
            </h3>
            <p style={{ margin: "0 0 0.85rem", fontSize: "0.85rem", color: "var(--color-text-sub)" }}>
              Copy the secure setup link below if you want to share it directly via WhatsApp or SMS:
            </p>
            <pre
              style={{
                margin: 0,
                padding: "0.75rem",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "10px",
                fontSize: "0.8rem",
                overflowX: "auto",
                color: "var(--color-text-main)",
              }}
            >
              {backupInviteInfo}
            </pre>
            <div style={{ display: "flex", gap: "0.65rem", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={copyInviteToClipboard}
                className={sheetStyles.primaryBtn}
                style={{ flex: 1 }}
              >
                Copy Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsInviteOpen(false);
                  setBackupInviteInfo(null);
                }}
                className={sheetStyles.secondaryBtn}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Provisioning Mode Toggle */}
            <div className={styles.modeTabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={provisionMode === "invite"}
                className={`${styles.modeTabBtn} ${
                  provisionMode === "invite" ? styles.modeTabActive : ""
                }`}
                onClick={() => setProvisionMode("invite")}
              >
                <Mail size={15} />
                <span>Send Invite Link</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={provisionMode === "direct"}
                className={`${styles.modeTabBtn} ${
                  provisionMode === "direct" ? styles.modeTabActive : ""
                }`}
                onClick={() => setProvisionMode("direct")}
              >
                <UserCheck size={15} />
                <span>Create Directly</span>
              </button>
            </div>

            <div className={sheetStyles.grid2}>
              <div className={sheetStyles.fieldGroup}>
                <label className={sheetStyles.label}>
                  First Name {provisionMode === "direct" ? "*" : "(Optional)"}
                </label>
                <input
                  type="text"
                  className={sheetStyles.input}
                  placeholder="e.g. Faith"
                  value={inviteFirstName}
                  onChange={(e) => setInviteFirstName(e.target.value)}
                />
              </div>

              <div className={sheetStyles.fieldGroup}>
                <label className={sheetStyles.label}>Last Name (Optional)</label>
                <input
                  type="text"
                  className={sheetStyles.input}
                  placeholder="e.g. Wandera"
                  value={inviteLastName}
                  onChange={(e) => setInviteLastName(e.target.value)}
                />
              </div>
            </div>

            <div className={sheetStyles.fieldGroup}>
              <label className={sheetStyles.label}>Email Address *</label>
              <input
                type="email"
                className={sheetStyles.input}
                placeholder="e.g. staff@premierranch.co.ke"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            {provisionMode === "direct" && (
              <div className={sheetStyles.fieldGroup}>
                <label className={sheetStyles.label}>Initial Password *</label>
                <PasswordInput
                  placeholder="Minimum 6 characters"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  isSubmitting={isInviting}
                />
              </div>
            )}

            <div className={sheetStyles.fieldGroup}>
              <label className={sheetStyles.label}>Base Role Preset</label>
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
                  const selected = inviteRole === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleInviteRoleChange(opt.value)}
                      style={{
                        padding: "0.7rem 0.65rem",
                        borderRadius: "12px",
                        border: selected
                          ? "2px solid var(--color-primary)"
                          : "1px solid var(--color-border)",
                        backgroundColor: selected
                          ? "var(--color-primary-light)"
                          : "var(--color-bg)",
                        color: "var(--color-text-main)",
                        textAlign: "left",
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{opt.title}</div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--color-text-sub)",
                          marginTop: "2px",
                        }}
                      >
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInvitePerms(!showInvitePerms)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                minHeight: "44px",
                padding: "0.65rem 0.9rem",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text-main)",
                fontWeight: 700,
                fontSize: "0.84rem",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <span>
                Customize Staff Permissions (
                {ALL_PERMISSION_KEYS.filter((k) => invitePermMap[k]).length}/
                {ALL_PERMISSION_KEYS.length} active)
              </span>
              {showInvitePerms ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showInvitePerms && (
              <PermissionMatrixEditor
                role={inviteRole}
                permMap={invitePermMap}
                onChangePermMap={setInvitePermMap}
                onResetDefaults={() =>
                  setInvitePermMap({ ...ROLE_DEFAULT_PERMISSIONS[inviteRole] })
                }
              />
            )}
          </>
        )}
      </ResponsiveSheet>

      {/* Granular Permissions Modal */}
      <UserPermissionsModal
        isOpen={!!editingMember}
        member={editingMember}
        onClose={() => {
          setEditingMember(null);
          refreshSession();
          router.refresh();
        }}
      />

      {/* Mobile Member Quick Action Sheet */}
      {isMobile && actionMember && (
        <div className={styles.actionSheetOverlay} onClick={() => setActionMember(null)}>
          <div className={styles.actionSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dragHandle} />
            <div className={styles.actionSheetTitle}>{actionMember.name}</div>

            {actionMember.isPending && (
              <>
                <button
                  type="button"
                  className={styles.actionSheetButton}
                  onClick={async () => {
                    const res = await resendInvitation(actionMember.id);
                    toast(res.message, res.success ? "success" : "error");
                    setActionMember(null);
                    router.refresh();
                  }}
                >
                  <Send size={19} color="#10b981" />{" "}
                  {actionMember.isExpired ? "Renew & Resend Invite" : "Resend Invite Email"}
                </button>
                <button
                  type="button"
                  className={styles.actionSheetButton}
                  onClick={async () => {
                    const res = await getInviteLinkByUserId(actionMember.id);
                    if (res.success && res.link) {
                      navigator.clipboard.writeText(res.link);
                      toast("Setup link copied to clipboard!", "success");
                    } else {
                      toast(res.message || "Failed to copy link.", "error");
                    }
                    setActionMember(null);
                  }}
                >
                  <LinkIcon size={19} color="#3b82f6" /> Copy Setup Link
                </button>
              </>
            )}

            <button
              type="button"
              className={styles.actionSheetButton}
              onClick={() => {
                setEditingMember(actionMember);
                setActionMember(null);
              }}
            >
              <Settings size={19} color="var(--color-primary)" /> Manage Access &amp; Permissions
            </button>

            <button
              type="button"
              className={`${styles.actionSheetButton} ${styles.deleteBtn}`}
              onClick={() => {
                setDeletingUser(actionMember);
                setActionMember(null);
              }}
            >
              <Trash2 size={19} color="#ef4444" /> Remove from Organization
            </button>

            <button
              type="button"
              className={`${styles.actionSheetButton} ${styles.cancelAction}`}
              onClick={() => setActionMember(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Theme-Safe Remove Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={confirmRemoveUser}
        title="Remove Team Member"
        message={
          <span>
            You are about to remove <strong>{deletingUser?.name}</strong>. They will immediately
            lose access to this organization.
          </span>
        }
        confirmText="Remove User"
        isLoading={isRemoving}
      />
    </div>
  );
}
