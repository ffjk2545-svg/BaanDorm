import { redirect } from "next/navigation";
import { createOrganization } from "@/app/actions";
import { getWorkspace } from "@/lib/supabase/server";

export default async function Setup({ searchParams }: { searchParams: Promise<{error?:string}> }) {
  const { supabase,user,organizationId } = await getWorkspace();
  if (!supabase || !user) redirect("/login");
  if (organizationId) redirect("/");
  const {error}=await searchParams;
  return <main className="auth"><section className="auth-card"><div className="brand"><span className="brand-mark">⌂</span>BaanDorm</div><h1>ตั้งค่ากิจการ</h1><p className="subtitle">เพิ่มข้อมูลกิจการและอาคารแรกเพื่อเริ่มใช้งาน</p>{error&&<div className="notice" role="alert">{error}</div>}<form action={createOrganization}><label className="field">ชื่อกิจการ<input name="name" required maxLength={120} placeholder="เช่น บ้านสวนอพาร์ตเมนต์"/></label><label className="field">ชื่ออาคารแรก<input name="property" required maxLength={120} placeholder="เช่น อาคาร A"/></label><button className="button" type="submit">สร้างกิจการ</button></form></section></main>;
}
