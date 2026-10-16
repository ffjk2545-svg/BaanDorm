import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function calculateMeterCharge(previous: number, current: number, rate: number) {
  if (![previous, current, rate].every(Number.isFinite) || previous < 0 || current < previous || rate < 0) {
    throw new Error("เลขมิเตอร์หรืออัตราค่าบริการไม่ถูกต้อง");
  }
  const units = new Decimal(current).minus(previous);
  const amount = units.mul(rate).toDecimalPlaces(2);
  return { units: units.toNumber(), amount: amount.toNumber() };
}

export function calculateInvoiceBalance(total: number, payments: number) {
  if (total < 0 || payments < 0) throw new Error("ยอดเงินต้องไม่ติดลบ");
  return new Decimal(total).minus(payments).toDecimalPlaces(2).toNumber();
}

export const formatTHB = (amount: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);
