"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
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
  const { data: org, error: orgError } = await supabase.from("organizations").insert({ name: parsed.data.name, owner_user_id: user.id }).select("id").single();
  if (orgError || !org) redirect("/setup?error=สร้างกิจการไม่สำเร็จ");
  const { error: memberError } = await supabase.from("organization_members").insert({ organization_id: org.id, user_id: user.id, role: "owner" });
  if (memberError) redirect("/setup?error=สร้างสิทธิ์เจ้าของไม่สำเร็จ กรุณาตรวจสอบ Supabase");
  const { error: propertyError } = await supabase.from("properties").insert({ organization_id: org.id, name: parsed.data.property });
  if (propertyError) redirect("/setup?error=กิจการถูกสร้างแล้ว แต่สร้างอาคารไม่สำเร็จ");
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

const meterSchema=z.object({room_id:z.string().uuid(),utility:z.enum(["water","electricity"]),reading_value:z.coerce.number().nonnegative(),read_at:z.string().date(),notes:z.string().max(500)});
export async function recordMeter(formData:FormData) {
  const parsed=meterSchema.safeParse(Object.fromEntries(formData)); if(!parsed.success) redirect("/meters?error=กรุณาตรวจสอบข้อมูลมิเตอร์");
  const supabase=await createClient(); if(!supabase) redirect("/meters?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle(); if(!membership) redirect("/setup");
  const {data:previous}=await supabase.from("meter_readings").select("reading_value").eq("organization_id",membership.organization_id).eq("room_id",parsed.data.room_id).eq("utility",parsed.data.utility).lt("read_at",parsed.data.read_at).order("read_at",{ascending:false}).limit(1).maybeSingle();
  if(previous && parsed.data.reading_value<Number(previous.reading_value)) redirect("/meters?error=เลขมิเตอร์ต้องไม่น้อยกว่าครั้งก่อน");
  const {error}=await supabase.from("meter_readings").insert({...parsed.data,organization_id:membership.organization_id,captured_by:user.id});
  if(error) redirect("/meters?error=บันทึกไม่สำเร็จ อาจมีข้อมูลของวันที่นี้แล้ว");
  redirect("/meters?saved=1");
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
  const parsed=endLeaseSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/leases?error=กรุณาตรวจสอบการย้ายออก");
  const supabase=await createClient();if(!supabase)redirect("/leases?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {error}=await supabase.rpc("end_lease",{p_lease_id:parsed.data.lease_id,p_end_date:parsed.data.end_date,p_refund:parsed.data.refund,p_deduction:parsed.data.deduction,p_notes:parsed.data.notes||null});
  if(error)redirect(`/leases?error=${encodeURIComponent("ปิดสัญญาไม่สำเร็จ ตรวจสอบวันย้ายออกและยอดคืน/หักเงินประกัน")}`);
  redirect("/leases?saved=1");
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

export async function finalizeInvoice(formData:FormData) {
  const parsed=z.string().uuid().safeParse(formData.get("invoice_id"));if(!parsed.success)redirect("/invoices?error=ใบแจ้งหนี้ไม่ถูกต้อง");
  const supabase=await createClient();if(!supabase)redirect("/invoices?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {error}=await supabase.rpc("finalize_invoice",{p_invoice_id:parsed.data});
  if(error)redirect("/invoices?error=ยืนยันใบแจ้งหนี้ไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และสถานะบิล");
  redirect("/invoices?saved=1");
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

const propertySchema=z.object({name:z.string().trim().min(2).max(120),address:z.string().max(300),province:z.string().max(100),postal_code:z.string().max(12),phone:z.string().max(30)});
export async function createProperty(formData:FormData) {
  const parsed=propertySchema.safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/settings?error=กรุณาตรวจสอบชื่ออาคาร");
  const supabase=await createClient();if(!supabase)redirect("/settings?error=ยังไม่ได้ตั้งค่า Supabase");
  const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
  const {data:membership}=await supabase.from("organization_members").select("organization_id,role").eq("user_id",user.id).limit(1).maybeSingle();if(!membership)redirect("/setup");
  if(!["owner","manager"].includes(membership.role))redirect("/settings?error=เฉพาะเจ้าของหรือผู้จัดการที่เพิ่มอาคารได้");
  const {error}=await supabase.from("properties").insert({...parsed.data,organization_id:membership.organization_id});
  if(error)redirect("/settings?error=เพิ่มอาคารไม่สำเร็จ");
  redirect("/settings?saved=1");
}
