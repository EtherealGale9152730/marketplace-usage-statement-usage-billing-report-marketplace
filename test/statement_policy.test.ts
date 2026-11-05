import assert from "node:assert/strict";
import test from "node:test";
import { calculateStatement, statementRequestSchema } from "../src/statement_policy";

test("the monthly total includes only orders handed off during that month", () => {
  const input = statementRequestSchema.parse({
    month: "2026-08",
    customer: { name: "Northwind Studio", email: "buyer@example.com" },
    sellerAssets: [{ name: "Photo pack", unit: "download" }],
    buyerUpdates: [],
    orders: [
      { orderId: "done", completedAt: "2026-08-08T12:00:00.000Z", assetName: "Photo pack", quantity: 2, amountUsd: 19.5 },
      { orderId: "pending", completedAt: null, assetName: "Photo pack", quantity: 1, amountUsd: 12 },
      { orderId: "older", completedAt: "2026-07-31T23:00:00.000Z", assetName: "Photo pack", quantity: 3, amountUsd: 25 }
    ]
  });

  const statement = calculateStatement(input);
  assert.equal(statement.totalUsd, 19.5);
  assert.deepEqual(statement.orders.map((order) => order.orderId), ["done"]);
});
