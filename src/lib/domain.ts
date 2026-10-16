export type UUID = string;
export type ISODate = string;
export type MemberRole = "owner" | "manager" | "accountant" | "staff" | "tenant";
export type RoomStatus = "available" | "occupied" | "maintenance" | "reserved";
export type InvoiceStatus = "draft" | "issued" | "partial" | "paid" | "overdue" | "void";
export type PaymentMethod = "cash" | "bank_transfer" | "promptpay" | "card" | "other";

export interface Organization { id: UUID; name: string; owner_user_id: UUID; currency: "THB"; timezone: "Asia/Bangkok"; }
export interface Property { id: UUID; organization_id: UUID; name: string; address: string | null; province: string | null; postal_code: string | null; phone: string | null; is_active: boolean; }
export interface Room { id: UUID; organization_id: UUID; property_id: UUID; room_number: string; floor: number; monthly_rent: number; status: RoomStatus; notes: string | null; }
export interface Tenant { id: UUID; organization_id: UUID; auth_user_id: UUID | null; full_name: string; email: string | null; phone: string | null; identity_number: string | null; }
export interface Lease { id: UUID; organization_id: UUID; room_id: UUID; tenant_id: UUID; start_date: ISODate; end_date: ISODate | null; rent_amount: number; deposit_amount: number; billing_day: number; status: "active" | "ended" | "draft"; }
export interface MeterReading { id: UUID; organization_id: UUID; room_id: UUID; utility: "water" | "electricity"; reading_value: number; read_at: ISODate; evidence_path: string | null; }
export interface UtilityRate { id: UUID; organization_id: UUID; property_id: UUID; utility: "water" | "electricity"; unit_rate: number; fixed_fee: number; effective_from: ISODate; effective_to: ISODate | null; source_reference: string; }
export interface Invoice { id: UUID; organization_id: UUID; tenant_id: UUID; lease_id: UUID; invoice_number: string; period_start: ISODate; period_end: ISODate; due_date: ISODate; subtotal: number; total: number; status: InvoiceStatus; }
export interface Payment { id: UUID; organization_id: UUID; invoice_id: UUID; amount: number; method: PaymentMethod; received_at: string; reference: string | null; }
export interface Expense { id: UUID; organization_id: UUID; property_id: UUID | null; category: string; description: string; amount: number; incurred_on: ISODate; }
export interface SecurityDeposit { id: UUID; organization_id: UUID; lease_id: UUID; amount_received: number; amount_refunded: number; amount_deducted: number; settlement_due_on: ISODate | null; settled_on: ISODate | null; status: "held" | "partially_refunded" | "refunded" | "forfeited"; }
