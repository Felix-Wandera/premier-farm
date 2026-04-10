"use client";
import React, { useState } from "react";
import styles from "../../../(dashboard)/users/page.module.css";
import { Plus, Shield, User, Clock, MoreHorizontal, Search, Info, X, Mail } from "lucide-react";
import EmptyState from "../ui/EmptyState";
import { useToast } from "../ui/Toast";
import { inviteUser } from "@/actions/user.actions";

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
  const [backupInviteInfo, setBackupInviteInfo] = useState<string | null>(null);

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
      setBackupInviteInfo(res.backupInvite);
      setInviteEmail(""); // clear email but leave modal open so they can see backup
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

      {/* Search */}
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

      {/* Role Filters */}
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

      {/* Team List */}
      <div className={styles.teamList}>
        {filtered.length > 0 ? (
          filtered.map(member => (
            <div key={member.id} className={styles.memberCard}>
              <div className={styles.avatarCircle}>
                <User size={22} />
              </div>

              <div className={styles.memberInfo}>
                <h3>{member.name}</h3>
                <p>{member.email}</p>
              </div>

              <div className={styles.memberMeta}>
                <span className={styles.roleBadge} style={{ background: `${ROLE_COLORS[member.role] || '#64748b'}15`, color: ROLE_COLORS[member.role] || '#64748b', borderColor: `${ROLE_COLORS[member.role] || '#64748b'}30` }}>
                  <Shield size={12} /> {member.role}
                </span>
                <span className={styles.lastSeen}>
                  <Clock size={12} /> {member.lastActive}
                </span>
              </div>

              <div className={styles.menuWrapper}>
                <button 
                  className={styles.moreBtn} 
                  onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                  aria-label="Actions"
                  aria-expanded={openMenuId === member.id}
                >
                  <MoreHorizontal size={20} />
                </button>
                
                {openMenuId === member.id && (
                  <div className={styles.dropdown}>
                    <button onClick={() => {toast("Edit feature coming soon", "info"); setOpenMenuId(null);}}>Edit Member</button>
                    <button onClick={() => {toast("Permissions restricted", "warning"); setOpenMenuId(null);}}>Change Role</button>
                    <button className={styles.deleteBtn} onClick={() => {toast("Cannot delete admin", "error"); setOpenMenuId(null);}}>Remove</button>
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

      {/* Invite Modal Overlay */}
      {isInviteOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: "1rem" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "12px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
             <div style={{ padding: "1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>Invite Team Member</h2>
               <button onClick={() => { setIsInviteOpen(false); setBackupInviteInfo(null); }} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} color="#64748b" /></button>
             </div>

             <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
                    style={{ marginTop: "0.5rem", width: "100%", padding: "0.875rem", backgroundColor: "#2563eb", color: "#fff", borderRadius: "8px", border: "none", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: isInviting ? "not-allowed" : "pointer", opacity: isInviting ? 0.7 : 1 }}
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
    </div>
  );
}
