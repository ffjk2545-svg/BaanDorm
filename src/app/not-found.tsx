import Link from "next/link";

export default function NotFound() {
  return <main className="auth"><section className="auth-card"><div className="brand"><span className="brand-mark">⌂</span>KumkongApartment</div><h1>ไม่พบหน้านี้</h1><p className="subtitle">ลิงก์อาจไม่ถูกต้องหรือรายการนี้ไม่มีอยู่แล้ว</p><Link className="button" href="/">กลับหน้าหลัก</Link></section></main>;
}
