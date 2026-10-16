# BaanDorm Product Scope

## Purpose

BaanDorm เป็นระบบบริหารอาคารเช่าในประเทศไทย ใช้ข้อมูลแบบ multi-tenant โดยกิจการเป็นขอบเขตความปลอดภัยหลัก สกุลเงิน THB และเวลา Asia/Bangkok

## Roles

Schema กำหนด `owner`, `manager`, `accountant`, `staff`, `tenant` ไว้สำหรับการแยกหน้าที่ RLS ปิดสิทธิ์ tenant role จากข้อมูลปฏิบัติการ และจำกัดการเขียนข้อมูลการเงินไว้ที่ owner/manager/accountant ส่วน role matrix ที่แยกสิทธิ์ทุกโมดูลและ Tenant Portal ยังต้องทำเพิ่มก่อนเปิดให้พนักงานหรือผู้เช่าใช้งานจริง

## Modules

| Module | Status |
|---|---|
| Auth, business onboarding, room and tenant entry | Implemented |
| Organization scoped schema and private evidence storage | Implemented in migration |
| Meter reading with prior-reading validation | Implemented |
| Live dashboard, rooms, tenant, meter read views | Implemented |
| Lease start/end and deposit settlement | Implemented with transactional database functions |
| Invoice generation from rent and configured meter rates | Implemented with an idempotency constraint and transaction |
| Partial payment entry with balance validation | Implemented with row locking and a transactional database function |
| Expense entry and live cash flow totals | Implemented |
| Rate configuration | Implemented with effective dates and a required provider-bill reference |
| Maintenance tickets, announcements, parcels, task list | Basic create and close/collect/complete workflows implemented |
| Assets, tenant portal, reporting, scheduled reminders | Schema/read views or not enabled; full workflows pending |
| Tenant portal, LINE, OCR, PromptPay, notifications, PDF, imports, exports, backup | Not enabled; provider credentials/configuration and additional implementation required |

## Business rules

- A room may have only one active lease at a time.
- Meter readings are unique per room, utility, and date; a new reading cannot be below its prior reading.
- Invoices are unique for a lease and billing period.
- Deposits are tracked separately from regular income.
- Invoice and payment values use PostgreSQL `numeric`; client calculation helpers use Decimal.js.
- All property records carry `organization_id` and are protected by RLS.

## Known limitations

- Supabase credentials are required; no production credentials or project are included.
- Authorization always scopes data to an organization. Tenant-role access is blocked, finance writes require an owner/manager/accountant, and room/lease transitions require owner/manager. Granular role rules for all remaining modules and tenant self-service access are not complete.
- Utility rate administration, receipts, analytics, maintenance state transitions, exports, scheduled jobs, and integrations need their application flows implemented before production use.
- SQL migrations have not been applied to a live PostgreSQL/Supabase project in this environment; validate them against a disposable Supabase project before production.
- Thai controlled-contract requirements are not fully enforced: the app does not calculate applicability, enforce the advance-rent/deposit cap, or generate standard lease forms. Review [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) and validate with Thai counsel.
- No live deployment was performed.
