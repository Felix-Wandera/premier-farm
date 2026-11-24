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
} from "lucide-react";
import EmptyState from "../ui/EmptyState";
import { useToast } from "../ui/Toast";
import {
  inviteUser,
  removeUser,
  resendInvitation,
  getInviteLinkByUserId,
} from "@/actions/user.actions";
import UserPermissionsModal from "./UserPermissionsModal";
import ResponsiveSheet from "../ui/ResponsiveSheet";
import sheetStyles from "../ui/ResponsiveSheet.module.css";
import ConfirmationModal from "../ui/ConfirmationModal";
import {
  AppRole,
  PERMISSION_DEFINITIONS,
  PermissionKey,
  ROLE_DEFAULT_PERMISSIONS,
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

export interface TeamMemberRow {
  id: string;
  name: string;
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
  const [inviteEmail, setInviteEmail] = useState("");
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
    setInviteRole(r);
    setInvitePermMap({ ...ROLE_DEFAULT_PERMISSIONS[r] });
  };

  const handleInvitePermToggle = (key: PermissionKey) => {
    setInvitePermMap((prev) => {
      const nextVal = !prev[key];
      const next = { ...prev, [key]: nextVal };
      const def = PERMISSION_DEFINITIONS.find((d) => d.key === key);
      if (nextVal && def?.requires) next[def.requires] = true;
      if (!nextVal) {
        for (const c of PERMISSION_DEFINITIONS) {
          if (c.requires === key) next[c.key] = false;
        }
      }
      return next;
    });
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return toast("Email is required", "error");

    setIsInviting(true);
    setBackupInviteInfo(null);

    const res = await inviteUser({
      email: inviteEmail.trim(),
      role: inviteRole,
      permissionMap: invitePermMap,
    });

    setIsInviting(false);

    if (res.success) {
      toast(res.message, res.message.includes("failed") ? "warning" : "success");
      setBackupInviteInfo(res.backupInvite ?? null);
      setInviteEmail("");
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
          <p className={styles.subtitle}>{initialUsers.length} ranch members</p>
        </div>
        <button
          type="button"
          className={styles.desktopInviteBtn}
          onClick={() => setIsInviteOpen(true)}
        >
          <Plus size={18} strokeWidth={2.4} />
          <span>Invite Member</span>
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
            const hasDeletePerm = member.permissionMap?.["herd:delete"];
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
                        {member.isExpired ? "EXPIRED" : "PENDING"}
                      </span>
                    )}
                    {member.hasCustomPermissions && (
                      <span className={styles.badgeCustom}>CUSTOM</span>
                    )}
                    {hasDeletePerm && (
                      <span className={styles.badgeDeleteGrant}>
                        <ShieldAlert size={11} /> DELETE GRANT
                      </span>
                    )}
                  </div>

                  <p className={styles.emailLine}>
                    <Mail size={12} /> <span>{member.email}</span>
                  </p>

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
                      Permissions &rarr;
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
                        <Shield size={14} /> Role &amp; Permissions
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
            actionLabel="Invite Member"
            onAction={() => setIsInviteOpen(true)}
          />
        )}
      </div>

      {/* Invite Sheet */}
      <ResponsiveSheet
        isOpen={isInviteOpen}
        onClose={() => {
          setIsInviteOpen(false);
          setBackupInviteInfo(null);
        }}
        size="md"
        title="Invite Team Member"
        subtitle="Send an email invite and assign role permissions"
        disableClose={isInviting}
        footer={
          !backupInviteInfo ? (
            <button
              type="button"
              onClick={handleInvite}
              disabled={isInviting}
              className={sheetStyles.primaryBtn}
            >
              <Mail size={18} />
              <span>{isInviting ? "Sending Invitation..." : "Send Email Invite"}</span>
            </button>
          ) : undefined
        }
      >
        {backupInviteInfo ? (
          <div className={sheetStyles.cardBox} style={{ borderColor: "var(--color-primary)" }}>
            <h3 style={{ margin: "0 0 0.4rem", color: "var(--color-primary)", fontSize: "1rem" }}>
              Invitation Generated
            </h3>
            <p style={{ margin: "0 0 0.85rem", fontSize: "0.85rem", color: "var(--color-text-sub)" }}>
              Copy the secure setup link below if you want to share it directly:
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
            <div className={sheetStyles.fieldGroup}>
              <label className={sheetStyles.label}>Email Address *</label>
              <input
                type="email"
                className={sheetStyles.input}
                placeholder="e.g. employee@premierranch.co.ke"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className={sheetStyles.fieldGroup}>
              <label className={sheetStyles.label}>Base Role Assignment</label>
              <select
                className={sheetStyles.select}
                value={inviteRole}
                onChange={(e) => handleInviteRoleChange(e.target.value as AppRole)}
              >
                <option value="WORKER">Worker (Field &amp; Milk Logging)</option>
                <option value="MANAGER">Manager (Operations, Finances &amp; Analytics)</option>
                <option value="ADMIN">Administrator (Full Organization Access)</option>
              </select>
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
              <span>Customize Granular Permissions</span>
              {showInvitePerms ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showInvitePerms && (
              <div
                style={{
                  maxHeight: "240px",
                  overflowY: "auto",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  padding: "0.4rem 0.85rem",
                  backgroundColor: "var(--color-bg)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {PERMISSION_DEFINITIONS.map((def, idx) => (
                  <label
                    key={def.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      fontSize: "0.84rem",
                      padding: "0.55rem 0",
                      borderBottom:
                        idx < PERMISSION_DEFINITIONS.length - 1
                          ? "1px solid var(--color-border)"
                          : "none",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{def.label}</span>
                      {def.optInOnly && (
                        <span
                          style={{
                            marginLeft: "6px",
                            fontSize: "0.68rem",
                            color: "#ef4444",
                            fontWeight: 700,
                          }}
                        >
                          (Opt-in)
                        </span>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={invitePermMap[def.key]}
                      onChange={() => handleInvitePermToggle(def.key)}
                      style={{
                        width: "20px",
                        height: "20px",
                        accentColor: "var(--color-primary)",
                        flexShrink: 0,
                      }}
                    />
                  </label>
                ))}
              </div>
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
              <Settings size={19} color="var(--color-primary)" /> Role &amp; Permissions
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
