import { notFound } from "next/navigation";
import type { Metadata } from "next";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";
import { PrintableInvoice } from "@/components/printable-invoice";
import { createClient } from "@/lib/supabase/server";

type Bill = {
  invoice_number: string;
  period_start: string;
  period_end: string;
  due_date: string;
  total: number;
  status: string;
  tenant_name: string;
  room_number: string;
  property_name: string;
  property_address: string | null;
  property_phone: string | null;
  property_logo_url: string | null;
  organization_name: string;
  document_display_name: string;
  brand_logo_url: string | null;
  promptpay_id: string | null;
  items: Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
};

export const metadata: Metadata = { title: "ใบแจ้งหนี้" };

export default async function BillPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) notFound();
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data, error } = await supabase.rpc("get_public_invoice", { p_token: token });
  if (error || !data) notFound();

  let qrDataUrl: string | null = null;
  const promptpayId = data.promptpay_id?.replace(/\D/g, "");
  if (promptpayId && [10, 13, 15].includes(promptpayId.length) && Number(data.total) > 0) {
    const payload = generatePayload(promptpayId, { amount: Number(data.total) });
    qrDataUrl = await QRCode.toDataURL(payload, { width: 380, margin: 1, errorCorrectionLevel: "M" });
  }

  return <PrintableInvoice bill={data as Bill} qrDataUrl={qrDataUrl}/>;
}
