import React from "react";
import styles from "./Skeleton.module.css";

type SkeletonProps = {
  width?: string;
  height?: string;
  borderRadius?: string;
};

export default function Skeleton({ width = "100%", height = "1rem", borderRadius = "8px" }: SkeletonProps) {
  return <div className={styles.skeleton} style={{ width, height, borderRadius }} />;
}
