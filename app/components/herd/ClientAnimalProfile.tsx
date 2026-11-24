"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Activity, Droplet, HeartPulse, Info, DollarSign, Skull, Trash2, Edit2, Check, X } from "lucide-react";
import styles from "../../(dashboard)/herd/[id]/page.module.css";
import AnimalIcon from "../ui/AnimalIcon";
import EditAnimalModal from "./EditAnimalModal";
import StatusUpdateModal from "./StatusUpdateModal";
import DeleteAnimalModal from "./DeleteAnimalModal";
import { updateAnimal, updateAnimalStatus } from "@/actions/animal.actions";
import { updateSingleMilkLog, deleteSingleMilkLog } from "@/actions/milk.actions";
import { useToast } from "../ui/Toast";
import { useAuth } from "../auth/AuthProvider";
import ConfirmationModal from "../ui/ConfirmationModal";
import OutlierWarningModal from "../ui/OutlierWarningModal";

function calculateAge(dob: Date | null) {
  if (!dob) return "Unknown";
  const diff = Date.now() - new Date(dob).getTime();
  const ageDate = new Date(diff);
  const years = Math.abs(ageDate.getUTCFullYear() - 1970);
  const months = ageDate.getUTCMonth();
  if (years > 0) return `${years} yrs ${months} mos`;
  if (months > 0) return `${months} mos`;
  return "Newborn";
}

function formatSpecies(s: string) {
  if (s === "DAIRY_COW") return "Dairy Cow";
  if (s === "INDIGENOUS_COW") return "Indigenous";
  if (s === "BULL") return "Bull";
  if (s === "HEIFER") return "Heifer";
  if (s === "SHEEP") return "Sheep";
  if (s === "GOAT") return "Goat";
  return s;
}

export default function ClientAnimalProfile({ initialData }: { initialData: any }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("herd:edit");
  const canDelete = hasPermission("herd:delete");
  const canManageMilkHistory = hasPermission("milk:manage_history");
  const canViewFinances = hasPermission("finances:view");

  const [activeTab, setActiveTab] = useState<"info" | "milk" | "health" | "breeding">("info");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [milkLogs, setMilkLogs] = useState<any[]>(initialData?.milkLogs || []);
  const [editingMilkLogId, setEditingMilkLogId] = useState<string | null>(null);
  const [editMilkYield, setEditMilkYield] = useState<string>("");
  const [isMilkActionLoading, setIsMilkActionLoading] = useState(false);
  const [deletingMilkLog, setDeletingMilkLog] = useState<{ id: string; session: string; date: string; amount: number } | null>(null);
  const [milkOutlierState, setMilkOutlierState] = useState<{ logId: string; warnings: string[]; canOverride: boolean } | null>(null);
  const toast = useToast();

  const handleStartMilkEdit = (log: any) => {
    setEditingMilkLogId(log.id);
    setEditMilkYield(String(log.amountLiters));
  };

  const handleSaveMilkEdit = async (logId: string, overrideWarnings = false) => {
    const val = parseFloat(editMilkYield);
    if (isNaN(val) || val <= 0 || val > 60) {
      toast("Please enter a valid yield between 0.1 and 60 Liters.", "error");
      return;
    }
    setIsMilkActionLoading(true);
    const res: any = await updateSingleMilkLog(logId, val, overrideWarnings);
    setIsMilkActionLoading(false);

    if (res.code === "OUTLIER_WARNING" && res.warnings) {
      setMilkOutlierState({
        logId,
        warnings: res.warnings,
        canOverride: Boolean(res.canOverride),
      });
      return;
    }

    setMilkOutlierState(null);

    if (res.success) {
      toast(res.message, "success");
      setMilkLogs((prev) => prev.map((item) => (item.id === logId ? { ...item, amountLiters: val } : item)));
      setEditingMilkLogId(null);
    } else {
      toast(res.message, "error");
    }
  };

  const handleDeleteMilkLog = (log: any) => {
    setDeletingMilkLog({
      id: log.id,
      session: log.milkingTime,
      date: new Date(log.recordDate || log.date).toLocaleDateString(),
      amount: log.amountLiters,
    });
  };

  const confirmDeleteMilkLog = async () => {
    if (!deletingMilkLog) return;
    setIsMilkActionLoading(true);
    const res = await deleteSingleMilkLog(deletingMilkLog.id);
    setIsMilkActionLoading(false);
    if (res.success) {
      toast(res.message, "success");
      setMilkLogs((prev) => prev.filter((item) => item.id !== deletingMilkLog.id));
      setDeletingMilkLog(null);
    } else {
      toast(res.message, "error");
    }
  };

  if (!initialData) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Animal not found.</div>;
  }

  const ageInfo = calculateAge(initialData.dateOfBirth);
  const prettySpecies = formatSpecies(initialData.species);
  const displayStatus = initialData.status.charAt(0).toUpperCase() + initialData.status.slice(1).toLowerCase();

  const births = initialData.breedingEvents?.filter((e: any) => e.eventType === "BIRTH" && e.actualDate) || [];
  const lastCalved =
    births.length > 0
      ? new Date(births[0].actualDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
      : "Never";

  return (
    <div className={styles.container}>
      {/* Sticky Header */}
      <header className={styles.header}>
        <Link href="/herd" className={styles.backBtn}>
          <ArrowLeft size={24} />
        </Link>
        <div className={styles.headerActions} style={{ display: "flex", gap: "0.5rem" }}>
          {canEdit && (
            <button
              className={styles.iconBtn}
              aria-label="Edit Profile"
              title="Edit Animal Profile"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit size={20} />
            </button>
          )}
          {canDelete && (
            <button
              className={styles.iconBtn}
              aria-label="Delete Animal"
              title="Delete Animal Record"
              onClick={() => setIsDeleteModalOpen(true)}
              style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.35)" }}
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </header>

      {canEdit && (
        <>
          <EditAnimalModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            animal={initialData}
            onSave={async (data) => {
              const res = await updateAnimal(initialData.id, data);
              if (res.success) router.refresh();
              return res;
            }}
          />

          <StatusUpdateModal
            isOpen={isStatusModalOpen}
            onClose={() => setIsStatusModalOpen(false)}
            animal={initialData}
            onSave={async (id, status, data) => {
              const res = await updateAnimalStatus(id, status, data);
              if (res.success) router.refresh();
              return res;
            }}
          />
        </>
      )}

      {canDelete && (
        <DeleteAnimalModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onOpenStatusModal={canEdit ? () => setIsStatusModalOpen(true) : undefined}
          animal={initialData}
        />
      )}

      {/* Cover Profile */}
      <section className={styles.cover}>
        <div
          className={styles.profileBadge}
          onClick={() => {
            if (canEdit && initialData.status !== "DECEASED" && initialData.status !== "SOLD") {
              setIsStatusModalOpen(true);
            }
          }}
          style={{
            cursor: canEdit && initialData.status !== "DECEASED" && initialData.status !== "SOLD" ? "pointer" : "default",
          }}
          title={canEdit && initialData.status !== "DECEASED" && initialData.status !== "SOLD" ? "Click to record Sold or Deceased" : undefined}
        >
          <div className={`${styles.statusDot} ${initialData.status === "SICK" ? styles.dotSick : ""}`}></div>
          {displayStatus}
        </div>
        <h1 className={styles.tagTitle} style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center" }}>
          <AnimalIcon species={prettySpecies} size={38} />
          {initialData.name || initialData.tagNumber}{" "}
          {initialData.tagNumber && initialData.name && (
            <span style={{ fontSize: "0.6em", opacity: 0.8, fontWeight: 600 }}>#{initialData.tagNumber}</span>
          )}
        </h1>
        <p className={styles.subtitle}>
          {prettySpecies}
          {initialData.breed ? ` • ${initialData.breed}` : ""} • {initialData.gender === "MALE" ? "Male" : "Female"}
        </p>

        <div className={styles.quickStats}>
          <div className={styles.statBox}>
            <span>Age</span>
            <strong>{ageInfo}</strong>
          </div>
          <div className={styles.statBox}>
            <span>Last Calved</span>
            <strong>{lastCalved}</strong>
          </div>
        </div>

        {/* Sale Banner if SOLD */}
        {initialData.status === "SOLD" && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.85rem 1.25rem",
              borderRadius: "12px",
              backgroundColor: "rgba(234, 179, 8, 0.12)",
              border: "1px solid rgba(234, 179, 8, 0.35)",
              color: "var(--color-text-main)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textAlign: "left",
            }}
          >
            <div style={{ padding: "0.5rem", borderRadius: "50%", backgroundColor: "rgba(234, 179, 8, 0.2)", color: "#ca8a04" }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#ca8a04" }}>
                {canViewFinances && initialData.sale?.amount != null
                  ? `Sold for KES ${initialData.sale.amount.toLocaleString()}`
                  : "Status: Sold"}
              </div>
              <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                {initialData.sale?.buyerName ? `Buyer: ${initialData.sale.buyerName} • ` : ""}
                {initialData.sale?.date ? new Date(initialData.sale.date).toLocaleDateString() : ""}
                {initialData.sale?.notes && ` • ${initialData.sale.notes}`}
              </div>
            </div>
          </div>
        )}

        {/* Deceased Banner if DECEASED */}
        {initialData.status === "DECEASED" && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.85rem 1.25rem",
              borderRadius: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "var(--color-text-main)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textAlign: "left",
            }}
          >
            <div style={{ padding: "0.5rem", borderRadius: "50%", backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#dc2626" }}>
              <Skull size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#dc2626" }}>Deceased</div>
              <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                {initialData.causeOfDeath ? `Cause: ${initialData.causeOfDeath} • ` : ""}
                {initialData.dateOfDeath ? new Date(initialData.dateOfDeath).toLocaleDateString() : ""}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Tabs */}
      <nav className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "info" ? styles.activeTab : ""}`} onClick={() => setActiveTab("info")}>
          <Info size={18} /> Info
        </button>
        {(initialData.species === "DAIRY_COW" || initialData.species === "INDIGENOUS_COW") && initialData.gender === "FEMALE" && (
          <button className={`${styles.tab} ${activeTab === "milk" ? styles.activeTab : ""}`} onClick={() => setActiveTab("milk")}>
            <Droplet size={18} /> Milk
          </button>
        )}
        <button className={`${styles.tab} ${activeTab === "health" ? styles.activeTab : ""}`} onClick={() => setActiveTab("health")}>
          <Activity size={18} /> Health
        </button>
        {initialData.gender === "FEMALE" && (
          <button className={`${styles.tab} ${activeTab === "breeding" ? styles.activeTab : ""}`} onClick={() => setActiveTab("breeding")}>
            <HeartPulse size={18} /> Breeding
          </button>
        )}
      </nav>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === "info" && (
          <div className={styles.panel}>
            <h3>Genealogy</h3>
            <div className={styles.genealogyTree}>
              <div className={styles.parent}>
                <p className={styles.parentLabel}>Sire</p>
                <div className={styles.parentCard}>{initialData.fatherName || "Unknown"}</div>
              </div>
              <div className={styles.parent}>
                <p className={styles.parentLabel}>Dam</p>
                {initialData.mother?.id && !initialData.mother.isDeleted ? (
                  <Link
                    href={`/herd/${initialData.mother.id}`}
                    className={styles.parentCard}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                  >
                    {initialData.mother.name} {initialData.mother.tagNumber ? `(#${initialData.mother.tagNumber})` : ""} &rarr;
                  </Link>
                ) : (
                  <div className={styles.parentCard}>
                    {initialData.mother
                      ? `${initialData.mother.name}${initialData.mother.tagNumber ? ` (#${initialData.mother.tagNumber})` : ""} (Archived)`
                      : "Unknown"}
                  </div>
                )}
              </div>
            </div>

            {/* Offspring / Progeny List */}
            <div style={{ marginTop: "2rem", borderTop: "1px solid var(--color-border)", paddingTop: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Offspring &amp; Progeny</h3>
                <span style={{ fontSize: "0.85rem", opacity: 0.6, fontWeight: 500 }}>
                  {initialData.offspring?.length || 0} recorded
                </span>
              </div>

              {initialData.offspring && initialData.offspring.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
                  {initialData.offspring.map((child: any) => (
                    <Link
                      key={child.id}
                      href={`/herd/${child.id}`}
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: "10px",
                        border: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-bg)",
                        textDecoration: "none",
                        color: "inherit",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {child.name} {child.tagNumber ? `#${child.tagNumber}` : ""}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 7px",
                            borderRadius: "99px",
                            backgroundColor: child.status === "ACTIVE" ? "rgba(22, 163, 74, 0.15)" : "rgba(100, 116, 139, 0.15)",
                            color: child.status === "ACTIVE" ? "#16a34a" : "inherit",
                            fontWeight: 600,
                          }}
                        >
                          {child.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                        {formatSpecies(child.species)} ({child.gender.toLowerCase()})
                      </div>
                      {child.dateOfBirth && (
                        <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "2px" }}>
                          Born: {new Date(child.dateOfBirth).toLocaleDateString()}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.6 }}>No offspring recorded for this animal.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "milk" && (
          <div className={styles.panel}>
            {!milkLogs || milkLogs.length === 0 ? (
              <div className={styles.emptyState}>
                <Droplet size={48} className={styles.emptyIcon} />
                <p>No recent milk records.</p>
                {hasPermission("milk:log") && (
                  <Link href="/milk" className={styles.primaryBtn} style={{ textDecoration: "none" }}>
                    Log Milk
                  </Link>
                )}
              </div>
            ) : (
              <div className={styles.timeline}>
                {milkLogs.map((log: any) => {
                  const isEditing = editingMilkLogId === log.id;
                  const sessionDisplay =
                    log.milkingTime === "MORNING"
                      ? "Morning"
                      : log.milkingTime === "MIDDAY"
                        ? "Mid-day"
                        : log.milkingTime === "EVENING"
                          ? "Evening"
                          : "Other";

                  return (
                    <div key={log.id} className={styles.timelineItem} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                        <div className={styles.timelineDot} style={{ background: "#3b82f6", marginTop: "4px" }}></div>
                        <div className={styles.timelineContent}>
                          {isEditing ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "6px 0", flexWrap: "wrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  max="60"
                                  value={editMilkYield}
                                  onChange={(e) => setEditMilkYield(e.target.value)}
                                  style={{
                                    width: "90px",
                                    minHeight: "38px",
                                    padding: "4px 8px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-bg)",
                                    color: "var(--color-text-main)",
                                    fontSize: "1rem",
                                    fontWeight: 700,
                                  }}
                                  autoFocus
                                />
                                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Liters</span>
                              </div>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleSaveMilkEdit(log.id, false)}
                                  disabled={isMilkActionLoading}
                                  style={{
                                    minWidth: "38px",
                                    minHeight: "38px",
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    border: "none",
                                    backgroundColor: "#22c55e",
                                    color: "white",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "4px",
                                    fontWeight: 600,
                                    fontSize: "0.85rem",
                                  }}
                                >
                                  <Check size={16} /> Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingMilkLogId(null)}
                                  style={{
                                    minWidth: "38px",
                                    minHeight: "38px",
                                    padding: "6px 10px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    backgroundColor: "transparent",
                                    color: "var(--color-text-sub)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <h4>{log.amountLiters} Liters</h4>
                          )}
                          <p style={{ margin: "2px 0", fontSize: "0.85rem" }}>{sessionDisplay} Session</p>
                          <span className={styles.date}>
                            {new Date(log.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>

                      {!isEditing && canManageMilkHistory && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handleStartMilkEdit(log)}
                            style={{
                              background: "none",
                              border: "1px solid var(--color-border)",
                              borderRadius: "8px",
                              padding: "6px 8px",
                              cursor: "pointer",
                              color: "var(--color-text-sub)",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMilkLog(log)}
                            disabled={isMilkActionLoading}
                            style={{
                              background: "none",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              borderRadius: "8px",
                              padding: "6px 8px",
                              cursor: "pointer",
                              color: "#ef4444",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "health" && (
          <div className={styles.panel}>
            {!initialData.healthRecords || initialData.healthRecords.length === 0 ? (
              <div style={{ opacity: 0.6, padding: "1rem" }}>No health records found.</div>
            ) : (
              <div className={styles.timeline}>
                {initialData.healthRecords.map((hr: any) => (
                  <div key={hr.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot} style={{ background: "#ef4444" }}></div>
                    <div className={styles.timelineContent}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h4>{hr.recordType}</h4>
                        {canViewFinances && hr.cost != null && hr.cost > 0 && (
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#dc2626", background: "rgba(239,68,68,0.1)", padding: "2px 7px", borderRadius: "99px" }}>
                            KES {hr.cost.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p>{hr.description}</p>
                      <span className={styles.date}>{new Date(hr.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "breeding" && (
          <div className={styles.panel}>
            {!initialData.breedingEvents || initialData.breedingEvents.length === 0 ? (
              <div style={{ opacity: 0.6, padding: "1rem" }}>No breeding events found.</div>
            ) : (
              <div className={styles.timeline}>
                {initialData.breedingEvents.map((ev: any) => (
                  <div key={ev.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot} style={{ background: "#ec4899" }}></div>
                    <div className={styles.timelineContent}>
                      <h4>{ev.eventType.replace("_", " ")}</h4>
                      <p>Sire: {ev.sireDetails || "N/A"}</p>
                      {ev.expectedDate && !ev.actualDate && (
                        <p style={{ fontSize: "0.8rem", color: "#2563eb", margin: "2px 0" }}>
                          Expected: {new Date(ev.expectedDate).toLocaleDateString()}
                        </p>
                      )}
                      <span className={styles.date}>{new Date(ev.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!deletingMilkLog}
        onClose={() => setDeletingMilkLog(null)}
        onConfirm={confirmDeleteMilkLog}
        title="Delete Milk Record"
        message={
          <span>
            Are you sure you want to delete the <strong>{deletingMilkLog?.session.toLowerCase()}</strong> milk record of{" "}
            <strong>{deletingMilkLog?.amount} L</strong> recorded on {deletingMilkLog?.date} for{" "}
            <strong>{initialData.name || initialData.tagNumber}</strong>?
          </span>
        }
        confirmText="Delete Record"
        isLoading={isMilkActionLoading}
      />

      <OutlierWarningModal
        isOpen={!!milkOutlierState}
        warnings={milkOutlierState?.warnings || []}
        canOverride={milkOutlierState?.canOverride || false}
        isSubmitting={isMilkActionLoading}
        onCancel={() => setMilkOutlierState(null)}
        onOverride={() => {
          if (milkOutlierState) {
            handleSaveMilkEdit(milkOutlierState.logId, true);
          }
        }}
      />
    </div>
  );
}
