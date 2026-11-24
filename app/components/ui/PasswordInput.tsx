"use client";

import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import styles from "./PasswordInput.module.css";

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showLockIcon?: boolean;
  iconSize?: number;
  isSubmitting?: boolean;
  matchWithValue?: string;
  showMatchStatus?: boolean;
}

export default function PasswordInput({
  showLockIcon = true,
  iconSize = 18,
  isSubmitting = false,
  matchWithValue,
  showMatchStatus = false,
  className,
  disabled,
  value,
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const effectiveVisible = visible && !isSubmitting;

  const strValue = typeof value === "string" ? value : "";
  const hasMatchCheck =
    showMatchStatus && typeof matchWithValue === "string" && strValue.length > 0;
  const isMatching = hasMatchCheck && strValue === matchWithValue;

  return (
    <div>
      <div className={styles.wrapper}>
        {showLockIcon && (
          <span className={styles.leadingIcon} aria-hidden="true">
            <Lock size={iconSize} />
          </span>
        )}
        <input
          {...rest}
          value={value}
          disabled={disabled || isSubmitting}
          type={effectiveVisible ? "text" : "password"}
          className={`${styles.input} ${showLockIcon ? styles.withIcon : ""} ${className || ""}`}
        />
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setVisible((prev) => !prev)}
          disabled={disabled || isSubmitting}
          aria-label={effectiveVisible ? "Hide password" : "Show password"}
          aria-pressed={effectiveVisible}
          title={effectiveVisible ? "Hide password" : "Show password"}
        >
          {effectiveVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {hasMatchCheck && (
        <div
          className={`${styles.helperRow} ${
            isMatching ? styles.helperMatch : styles.helperMismatch
          }`}
        >
          <span>{isMatching ? "✓ Passwords match" : "Passwords do not match yet"}</span>
        </div>
      )}
    </div>
  );
}
