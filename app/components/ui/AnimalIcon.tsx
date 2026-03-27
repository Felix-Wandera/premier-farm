import React from "react";

export default function AnimalIcon({ species, size = 20 }: { species: string; size?: number }) {
  let emoji = "🐄"; // Default to Dairy Cow
  const s = species?.toLowerCase() || "";
  
  if (s.includes("sheep")) emoji = "🐑";
  else if (s.includes("goat")) emoji = "🐐";
  else if (s.includes("bull") || s.includes("indigenous")) emoji = "🐂";
  else if (s.includes("heifer")) emoji = "🐄";

  return (
    <span 
      style={{ 
        fontSize: `${size * 0.9}px`, // Scale slightly down to align gracefully within text
        lineHeight: 1, 
        display: "inline-flex", 
        alignItems: "center", 
        justifyContent: "center",
        filter: "grayscale(100%) contrast(1.5)", // Premium monochrome vector look imitating an SVG
        opacity: 0.85
      }}
      title={species}
      aria-label={species}
    >
      {emoji}
    </span>
  );
}
