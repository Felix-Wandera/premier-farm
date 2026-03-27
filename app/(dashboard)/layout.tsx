import Sidebar from "../components/sidebar/Sidebar";
import BottomNav from "../components/bottom-nav/BottomNav";
import Breadcrumb from "../components/ui/Breadcrumb";
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
        <Breadcrumb />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
