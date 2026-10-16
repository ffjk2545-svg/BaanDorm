"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function signIn(formData: FormData) {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/login?error=ข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=ยังไม่ได้ตั้งค่า Supabase");
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(`/login?error=${encodeURIComponent("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน")}`);
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/login");
}

export async function signUp(formData: FormData) {
  const parsed = credentials.extend({ name: z.string().trim().min(2).max(100) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/login?error=กรุณากรอกชื่อ อีเมล และรหัสผ่านอย่างน้อย 8 ตัวอักษร");
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=ยังไม่ได้ตั้งค่า Supabase");
  const { error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { full_name: parsed.data.name } } });
  if (error) redirect(`/login?error=${encodeURIComponent("สมัครสมาชิกไม่สำเร็จ กรุณาลองอีกครั้ง")}`);
  redirect("/login?success=ส่งลิงก์ยืนยันไปที่อีเมลแล้ว");
}

const organizationSchema = z.object({ name: z.string().trim().min(2).max(120), property: z.string().trim().min(1).max(120) });
export async function createOrganization(formData: FormData) {
  const parsed = organizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/setup?error=กรุณากรอกชื่อกิจการและอาคาร");
  const supabase = await createClient();
  if (!supabase) redirect("/setup?error=ยังไม่ได้ตั้งค่า Supabase");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("create_organization_with_property", {
    p_name: parsed.data.name,
    p_property_name: parsed.data.property,
  });
  if (error) redirect(`/setup?error=${encodeURIComponent("สร้างกิจการไม่สำเร็จ กรุณาลองอีกครั้ง หรือติดต่อผู้ดูแลระบบ")}`);
  redirect("/");
}

const roomSchema = z.object({ room_number: z.string().trim().min(1).max(30), floor: z.coerce.number().int().min(0).max(200), monthly_rent: z.coerce.number().positive(), status: z.enum(["available", "occupied", "maintenance", "reserved"]) });
export async function createRoom(formData: FormData) {
  const parsed = roomSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/rooms?error=กรุณาตรวจสอบข้อมูลห้อง");
  const supabase = await createClient();
  if (!supabase) redirect("/rooms?error=ยังไม่ได้ตั้งค่า Supabase");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) redirect("/rooms?error=บัญชีนี้ยังไม่ได้เข้าร่วมกิจการ");
  const { data: property } = await supabase.from("properties").select("id").eq("organization_id", membership.organization_id).limit(1).maybeSingle();
  if (!property) redirect("/rooms?error=กรุณาสร้างอาคารก่อนเพิ่มห้อง");
  const { error } = await supabase.from("rooms").insert({ ...parsed.data, organization_id: membership.organization_id, property_id: property.id });
  if (error) redirect(`/rooms?error=${encodeURIComponent(error.code === "23505" ? "เลขห้องนี้มีอยู่แล้ว" : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง")}`);
  redirect("/rooms?saved=1");
}

export async function updateRoomStatus(formData: FormData) {
  const parsed = z.object({ room_id: z.string().uuid(), status: z.enum(["available", "maintenance", "reserved"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/rooms?error=สถานะห้องไม่ถูกต้อง");
  const supabase = await createClient();
  if (!supabase) redirect("/rooms?error=ยังไม่ได้ตั้งค่า Supabase");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("organization_members").select("organization_id,role").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) redirect("/setup");
  if (!(membership.role === "owner" || membership.role === "manager")) redirect("/rooms?error=บัญชีนี้ไม่มีสิทธิ์เปลี่ยนสถานะห้อง");
  const { data: activeLease } = await supabase.from("leases").select("id").eq("organization_id", membership.organization_id).eq("room_id", parsed.data.room_id).eq("status", "active").maybeSingle();
  if (activeLease) redirect("/rooms?error=ห้องนี้มีผู้เช่าอยู่ เปลี่ยนสถานะไม่ได้");
  const { data, error } = await supabase.from("rooms").update({ status: parsed.data.status }).eq("id", parsed.data.room_id).eq("organization_id", membership.organization_id).neq("status", "occupied").select("id").maybeSingle();
  if (error || !data) redirect("/rooms?error=ห้องมีผู้เช่าอยู่หรือบันทึกสถานะไม่สำเร็จ");
  redirect("/rooms?saved=status");
}

const tenantSchema = z.object({ full_name:z.string().trim().min(2).max(120), email:z.string().email().or(z.literal("")), phone:z.string().max(30), identity_number:z.string().max(40) });
export async function createTenant(formData: FormData) {
  const parsed=tenantSchema.safeParse(Object.fromEntries(formData));
  if(!parsed.success) redirect("/tenants?error=กรุณาตรวจสอบข้อมูลผู้เช่า");
  const supabase=await createClient(); if(!supabase) redirect("/tenants?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();
  if(!membership) redirect("/setup");
  const {error}=await supabase.from("tenants").insert({...parsed.data,email:parsed.data.email||null,organization_id:membership.organization_id});
  if(error) redirect("/tenants?error=บันทึกข้อมูลไม่สำเร็จ");
  redirect("/tenants?saved=1");
}

const residentSchema = z.object({ room_id: z.string().uuid(), full_name: z.string().trim().min(2).max(120), phone: z.string().trim().max(30), rent_amount: z.coerce.number().nonnegative().max(10000000), deposit_amount: z.coerce.number().nonnegative().max(10000000), start_date: z.string().date(), billing_day: z.coerce.number().int().min(1).max(28) });
export async function createResidentAndLease(formData: FormData) {
  const parsed = residentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/rooms?error=กรุณาตรวจสอบห้อง ชื่อผู้เช่า และค่าเช่า");
  const supabase = await createClient();
  if (!supabase) redirect("/rooms?error=ยังไม่ได้ตั้งค่า Supabase");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("create_tenant_and_lease", {
    p_room_id: parsed.data.room_id,
    p_full_name: parsed.data.full_name,
    p_phone: parsed.data.phone || null,
    p_start_date: parsed.data.start_date,
    p_rent_amount: parsed.data.rent_amount,
    p_deposit_amount: parsed.data.deposit_amount,
    p_billing_day: parsed.data.billing_day,
  });
  if (error) redirect(`/rooms?error=${encodeURIComponent("เพิ่มผู้เช่าไม่สำเร็จ ตรวจสอบว่าห้องยังว่างและวันที่เริ่มพักไม่ใช่วันในอนาคต")}`);
  redirect("/rooms?saved=resident");
}

const meterSchema=z.object({room_id:z.string().uuid(),utility:z.enum(["water","electricity"]),reading_value:z.coerce.number().nonnegative(),read_at:z.string().date(),notes:z.string().max(500)});
export async function recordMeter(formData:FormData) {
  const parsed=meterSchema.safeParse(Object.fromEntries(formData)); if(!parsed.success) redirect("/meters?error=กรุณาตรวจสอบข้อมูลมิเตอร์");
  const returnPath=`/meters?read_date=${encodeURIComponent(parsed.data.read_at)}`;
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  if(parsed.data.read_at>today)redirect(`${returnPath}&error=เลือกวันที่วันนี้หรือย้อนหลังเท่านั้น`);
  const supabase=await createClient(); if(!supabase) redirect("/meters?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle(); if(!membership) redirect("/setup");
  const [previous,next]=await Promise.all([
    supabase.from("meter_readings").select("reading_value").eq("organization_id",membership.organization_id).eq("room_id",parsed.data.room_id).eq("utility",parsed.data.utility).lt("read_at",parsed.data.read_at).order("read_at",{ascending:false}).limit(1).maybeSingle(),
    supabase.from("meter_readings").select("reading_value").eq("organization_id",membership.organization_id).eq("room_id",parsed.data.room_id).eq("utility",parsed.data.utility).gt("read_at",parsed.data.read_at).order("read_at").limit(1).maybeSingle(),
  ]);
  if(previous.data && parsed.data.reading_value<Number(previous.data.reading_value)) redirect(`${returnPath}&error=เลขมิเตอร์ต้องไม่น้อยกว่าครั้งก่อน`);
  if(next.data && parsed.data.reading_value>Number(next.data.reading_value)) redirect(`${returnPath}&error=เลขย้อนหลังต้องไม่มากกว่าค่าที่บันทึกในวันถัดไป`);
  const {error}=await supabase.from("meter_readings").upsert({...parsed.data,organization_id:membership.organization_id,captured_by:user.id},{onConflict:"room_id,utility,read_at"});
  if(error) redirect(`${returnPath}&error=${encodeURIComponent("บันทึกไม่สำเร็จ ตรวจสอบวันและเลขมิเตอร์")}`);
  redirect(`${returnPath}&saved=1`);
}

const leaseSchema=z.object({room_id:z.string().uuid(),tenant_id:z.string().uuid(),start_date:z.string().date(),end_date:z.string().date().or(z.literal("")),rent_amount:z.coerce.number().nonnegative(),deposit_amount:z.coerce.number().nonnegative(),billing_day:z.coerce.number().int().min(1).max(28)});
export async function createLease(formData:FormData) {
  const parsed=leaseSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/leases?error=กรุณาตรวจสอบข้อมูลสัญญา");
  const supabase=await createClient();if(!supabase)redirect("/leases?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {error}=await supabase.rpc("create_lease",{p_room_id:parsed.data.room_id,p_tenant_id:parsed.data.tenant_id,p_start_date:parsed.data.start_date,p_end_date:parsed.data.end_date||null,p_rent_amount:parsed.data.rent_amount,p_deposit_amount:parsed.data.deposit_amount,p_billing_day:parsed.data.billing_day});
  if(error)redirect(`/leases?error=${encodeURIComponent("สร้างสัญญาไม่สำเร็จ กรุณาตรวจสอบห้อง ผู้เช่า และสิทธิ์ของบัญชี")}`);
  redirect("/leases?saved=1");
}

const endLeaseSchema=z.object({lease_id:z.string().uuid(),end_date:z.string().date(),refund:z.coerce.number().nonnegative(),deduction:z.coerce.number().nonnegative(),notes:z.string().max(500)});
export async function endLease(formData:FormData) {
  const parsed=endLeaseSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/rooms?error=กรุณาตรวจสอบข้อมูลการย้ายออก");
  const supabase=await createClient();if(!supabase)redirect("/rooms?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {error}=await supabase.rpc("end_lease",{p_lease_id:parsed.data.lease_id,p_end_date:parsed.data.end_date,p_refund:parsed.data.refund,p_deduction:parsed.data.deduction,p_notes:parsed.data.notes||null});
  if(error)redirect(`/rooms?error=${encodeURIComponent("บันทึกย้ายออกไม่สำเร็จ ตรวจสอบวันที่และยอดเงินประกัน")}`);
  redirect("/rooms?saved=moveout");
}

const invoiceSchema=z.object({lease_id:z.string().uuid(),period_start:z.string().date(),period_end:z.string().date(),due_date:z.string().date()});
export async function generateInvoice(formData:FormData) {
  const parsed=invoiceSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/invoices?error=กรุณาตรวจสอบรอบบิล");
  const supabase=await createClient();if(!supabase)redirect("/invoices?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data,error}=await supabase.rpc("generate_invoice",{p_lease_id:parsed.data.lease_id,p_period_start:parsed.data.period_start,p_period_end:parsed.data.period_end,p_due_date:parsed.data.due_date});
  if(error||!data)redirect(`/invoices?error=${encodeURIComponent("คำนวณบิลไม่สำเร็จ ตรวจสอบสัญญา รอบบิล และเลขมิเตอร์")}`);
  redirect(`/invoices?preview=${data}`);
}

export async function generateMonthlyInvoices(formData: FormData) {
  const billingMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).safeParse(formData.get("billing_month"));
  if (!billingMonth.success) redirect("/invoices?error=เลือกเดือนที่ต้องการออกบิล");
  const supabase = await createClient();
  if (!supabase) redirect("/invoices?error=ยังไม่ได้ตั้งค่า Supabase");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("organization_members").select("organization_id,role").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) redirect("/setup");
  if (!("owner manager accountant".split(" ").includes(membership.role))) redirect("/invoices?error=บัญชีนี้ไม่มีสิทธิ์สร้างบิล");

  const selectedMonth = billingMonth.data;
  const [year, month] = selectedMonth.split("-").map(Number);
  const periodStart = `${selectedMonth}-01`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const periodEnd = `${selectedMonth}-${String(daysInMonth).padStart(2, "0")}`;
  const { data: leaseRows, error: leasesError } = await supabase.from("leases").select("id,billing_day,start_date,end_date").eq("organization_id", membership.organization_id).eq("status", "active");
  if (leasesError) redirect("/invoices?error=โหลดรายชื่อห้องที่มีผู้เช่าไม่สำเร็จ");
  const leases = (leaseRows ?? []).filter(lease => lease.start_date <= periodEnd && (!lease.end_date || lease.end_date >= periodStart));
  if (!leases?.length) redirect("/invoices?created=0&skipped=0&failed=0");

  const leaseIds = leases.map(lease => lease.id);
  const { data: existing, error: existingError } = await supabase.from("invoices").select("lease_id").eq("organization_id", membership.organization_id).eq("period_start", periodStart).eq("period_end", periodEnd).in("lease_id", leaseIds);
  if (existingError) redirect("/invoices?error=ตรวจสอบบิลประจำเดือนไม่สำเร็จ");
  const alreadyBilled = new Set((existing ?? []).map(invoice => invoice.lease_id));
  let created = 0;
  let failed = 0;
  for (const lease of leases) {
    if (alreadyBilled.has(lease.id)) continue;
    const dueDay = Math.min(Number(lease.billing_day), daysInMonth);
    const dueDate = `${selectedMonth}-${String(dueDay).padStart(2, "0")}`;
    const { data: invoiceId, error } = await supabase.rpc("generate_invoice", { p_lease_id: lease.id, p_period_start: periodStart, p_period_end: periodEnd, p_due_date: dueDate });
    if (error || !invoiceId) {
      failed++;
      continue;
    }
    const { error: finalizeError } = await supabase.rpc("finalize_invoice", { p_invoice_id: invoiceId });
    if (finalizeError) failed++;
    else created++;
  }
  redirect(`/invoices?created=${created}&skipped=${alreadyBilled.size}&failed=${failed}`);
}

const invoiceFeeSchema=z.object({invoice_id:z.string().uuid(),description:z.string().trim().min(1).max(120),amount:z.coerce.number().positive().max(10000000)});
export async function addInvoiceFee(formData:FormData) {
  const parsed=invoiceFeeSchema.safeParse(Object.fromEntries(formData));
  if(!parsed.success)redirect("/invoices?error=กรุณาตรวจสอบชื่อและจำนวนค่าใช้จ่าย");
  const supabase=await createClient();if(!supabase)redirect("/invoices?error=ยังไม่ได้ตั้งค่า Supabase");
  const {error}=await supabase.rpc("add_invoice_fee",{p_invoice_id:parsed.data.invoice_id,p_description:parsed.data.description,p_amount:parsed.data.amount});
  if(error)redirect(`/invoices?preview=${parsed.data.invoice_id}&error=${encodeURIComponent("เพิ่มค่าใช้จ่ายไม่สำเร็จ ตรวจสอบว่าบิลยังเป็นฉบับร่าง")}`);
  redirect(`/invoices?preview=${parsed.data.invoice_id}&saved=1`);
}

async function pushInvoiceLine(invoiceId:string) {
  const accessToken=process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if(!accessToken) return "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน Vercel";
  const supabase=await createClient();
  if(!supabase) return "ยังไม่ได้ตั้งค่า Supabase";
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return "ไม่พบผู้ใช้ที่เข้าสู่ระบบ";
  const {data:membership}=await supabase.from("organization_members").select("organization_id,role").eq("user_id",user.id).limit(1).maybeSingle();
  if(!membership||!(["owner","manager","accountant"].includes(membership.role))) return "บัญชีนี้ไม่มีสิทธิ์ส่งบิล";
  const {data:invoice}=await supabase.from("invoices").select("id,organization_id,invoice_number,total,due_date,public_token,tenant_id,status").eq("id",invoiceId).eq("organization_id",membership.organization_id).maybeSingle();
  if(!invoice||invoice.status==="draft"||invoice.status==="void") return "ไม่พบใบแจ้งหนี้ที่ออกแล้ว";
  const {data:tenant}=await supabase.from("tenants").select("full_name,line_user_id").eq("id",invoice.tenant_id).eq("organization_id",membership.organization_id).maybeSingle();
  if(!tenant?.line_user_id) return "ยังไม่ได้บันทึก LINE User ID ของผู้เช่ารายนี้";
  const baseUrl=process.env.NEXT_PUBLIC_APP_URL??(process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:null);
  if(!baseUrl) return "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_APP_URL ใน Vercel";
  const billUrl=`${baseUrl.replace(/\/$/,"")}/bill/${invoice.public_token}`;
  try {
    const response=await fetch("https://api.line.me/v2/bot/message/push",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:`Bearer ${accessToken}`},
      body:JSON.stringify({to:tenant.line_user_id,messages:[{type:"text",text:`แจ้งบิลค่าเช่า ${invoice.invoice_number}\n${tenant.full_name}\nยอดชำระ ${Number(invoice.total).toLocaleString("th-TH")} บาท\nครบกำหนด ${invoice.due_date}\nดูใบแจ้งหนี้และ QR PromptPay: ${billUrl}`}]}),
    });
    if(!response.ok) return "LINE ส่งข้อความไม่สำเร็จ ตรวจสอบ Channel Access Token และ LINE User ID";
    await supabase.rpc("mark_invoice_line_sent",{p_invoice_id:invoice.id});
    return null;
  } catch {
    return "เชื่อมต่อ LINE ไม่สำเร็จ กรุณาลองส่งบิลอีกครั้ง";
  }
}

export async function sendInvoiceLine(formData:FormData) {
  const invoiceId=z.string().uuid().safeParse(formData.get("invoice_id"));
  if(!invoiceId.success)redirect("/invoices?error=ใบแจ้งหนี้ไม่ถูกต้อง");
  const error=await pushInvoiceLine(invoiceId.data);
  redirect(error?`/invoices?preview=${invoiceId.data}&line_error=${encodeURIComponent(error)}`:`/invoices?preview=${invoiceId.data}&line=sent`);
}

export async function finalizeInvoice(formData:FormData) {
  const parsed=z.string().uuid().safeParse(formData.get("invoice_id"));if(!parsed.success)redirect("/invoices?error=ใบแจ้งหนี้ไม่ถูกต้อง");
  const supabase=await createClient();if(!supabase)redirect("/invoices?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {error}=await supabase.rpc("finalize_invoice",{p_invoice_id:parsed.data});
  if(error)redirect("/invoices?error=ยืนยันใบแจ้งหนี้ไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และสถานะบิล");
  redirect(`/invoices?preview=${parsed.data}&saved=1`);
}

const paymentSchema=z.object({invoice_id:z.string().uuid(),amount:z.coerce.number().positive(),method:z.enum(["cash","bank_transfer","promptpay","card","other"]),reference:z.string().max(100)});
export async function recordInvoicePayment(formData:FormData) {
  const parsed=paymentSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/payments?error=กรุณาตรวจสอบข้อมูลการชำระ");
  const supabase=await createClient();if(!supabase)redirect("/payments?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {error}=await supabase.rpc("record_invoice_payment",{p_invoice_id:parsed.data.invoice_id,p_amount:parsed.data.amount,p_method:parsed.data.method,p_reference:parsed.data.reference||null});
  if(error)redirect(`/payments?error=${encodeURIComponent("บันทึกรับชำระไม่สำเร็จ ตรวจสอบยอดคงเหลือและสิทธิ์ของบัญชี")}`);
  redirect("/payments?saved=1");
}

const expenseSchema=z.object({category:z.string().trim().min(1).max(80),description:z.string().trim().min(1).max(250),amount:z.coerce.number().positive(),incurred_on:z.string().date(),vendor:z.string().max(120)});
export async function createExpense(formData:FormData) {
  const parsed=expenseSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/finance?error=กรุณาตรวจสอบรายการรายจ่าย");
  const supabase=await createClient();if(!supabase)redirect("/finance?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();if(!membership)redirect("/setup");
  const {error}=await supabase.from("expenses").insert({...parsed.data,organization_id:membership.organization_id,created_by:user.id});
  if(error)redirect("/finance?error=บันทึกรายจ่ายไม่สำเร็จ");
  redirect("/finance?saved=1");
}

const rateSchema=z.object({property_id:z.string().uuid(),utility:z.enum(["water","electricity"]),unit_rate:z.coerce.number().nonnegative(),fixed_fee:z.coerce.number().nonnegative(),effective_from:z.string().date(),effective_to:z.string().date().or(z.literal("")),source_reference:z.string().trim().min(1).max(160)});
export async function createUtilityRate(formData:FormData) {
  const parsed=rateSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/rates?error=กรุณาตรวจสอบอัตราค่าน้ำไฟ");
  if(parsed.data.effective_to&&parsed.data.effective_to<parsed.data.effective_from)redirect("/rates?error=วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มใช้");
  const supabase=await createClient();if(!supabase)redirect("/rates?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();if(!membership)redirect("/setup");
  const {error}=await supabase.from("utility_rates").insert({...parsed.data,effective_to:parsed.data.effective_to||null,organization_id:membership.organization_id});
  if(error)redirect("/rates?error=บันทึกไม่สำเร็จ อาจมีอัตราที่เริ่มใช้วันเดียวกันแล้ว");
  redirect("/rates?saved=1");
}

const ticketSchema=z.object({room_id:z.string().uuid().or(z.literal("")),title:z.string().trim().min(3).max(180),description:z.string().max(2000),priority:z.enum(["low","normal","high","urgent"])});
export async function createMaintenanceTicket(formData:FormData) {
  const parsed=ticketSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/maintenance?error=กรุณากรอกหัวข้องานซ่อม");
  const supabase=await createClient();if(!supabase)redirect("/maintenance?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();if(!membership)redirect("/setup");
  const {error}=await supabase.from("maintenance_tickets").insert({...parsed.data,room_id:parsed.data.room_id||null,organization_id:membership.organization_id});
  if(error)redirect("/maintenance?error=สร้างรายการแจ้งซ่อมไม่สำเร็จ");
  redirect("/maintenance?saved=1");
}

const announcementSchema=z.object({property_id:z.string().uuid().or(z.literal("")),title:z.string().trim().min(3).max(180),body:z.string().trim().min(1).max(5000)});
export async function createAnnouncement(formData:FormData) {
  const parsed=announcementSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/announcements?error=กรุณากรอกหัวข้อและเนื้อหาประกาศ");
  const supabase=await createClient();if(!supabase)redirect("/announcements?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();if(!membership)redirect("/setup");
  const {error}=await supabase.from("announcements").insert({...parsed.data,property_id:parsed.data.property_id||null,organization_id:membership.organization_id,created_by:user.id});
  if(error)redirect("/announcements?error=บันทึกประกาศไม่สำเร็จ");
  redirect("/announcements?saved=1");
}

const parcelSchema=z.object({tenant_id:z.string().uuid(),carrier:z.string().max(100),tracking_number:z.string().max(120),notes:z.string().max(500)});
export async function receiveParcel(formData:FormData) {
  const parsed=parcelSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/parcels?error=กรุณาตรวจสอบข้อมูลพัสดุ");
  const supabase=await createClient();if(!supabase)redirect("/parcels?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();if(!membership)redirect("/setup");
  const {error}=await supabase.from("parcels").insert({...parsed.data,organization_id:membership.organization_id});
  if(error)redirect("/parcels?error=บันทึกพัสดุไม่สำเร็จ");
  redirect("/parcels?saved=1");
}

const taskSchema=z.object({title:z.string().trim().min(3).max(180),details:z.string().max(2000),due_at:z.string().datetime().or(z.literal(""))});
export async function createTask(formData:FormData) {
  const raw=Object.fromEntries(formData);const due=raw.due_at?new Date(String(raw.due_at)).toISOString():"";
  const parsed=taskSchema.safeParse({...raw,due_at:due});if(!parsed.success)redirect("/tasks?error=กรุณากรอกชื่องาน");
  const supabase=await createClient();if(!supabase)redirect("/tasks?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle();if(!membership)redirect("/setup");
  const {error}=await supabase.from("tasks").insert({...parsed.data,due_at:parsed.data.due_at||null,organization_id:membership.organization_id,created_by:user.id});
  if(error)redirect("/tasks?error=บันทึกงานไม่สำเร็จ");
  redirect("/tasks?saved=1");
}

export async function collectParcel(formData:FormData) {
  const parcelId=z.string().uuid().safeParse(formData.get("parcel_id"));if(!parcelId.success)redirect("/parcels?error=รายการพัสดุไม่ถูกต้อง");
  const supabase=await createClient();if(!supabase)redirect("/parcels?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data,error}=await supabase.from("parcels").update({collected_at:new Date().toISOString(),collected_by:user.email??"staff"}).eq("id",parcelId.data).is("collected_at",null).select("id").maybeSingle();
  if(error||!data)redirect("/parcels?error=บันทึกการรับพัสดุไม่สำเร็จ หรือพัสดุถูกรับไปแล้ว");
  redirect("/parcels?saved=1");
}

export async function resolveMaintenanceTicket(formData:FormData) {
  const ticketId=z.string().uuid().safeParse(formData.get("ticket_id"));if(!ticketId.success)redirect("/maintenance?error=รายการแจ้งซ่อมไม่ถูกต้อง");
  const supabase=await createClient();if(!supabase)redirect("/maintenance?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data,error}=await supabase.from("maintenance_tickets").update({status:"resolved",resolved_at:new Date().toISOString()}).eq("id",ticketId.data).not("status","in",'("resolved","closed")').select("id").maybeSingle();
  if(error||!data)redirect("/maintenance?error=อัปเดตงานซ่อมไม่สำเร็จ");
  redirect("/maintenance?saved=1");
}

export async function completeTask(formData:FormData) {
  const taskId=z.string().uuid().safeParse(formData.get("task_id"));if(!taskId.success)redirect("/tasks?error=รายการงานไม่ถูกต้อง");
  const supabase=await createClient();if(!supabase)redirect("/tasks?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data,error}=await supabase.from("tasks").update({status:"done"}).eq("id",taskId.data).eq("status","open").select("id").maybeSingle();
  if(error||!data)redirect("/tasks?error=อัปเดตงานไม่สำเร็จ");
  redirect("/tasks?saved=1");
}

const secureImageUrl=z.string().trim().url().refine(value=>value.startsWith("https://"),"Logo URL must use HTTPS").or(z.literal(""));
const propertySchema=z.object({name:z.string().trim().min(2).max(120),address:z.string().max(300),province:z.string().max(100),postal_code:z.string().max(12),phone:z.string().max(30),logo_url:secureImageUrl});
export async function createProperty(formData:FormData) {
  const parsed=propertySchema.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/settings?error=กรุณาตรวจสอบชื่ออาคาร");
  const supabase=await createClient();if(!supabase)redirect("/settings?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id,role").eq("user_id",user.id).limit(1).maybeSingle();if(!membership)redirect("/setup");
  if(!["owner","manager"].includes(membership.role))redirect("/settings?error=เฉพาะเจ้าของหรือผู้จัดการที่เพิ่มอาคารได้");
  const {error}=await supabase.from("properties").insert({...parsed.data,logo_url:parsed.data.logo_url||null,organization_id:membership.organization_id});
  if(error)redirect("/settings?error=เพิ่มอาคารไม่สำเร็จ");
  redirect("/settings?saved=1");
}

export async function updateProperty(formData:FormData) {
  const propertyId=z.string().uuid().safeParse(formData.get("property_id"));
  const parsed=propertySchema.safeParse(Object.fromEntries(formData));
  if(!propertyId.success||!parsed.success)redirect("/settings?error=กรุณาตรวจสอบข้อมูลอาคาร");
  const supabase=await createClient();if(!supabase)redirect("/settings?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id,role").eq("user_id",user.id).limit(1).maybeSingle();
  if(!membership||!(membership.role==="owner"||membership.role==="manager"))redirect("/settings?error=เฉพาะเจ้าของหรือผู้จัดการที่แก้ข้อมูลอาคารได้");
  const {error}=await supabase.from("properties").update({...parsed.data,logo_url:parsed.data.logo_url||null}).eq("id",propertyId.data).eq("organization_id",membership.organization_id);
  if(error)redirect("/settings?error=อัปเดตข้อมูลอาคารไม่สำเร็จ");
  redirect("/settings?saved=1");
}

const brandSettingsSchema=z.object({document_display_name:z.string().trim().min(2).max(120),brand_logo_url:secureImageUrl,promptpay_id:z.string().trim().regex(/^(?:\d{10}|\d{13}|\d{15})?$/)});
export async function updateBrandSettings(formData:FormData) {
  const parsed=brandSettingsSchema.safeParse(Object.fromEntries(formData));
  if(!parsed.success)redirect("/settings?error=กรุณาตรวจสอบชื่อกิจการ URL โลโก้ และ PromptPay ID");
  const supabase=await createClient();if(!supabase)redirect("/settings?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id,role").eq("user_id",user.id).limit(1).maybeSingle();
  if(!membership||membership.role!=="owner")redirect("/settings?error=เฉพาะเจ้าของกิจการที่แก้การตั้งค่าได้");
  const {error}=await supabase.from("organizations").update({document_display_name:parsed.data.document_display_name,brand_logo_url:parsed.data.brand_logo_url||null,promptpay_id:parsed.data.promptpay_id||null}).eq("id",membership.organization_id);
  if(error)redirect("/settings?error=บันทึกการตั้งค่าไม่สำเร็จ กรุณารัน migration ล่าสุด");
  redirect("/settings?saved=1");
}

export async function rotateTenantLineCode(formData:FormData) {
  const tenantId=z.string().uuid().safeParse(formData.get("tenant_id"));
  if(!tenantId.success)redirect("/tenants?error=ผู้เช่าไม่ถูกต้อง");
  const supabase=await createClient();if(!supabase)redirect("/tenants?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id,role").eq("user_id",user.id).limit(1).maybeSingle();
  if(!membership||!(membership.role==="owner"||membership.role==="manager"))redirect("/tenants?error=เฉพาะเจ้าของหรือผู้จัดการที่จัดการ LINE ได้");
  const {data,error}=await supabase.from("tenants").update({line_link_code:randomUUID(),line_link_expires_at:new Date(Date.now()+7*24*60*60*1000).toISOString()}).eq("id",tenantId.data).eq("organization_id",membership.organization_id).is("line_user_id",null).select("id").maybeSingle();
  if(error||!data)redirect("/tenants?error=สร้างรหัส LINE ไม่สำเร็จ ผู้เช่าอาจเชื่อม LINE ไปแล้ว");
  redirect("/tenants?saved=1");
}
