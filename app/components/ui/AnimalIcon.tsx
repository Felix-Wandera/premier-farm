import React from "react";

export function CattleIcon({
  size = 20,
  strokeWidth = 2,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Gentle curved horns */}
      <path
        d="M7.6 6.2C6.2 4.8 4.9 4.3 4.3 5.2M16.4 6.2C17.8 4.8 19.1 4.3 19.7 5.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lateral cattle ears */}
      <path
        d="M6.5 8.4L3.1 8C2.4 8.6 2.7 10.5 4.4 11L6.5 10.8M17.5 8.4L20.9 8C21.6 8.6 21.3 10.5 19.6 11L17.5 10.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Head & broad muzzle outline */}
      <path
        d="M7.6 6.2C9.2 5.5 14.8 5.5 16.4 6.2L17.5 10.8L16.7 15.3C16.3 18 14.5 19.5 12 19.5C9.5 19.5 7.7 18 7.3 15.3L6.5 10.8L7.6 6.2Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Muzzle curve */}
      <path
        d="M7.5 14.6C9.3 13.6 14.7 13.6 16.5 14.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Eyes & nostrils */}
      <circle cx="9.6" cy="10.8" r="0.9" fill="currentColor" />
      <circle cx="14.4" cy="10.8" r="0.9" fill="currentColor" />
      <circle cx="10.3" cy="16.8" r="0.75" fill="currentColor" />
      <circle cx="13.7" cy="16.8" r="0.75" fill="currentColor" />
    </svg>
  );
}

export default function AnimalIcon({
  species,
  size = 22,
}: {
  species: string;
  size?: number;
}) {
  const s = (species || "").toLowerCase();

  const renderSvg = () => {
    // 1. Bull — wide sweeping horns + nose ring
    if (s.includes("bull") || s.includes("steer") || s.includes("ox")) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M7.5 6.4C4.8 5.8 3.0 4.0 3.5 2.4M16.5 6.4C19.2 5.8 21.0 4.0 20.5 2.4"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M6.5 8.8L3.4 9.2C3.2 10.6 4.5 11.2 6.5 10.8M17.5 8.8L20.6 9.2C20.8 10.6 19.5 11.2 17.5 10.8"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 6.4C9.4 5.7 14.6 5.7 16.5 6.4L17.5 10.8L16.6 15.0C16.2 17.4 14.5 18.8 12 18.8C9.5 18.8 7.8 17.4 7.4 15.0L6.5 10.8L7.5 6.4Z"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinejoin="round"
          />
          <path d="M7.6 14.3C9.5 13.5 14.5 13.5 16.4 14.3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="9.6" cy="10.7" r="0.95" fill="currentColor" />
          <circle cx="14.4" cy="10.7" r="0.95" fill="currentColor" />
          <circle cx="10.4" cy="16.3" r="0.7" fill="currentColor" />
          <circle cx="13.6" cy="16.3" r="0.7" fill="currentColor" />
          {/* Iconic bull nose ring */}
          <path
            d="M10.4 18.2C10.0 19.6 10.8 21.0 12 21.0C13.2 21.0 14.0 19.6 13.6 18.2"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    // 2. Indigenous / Zebu / Boran / Sahiwal — upward lyre horns + drooping Zebu ears
    if (s.includes("indigenous") || s.includes("zebu") || s.includes("boran") || s.includes("sahiwal") || s.includes("ankole")) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M8.3 6.3C6.8 4.2 6.5 2.5 7.5 1.7M15.7 6.3C17.2 4.2 17.5 2.5 16.5 1.7"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M6.8 8.7C4.2 9.3 3.0 11.4 3.8 12.8C4.9 13.0 6.1 11.8 6.8 10.8M17.2 8.7C19.8 9.3 21.0 11.4 20.2 12.8C19.1 13.0 17.9 11.8 17.2 10.8"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.3 6.3C10.1 5.7 13.9 5.7 15.7 6.3L17.2 10.8L16.0 15.6C15.6 18.0 14.1 19.5 12 19.5C9.9 19.5 8.4 18.0 8.0 15.6L6.8 10.8L8.3 6.3Z"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinejoin="round"
          />
          <path d="M8.1 14.8C9.8 13.9 14.2 13.9 15.9 14.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="9.8" cy="10.9" r="0.85" fill="currentColor" />
          <circle cx="14.2" cy="10.9" r="0.85" fill="currentColor" />
          <circle cx="10.5" cy="16.9" r="0.7" fill="currentColor" />
          <circle cx="13.5" cy="16.9" r="0.7" fill="currentColor" />
        </svg>
      );
    }

    // 3. Heifer / Calf — polled young head, forelock tuft & perky ears
    if (s.includes("heifer") || s.includes("calf") || s.includes("weaner")) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M7.2 8.2L3.4 6.8C2.8 8.4 3.8 10.5 6.6 10.7M16.8 8.2L20.6 6.8C21.2 8.4 20.2 10.5 17.4 10.7"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10.7 6.1L12 4.6L13.3 6.1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M7.2 8.2C8.6 6.1 15.4 6.1 16.8 8.2L17.4 10.7L16.3 15.3C15.9 17.8 14.2 19.2 12 19.2C9.8 19.2 8.1 17.8 7.7 15.3L6.6 10.7L7.2 8.2Z"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinejoin="round"
          />
          <path d="M7.9 14.7C9.6 13.8 14.4 13.8 16.1 14.7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="9.7" cy="11.0" r="0.95" fill="currentColor" />
          <circle cx="14.3" cy="11.0" r="0.95" fill="currentColor" />
          <circle cx="10.5" cy="16.8" r="0.7" fill="currentColor" />
          <circle cx="13.5" cy="16.8" r="0.7" fill="currentColor" />
        </svg>
      );
    }

    // 4. Goat — swept-back horns, tapered face & chin beard
    if (s.includes("goat") || s.includes("buck") || s.includes("doe") || s.includes("kid")) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9.6 6.3C8.6 3.7 6.8 2.4 5.1 2.8M14.4 6.3C15.4 3.7 17.2 2.4 18.9 2.8"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M7.4 8.6L3.4 7.7C3.3 9.3 4.8 10.5 7.0 10.5M16.6 8.6L20.6 7.7C20.7 9.3 19.2 10.5 17.0 10.5"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.4 8.6C8.8 6.2 15.2 6.2 16.6 8.6L15.1 15.5C14.6 17.4 13.4 18.5 12 18.5C10.6 18.5 9.4 17.4 8.9 15.5L7.4 8.6Z"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinejoin="round"
          />
          <circle cx="9.8" cy="11.0" r="0.85" fill="currentColor" />
          <circle cx="14.2" cy="11.0" r="0.85" fill="currentColor" />
          <path d="M10.8 15.7L12 16.9L13.2 15.7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11.1 18.4L12 21.4L12.9 18.4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 5. Sheep — fluffy wool crown, horizontal soft ears & oval face
    if (s.includes("sheep") || s.includes("ewe") || s.includes("ram") || s.includes("lamb") || s.includes("merino") || s.includes("dorper")) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M7.8 8.8C7.0 7.4 7.7 5.6 9.3 5.4C10.0 4.0 11.9 3.6 13.1 4.6C14.7 4.2 16.4 5.4 16.3 7.1C17.0 7.7 16.9 8.5 16.2 9.0"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.6 9.4L3.6 10.2C3.5 11.8 5.2 12.4 7.4 11.6M16.4 9.4L20.4 10.2C20.5 11.8 18.8 12.4 16.6 11.6"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.6 9.0H16.4L15.4 15.6C15.0 18.0 13.7 19.4 12 19.4C10.3 19.4 9.0 18.0 8.6 15.6L7.6 9.0Z"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinejoin="round"
          />
          <circle cx="9.8" cy="12.0" r="0.85" fill="currentColor" />
          <circle cx="14.2" cy="12.0" r="0.85" fill="currentColor" />
          <path d="M10.8 16.0L12 17.2L13.2 16.0M12 17.2V18.6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    // 6. Default: Dairy Cow
    return <CattleIcon size={size} strokeWidth={1.85} />;
  };

  return (
    <span
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "inherit",
        flexShrink: 0,
      }}
      title={species}
      aria-label={species}
    >
      {renderSvg()}
    </span>
  );
}
