import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type LineEvent = {
  type?: string;
  replyToken?: string;
  message?: { type?: string; text?: string };
  source?: { userId?: string };
};

function validSignature(body: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(body).digest();
  let received: Buffer;
  try { received = Buffer.from(signature, "base64"); } catch { return false; }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function reply(token: string | undefined, text: string) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !accessToken) return;
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ replyToken: token, messages: [{ type: "text", text }] }),
  });
}

export async function POST(request: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const signature = request.headers.get("x-line-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Invalid webhook configuration" }, { status: 401 });
  const body = await request.text();
  if (!validSignature(body, signature, secret)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let events: LineEvent[];
  try { events = (JSON.parse(body) as { events?: LineEvent[] }).events ?? []; }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  for (const event of events) {
    if (event.type !== "message" || event.message?.type !== "text" || !event.message.text || !event.source?.userId) continue;
    const match = event.message.text.trim().match(/^(?:LINK|เชื่อม)\s+([0-9a-f-]{36})$/i);
    if (!match) continue;
    const { data, error } = await supabase.rpc("link_tenant_line_user", {
      p_link_code: match[1],
      p_line_user_id: event.source.userId,
    });
    await reply(event.replyToken, !error && data === true
      ? "เชื่อมต่อ LINE กับบัญชีผู้เช่าเรียบร้อยแล้ว รับแจ้งบิลจากกิจการนี้ได้เลย"
      : "รหัสเชื่อมต่อไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่จากผู้ดูแลกิจการ");
  }

  return NextResponse.json({ ok: true });
}
