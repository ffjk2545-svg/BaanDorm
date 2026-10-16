import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getWorkspace } from "@/lib/supabase/server";
import { formatTHB } from "@/lib/finance";
import { AnalyticsCharts, type ExpenseCategory, type MonthlyCashFlow, type MonthlyExpense, type MonthlyOccupancy } from "@/components/analytics-charts";
import { DashboardRealtime } from "@/components/dashboard-realtime";

export default async function Dashboard() {
  const { supabase, user, organizationId, role } = await getWorkspace();
  if (!supabase) return <main className="auth"><section className="auth-card"><div className="brand"><span className="brand-mark">⌂</span>KumkongApartment</div><h1>เชื่อมต่อฐานข้อมูล</h1><p className="subtitle">เพิ่มค่า Supabase ในไฟล์ .env.local แล้วเริ่มตั้งค่าระบบ</p><ol><li>สร้างโปรเจกต์ Supabase</li><li>รัน migration ใน <code>supabase/migrations</code></li><li>คัดลอกค่าจาก <code>.env.example</code> ไปยัง <code>.env.local</code></li></ol><Link className="button" href="/login">ไปหน้าเข้าสู่ระบบ</Link></section></main>;
  if (!user) redirect("/login");
  if (!organizationId) redirect("/setup");
  if (role === "staff") redirect("/meters");

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const billingMonth = today.slice(0, 7);
  const monthLabel = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(`${billingMonth}-01T12:00:00+07:00`));
  const [year, month] = billingMonth.split("-").map(Number);
  const analysisMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (5 - index), 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { key, start: `${key}-01`, end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10), label: new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "Asia/Bangkok" }).format(new Date(`${key}-01T12:00:00+07:00`)) };
  });
  const analysisStart = `${analysisMonths[0].start}T00:00:00+07:00`;
  const [roomsResult, leasesResult, invoicesResult, brand, paymentsHistory, expensesHistory, recentTicketsResult] = await Promise.all([
    supabase.from("rooms").select("id,room_number,status,monthly_rent").eq("organization_id", organizationId).order("room_number"),
    supabase.from("leases").select("id,room_id,rent_amount,start_date,end_date,status").eq("organization_id", organizationId).in("status", ["active", "ended"]),
    supabase.from("invoices").select("id,lease_id,invoice_number,total,status,due_date").eq("organization_id", organizationId).eq("period_start", `${billingMonth}-01`).order("due_date"),
    supabase.from("organizations").select("brand_logo_url").eq("id", organizationId).maybeSingle(),
    supabase.from("payments").select("invoice_id,amount,received_at").eq("organization_id", organizationId).gte("received_at", analysisStart).lte("received_at", new Date().toISOString()),
    supabase.from("expenses").select("amount,incurred_on,category").eq("organization_id", organizationId).gte("incurred_on", analysisMonths[0].start).lte("incurred_on", today),
    supabase.from("maintenance_tickets").select("id,title,status,priority,created_at,room_id").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(5),
  ]);
  const roomRows = roomsResult.data ?? [];
  const allLeases = leasesResult.data ?? [];
  const leases = allLeases.filter(lease => lease.status === "active" && lease.start_date <= today && (!lease.end_date || lease.end_date >= today));
  const invoices = invoicesResult.data ?? [];
  const roomNumberById = new Map(roomRows.map(room => [room.id, room.room_number]));
  const recentTickets = recentTicketsResult.data ?? [];
  const roomIdByLeaseId = new Map(leases.map(lease => [lease.id, lease.room_id]));
  const leasedRoomIds = new Set(leases.map(lease => lease.room_id));
  const occupied = leasedRoomIds.size;
  const vacant = roomRows.filter(room => !leasedRoomIds.has(room.id) && room.status === "available").length;
  const maintenance = roomRows.filter(room => room.status === "maintenance").length;
  const reserved = roomRows.filter(room => room.status === "reserved").length;
  const invoicedLeaseIds = new Set(invoices.map(invoice => invoice.lease_id));
  const missingBills = leases.length - invoicedLeaseIds.size;
  const invoiceIds = invoices.map(invoice => invoice.id);
  const currentInvoiceIdSet = new Set(invoiceIds);
  const paidByInvoice = new Map<string, number>();
  paymentsHistory.data?.forEach(payment => { if (currentInvoiceIdSet.has(payment.invoice_id)) paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) ?? 0) + Number(payment.amount)); });
  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(Number(invoice.total) - (paidByInvoice.get(invoice.id) ?? 0), 0), 0);
  const paidCount = invoices.filter(invoice => invoice.status === "paid").length;
  const pendingInvoices = invoices.filter(invoice => invoice.status !== "paid" && invoice.status !== "void").sort((a, b) => String(roomNumberById.get(roomIdByLeaseId.get(a.lease_id) ?? "") ?? "").localeCompare(String(roomNumberById.get(roomIdByLeaseId.get(b.lease_id) ?? "") ?? ""), "th", { numeric: true }));
  const progress = leases.length ? Math.min(100, Math.round(invoicedLeaseIds.size / leases.length * 100)) : 0;
  const expenses = expensesHistory.data ?? [];
  const payments = paymentsHistory.data ?? [];
  const cashFlow: MonthlyCashFlow[] = analysisMonths.map(period => ({
    key: period.key,
    label: period.label,
    income: payments.filter(payment => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).format(new Date(payment.received_at)) === period.key).reduce((sum, payment) => sum + Number(payment.amount), 0),
    expense: expenses.filter(expense => String(expense.incurred_on).slice(0, 7) === period.key).reduce((sum, expense) => sum + Number(expense.amount), 0),
  }));
  const occupancy: MonthlyOccupancy[] = analysisMonths.map(period => {
    const snapshot = period.key === billingMonth ? today : period.end;
    const leasedRoomIdsAtDate = new Set(allLeases.filter(lease => lease.start_date <= snapshot && (!lease.end_date || lease.end_date >= snapshot)).map(lease => lease.room_id));
    return { key: period.key, label: period.label, occupied: leasedRoomIdsAtDate.size, total: roomRows.length };
  });
  const monthlyExpenses: MonthlyExpense[] = analysisMonths.map(period => ({ key: period.key, label: period.label, total: expenses.filter(expense => String(expense.incurred_on).slice(0, 7) === period.key).reduce((sum, expense) => sum + Number(expense.amount), 0) }));
  const categoryTotals = new Map<string, number>();
  expenses.forEach(expense => categoryTotals.set(expense.category || "อื่น ๆ", (categoryTotals.get(expense.category || "อื่น ๆ") ?? 0) + Number(expense.amount)));
  const expenseCategories: ExpenseCategory[] = Array.from(categoryTotals, ([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total).slice(0, 3);
  const closedExpensePeriods = monthlyExpenses.slice(0, -1).slice(-3);
  const forecastExpenses = closedExpensePeriods.length ? closedExpensePeriods.reduce((sum, period) => sum + period.total, 0) / closedExpensePeriods.length : 0;
  const forecastIncome = leases.reduce((sum, lease) => sum + Number(lease.rent_amount), 0);
  const forecast = { income: forecastIncome, expenses: forecastExpenses, net: forecastIncome - forecastExpenses };

  return <AppShell current="/" userEmail={user.email ?? ""} role={role} brandLogoUrl={brand.data?.brand_logo_url}>
    <DashboardRealtime organizationId={organizationId}/>
    <section className="dashboard-hero">
      <div><span className="dashboard-eyebrow">ภาพรวมกิจการ · {monthLabel}</span><h1>สวัสดีครับ</h1><p>สรุปห้องพักและงานบิลที่ต้องดูแลในเดือนนี้</p></div>
      <Link className="button dashboard-primary" href={`/invoices?billing_month=${billingMonth}`}>จัดการบิล {monthLabel}<span aria-hidden="true"> →</span></Link>
    </section>

    <section className="dashboard-stats">
      <Stat label="ห้องที่มีผู้เช่า" value={`${occupied} / ${roomRows.length}`} note="ห้องที่กำลังใช้งาน" tone="teal"/>
      <Stat label="ห้องว่าง" value={String(vacant)} note={`${reserved} ห้องจอง · ${maintenance} ห้องปิดซ่อม`} tone="blue"/>
      <Stat label="บิลที่ออกแล้ว" value={`${invoicedLeaseIds.size} / ${leases.length}`} note={`รอบเดือน ${monthLabel}`} tone="violet"/>
      <Stat label="ยอดค้างรับรอบนี้" value={formatTHB(outstanding)} note={`${paidCount} ห้องชำระครบแล้ว`} tone="amber"/>
    </section>

    <div className="dashboard-columns">
      <section className="card billing-overview">
        <div className="dashboard-section-heading"><div><span className="dashboard-eyebrow">งานประจำเดือน</span><h2>ออกบิลค่าเช่า</h2></div><Link className="text-link" href={`/invoices?billing_month=${billingMonth}`}>เปิดรายการบิล →</Link></div>
        {leases.length === 0 ? <div className="empty compact-empty"><strong>ยังไม่มีห้องที่มีสัญญา</strong>เริ่มจากเพิ่มผู้เช่าเข้าห้องเพื่อให้ระบบจัดบิลได้<p><Link className="button" href="/rooms">จัดการห้องและผู้เช่า</Link></p></div> : <>
          <div className="billing-progress-copy"><strong>ออกบิลแล้ว {invoicedLeaseIds.size} จาก {leases.length} ห้อง</strong><span>{missingBills === 0 ? "ครบทุกห้องแล้ว" : `เหลืออีก ${missingBills} ห้อง`}</span></div>
          <div className="progress-track" role="progressbar" aria-label="ความคืบหน้าการออกบิล" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }}/></div>
          {missingBills > 0 && <p className="dashboard-hint">กดครั้งเดียวเพื่อออกบิลให้ห้องที่ยังไม่มี ระบบจะข้ามห้องที่ออกแล้ว</p>}
          <Link className="button" href={`/invoices?billing_month=${billingMonth}${missingBills ? "#create" : ""}`}>{missingBills ? `ออกบิลที่เหลือ ${missingBills} ห้อง` : "ตรวจสอบบิลประจำเดือน"}</Link>
        </>}
      </section>

      <section className="card room-summary">
        <div className="dashboard-section-heading"><div><span className="dashboard-eyebrow">สถานะปัจจุบัน</span><h2>ห้องพัก</h2></div><Link className="text-link" href="/rooms">ดูห้องทั้งหมด →</Link></div>
        <div className="room-status-list"><Status label="มีผู้เช่า" count={occupied} total={roomRows.length} tone="occupied"/><Status label="ว่าง" count={vacant} total={roomRows.length} tone="vacant"/><Status label="จองแล้ว" count={reserved} total={roomRows.length} tone="reserved"/><Status label="ปิดซ่อม" count={maintenance} total={roomRows.length} tone="maintenance"/></div>
        {roomRows.length === 0 && <Link className="button secondary" href="/rooms">เพิ่มห้องแรก</Link>}
      </section>
    </div>

    <section className="card pending-panel">
      <div className="dashboard-section-heading"><div><span className="dashboard-eyebrow">ติดตามรับชำระ</span><h2>บิลที่ยังไม่ชำระครบ</h2><p className="subtitle">ระบุเลขห้องและเลขที่บิล เพื่อให้หาได้ทันที</p></div><Link className="button secondary" href="/payments">บันทึกรับชำระ</Link></div>
      {pendingInvoices.length === 0 ? <div className="empty compact-empty"><strong>{invoices.length ? "เยี่ยมเลย ชำระครบทุกบิลแล้ว" : "ยังไม่มีบิลในรอบนี้"}</strong>{invoices.length ? "ไม่มีรายการค้างรับที่ต้องติดตาม" : "เริ่มออกบิลเมื่อพร้อมได้จากหน้าค่าเช่าและบิล"}{!invoices.length && <p><Link className="button" href={`/invoices?billing_month=${billingMonth}`}>ไปหน้าออกบิล</Link></p>}</div> : <div className="pending-list">{pendingInvoices.slice(0, 6).map(invoice => {
        const roomNumber = roomNumberById.get(roomIdByLeaseId.get(invoice.lease_id) ?? "") ?? "—";
        return <Link className="pending-item" href={`/invoices?billing_month=${billingMonth}&preview=${invoice.id}`} key={invoice.id}><span className="pending-room">ห้อง {roomNumber}</span><span className="pending-invoice">{invoice.invoice_number}<small>ครบกำหนด {invoice.due_date}</small></span><strong>{formatTHB(Math.max(Number(invoice.total) - (paidByInvoice.get(invoice.id) ?? 0), 0))}</strong><span className={`badge ${invoice.status === "overdue" ? "warn" : ""}`}>{invoice.status === "overdue" ? "เกินกำหนด" : invoice.status === "partial" ? "ชำระบางส่วน" : "รอชำระ"}</span></Link>;
      })}{pendingInvoices.length > 6 && <Link className="pending-more" href={`/invoices?billing_month=${billingMonth}`}>ดูบิลค้างทั้งหมด {pendingInvoices.length} รายการ →</Link>}</div>}
    </section>

    <section className="card pending-panel">
      <div className="dashboard-section-heading"><div><span className="dashboard-eyebrow">งานดูแลอาคาร</span><h2>แจ้งซ่อมล่าสุด</h2></div><Link className="text-link" href="/maintenance">ดูงานซ่อมทั้งหมด →</Link></div>
      {recentTickets.length === 0 ? <p className="subtitle">ยังไม่มีรายการแจ้งซ่อม</p> : <div className="pending-list">{recentTickets.map(ticket => <Link className="pending-item" href="/maintenance" key={ticket.id}><span className="pending-room">ห้อง {roomNumberById.get(ticket.room_id ?? "") ?? "—"}</span><span className="pending-invoice">{ticket.title}<small>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(ticket.created_at))}</small></span><span className={`badge ${["urgent", "high"].includes(ticket.priority) ? "warn" : ""}`}>{ticket.status === "open" ? "รับแจ้งแล้ว" : ticket.status === "in_progress" ? "กำลังดำเนินการ" : ticket.status === "waiting" ? "รอดำเนินการ" : ticket.status === "resolved" ? "แก้ไขแล้ว" : "ปิดงาน"}</span></Link>)}</div>}
    </section>

    <AnalyticsCharts cashFlow={cashFlow} occupancy={occupancy} expenses={monthlyExpenses} categories={expenseCategories} forecast={forecast}/>

    <section className="dashboard-shortcuts"><Link href="/meters"><span className="shortcut-icon">↗</span><span><strong>จดมิเตอร์น้ำและไฟ</strong><small>น้ำ 12 บาท/หน่วย · ไฟ 8 บาท/หน่วย</small></span><b>→</b></Link><Link href="/rooms"><span className="shortcut-icon">⌂</span><span><strong>สถานะห้องและผู้เช่า</strong><small>ดูห้องว่าง ย้ายเข้า หรือบันทึกย้ายออก</small></span><b>→</b></Link></section>
  </AppShell>;
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return <div className={`card dashboard-stat ${tone}`}><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-note">{note}</span></div>;
}

function Status({ label, count, total, tone }: { label: string; count: number; total: number; tone: string }) {
  return <div className="room-status-item"><span className={`status-dot ${tone}`}/><span>{label}</span><strong>{count}</strong><small>{total ? `${Math.round(count / total * 100)}%` : "0%"}</small></div>;
}

