import Link from "next/link";
import { Building2, ClipboardList, Gauge, Home, Settings } from "lucide-react";
import { signOut } from "@/app/actions";

const nav = [
  { href: "/", label: "ภาพรวม", icon: Home },
  { href: "/rooms", label: "ห้องและผู้เช่า", icon: Building2 },
  { href: "/meters", label: "จดน้ำและไฟ", icon: Gauge },
  { href: "/invoices", label: "ค่าเช่าและบิล", icon: ClipboardList },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

export function AppShell({ children, current, userEmail, brandLogoUrl }: { children: React.ReactNode; current: string; userEmail: string; brandLogoUrl?: string | null }) {
  return <div className="shell"><aside className="sidebar"><Link className="brand" href="/">{brandLogoUrl?<img className="brand-logo" src={brandLogoUrl} alt="โลโก้กิจการ"/>:<span className="brand-mark">⌂</span>}<span className="brand-name">KumkongApartment</span></Link><div><p className="nav-label">จัดการหอพัก</p><nav className="nav">{nav.map(({ href,label,icon:Icon }) => <Link className={current===href?"active":""} href={href} key={href}><Icon size={17}/><span className="nav-text">{label}</span></Link>)}</nav></div><div className="sidebar-bottom"><form action={signOut}><button className="button secondary" type="submit">ออกจากระบบ</button></form><p>{userEmail}</p></div></aside><div className="main"><header className="topbar"><strong>KumkongApartment</strong><small>ระบบบริหารจัดการหอพัก</small></header><main className="content">{children}</main></div></div>;
}
