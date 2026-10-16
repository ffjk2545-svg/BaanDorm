# Business Rules

- Meter use = current reading − latest earlier reading for the same room and utility. Lower readings are rejected; corrections require an audited correction workflow (not yet provided in UI).
- Utility charge = units × the latest rate whose effective range overlaps the billing period plus that rate's fixed fee. A reading is billed only when both a pre-period baseline and an in-period reading exist.
- An invoice is unique by lease and period. Issued invoices should be corrected with a credit/adjustment record rather than silently overwritten; that workflow is pending.
- Outstanding receivable = issued invoice total − all valid payments. The payment transaction locks the invoice and rejects a payment larger than its remaining balance.
- Receipts must reference accepted payments. Receipt generation is pending.
- Deposits are liabilities and excluded from normal revenue. Refunds and deductions cannot exceed the deposit received.
- Cash flow reports must use payment receipt date for cash income and expense incurred date for outflows; invoice totals are not cash receipts.
- Move-in starts an active lease, marks the room occupied, and records the security deposit atomically. Move-out settles the deposit, ends the lease, and makes the room available atomically.
- Use Asia/Bangkok for display and UTC timestamps for event records.

## Thai rental compliance checks

The Office of the Consumer Protection Board (OCPB) states that the 2025 controlled-contract announcement requires affected residential rental businesses to use the standard Thai contract, charge utilities no higher than the provider charges, show the calculation method, cap advance rent plus deposit at three months of monthly rent, and refund the deposit within seven days when no tenant-caused damage is found. Applicability depends on the business and property classification, so confirm the current notice before use. See the [OCPB standard-contract notice](https://www.ocpb.go.th/news_view.php?nid=17943) and [OCPB summary of the requirements](https://www.ocpb.go.th/news_view_en.php?nid=17995).

The app records the provider and bill reference with each utility rate and records the move-out deposit settlement date. It does not verify provider charges, enforce the combined advance-rent/deposit cap, generate the required standard lease form, or determine whether a property is covered. Those controls require legal review and further implementation before production use.
