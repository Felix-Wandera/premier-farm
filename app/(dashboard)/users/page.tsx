"use client";
import React, { useState } from "react";
import styles from "./page.module.css";
import { Plus, Shield, User, Clock, MoreHorizontal } from "lucide-react";

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

  const filtered = activeFilter === "All" 
    ? MOCK_TEAM 
    : MOCK_TEAM.filter(m => m.role === activeFilter);

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

      {/* Role Filters */}
      <div className={styles.filters}>
        {["All", "Admin", "Manager", "Worker"].map(f => (
          <button 
            key={f} 
            className={`${styles.filterPill} ${activeFilter === f ? styles.activePill : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Team List */}
      <div className={styles.teamList}>
        {filtered.map(member => (
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

            <button className={styles.moreBtn}><MoreHorizontal size={20} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
