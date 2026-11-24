"use client";
import React, { useState, useEffect } from "react";
import styles from "../../(dashboard)/users/page.module.css";
import {
  Plus,
  Shield,
  User,
  Clock,
  MoreHorizontal,
  Search,
  Info,
  X,
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
import { inviteUser, removeUser, resendInvitation, getInviteLinkByUserId } from "@/actions/user.actions";
import UserPermissionsModal from "./UserPermissionsModal";
import {
  AppRole,
  PERMISSION_DEFINITIONS,
  PermissionKey,
  ROLE_DEFAULT_PERMISSIONS,
} from "@/lib/permissions";
import { useAuth } from "../auth/AuthProvider";
import { useRouter } from "next/navigation";

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

export default function ClientUserManagement({ initialUsers }: { initialUsers: any[] }) {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("WORKER");
  const [showInvitePerms, setShowInvitePerms] = useState(false);
  const [invitePermMap, setInvitePermMap] = useState<Record<PermissionKey, boolean>>(
    () => ({ ...ROLE_DEFAULT_PERMISSIONS.WORKER })
  );
  const [isInviting, setIsInviting] = useState(false);
  const [actionMember, setActionMember] = useState<any | null>(null);
  const isMobile = useIsMobile();
  const [backupInviteInfo, setBackupInviteInfo] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);

  // Granular Role & Permissions Modal
  const [editingMember, setEditingMember] = useState<any>(null);
  const toast = useToast();

  const pendingCount = initialUsers.filter((m) => m.isPending).length;

  const filtered = initialUsers.filter((member) => {
    const matchesSearch =
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Team &amp; Permissions</h1>
          <p className={styles.subtitle}>{initialUsers.length} organization members</p>
        </div>
        <button className={styles.inviteBtn} onClick={() => setIsInviteOpen(true)}>
          <Plus size={20} /> Invite
        </button>
      </header>

      <div className={styles.searchBox}>
        <Search className={styles.searchIcon} size={20} />
        <input
          type="text"
          placeholder="Search team members..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.filters} role="tablist">
        {["All", "Admin", "Manager", "Worker"].map((f) => (
          <button
            key={f}
            className={`${styles.filterPill} ${activeFilter === f ? styles.activePill : ""}`}
            onClick={() => setActiveFilter(f)}
            role="tab"
            aria-selected={activeFilter === f}
            aria-pressed={activeFilter === f}
          >
            {f}
          </button>
        ))}
        <button
          className={`${styles.filterPill} ${activeFilter === "Pending" ? styles.activePill : ""}`}
          onClick={() => setActiveFilter("Pending")}
          role="tab"
          aria-selected={activeFilter === "Pending"}
          aria-pressed={activeFilter === "Pending"}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          Pending
          {pendingCount > 0 && (
            <span
              style={{
                backgroundColor: activeFilter === "Pending" ? "rgba(255,255,255,0.25)" : "#fef08a",
                color: activeFilter === "Pending" ? "#fff" : "#854d0e",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: "10px",
              }}
            >
              {pendingCount}
            </span>
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
                  <User size={22} />
                </div>

                <div className={styles.memberInfo}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0 }}>{member.name}</h3>
                    {member.isPending && (
                      <span
                        style={{
                          backgroundColor: member.isExpired ? "#fee2e2" : "#fef9c3",
                          color: member.isExpired ? "#991b1b" : "#854d0e",
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          border: `1px solid ${member.isExpired ? "#fca5a5" : "#fef08a"}`,
                        }}
                      >
                        {member.isExpired ? "EXPIRED INVITE" : "PENDING"}
                      </span>
                    )}
                    {member.hasCustomPermissions && (
                      <span
                        style={{
                          backgroundColor: "rgba(59, 130, 246, 0.12)",
                          color: "#2563eb",
                          fontSize: "0.66rem",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "99px",
                        }}
                      >
                        CUSTOM ACCESS
                      </span>
                    )}
                    {hasDeletePerm && (
                      <span
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.12)",
                          color: "#dc2626",
                          fontSize: "0.66rem",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "99px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <ShieldAlert size={11} /> CAN DELETE ANIMALS
                      </span>
                    )}
                    {member.isPending && member.expiryText && !member.isExpired && (
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-sub)", fontWeight: 500 }}>
                        ({member.expiryText})
                      </span>
                    )}
                  </div>
                  <p>
                    <Mail size={12} strokeWidth={3} /> {member.email}
                  </p>
                  <div className={styles.lastSeen}>
                    <Clock size={12} /> {member.isPending ? `Invited on ${member.lastActive}` : member.lastActive}
                    <span style={{ fontSize: "0.9em", opacity: 0.5 }}>•</span>
                    <span style={{ color: ROLE_COLORS[member.role], fontWeight: 700, fontSize: "0.75rem" }}>
                      {member.role}
                    </span>
                    <span style={{ fontSize: "0.9em", opacity: 0.5 }}>•</span>
                    <button
                      type="button"
                      onClick={() => setEditingMember(member)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-primary, #047857)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Configure Permissions
                    </button>
                  </div>
                </div>

                <div className={styles.menuWrapper}>
                  <button
                    className={styles.moreBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMobile) {
                        setActionMember(member);
                      } else {
                        setOpenMenuId(openMenuId === member.id ? null : member.id);
                      }
                    }}
                    aria-label="Actions"
                  >
                    <MoreHorizontal size={20} />
                  </button>

                  {!isMobile && openMenuId === member.id && (
                    <div className={styles.dropdown}>
                      {member.isPending && (
                        <>
                          <button
                            onClick={async () => {
                              setOpenMenuId(null);
                              const res = await resendInvitation(member.id);
                              toast(res.message, res.success ? "success" : "error");
                            }}
                          >
                            <Send size={14} /> {member.isExpired ? "Renew & Resend" : "Resend Invite"}
                          </button>
                          <button
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
                          <hr style={{ margin: "4px 0", border: "none", borderTop: "1px solid var(--color-border)" }} />
                        </>
                      )}
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setOpenMenuId(null);
                        }}
                      >
                        <Shield size={14} /> Role &amp; Permissions
                      </button>
                      <button
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
                ? `We couldn't find any team members matching "${searchQuery}"`
                : "You haven't added any team members yet."
            }
            actionLabel="Invite Member"
            onAction={() => setIsInviteOpen(true)}
          />
        )}
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContainer} style={{ maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className={styles.dragHandle} />
            <div className={styles.modalHeader}>
              <h2>Invite Team Member</h2>
              <button
                onClick={() => {
                  setIsInviteOpen(false);
                  setBackupInviteInfo(null);
                }}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <X size={24} color="#64748b" />
              </button>
            </div>

            <div className={styles.modalBody}>
              {backupInviteInfo ? (
                <div style={{ backgroundColor: "#f0fdf4", padding: "1rem", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                  <h3 style={{ margin: "0 0 0.5rem 0", color: "#166534", fontSize: "1rem" }}>Invitation Generated</h3>
                  <p style={{ margin: "0 0 1rem 0", color: "#15803d", fontSize: "0.875rem" }}>
                    You can copy the secure link details below in case the email fails.
                  </p>
                  <pre style={{ margin: 0, padding: "0.75rem", backgroundColor: "#dcfce7", borderRadius: "6px", fontSize: "0.875rem", overflowX: "auto", color: "#166534" }}>
                    {backupInviteInfo}
                  </pre>
                  <button
                    onClick={copyInviteToClipboard}
                    style={{ marginTop: "1rem", width: "100%", padding: "0.5rem", backgroundColor: "#fff", border: "1px solid #22c55e", color: "#16a34a", borderRadius: "6px", cursor: "pointer", fontWeight: 500 }}
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => {
                      setIsInviteOpen(false);
                      setBackupInviteInfo(null);
                    }}
                    style={{ marginTop: "0.5rem", width: "100%", padding: "0.5rem", backgroundColor: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontWeight: 500 }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Email Address *</label>
                    <input
                      type="email"
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-main)" }}
                      placeholder="e.g. employee@premierranch.co.ke"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Base Role Assignment</label>
                    <select
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text-main)" }}
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
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg)",
                      color: "var(--color-text-main)",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    <span>Customize Granular Permissions (Finances, Analytics, etc.)</span>
                    {showInvitePerms ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showInvitePerms && (
                    <div
                      style={{
                        maxHeight: "240px",
                        overflowY: "auto",
                        border: "1px solid var(--color-border)",
                        borderRadius: "10px",
                        padding: "0.5rem 0.75rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      {PERMISSION_DEFINITIONS.map((def) => (
                        <label
                          key={def.key}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.83rem", padding: "0.35rem 0", cursor: "pointer" }}
                        >
                          <div>
                            <span style={{ fontWeight: 600 }}>{def.label}</span>
                            {def.optInOnly && (
                              <span style={{ marginLeft: "6px", fontSize: "0.68rem", color: "#dc2626", fontWeight: 700 }}>
                                (Opt-in only)
                              </span>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={invitePermMap[def.key]}
                            onChange={() => handleInvitePermToggle(def.key)}
                            style={{ width: "17px", height: "17px", accentColor: "var(--color-primary)" }}
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleInvite}
                    disabled={isInviting}
                    style={{
                      width: "100%",
                      padding: "0.875rem",
                      backgroundColor: "var(--color-primary, #047857)",
                      color: "#fff",
                      borderRadius: "8px",
                      border: "none",
                      fontWeight: 600,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                      cursor: isInviting ? "not-allowed" : "pointer",
                      opacity: isInviting ? 0.7 : 1,
                    }}
                  >
                    <Mail size={18} />
                    {isInviting ? "Sending Invitation..." : "Send Email Invite"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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

      {isMobile && actionMember && (
        <div className={styles.actionSheetOverlay} onClick={() => setActionMember(null)}>
          <div className={styles.actionSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dragHandle} />
            <div className={styles.actionSheetTitle}>{actionMember.name}</div>

            {actionMember.isPending && (
              <>
                <button
                  className={styles.actionSheetButton}
                  onClick={async () => {
                    const res = await resendInvitation(actionMember.id);
                    toast(res.message, res.success ? "success" : "error");
                    setActionMember(null);
                  }}
                >
                  <Send size={20} color="#10b981" />{" "}
                  {actionMember.isExpired ? "Renew & Resend Invitation" : "Resend Invitation Email"}
                </button>
                <button
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
                  <LinkIcon size={20} color="#3b82f6" /> Copy Setup Link
                </button>
              </>
            )}

            <button
              className={styles.actionSheetButton}
              onClick={() => {
                setEditingMember(actionMember);
                setActionMember(null);
              }}
            >
              <Settings size={20} color="#64748b" /> Role &amp; Granular Permissions
            </button>

            <button
              className={`${styles.actionSheetButton} ${styles.deleteBtn}`}
              onClick={() => {
                setDeletingUser(actionMember);
                setActionMember(null);
              }}
            >
              <Trash2 size={20} color="#f43f5e" /> Remove from Organization
            </button>

            <button className={`${styles.actionSheetButton} ${styles.cancelAction}`} onClick={() => setActionMember(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {deletingUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <h2>Remove Team Member</h2>
              <button onClick={() => setDeletingUser(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={24} color="#64748b" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div style={{ backgroundColor: "#fee2e2", color: "#ef4444", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem auto" }}>
                  <Trash2 size={32} />
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Are you sure?</h3>
                <p style={{ color: "#64748b", lineHeight: "1.5" }}>
                  You are about to remove <strong>{deletingUser.name}</strong>. They will immediately lose access to this organization.
                </p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  onClick={() => setDeletingUser(null)}
                  style={{ flex: 1, padding: "0.75rem", background: "#f1f5f9", border: "none", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const res = await removeUser(deletingUser.id);
                    toast(res.message, res.success ? "success" : "error");
                    setDeletingUser(null);
                    router.refresh();
                  }}
                  style={{ flex: 1, padding: "0.75rem", background: "#f43f5e", color: "#fff", border: "none", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  Remove User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
