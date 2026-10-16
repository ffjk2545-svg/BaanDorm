"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="auth"><section className="auth-card"><div className="brand"><span className="brand-mark">⌂</span>KumkongApartment</div><h1>เปิดหน้านี้ไม่สำเร็จ</h1><p className="subtitle">ลองโหลดข้อมูลอีกครั้ง หากยังพบปัญหาให้ติดต่อผู้ดูแลกิจการ</p><button className="button" onClick={() => reset()}>ลองอีกครั้ง</button></section></main>;
}
