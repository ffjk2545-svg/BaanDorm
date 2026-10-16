"use client";

import { useState } from "react";
import { createResidentAndLease } from "@/app/actions";

type AvailableRoom = { id: string; room_number: string; monthly_rent: number };

export function AddResidentForm({ rooms, today }: { rooms: AvailableRoom[]; today: string }) {
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const selectedRoom = rooms.find(room => room.id === roomId);

  if (rooms.length === 0) return <div className="empty"><strong>ยังไม่มีห้องว่าง</strong>เพิ่มห้องใหม่ หรือทำเครื่องหมายห้องที่ว่างก่อนเพิ่มผู้เช่า</div>;

  return <form action={createResidentAndLease} className="form-grid">
    <label className="field">เลือกห้องว่างหรือจองแล้ว
      <select name="room_id" value={roomId} onChange={event => setRoomId(event.target.value)} required>
        {rooms.map(room => <option key={room.id} value={room.id}>ห้อง {room.room_number} · {Number(room.monthly_rent).toLocaleString("th-TH")} บาท/เดือน</option>)}
      </select>
    </label>
    <label className="field">ชื่อผู้เช่า<input name="full_name" autoComplete="name" required /></label>
    <label className="field">เบอร์โทรศัพท์ (ถ้ามี)<input name="phone" type="tel" autoComplete="tel" /></label>
    <label className="field">ค่าเช่าต่อเดือน (บาท)<input name="rent_amount" type="number" min="0" step="0.01" defaultValue={selectedRoom?.monthly_rent ?? 0} key={roomId} required /></label>
    <label className="field">เงินประกัน (ถ้ามี)<input name="deposit_amount" type="number" min="0" step="0.01" defaultValue="0" /></label>
    <label className="field">วันที่เริ่มพัก<input name="start_date" type="date" defaultValue={today} required /></label>
    <input type="hidden" name="billing_day" value="1" />
    <button className="button" type="submit">เพิ่มผู้เช่าและเริ่มคิดค่าเช่า</button>
  </form>;
}
