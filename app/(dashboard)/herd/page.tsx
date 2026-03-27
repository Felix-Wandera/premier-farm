"use client";
import React, { useState } from "react";
import styles from "./page.module.css";
import { Search, Plus, LayoutGrid, List as ListIcon } from "lucide-react";
import Link from "next/link";
import AnimalIcon from "../../components/ui/AnimalIcon";
import QuickAddMenu from "../../components/quick-add/QuickAddMenu";

type Animal = {
  id: string;
  tagNumber: string;
  name: string;
  species: string;
  status: "Active" | "Sick" | "Sold" | "Deceased";
  age: string;
};

const MOCK_ANIMALS: Animal[] = [
  { id: "1", tagNumber: "DC-024", name: "Bella", species: "Dairy Cow", status: "Active", age: "3 yrs" },
  { id: "2", tagNumber: "IC-012", name: "", species: "Indigenous", status: "Sick", age: "5 yrs" },
  { id: "3", tagNumber: "GT-005", name: "Billy", species: "Goat", status: "Active", age: "8 mos" },
  { id: "4", tagNumber: "DC-089", name: "Daisy", species: "Dairy Cow", status: "Active", age: "2 yrs" },
  { id: "5", tagNumber: "SH-002", name: "", species: "Sheep", status: "Active", age: "1 yr" },
  { id: "6", tagNumber: "DC-102", name: "Luna", species: "Dairy Cow", status: "Active", age: "4 yrs" },
];

const FILTERS = ["All", "Dairy Cow", "Indigenous", "Bull", "Heifer", "Sheep", "Goat", "Sick", "Sold", "Deceased"];

export default function HerdDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const filteredAnimals = MOCK_ANIMALS.filter((animal) => {
    const matchesSearch = animal.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          animal.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeFilter === "All") return true;
    if (activeFilter === "Sick") return animal.status === "Sick";
    if (activeFilter === "Sold") return animal.status === "Sold";
    if (activeFilter === "Deceased") return animal.status === "Deceased";
    return animal.species === activeFilter;
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
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Animal Grid / List */}
      <div className={viewMode === 'grid' ? styles.grid : styles.list}>
        {filteredAnimals.map((animal) => (
          <div key={animal.id} className={`${styles.animalCard} ${viewMode === 'list' ? styles.listCard : ''}`}>
             <div className={styles.cardHeader}>
               <div className={styles.avatar}>
                 <AnimalIcon species={animal.species} size={28} />
               </div>
               <div className={styles.statusBadge}>
                 <span className={`${styles.statusDot} ${animal.status === 'Sick' ? styles.dotSick : styles.dotActive}`}></span>
                 {animal.status}
               </div>
             </div>

             <div className={styles.cardBody}>
               <h3 className={styles.tagNumber} style={{display: "flex", alignItems: "center", gap: "6px"}}>
                 {animal.tagNumber} {animal.name && <span className={styles.animalName}>({animal.name})</span>}
               </h3>
               
               <div className={styles.tags}>
                 <span className={styles.infoTag}>{animal.species}</span>
                 <span className={styles.infoTag}>{animal.age}</span>
               </div>
             </div>
          </div>
        ))}
      </div>

      {/* Floating Action Button purely for this page */}
      <button className={styles.fabMain} aria-label="Add New Animal" onClick={() => setIsQuickAddOpen(true)}>
         <Plus size={28} color="white" strokeWidth={2.5} />
      </button>

      <QuickAddMenu isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </div>
  );
}
