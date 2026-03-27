import React from "react";

export default function AnimalIcon({ species, size = 20 }: { species: string; size?: number }) {
  const s = species?.toLowerCase() || "";
  
  // Custom professional SVG paths
  const icons = {
    cow: (
      <path d="M4 14C4 14 3 14 2 11C2 8 4 6 7 6C9 6 10 7 11 8C12 7 13 6 15 6C18 6 20 8 20 11C20 14 19 14 19 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    ),
    // Simplified premium paths for illustration
    beef: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 5c.67 0 1.33.33 1.66.66.33.33.34 1.34.34 2.34s-.17 2-.5 2.5a2.5 2.5 0 0 1-2 1.5H7.5a2.5 2.5 0 0 1-2-1.5c-.33-.5-.5-1.5-.5-2.5s.01-2.01.34-2.34C5.67 5.33 6.33 5 7 5h10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 11c0 3 2 6 5 6s5-3 5-6M12 17v4M9 21h6M5 7L3 5M19 7l2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    sheep: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 13c3.314 0 6-2 6-4.5S15.314 4 12 4 6 6 6 8.5s2.686 4.5 6 4.5Z" stroke="currentColor" strokeWidth="2" />
        <path d="M18 11c1.5 0 3-1 3-3s-1.5-3-3-3M6 11c-1.5 0-3-1-3-3s1.5-3-3-3M9 17l-1 3M15 17l1 3M12 13v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  };

  let icon = icons.beef; // Default

  if (s.includes("sheep")) icon = icons.sheep;
  else if (s.includes("goat")) icon = icons.sheep; // Closest match for now
  
  return (
    <span 
      style={{ 
        width: size,
        height: size,
        display: "inline-flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "var(--color-text-main)",
        opacity: 0.85
      }}
      title={species}
      aria-label={species}
    >
      {icon}
    </span>
  );
}
