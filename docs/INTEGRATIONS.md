# Integrations

External provider accounts are not configured in this repository. The app reports LINE delivery only after LINE returns a successful Messaging API response.

## LINE

Set `LINE_CHANNEL_ACCESS_TOKEN` and `LINE_CHANNEL_SECRET` in the deployment environment. The webhook at `/api/line/webhook` verifies LINE's signature and links a tenant when the tenant sends their one-time `LINK <code>` to the Official Account. Configure that webhook URL in LINE Developers. The family can push an issued bill from the invoice page; automatic delivery requires this provider setup and each tenant to link their LINE account.

## Meter OCR

Set `OCR_PROVIDER` and `OCR_API_KEY` after implementing a provider adapter, file size/type validation, confidence display, human confirmation, and retention controls. OCR suggestions must never be written as confirmed readings without review.

## PromptPay / QR payment

Set the organization's PromptPay ID from KumkongApartment Settings. The public bill generates a PromptPay QR for the invoice total and can be printed or saved as PDF. A generated QR is not proof of payment; reconcile incoming settlement data before marking bills paid.

## Notifications and scheduled jobs

`CRON_SECRET` is reserved for authenticated scheduled endpoints. No job endpoint is active yet.
