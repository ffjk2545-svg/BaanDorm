import Link from "next/link";
import { Building2, CalendarDays, ClipboardList, CreditCard, FileText, Gauge, Home, Megaphone, Package, Settings, SlidersHorizontal, Users, Wrench, Wallet } from "lucide-react";
import { signOut } from "@/app/actions";

const nav = [
  { href: "/", label: "ภาพรวม", icon: Home }, { href: "/rooms", label: "ห้องพัก", icon: Building2 },
  { href: "/tenants", label: "ผู้เช่า", icon: Users }, { href: "/leases", label: "สัญญาเช่า", icon: FileText },
  { href: "/meters", label: "มิเตอร์", icon: Gauge }, { href: "/invoices", label: "วางบิล", icon: ClipboardList },
  { href: "/rates", label: "อัตราค่าน้ำไฟ", icon: SlidersHorizontal },
  { href: "/payments", label: "รับชำระ", icon: CreditCard }, { href: "/finance", label: "การเงิน", icon: Wallet },
  { href: "/maintenance", label: "แจ้งซ่อม", icon: Wrench }, { href: "/announcements", label: "ประกาศ", icon: Megaphone },
  { href: "/parcels", label: "พัสดุ", icon: Package }, { href: "/tasks", label: "งาน", icon: CalendarDays }, { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

export function AppShell({ children, current, userEmail }: { children: React.ReactNode; current: string; userEmail: string }) {
  return <div className="shell"><aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">⌂</span><span className="brand-name">BaanDorm</span></Link><div><p className="nav-label">จัดการหอพัก</p><nav className="nav">{nav.map(({ href,label,icon:Icon }) => <Link className={current===href?"active":""} href={href} key={href}><Icon size={17}/><span className="nav-text">{label}</span></Link>)}</nav></div><div className="sidebar-bottom"><form action={signOut}><button className="button secondary" type="submit">ออกจากระบบ</button></form><p>{userEmail}</p></div></aside><div className="main"><header className="topbar"><strong>BaanDorm</strong><small>ระบบบริหารจัดการหอพัก</small></header><main className="content">{children}</main></div></div>;
}
