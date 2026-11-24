"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Activity,
  Droplet,
  HeartPulse,
  Info,
  DollarSign,
  Skull,
  Trash2,
  Edit2,
  Check,
  X,
  Stethoscope,
  RefreshCw,
} from "lucide-react";
import styles from "../../(dashboard)/herd/[id]/page.module.css";
import AnimalIcon from "../ui/AnimalIcon";
import EditAnimalModal, { EditableAnimalData } from "./EditAnimalModal";
import StatusUpdateModal from "./StatusUpdateModal";
import DeleteAnimalModal from "./DeleteAnimalModal";
import { updateAnimal, updateAnimalStatus } from "@/actions/animal.actions";
import { updateSingleMilkLog, deleteSingleMilkLog } from "@/actions/milk.actions";
import { useToast } from "../ui/Toast";
import { useAuth } from "../auth/AuthProvider";
import ConfirmationModal from "../ui/ConfirmationModal";
import OutlierWarningModal from "../ui/OutlierWarningModal";

interface AnimalMilkLogRow {
  id: string;
  amountLiters: number;
  milkingTime: string;
  date: Date | string;
  recordDate?: Date | string;
}

interface AnimalHealthRow {
  id: string;
  recordType: string;
  description: string;
  cost?: number | null;
  date: Date | string;
}

interface AnimalBreedingRow {
  id: string;
  eventType: string;
  sireDetails?: string | null;
  expectedDate?: Date | string | null;
  actualDate?: Date | string | null;
  date: Date | string;
}

interface AnimalOffspringRow {
  id: string;
  name: string;
  tagNumber?: string | null;
  status: string;
  species: string;
  gender: string;
  dateOfBirth?: Date | string | null;
}

interface AnimalProfileFullData extends EditableAnimalData {
  causeOfDeath?: string | null;
  dateOfDeath?: Date | string | null;
  sale?: {
    amount?: number | null;
    buyerName?: string | null;
    date?: Date | string | null;
    notes?: string | null;
  } | null;
  milkLogs?: AnimalMilkLogRow[];
  healthRecords?: AnimalHealthRow[];
  breedingEvents?: AnimalBreedingRow[];
  offspring?: AnimalOffspringRow[];
}

function calculateAge(dob: Date | null) {
  if (!dob) return "Not recorded";
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

export default function ClientAnimalProfile({
  initialData,
}: {
  initialData: AnimalProfileFullData | null;
}) {
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
  const [milkLogs, setMilkLogs] = useState<AnimalMilkLogRow[]>(initialData?.milkLogs || []);
  const [editingMilkLogId, setEditingMilkLogId] = useState<string | null>(null);
  const [editMilkYield, setEditMilkYield] = useState<string>("");
  const [isMilkActionLoading, setIsMilkActionLoading] = useState(false);
  const [deletingMilkLog, setDeletingMilkLog] = useState<{
    id: string;
    session: string;
    date: string;
    amount: number;
  } | null>(null);
  const [milkOutlierState, setMilkOutlierState] = useState<{
    logId: string;
    warnings: string[];
    canOverride: boolean;
  } | null>(null);
  const toast = useToast();

  const handleStartMilkEdit = (log: AnimalMilkLogRow) => {
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
    const res = await updateSingleMilkLog(logId, val, overrideWarnings);
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
      setMilkLogs((prev) =>
        prev.map((item) => (item.id === logId ? { ...item, amountLiters: val } : item))
      );
      setEditingMilkLogId(null);
    } else {
      toast(res.message, "error");
    }
  };

  const handleDeleteMilkLog = (log: AnimalMilkLogRow) => {
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

  const ageInfo = calculateAge(initialData.dateOfBirth ? new Date(initialData.dateOfBirth) : null);
  const prettySpecies = formatSpecies(initialData.species);
  const displayStatus =
    initialData.status.charAt(0).toUpperCase() + initialData.status.slice(1).toLowerCase();
  const canTransitionStatus =
    canEdit && initialData.status !== "DECEASED" && initialData.status !== "SOLD";

  const births =
    initialData.breedingEvents?.filter((e) => e.eventType === "BIRTH" && e.actualDate) || [];
  const latestBirthDate = births[0]?.actualDate;
  const lastCalved = latestBirthDate
    ? new Date(latestBirthDate).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Never";

  return (
    <div className={styles.container}>
      {/* Sticky Header */}
      <header className={styles.header}>
        <Link href="/herd" className={styles.backBtn} aria-label="Back to Herd Directory">
          <ArrowLeft size={20} />
        </Link>

        <div className={styles.headerActions}>
          {canTransitionStatus && (
            <button
              type="button"
              className={styles.statusActionBtn}
              onClick={() => setIsStatusModalOpen(true)}
            >
              <RefreshCw size={15} />
              <span>Status</span>
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Edit Profile"
              title="Edit Animal Profile"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit size={18} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.deleteIconBtn}`}
              aria-label="Delete Animal"
              title="Delete Animal Record"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <Trash2 size={18} />
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
          className={`${styles.profileBadge} ${
            initialData.status === "SICK" || initialData.status === "DECEASED"
              ? styles.badgeSick
              : initialData.status === "SOLD"
              ? styles.badgeSold
              : ""
          }`}
          onClick={() => {
            if (canTransitionStatus) setIsStatusModalOpen(true);
          }}
          style={{ cursor: canTransitionStatus ? "pointer" : "default" }}
        >
          <div
            className={`${styles.statusDot} ${
              initialData.status === "SICK" || initialData.status === "DECEASED"
                ? styles.dotSick
                : initialData.status === "SOLD"
                ? styles.dotSold
                : ""
            }`}
          />
          <span>{displayStatus}</span>
        </div>

        <div className={styles.heroIdentity}>
          <div className={styles.heroAvatar}>
            <AnimalIcon species={prettySpecies} size={34} />
          </div>
          <div className={styles.heroTitles}>
            <h1 className={styles.tagTitle}>{initialData.name || initialData.tagNumber}</h1>
            {initialData.tagNumber && initialData.name && (
              <span className={`${styles.heroTagPill} tabular-nums`}>#{initialData.tagNumber}</span>
            )}
          </div>
        </div>

        <p className={styles.subtitle}>
          {prettySpecies}
          {initialData.breed ? ` • ${initialData.breed}` : ""} •{" "}
          {initialData.gender === "MALE" ? "Male" : "Female"}
        </p>

        <div className={styles.quickStats}>
          <div className={styles.statBox}>
            <span>Age</span>
            <strong className="tabular-nums">{ageInfo}</strong>
          </div>
          <div className={styles.statBox}>
            <span>Last Calved</span>
            <strong>{lastCalved}</strong>
          </div>
        </div>

        {/* Sale Banner if SOLD */}
        {initialData.status === "SOLD" && (
          <div className={styles.soldBanner}>
            <div className={styles.soldBannerIcon}>
              <DollarSign size={18} />
            </div>
            <div>
              <div className={`${styles.soldBannerTitle} tabular-nums`}>
                {canViewFinances && initialData.sale?.amount != null
                  ? `Sold for KES ${initialData.sale.amount.toLocaleString()}`
                  : "Status: Sold"}
              </div>
              <div className={styles.bannerMeta}>
                {initialData.sale?.buyerName ? `Buyer: ${initialData.sale.buyerName} • ` : ""}
                {initialData.sale?.date ? new Date(initialData.sale.date).toLocaleDateString() : ""}
                {initialData.sale?.notes && ` • ${initialData.sale.notes}`}
              </div>
            </div>
          </div>
        )}

        {/* Deceased Banner if DECEASED */}
        {initialData.status === "DECEASED" && (
          <div className={styles.deceasedBanner}>
            <div className={styles.deceasedBannerIcon}>
              <Skull size={18} />
            </div>
            <div>
              <div className={styles.deceasedBannerTitle}>Deceased</div>
              <div className={styles.bannerMeta}>
                {initialData.causeOfDeath ? `Cause: ${initialData.causeOfDeath} • ` : ""}
                {initialData.dateOfDeath ? new Date(initialData.dateOfDeath).toLocaleDateString() : ""}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Tabs */}
      <nav className={styles.tabs} aria-label="Animal Profile Sections">
        <button
          type="button"
          className={`${styles.tab} ${activeTab === "info" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("info")}
        >
          <Info size={16} /> Info
        </button>
        {(initialData.species === "DAIRY_COW" || initialData.species === "INDIGENOUS_COW") &&
          initialData.gender === "FEMALE" && (
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "milk" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("milk")}
            >
              <Droplet size={16} /> Milk ({milkLogs.length})
            </button>
          )}
        <button
          type="button"
          className={`${styles.tab} ${activeTab === "health" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("health")}
        >
          <Activity size={16} /> Health ({initialData.healthRecords?.length || 0})
        </button>
        {initialData.gender === "FEMALE" && (
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "breeding" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("breeding")}
          >
            <HeartPulse size={16} /> Breeding ({initialData.breedingEvents?.length || 0})
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
                <p className={styles.parentLabel}>Sire (Father)</p>
                <div className={styles.parentCard}>{initialData.fatherName || "Not recorded"}</div>
              </div>
              <div className={styles.parent}>
                <p className={styles.parentLabel}>Dam (Mother)</p>
                {initialData.mother?.id && !initialData.mother.isDeleted ? (
                  <Link
                    href={`/herd/${initialData.mother.id}`}
                    className={styles.parentCard}
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    {initialData.mother.name}{" "}
                    {initialData.mother.tagNumber ? `(#${initialData.mother.tagNumber})` : ""} &rarr;
                  </Link>
                ) : (
                  <div className={styles.parentCard}>
                    {initialData.mother
                      ? `${initialData.mother.name}${
                          initialData.mother.tagNumber ? ` (#${initialData.mother.tagNumber})` : ""
                        } (Archived)`
                      : "Not recorded"}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.offspringSection}>
              <div className={styles.offspringHeader}>
                <h3>Offspring &amp; Progeny</h3>
                <span className="tabular-nums">{initialData.offspring?.length || 0} recorded</span>
              </div>

              {initialData.offspring && initialData.offspring.length > 0 ? (
                <div className={styles.offspringGrid}>
                  {initialData.offspring.map((child) => (
                    <Link key={child.id} href={`/herd/${child.id}`} className={styles.offspringCard}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {child.name} {child.tagNumber ? `#${child.tagNumber}` : ""}
                        </span>
                        <span className={styles.offspringStatus}>{child.status}</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-sub)" }}>
                        {formatSpecies(child.species)} ({child.gender.toLowerCase()})
                      </div>
                      {child.dateOfBirth && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-sub)", opacity: 0.8 }}>
                          Born: {new Date(child.dateOfBirth).toLocaleDateString()}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--color-text-sub)" }}>
                  No offspring recorded for this animal yet.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "milk" && (
          <div className={styles.panel}>
            {!milkLogs || milkLogs.length === 0 ? (
              <div className={styles.emptyState}>
                <Droplet size={40} className={styles.emptyIcon} />
                <p>No recent milk records.</p>
                {hasPermission("milk:log") && (
                  <Link href="/milk" className={styles.primaryBtn} style={{ textDecoration: "none" }}>
                    Log Milk
                  </Link>
                )}
              </div>
            ) : (
              <div className={styles.timeline}>
                {milkLogs.map((log) => {
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
                    <div key={log.id} className={styles.timelineItem}>
                      <div className={`${styles.timelineDot} ${styles.dotMilk}`}>
                        <Droplet size={16} />
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineCardRow}>
                          <div>
                            {isEditing ? (
                              <div className={styles.inlineMilkEdit}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    min="0.1"
                                    max="60"
                                    value={editMilkYield}
                                    onChange={(e) => setEditMilkYield(e.target.value)}
                                    className={`${styles.inlineYieldInput} tabular-nums`}
                                    autoFocus
                                  />
                                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Liters</span>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveMilkEdit(log.id, false)}
                                    disabled={isMilkActionLoading}
                                    className={styles.inlineSaveBtn}
                                  >
                                    <Check size={15} /> Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingMilkLogId(null)}
                                    className={styles.inlineCancelBtn}
                                    aria-label="Cancel edit"
                                  >
                                    <X size={15} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <h4 className="tabular-nums">{log.amountLiters} Liters</h4>
                            )}
                            <p>{sessionDisplay} Session</p>
                            <span className={styles.date}>
                              {new Date(log.date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>

                          {!isEditing && canManageMilkHistory && (
                            <div className={styles.recordActionBtns}>
                              <button
                                type="button"
                                onClick={() => handleStartMilkEdit(log)}
                                className={styles.miniActionBtn}
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMilkLog(log)}
                                disabled={isMilkActionLoading}
                                className={`${styles.miniActionBtn} ${styles.miniDeleteBtn}`}
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
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
              <div className={styles.emptyState}>
                <Stethoscope size={40} className={styles.emptyIcon} />
                <p>No health records logged yet.</p>
              </div>
            ) : (
              <div className={styles.timeline}>
                {initialData.healthRecords.map((hr) => (
                  <div key={hr.id} className={styles.timelineItem}>
                    <div className={`${styles.timelineDot} ${styles.dotHealth}`}>
                      <Stethoscope size={16} />
                    </div>
                    <div className={styles.timelineContent}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h4>{hr.recordType}</h4>
                        {canViewFinances && hr.cost != null && hr.cost > 0 && (
                          <span className={`${styles.costBadge} tabular-nums`}>
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
              <div className={styles.emptyState}>
                <HeartPulse size={40} className={styles.emptyIcon} />
                <p>No breeding events recorded yet.</p>
              </div>
            ) : (
              <div className={styles.timeline}>
                {initialData.breedingEvents.map((ev) => (
                  <div key={ev.id} className={styles.timelineItem}>
                    <div className={`${styles.timelineDot} ${styles.dotBreeding}`}>
                      <HeartPulse size={16} />
                    </div>
                    <div className={styles.timelineContent}>
                      <h4>{ev.eventType.replace("_", " ")}</h4>
                      <p>Sire: {ev.sireDetails || "N/A"}</p>
                      {ev.expectedDate && !ev.actualDate && (
                        <p className={styles.expectedDateNote}>
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
