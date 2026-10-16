import { AppShell } from "@/components/app-shell";

export default function Loading() {
  return <AppShell current="" userEmail="">
    <div className="loading-state" aria-busy="true" aria-live="polite">
      <div className="skeleton skeleton-heading"/>
      <div className="skeleton skeleton-copy"/>
      <div className="loading-metrics"><div className="card skeleton-card"/><div className="card skeleton-card"/><div className="card skeleton-card"/></div>
      <div className="card skeleton-panel"><div className="skeleton skeleton-heading"/><div className="skeleton skeleton-copy"/></div>
      <span className="sr-only">กำลังโหลดข้อมูล…</span>
    </div>
  </AppShell>;
}
