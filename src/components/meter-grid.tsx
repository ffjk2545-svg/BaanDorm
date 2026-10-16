"use client";

import { useEffect, useState } from "react";
import { recordMeter } from "@/app/actions";

export type MeterGridRow = {
  roomId: string;
  roomNumber: string;
  utility: "water" | "electricity";
  previous: number | null;
  previousReadAt: string | null;
  current: number | null;
  currentReadAt: string | null;
  unitRate: number | null;
  fixedFee: number;
};

const money = (amount: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

export function MeterGrid({ rows, readDate, today }: { rows: MeterGridRow[]; readDate: string; today: string }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(rows.map(row => [`${row.roomId}-${row.utility}`, row.current === null ? "" : String(row.current)])));
  useEffect(() => setValues(Object.fromEntries(rows.map(row => [`${row.roomId}-${row.utility}`, row.current === null ? "" : String(row.current)]))), [rows, readDate]);

  if (!rows.length) return <section className="card"><p className="empty"><strong>ยังไม่มีห้องพัก</strong>เพิ่มห้องก่อนเริ่มจดมิเตอร์</p></section>;

  return <>
    <section className="card meter-guide">
      <div className="meter-guide-icon">↗</div>
      <div><strong>เริ่มใช้ครั้งแรก ไม่มีเลขเดือนก่อนใช่ไหม?</strong><p>เลือกวันที่ที่มีเลขมิเตอร์อ้างอิง แล้วบันทึกเป็น “เลขตั้งต้น” ก่อน จากนั้นเลือกวันปลายรอบและกรอกเลขใหม่ ระบบจะคิดเฉพาะหน่วยที่เพิ่มขึ้นให้</p></div>
    </section>
    <section className="card meter-panel">
      <div className="meter-panel-heading"><div><h2 className="section-title">จดมิเตอร์น้ำและไฟ</h2><p className="subtitle">น้ำ 12 บาท/หน่วย · ไฟ 8 บาท/หน่วย</p></div>
        <form method="get" className="meter-date-form"><label className="field" htmlFor="meter-read-date">วันที่จด</label><input id="meter-read-date" type="date" name="read_date" max={today} defaultValue={readDate}/><button className="button secondary" type="submit">ดูวันที่เลือก</button></form>
      </div>
      <div className="table-wrap">
        <table className="meter-table"><thead><tr><th>ห้อง</th><th>มิเตอร์</th><th>เลขก่อนหน้า</th><th>เลขวันที่เลือก</th><th>ใช้ไป</th><th>ราคา/หน่วย</th><th>ยอดประมาณ</th><th></th></tr></thead>
          <tbody>{rows.map(row => {
            const key = `${row.roomId}-${row.utility}`;
            const entered = values[key] === "" ? null : Number(values[key]);
            const units = entered !== null && row.previous !== null ? entered - row.previous : null;
            const amount = units !== null && units >= 0 && row.unitRate !== null ? units * row.unitRate + row.fixedFee : null;
            const formId = `meter-${key}`;
            return <tr key={key}>
              <td><strong>{row.roomNumber}</strong></td>
              <td><span className={`utility-pill ${row.utility}`}>{row.utility === "water" ? "น้ำ" : "ไฟฟ้า"}</span></td>
              <td>{row.previous === null ? <span className="meter-missing">ยังไม่มี · ตั้งเลขเริ่มต้น</span> : <>{row.previous.toLocaleString("th-TH")}<small>ณ {row.previousReadAt}</small></>}</td>
              <td><input form={formId} aria-label={`เลขมิเตอร์${row.utility === "water" ? "น้ำ" : "ไฟฟ้า"} ห้อง ${row.roomNumber}`} name="reading_value" type="number" min={row.previous ?? 0} step="any" value={values[key]} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))} required/>{row.current !== null && <small>บันทึกแล้ว {row.current.toLocaleString("th-TH")}</small>}</td>
              <td>{units !== null && units >= 0 ? `${units.toLocaleString("th-TH")} หน่วย` : row.previous === null ? "รอเลขครั้งถัดไป" : "—"}</td>
              <td>{row.unitRate === null ? "ยังไม่ตั้งอัตรา" : `${money(row.unitRate)}${row.fixedFee ? ` + ค่าบริการ ${money(row.fixedFee)}` : ""}`}</td>
              <td className="meter-estimate">{amount === null ? "—" : money(amount)}</td>
              <td><form id={formId} action={recordMeter} className="meter-row-form">
                <input type="hidden" name="room_id" value={row.roomId}/>
                <input type="hidden" name="utility" value={row.utility}/>
                <input type="hidden" name="read_at" value={readDate}/>
                <input type="hidden" name="notes" value=""/>
                <button className="button secondary" type="submit">{row.previous === null ? "บันทึกเลขตั้งต้น" : "บันทึกเลข"}</button>
              </form></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p className="meter-footnote">เลขตั้งต้นจะไม่ถูกคิดค่าน้ำ/ไฟ เพราะยังไม่มีเลขก่อนหน้าให้หักลบ · เลือกวันที่ย้อนหลังเพื่อบันทึกเลขจากบิลหรือสมุดจดเดิมได้</p>
    </section>
  </>;
}
