"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../(dashboard)/herd/page.module.css";
import Link from "next/link";
import AnimalIcon from "../ui/AnimalIcon";
import EmptyState from "../ui/EmptyState";
import { useAuth } from "../auth/AuthProvider";
import { Search, Plus, LayoutGrid, List as ListIcon, Info, ChevronRight } from "lucide-react";

type PrismaAnimal = {
  id: string;
  tagNumber: string | null;
  name: string;
  species: string;
  status: string;
  dateOfBirth: Date | null;
};

function formatSpecies(s: string) {
  if (s === "DAIRY_COW") return "Dairy Cow";
  if (s === "INDIGENOUS_COW") return "Indigenous";
  if (s === "BULL") return "Bull";
  if (s === "HEIFER") return "Heifer";
  if (s === "SHEEP") return "Sheep";
  if (s === "GOAT") return "Goat";
  return s;
}

function formatStatus(s: string) {
  if (s === "ACTIVE") return "Active";
  if (s === "SICK") return "Sick";
  if (s === "SOLD") return "Sold";
  if (s === "DECEASED") return "Deceased";
  return s;
}

function calculateAge(dob: Date | null): string | null {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  if (diff < 0) return null;
  const ageDate = new Date(diff);
  const years = Math.abs(ageDate.getUTCFullYear() - 1970);
  const months = ageDate.getUTCMonth();

  if (years > 0) return months > 0 ? `${years}y ${months}m` : `${years} yrs`;
  if (months > 0) return `${months} mos`;
  return "Newborn";
}

function getSpeciesToneClass(species: string, css: Record<string, string>) {
  if (species === "BULL") return css.avatarAmber;
  if (species === "INDIGENOUS_COW") return css.avatarTerra;
  if (species === "SHEEP" || species === "GOAT") return css.avatarIndigo;
  return css.avatarEmerald;
}

const FILTERS = ["All", "Dairy Cow", "Indigenous", "Bull", "Heifer", "Sheep", "Goat", "Sick", "Sold", "Deceased"];

export default function ClientHerdDirectory({ initialAnimals }: { initialAnimals: PrismaAnimal[] }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("herd:create");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredAnimals = initialAnimals.filter((animal) => {
    const formattedSpecies = formatSpecies(animal.species);
    const formattedStatus = formatStatus(animal.status);

    const matchName = animal.name ? animal.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const matchTag = animal.tagNumber ? animal.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const matchesSearch = !searchQuery.trim() || matchName || matchTag;

    if (!matchesSearch) return false;

    if (activeFilter === "All") return true;
    if (activeFilter === "Sick") return formattedStatus === "Sick";
    if (activeFilter === "Sold") return formattedStatus === "Sold";
    if (activeFilter === "Deceased") return formattedStatus === "Deceased";
    return formattedSpecies === activeFilter;
  });

  const getStatusClasses = (status: string) => {
    if (status === "Sick" || status === "Deceased") {
      return { badge: styles.badgeSick, dot: styles.dotSick };
    }
    if (status === "Sold") {
      return { badge: styles.badgeSold, dot: styles.dotSold };
    }
    return { badge: styles.badgeActive, dot: styles.dotActive };
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>Herd Directory</h1>
            <span className={`${styles.countPill} tabular-nums`}>{filteredAnimals.length}</span>
          </div>
          <p className={styles.pageSubtitle}>Browse livestock profiles, lineage, and health status</p>
        </div>

        <div className={styles.headerControls}>
          {canCreate && (
            <Link href="/herd/new" className={styles.desktopAddBtn}>
              <Plus size={17} strokeWidth={2.4} />
              <span>Register Animal</span>
            </Link>
          )}

          <div className={styles.viewToggle}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${viewMode === "list" ? "" : styles.inactive}`}
              onClick={() => setViewMode("list")}
              aria-label="List View"
            >
              <ListIcon size={18} />
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${viewMode === "grid" ? "" : styles.inactive}`}
              onClick={() => setViewMode("grid")}
              aria-label="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} size={18} />
          <input
            type="text"
            placeholder="Search by animal name or ear tag..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filtersScroll}>
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`${styles.filterPill} ${activeFilter === filter ? styles.activeFilter : ""}`}
              onClick={() => setActiveFilter(filter)}
              aria-pressed={activeFilter === filter}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {filteredAnimals.length > 0 ? (
        <div className={viewMode === "grid" ? styles.grid : styles.list}>
          {filteredAnimals.map((animal) => {
            const formattedSpecies = formatSpecies(animal.species);
            const formattedStatus = formatStatus(animal.status);
            const age = calculateAge(animal.dateOfBirth);
            const statusClasses = getStatusClasses(formattedStatus);
            const toneClass = getSpeciesToneClass(animal.species, styles);

            return (
              <Link
                key={animal.id}
                href={`/herd/${animal.id}`}
                className={`${styles.animalCard} ${viewMode === "list" ? styles.listCard : ""}`}
              >
                <div className={styles.cardHeader}>
                  <div className={`${styles.avatar} ${toneClass}`}>
                    <AnimalIcon species={formattedSpecies} size={25} />
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.nameRow}>
                    <h3 className={styles.animalName}>{animal.name}</h3>
                    {animal.tagNumber && (
                      <span className={`${styles.tagBadge} tabular-nums`}>#{animal.tagNumber}</span>
                    )}
                  </div>

                  <div className={styles.tags}>
                    <span className={styles.infoTag}>{formattedSpecies}</span>
                    {age && (
                      <>
                        <span className={styles.infoDot}>•</span>
                        <span className={`${styles.infoTag} tabular-nums`}>{age}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.cardRight}>
                  <div className={`${styles.statusBadge} ${statusClasses.badge}`}>
                    <span className={`${styles.statusDot} ${statusClasses.dot}`} />
                    <span>{formattedStatus}</span>
                  </div>
                  <ChevronRight size={17} className={styles.chevron} />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Info size={36} />}
          title="No animals found"
          description={
            searchQuery
              ? `No livestock matched "${searchQuery}".`
              : "Try another filter or register a new animal."
          }
          actionLabel={canCreate ? "Register Animal" : undefined}
          onAction={canCreate ? () => router.push("/herd/new") : undefined}
        />
      )}
    </div>
  );
}
