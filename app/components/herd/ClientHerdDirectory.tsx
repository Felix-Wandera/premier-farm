"use client";
import React, { useState } from "react";
import styles from "../../(dashboard)/herd/page.module.css";
import Link from "next/link";
import AnimalIcon from "../ui/AnimalIcon";
import QuickAddMenu from "../quick-add/QuickAddMenu";
import EmptyState from "../ui/EmptyState";
import { Search, Plus, LayoutGrid, List as ListIcon, Info } from "lucide-react";

type PrismaAnimal = {
  id: string;
  tagNumber: string;
  name: string | null;
  species: string;
  status: string;
  dateOfBirth: Date | null;
};

// Helpers
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

function calculateAge(dob: Date | null) {
  if (!dob) return "Unknown age";
  const diff = Date.now() - new Date(dob).getTime();
  const ageDate = new Date(diff); 
  const years = Math.abs(ageDate.getUTCFullYear() - 1970);
  const months = ageDate.getUTCMonth();
  
  if (years > 0) return `${years} yrs`;
  if (months > 0) return `${months} mos`;
  return "Newborn";
}

const FILTERS = ["All", "Dairy Cow", "Indigenous", "Bull", "Heifer", "Sheep", "Goat", "Sick", "Sold", "Deceased"];

export default function ClientHerdDirectory({ initialAnimals }: { initialAnimals: PrismaAnimal[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const filteredAnimals = initialAnimals.filter((animal) => {
    const formattedSpecies = formatSpecies(animal.species);
    const formattedStatus = formatStatus(animal.status);

    const matchName = animal.name ? animal.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const matchesSearch = animal.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) || matchName;
    
    if (!matchesSearch) return false;
    
    if (activeFilter === "All") return true;
    if (activeFilter === "Sick") return formattedStatus === "Sick";
    if (activeFilter === "Sold") return formattedStatus === "Sold";
    if (activeFilter === "Deceased") return formattedStatus === "Deceased";
    return formattedSpecies === activeFilter;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Herd Directory</h1>
        
        <div className={styles.viewToggle}>
          <button 
            className={`${styles.toggleBtn} ${viewMode === 'list' ? '' : styles.inactive}`} 
            onClick={() => setViewMode('list')}
            aria-label="List View"
          >
            <ListIcon size={18} />
          </button>
          <button 
            className={`${styles.toggleBtn} ${viewMode === 'grid' ? '' : styles.inactive}`} 
            onClick={() => setViewMode('grid')}
            aria-label="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} size={20} />
          <input 
            type="text" 
            placeholder="Search by Tag ID or Name..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filtersScroll}>
          {FILTERS.map(filter => (
            <button 
              key={filter} 
              className={`${styles.filterPill} ${activeFilter === filter ? styles.activeFilter : ''}`}
              onClick={() => setActiveFilter(filter)}
              aria-selected={activeFilter === filter}
              aria-pressed={activeFilter === filter}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Animal Grid / List */}
      {filteredAnimals.length > 0 ? (
        <div className={viewMode === 'grid' ? styles.grid : styles.list}>
          {filteredAnimals.map((animal) => {
            const formattedSpecies = formatSpecies(animal.species);
            const formattedStatus = formatStatus(animal.status);
            const age = calculateAge(animal.dateOfBirth);

            return (
              <Link key={animal.id} href={`/herd/${animal.id}`} className={`${styles.animalCard} ${viewMode === 'list' ? styles.listCard : ''}`} style={{textDecoration: 'none'}}>
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>
                    <AnimalIcon species={formattedSpecies} size={28} />
                  </div>
                  <div className={`${styles.statusBadge} ${formattedStatus === 'Sick' ? styles.badgeSick : styles.badgeActive}`}>
                    <span className={`${styles.statusDot} ${formattedStatus === 'Sick' ? styles.dotSick : styles.dotActive}`}></span>
                    {formattedStatus}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.tagNumber} style={{display: "flex", alignItems: "center", gap: "6px"}}>
                    {animal.tagNumber} {animal.name && <span className={styles.animalName}>({animal.name})</span>}
                  </h3>
                  
                  <div className={styles.tags}>
                    <span className={styles.infoTag}>{formattedSpecies}</span>
                    <span className={styles.infoTag}>{age}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <EmptyState 
          icon={<Info size={36} />}
          title="No animals found"
          description={searchQuery ? `We couldn't find any animals matching "${searchQuery}"` : "Try adjusting your filters or add a new animal."}
          actionLabel="Add New Animal"
          onAction={() => setIsQuickAddOpen(true)}
        />
      )}

      {/* Floating Action Button purely for this page */}
      <button className={styles.fabMain} aria-label="Add New Animal" onClick={() => setIsQuickAddOpen(true)}>
         <Plus size={28} color="white" strokeWidth={2.5} />
      </button>

      <QuickAddMenu isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </div>
  );
}
