import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getWorkspace } from "@/lib/supabase/server";
import { formatTHB } from "@/lib/finance";

export default async function Dashboard() {
  const { supabase, user, organizationId } = await getWorkspace();
  if (!supabase) return <main className="auth"><section className="auth-card"><div className="brand"><span className="brand-mark">⌂</span>BaanDorm</div><h1>เชื่อมต่อฐานข้อมูล</h1><p className="subtitle">เพิ่มค่า Supabase ในไฟล์ .env.local แล้วเริ่มตั้งค่าระบบ</p><ol><li>สร้างโปรเจกต์ Supabase</li><li>รัน migration ใน <code>supabase/migrations</code></li><li>คัดลอกค่าจาก <code>.env.example</code> ไปยัง <code>.env.local</code></li></ol><Link className="button" href="/login">ไปหน้าเข้าสู่ระบบ</Link></section></main>;
  if (!user) redirect("/login");
  if (!organizationId) redirect("/setup");
  const [rooms, tenants, invoices, paidPayments, income, expenses] = await Promise.all([
    supabase.from("rooms").select("id,status", { count: "exact" }).eq("organization_id", organizationId),
    supabase.from("leases").select("tenant_id", { count: "exact" }).eq("organization_id", organizationId).eq("status", "active"),
    supabase.from("invoices").select("id,total,status,due_date").eq("organization_id", organizationId).neq("status", "void"),
    supabase.from("payments").select("invoice_id,amount").eq("organization_id", organizationId),
    supabase.from("payments").select("amount").eq("organization_id", organizationId).gte("received_at", new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString()),
    supabase.from("expenses").select("amount").eq("organization_id", organizationId).gte("incurred_on", new Date().toISOString().slice(0,8)+"01"),
  ]);
  const totalRooms = rooms.count ?? 0;
  const occupied = rooms.data?.filter(r => r.status === "occupied").length ?? 0;
  const paymentsByInvoice = new Map<string,number>();
  paidPayments.data?.forEach(p=>paymentsByInvoice.set(p.invoice_id,(paymentsByInvoice.get(p.invoice_id)??0)+Number(p.amount)));
  const outstanding = invoices.data?.filter(i => ["issued","partial","overdue"].includes(i.status)).reduce((s,i) => s + Math.max(Number(i.total)-(paymentsByInvoice.get(i.id)??0),0),0) ?? 0;
  const cashIn = income.data?.reduce((s,p)=>s+Number(p.amount),0) ?? 0;
  const cashOut = expenses.data?.reduce((s,e)=>s+Number(e.amount),0) ?? 0;
  return <AppShell current="/" userEmail={user.email ?? ""}><div className="page-heading"><div><h1>ภาพรวม</h1><p className="subtitle">สรุปผลการดำเนินงานจากข้อมูลจริงของกิจการ</p></div><Link className="button" href="/meters">เริ่มจดมิเตอร์</Link></div><section className="metric-grid"><Metric label="ห้องที่มีผู้เช่า" value={`${occupied} / ${totalRooms}`} note={totalRooms?`อัตราเข้าพัก ${Math.round(occupied/totalRooms*100)}%`:"เพิ่มห้องเพื่อเริ่มติดตาม"}/><Metric label="สัญญาที่กำลังใช้งาน" value={String(tenants.count ?? 0)} note="สัญญาเช่าที่ยังมีผล"/><Metric label="ยอดเรียกเก็บคงค้าง" value={formatTHB(outstanding)} note="ยอดบิลที่ยังไม่ชำระครบ"/><Metric label="เงินสดรับสุทธิเดือนนี้" value={formatTHB(cashIn-cashOut)} note={`รับ ${formatTHB(cashIn)} · จ่าย ${formatTHB(cashOut)}`}/></section><section className="card"><h2 className="section-title">งานที่ต้องทำ</h2>{totalRooms===0?<div className="empty"><strong>เริ่มต้นด้วยการเพิ่มห้องพัก</strong>เพิ่มห้องและกำหนดค่าเช่าเพื่อเตรียมข้อมูลสำหรับสัญญาและการวางบิล<p><Link className="button" href="/rooms">เพิ่มห้องแรก</Link></p></div>:<div className="table-wrap"><table><thead><tr><th>รายการ</th><th>จำนวน</th><th>ไปที่</th></tr></thead><tbody><tr><td>บิลที่ยังค้างชำระ</td><td>{invoices.data?.filter(i=>["issued","partial","overdue"].includes(i.status)).length ?? 0}</td><td><Link href="/invoices">ดูบิล</Link></td></tr><tr><td>ห้องว่าง</td><td>{rooms.data?.filter(r=>r.status==="available").length ?? 0}</td><td><Link href="/rooms">ดูห้องพัก</Link></td></tr></tbody></table></div>}</section></AppShell>;
}
function Metric({label,value,note}:{label:string;value:string;note:string}) { return <div className="card"><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>; }
