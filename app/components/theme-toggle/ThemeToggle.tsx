"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ className, hideLabel = false }: { className?: string; hideLabel?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={className} style={{ width: 20, height: 20, opacity: 0 }} />; // placeholder
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={className}
      aria-label="Toggle Dark Mode"
    >
      {isDark ? <Moon size={20} /> : <Sun size={20} />}
      {!hideLabel && <span>{isDark ? "Dark Mode" : "Light Mode"}</span>}
    </button>
  );
}
