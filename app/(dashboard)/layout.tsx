import Sidebar from "../components/sidebar/Sidebar";
import BottomNav from "../components/bottom-nav/BottomNav";
import styles from "../layout.module.css";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.appContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
