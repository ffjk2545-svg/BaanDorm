import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getWorkspace } from "@/lib/supabase/server";
import { formatTHB } from "@/lib/finance";

export default async function Dashboard() {
  const { supabase, user, organizationId } = await getWorkspace();
  if (!supabase) return <main className="auth"><section className="auth-card"><div className="brand"><span className="brand-mark">⌂</span>KumkongApartment</div><h1>เชื่อมต่อฐานข้อมูล</h1><p className="subtitle">เพิ่มค่า Supabase ในไฟล์ .env.local แล้วเริ่มตั้งค่าระบบ</p><ol><li>สร้างโปรเจกต์ Supabase</li><li>รัน migration ใน <code>supabase/migrations</code></li><li>คัดลอกค่าจาก <code>.env.example</code> ไปยัง <code>.env.local</code></li></ol><Link className="button" href="/login">ไปหน้าเข้าสู่ระบบ</Link></section></main>;
  if (!user) redirect("/login");
  if (!organizationId) redirect("/setup");

  const [rooms, invoices, payments, brand] = await Promise.all([
    supabase.from("rooms").select("id,room_number,status,monthly_rent").eq("organization_id", organizationId).order("room_number"),
    supabase.from("invoices").select("id,total,status").eq("organization_id", organizationId).in("status", ["issued", "partial", "overdue"]),
    supabase.from("payments").select("invoice_id,amount").eq("organization_id", organizationId),
    supabase.from("organizations").select("brand_logo_url").eq("id", organizationId).maybeSingle(),
  ]);
  const roomRows = rooms.data ?? [];
  const occupied = roomRows.filter(room => room.status === "occupied").length;
  const available = roomRows.filter(room => room.status === "available").length;
  const paidByInvoice = new Map<string, number>();
  payments.data?.forEach(payment => paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) ?? 0) + Number(payment.amount)));
  const outstanding = invoices.data?.reduce((sum, invoice) => sum + Math.max(Number(invoice.total) - (paidByInvoice.get(invoice.id) ?? 0), 0), 0) ?? 0;

  return <AppShell current="/" userEmail={user.email ?? ""} brandLogoUrl={brand.data?.brand_logo_url}>
    <div className="page-heading"><div><h1>ภาพรวม</h1><p className="subtitle">ดูห้องว่าง ห้องที่มีผู้เช่า และบิลที่ยังต้องติดตาม</p></div><Link className="button" href="/rooms">จัดการห้องพัก</Link></div>
    <section className="metric-grid">
      <Metric label="ห้องทั้งหมด" value={String(roomRows.length)} note="จำนวนห้องในกิจการ"/>
      <Metric label="มีผู้เช่า" value={String(occupied)} note="ห้องที่กำลังคิดค่าเช่า"/>
      <Metric label="ห้องว่าง" value={String(available)} note="พร้อมเพิ่มผู้เช่า"/>
      <Metric label="ยอดบิลที่ต้องติดตาม" value={formatTHB(outstanding)} note={`${invoices.data?.length ?? 0} บิลที่ยังไม่ชำระครบ`}/>
    </section>
    <section className="card" style={{marginBottom:18}}>
      <h2 className="section-title">ทำรายการ</h2>
      <div className="quick-actions">
        <Link className="quick-action" href="/rooms"><strong>เพิ่มห้องหรือผู้เช่า</strong><span>ดูสถานะห้องทั้งหมดในหน้าเดียว</span></Link>
        <Link className="quick-action" href="/meters"><strong>จดมิเตอร์น้ำและไฟ</strong><span>น้ำ 12 บาท/หน่วย · ไฟ 8 บาท/หน่วย</span></Link>
        <Link className="quick-action" href="/invoices"><strong>คิดค่าเช่าประจำเดือน</strong><span>ออกบิลให้ห้องที่มีผู้เช่าด้วยปุ่มเดียว</span></Link>
      </div>
    </section>
    <section className="card">
      <h2 className="section-title">สถานะห้อง</h2>
      {roomRows.length === 0 ? <div className="empty"><strong>ยังไม่มีห้องพัก</strong>เพิ่มห้องแรกเพื่อเริ่มจัดการหอพัก<p><Link className="button" href="/rooms">เพิ่มห้องพัก</Link></p></div> : <div className="room-grid">{roomRows.map(room => <article className="room-card" key={room.id}><div className="room-card-heading"><strong>ห้อง {room.room_number}</strong><span className={`badge ${room.status === "occupied" ? "good" : room.status === "maintenance" ? "warn" : ""}`}>{room.status === "occupied" ? "มีผู้เช่า" : room.status === "maintenance" ? "ปิดซ่อม" : room.status === "reserved" ? "จองแล้ว" : "ว่าง"}</span></div><p>ค่าเช่า {formatTHB(Number(room.monthly_rent))}/เดือน</p></article>)}</div>}
    </section>
  </AppShell>;
}

function Metric({label,value,note}:{label:string;value:string;note:string}) { return <div className="card"><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>; }
