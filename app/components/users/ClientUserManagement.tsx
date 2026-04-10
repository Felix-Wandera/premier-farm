"use client";
import React, { useState, useEffect } from "react";
import styles from "../../(dashboard)/users/page.module.css";
import { Plus, Shield, User, Clock, MoreHorizontal, Search, Info, X, Mail, Link as LinkIcon, Send, Settings, Trash2 } from "lucide-react";
import EmptyState from "../ui/EmptyState";
import { useToast } from "../ui/Toast";
import { inviteUser, updateUserRole, removeUser, resendInvitation, getInviteLinkByUserId } from "@/actions/user.actions";

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return isMobile;
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#f43f5e",
  MANAGER: "#3b82f6",
  WORKER: "#64748b",
};

export default function ClientUserManagement({ initialUsers }: { initialUsers: any[] }) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("WORKER");
  const [isInviting, setIsInviting] = useState(false);
  const [actionMember, setActionMember] = useState<any | null>(null);
  const isMobile = useIsMobile();
  const [backupInviteInfo, setBackupInviteInfo] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);

  // Role Edit Modal
  const [editingMember, setEditingMember] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("WORKER");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const toast = useToast();

  const filtered = initialUsers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const filterRole = activeFilter.toUpperCase();
    const matchesRole = activeFilter === "All" || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleInvite = async () => {
    if (!inviteEmail) return toast("Email is required", "error");
    
    setIsInviting(true);
    setBackupInviteInfo(null);
    
    const res = await inviteUser({ email: inviteEmail.trim(), role: inviteRole });
    
    setIsInviting(false);
    
    if (res.success) {
      toast(res.message, res.message.includes("failed") ? "warning" : "success");
      setBackupInviteInfo(res.backupInvite ?? null);
      setInviteEmail("");
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
          <h1 className={styles.pageTitle}>Team</h1>
          <p className={styles.subtitle}>{initialUsers.length} members</p>
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
        {["All", "Admin", "Manager", "Worker"].map(f => (
          <button 
            key={f} 
            className={`${styles.filterPill} ${activeFilter === f ? styles.activePill : ''}`}
            onClick={() => setActiveFilter(f)}
            role="tab"
            aria-selected={activeFilter === f}
            aria-pressed={activeFilter === f}
          >
            {f}
          </button>
        ))}
      </div>

      <div className={styles.teamList}>
        {filtered.length > 0 ? (
          filtered.map(member => (
            <div key={member.id} className={styles.memberCard}>
              <div className={styles.avatarCircle}>
                <User size={22} />
              </div>

              <div className={styles.memberInfo}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0 }}>{member.name}</h3>
                  {member.isPending && (
                    <span style={{ backgroundColor: "#fef9c3", color: "#854d0e", fontSize: "0.65rem", fontWeight: 800, padding: "1px 6px", borderRadius: "4px", border: "1px solid #fef08a" }}>
                      PENDING
                    </span>
                  )}
                </div>
                <p>
                  <Mail size={12} strokeWidth={3} /> {member.email}
                </p>
                <div className={styles.lastSeen}>
                  <Clock size={12} /> {member.lastActive}
                  <span style={{ fontSize: "0.9em", opacity: 0.5 }}>•</span>
                  <span style={{ color: ROLE_COLORS[member.role], fontWeight: 700, fontSize: "0.75rem" }}>{member.role}</span>
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
                        <button onClick={async () => {
                          setOpenMenuId(null);
                          const res = await resendInvitation(member.id);
                          toast(res.message, res.success ? "success" : "error");
                        }}>
                          <Send size={14} /> Resend Invite
                        </button>
                        <button onClick={async () => {
                          setOpenMenuId(null);
                          const res = await getInviteLinkByUserId(member.id);
                          if (res.success && res.link) {
                            navigator.clipboard.writeText(res.link);
                            toast("Setup link copied to clipboard!", "success");
                          } else {
                            toast(res.message || "Failed to copy link.", "error");
                          }
                        }}>
                          <LinkIcon size={14} /> Copy Setup Link
                        </button>
                        <hr style={{ margin: "4px 0", border: "none", borderTop: "1px solid var(--color-border)" }} />
                      </>
                    )}
                    <button onClick={() => {
                      setEditingMember(member);
                      setSelectedRole(member.role);
                      setOpenMenuId(null);
                    }}>
                      <Settings size={14} /> Edit Role
                    </button>
                    <button className={styles.deleteBtn} onClick={() => {
                      setDeletingUser(member);
                      setOpenMenuId(null);
                    }}>
                      <Trash2 size={14} /> Remove User
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <EmptyState 
            icon={<Info size={36} />}
            title="No members found"
            description={searchQuery ? `We couldn't find any team members matching "${searchQuery}"` : "You haven't added any team members yet."}
            actionLabel="Invite Member"
            onAction={() => setIsInviteOpen(true)}
          />
        )}
      </div>

      {isInviteOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContainer}>
             <div className={styles.dragHandle} />
             <div className={styles.modalHeader}>
               <h2>Invite Team Member</h2>
               <button onClick={() => { setIsInviteOpen(false); setBackupInviteInfo(null); }} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} color="#64748b" /></button>
             </div>

             <div className={styles.modalBody}>
               {backupInviteInfo ? (
                 <div style={{ backgroundColor: "#f0fdf4", padding: "1rem", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                    <h3 style={{ margin: "0 0 0.5rem 0", color: "#166534", fontSize: "1rem" }}>Invitation Generated</h3>
                    <p style={{ margin: "0 0 1rem 0", color: "#15803d", fontSize: "0.875rem" }}>You can copy the secure link details below in case the email fails.</p>
                    <pre style={{ margin: 0, padding: "0.75rem", backgroundColor: "#dcfce7", borderRadius: "6px", fontSize: "0.875rem", overflowX: "auto", color: "#166534" }}>{backupInviteInfo}</pre>
                    <button onClick={copyInviteToClipboard} style={{ marginTop: "1rem", width: "100%", padding: "0.5rem", backgroundColor: "#fff", border: "1px solid #22c55e", color: "#16a34a", borderRadius: "6px", cursor: "pointer", fontWeight: 500 }}>
                      Copy to Clipboard
                    </button>
                    <button onClick={() => { setIsInviteOpen(false); setBackupInviteInfo(null); }} style={{ marginTop: "0.5rem", width: "100%", padding: "0.5rem", backgroundColor: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontWeight: 500 }}>
                      Close
                    </button>
                 </div>
               ) : (
                 <>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Email Address *</label>
                    <input type="email" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }} placeholder="e.g. employee@farm.co.ke" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Role Assignment</label>
                    <select style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white" }} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                      <option value="WORKER">Worker (Data Entry)</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleInvite}
                    disabled={isInviting}
                    style={{ width: "100%", padding: "0.875rem", backgroundColor: "#2563eb", color: "#fff", borderRadius: "8px", border: "none", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isInviting ? "not-allowed" : "pointer", opacity: isInviting ? 0.7 : 1 }}
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

      {editingMember && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContainer}>
            <div className={styles.dragHandle} />
            <div className={styles.modalHeader}>
              <h2>Change Role — {editingMember.name}</h2>
              <button onClick={() => setEditingMember(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={22} color="#64748b" /></button>
            </div>
            <div className={styles.modalBody}>
              <select style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white" }} value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                <option value="WORKER">Worker</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Administrator</option>
              </select>
              <button
                onClick={async () => {
                  setIsUpdatingRole(true);
                  const res = await updateUserRole(editingMember.id, selectedRole);
                  setIsUpdatingRole(false);
                  toast(res.message, res.success ? "success" : "error");
                  if (res.success) setEditingMember(null);
                }}
                disabled={isUpdatingRole}
                className={styles.saveBtn}
              >
                {isUpdatingRole ? "Saving..." : "Save Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isMobile && actionMember && (
        <div className={styles.actionSheetOverlay} onClick={() => setActionMember(null)}>
           <div className={styles.actionSheet} onClick={e => e.stopPropagation()}>
              <div className={styles.dragHandle} />
              <div className={styles.actionSheetTitle}>{actionMember.name}</div>
              
              {actionMember.isPending && (
                <>
                  <button className={styles.actionSheetButton} onClick={async () => {
                    const res = await resendInvitation(actionMember.id);
                    toast(res.message, res.success ? "success" : "error");
                    setActionMember(null);
                  }}>
                    <Send size={20} color="#10b981" /> Resend Invitation Email
                  </button>
                  <button className={styles.actionSheetButton} onClick={async () => {
                    const res = await getInviteLinkByUserId(actionMember.id);
                    if (res.success && res.link) {
                      navigator.clipboard.writeText(res.link);
                      toast("Setup link copied to clipboard!", "success");
                    } else {
                      toast(res.message || "Failed to copy link.", "error");
                    }
                    setActionMember(null);
                  }}>
                    <LinkIcon size={20} color="#3b82f6" /> Copy Setup Link
                  </button>
                </>
              )}

              <button className={styles.actionSheetButton} onClick={() => {
                setEditingMember(actionMember);
                setSelectedRole(actionMember.role);
                setActionMember(null);
              }}>
                <Settings size={20} color="#64748b" /> Change User Role
              </button>

              <button className={`${styles.actionSheetButton} ${styles.deleteBtn}`} onClick={() => {
                setDeletingUser(actionMember);
                setActionMember(null);
              }}>
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
                <button onClick={() => setDeletingUser(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} color="#64748b" /></button>
             </div>
             <div className={styles.modalBody}>
                <div style={{ textAlign: "center", padding: "1rem 0" }}>
                  <div style={{ backgroundColor: "#fee2e2", color: "#ef4444", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem auto" }}>
                    <Trash2 size={32} />
                  </div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Are you sure?</h3>
                  <p style={{ color: "#64748b", lineHeight: "1.5" }}>
                    You are about to remove <strong>{deletingUser.name}</strong>. 
                    They will immediately lose access to the platform. This action can be reversed later by an administrator.
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
