import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateInvoiceBalance, calculateMeterCharge } from "./finance";

describe("financial calculations", () => {
  it("calculates meter units and decimal-safe charge", () => {
    assert.deepEqual(calculateMeterCharge(125, 137, 7.5), { units: 12, amount: 90 });
  });
  it("rejects a meter reading lower than the previous reading", () => {
    assert.throws(() => calculateMeterCharge(10, 9, 5));
  });
  it("calculates outstanding balances after partial payment", () => {
    assert.equal(calculateInvoiceBalance(1000, 375.5), 624.5);
  });
});
