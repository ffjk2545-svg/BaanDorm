"use client";

type InvoiceLine = { description: string; quantity: number; unit_price: number; amount: number };
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
  items: InvoiceLine[];
};

const money = (value: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);

export function PrintableInvoice({ bill, qrDataUrl }: { bill: Bill; qrDataUrl: string | null }) {
  return <main className="bill-page">
    <div className="bill-toolbar"><button className="button" onClick={() => window.print()}>พิมพ์ / บันทึกเป็น PDF</button></div>
    <article className="bill-sheet">
      <header className="bill-header"><div>{bill.property_logo_url&&<img className="bill-logo" src={bill.property_logo_url} alt="โลโก้อาคาร"/>}<p className="bill-eyebrow">ใบแจ้งค่าเช่าและบริการ</p><h1>{bill.document_display_name||bill.organization_name}</h1><p>{bill.property_name}</p>{bill.property_address&&<p>{bill.property_address}</p>}{bill.property_phone&&<p>โทร. {bill.property_phone}</p>}<small>KumkongApartment</small></div><div className="bill-number"><strong>{bill.invoice_number}</strong><span>ห้อง {bill.room_number}</span></div></header>
      <section className="bill-meta"><div><span>ผู้เช่า</span><strong>{bill.tenant_name}</strong></div><div><span>รอบบิล</span><strong>{bill.period_start} ถึง {bill.period_end}</strong></div><div><span>วันครบกำหนด</span><strong>{bill.due_date}</strong></div></section>
      <table className="bill-table"><thead><tr><th>รายการ</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>รวม</th></tr></thead><tbody>{bill.items.map((item, index) => <tr key={`${item.description}-${index}`}><td>{item.description}</td><td>{item.quantity}</td><td>{money(item.unit_price)}</td><td>{money(item.amount)}</td></tr>)}</tbody></table>
      <section className="bill-total"><span>ยอดที่ต้องชำระ</span><strong>{money(bill.total)}</strong></section>
      <section className="bill-payment"><div><h2>ชำระด้วย PromptPay</h2><p>เปิดแอปธนาคาร สแกน QR และตรวจสอบยอดก่อนยืนยัน</p><small>สถานะ: {bill.status === "paid" ? "ชำระแล้ว" : "รอชำระ"}</small></div>{qrDataUrl ? <img src={qrDataUrl} alt="PromptPay QR สำหรับชำระบิลนี้" width={190} height={190}/> : <div className="bill-no-qr">ยังไม่ได้ตั้งค่า PromptPay ID<br/>ติดต่อผู้ดูแลกิจการ</div>}</section>
      <footer className="bill-footer">กรุณาเก็บหลักฐานการชำระเงินไว้ และแจ้งผู้ดูแลหากยอดไม่ตรง</footer>
    </article>
  </main>;
}
