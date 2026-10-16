import type { Metadata } from "next";
import { signIn, signUp } from "@/app/actions";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  return <main className="auth"><section className="auth-card"><div className="brand"><span className="brand-mark">⌂</span>KumkongApartment</div><h1>เข้าสู่ระบบ</h1><p className="subtitle">ระบบจัดการหอพักสำหรับครอบครัวผู้ดูแลกิจการ</p>{params.error&&<div className="notice" role="alert">{params.error}</div>}{params.success&&<div className="notice success" role="status">{params.success}</div>}<form action={signIn}><label className="field">อีเมล<input type="email" name="email" autoComplete="email" required/></label><label className="field">รหัสผ่าน<input type="password" name="password" autoComplete="current-password" minLength={8} required/></label><button className="button" type="submit">เข้าสู่ระบบ</button></form><details style={{marginTop:24}}><summary>ยังไม่มีบัญชี? สมัครใช้งาน</summary><form action={signUp}><label className="field">ชื่อผู้ดูแล<input name="name" required minLength={2}/></label><label className="field">อีเมล<input type="email" name="email" required/></label><label className="field">รหัสผ่าน<input type="password" name="password" minLength={8} required/></label><button className="button secondary" type="submit">สร้างบัญชี</button></form></details></section></main>;
}

