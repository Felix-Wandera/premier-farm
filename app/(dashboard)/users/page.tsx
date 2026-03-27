"use client";
import React, { useState } from "react";
import styles from "./page.module.css";
import { Plus, Shield, User, Clock, MoreHorizontal, Search, Info } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/Toast";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Worker";
  lastActive: string;
  status: "Online" | "Offline";
};

const MOCK_TEAM: TeamMember[] = [
  { id: "1", name: "John Kamau", email: "john@premierfarm.co.ke", role: "Admin", lastActive: "Now", status: "Online" },
  { id: "2", name: "Mary Wanjiku", email: "mary@premierfarm.co.ke", role: "Manager", lastActive: "2h ago", status: "Online" },
  { id: "3", name: "David Ochieng", email: "david@premierfarm.co.ke", role: "Worker", lastActive: "Today 5:30 AM", status: "Offline" },
  { id: "4", name: "Grace Akinyi", email: "grace@premierfarm.co.ke", role: "Worker", lastActive: "Yesterday", status: "Offline" },
];

const ROLE_COLORS: Record<string, string> = {
  Admin: "#f43f5e",
  Manager: "#3b82f6",
  Worker: "#64748b",
};

export default function UserManagement() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const toast = useToast();

  const filtered = MOCK_TEAM.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = activeFilter === "All" || member.role === activeFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Team</h1>
          <p className={styles.subtitle}>{MOCK_TEAM.length} members</p>
        </div>
        <button className={styles.inviteBtn}>
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
                <span className={`${styles.presenceDot} ${member.status === 'Online' ? styles.online : ''}`}></span>
              </div>

              <div className={styles.memberInfo}>
                <h3>{member.name}</h3>
                <p>{member.email}</p>
              </div>

              <div className={styles.memberMeta}>
                <span className={styles.roleBadge} style={{ background: `${ROLE_COLORS[member.role]}15`, color: ROLE_COLORS[member.role], borderColor: `${ROLE_COLORS[member.role]}30` }}>
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
            onAction={() => toast("Invitation system coming soon!", "info")}
          />
        )}
      </div>
    </div>
  );
}
