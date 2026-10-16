# Integrations

External providers are not configured in this repository. The app must not report delivery or OCR success until an adapter receives a verified provider response.

## LINE

Set `LINE_CHANNEL_ACCESS_TOKEN` and `LINE_CHANNEL_SECRET` only after implementing webhook signature verification, consent, tenant-to-LINE identity linking, retry handling, and delivery logs.

## Meter OCR

Set `OCR_PROVIDER` and `OCR_API_KEY` after implementing a provider adapter, file size/type validation, confidence display, human confirmation, and retention controls. OCR suggestions must never be written as confirmed readings without review.

## PromptPay / QR payment

Set `PROMPTPAY_MERCHANT_ID` only with a supported payment provider or verified Thai QR generation flow. A generated QR is not proof of payment; reconcile incoming settlement data before marking bills paid.

## Notifications and scheduled jobs

`CRON_SECRET` is reserved for authenticated scheduled endpoints. No job endpoint is active yet.
