"use client";

import { useState } from "react";
import { recordMeter } from "@/app/actions";

export type MeterGridRow = {
  roomId: string;
  roomNumber: string;
  utility: "water" | "electricity";
  previous: number | null;
  current: number | null;
  currentReadAt: string | null;
  unitRate: number | null;
  fixedFee: number;
};

const money = (amount: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

export function MeterGrid({ rows, readDate, monthLabel }: { rows: MeterGridRow[]; readDate: string; monthLabel: string }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(rows.map(row => [`${row.roomId}-${row.utility}`, row.current === null ? "" : String(row.current)])));

  if (!rows.length) return <section className="card"><p className="empty">ยังไม่มีห้องพัก เพิ่มห้องก่อนเริ่มจดมิเตอร์</p></section>;

  return <section className="card" style={{ marginBottom: 18 }}>
    <h2 className="section-title">จดมิเตอร์ประจำ {monthLabel}</h2>
    <p className="subtitle">ระบบแสดงเลขล่าสุดก่อนเดือนนี้ คู่กับค่าที่จดในเดือนนี้ และคำนวณหน่วยกับยอดประมาณการทันที</p>
    <div className="table-wrap">
      <table className="meter-table"><thead><tr><th>ห้อง</th><th>มิเตอร์</th><th>เลขก่อนหน้า</th><th>เลขเดือนนี้</th><th>หน่วยที่ใช้</th><th>อัตรา/หน่วย</th><th>ยอดประมาณ</th><th>บันทึก</th></tr></thead>
        <tbody>{rows.map(row => {
          const key = `${row.roomId}-${row.utility}`;
          const entered = values[key] === "" ? null : Number(values[key]);
          const units = entered !== null && row.previous !== null ? entered - row.previous : null;
          const amount = units !== null && units >= 0 && row.unitRate !== null ? units * row.unitRate + row.fixedFee : null;
          const formId = `meter-${key}`;
          return <tr key={key}>
            <td>{row.roomNumber}</td>
            <td>{row.utility === "water" ? "น้ำ" : "ไฟฟ้า"}</td>
            <td>{row.previous === null ? "ยังไม่มีเลขก่อนหน้า" : row.previous.toLocaleString("th-TH")}</td>
            <td><input form={formId} aria-label={`เลขมิเตอร์${row.utility === "water" ? "น้ำ" : "ไฟฟ้า"} ห้อง ${row.roomNumber}`} name="reading_value" type="number" min={row.previous ?? 0} step="any" value={values[key]} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))} required/>{row.current !== null && row.currentReadAt&&<small>ค่าที่บันทึกล่าสุด {row.current.toLocaleString("th-TH")} ({row.currentReadAt})</small>}</td>
            <td>{units !== null && units >= 0 ? units.toLocaleString("th-TH") : "—"}</td>
            <td>{row.unitRate === null ? "ยังไม่ตั้งอัตรา" : `${money(row.unitRate)}${row.fixedFee ? ` + ค่าบริการ ${money(row.fixedFee)}` : ""}`}</td>
            <td>{amount === null ? "—" : money(amount)}</td>
            <td><form id={formId} action={recordMeter} className="meter-row-form">
              <input type="hidden" name="room_id" value={row.roomId}/>
              <input type="hidden" name="utility" value={row.utility}/>
              <input type="hidden" name="read_at" value={readDate}/>
              <input type="hidden" name="notes" value=""/>
              <button className="button secondary" type="submit">บันทึก</button>
            </form></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <p className="meter-footnote">ถ้ายังไม่มีเลขเดือนก่อน ระบบจะไม่คำนวณยอดค่าน้ำ/ไฟจนกว่าจะมีเลขอ้างอิงก่อนหน้า</p>
  </section>;
}
