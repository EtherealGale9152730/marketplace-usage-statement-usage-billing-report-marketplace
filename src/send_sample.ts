import { InfraiClient } from "./infrai_client";
import { statementRequestSchema } from "./statement_policy";
import { sendUsageStatement } from "./usage_statement";

const apiKey = process.env.INFRAI_API_KEY;
const customerEmail = process.env.CUSTOMER_EMAIL;
if (!apiKey || !customerEmail) {
  throw new Error("Set INFRAI_API_KEY and CUSTOMER_EMAIL before running the sample");
}

const sample = statementRequestSchema.parse({
  month: "2026-08",
  customer: { name: "Northwind Studio", email: customerEmail },
  sellerAssets: [
    { name: "Product photo pack", unit: "download" },
    { name: "Listing translation", unit: "listing" }
  ],
  buyerUpdates: [
    { occurredAt: "2026-08-12T09:30:00.000Z", summary: "Added the French storefront" }
  ],
  orders: [
    { orderId: "ord_1042", completedAt: "2026-08-18T15:00:00.000Z", assetName: "Product photo pack", quantity: 24, amountUsd: 48 },
    { orderId: "ord_1049", completedAt: null, assetName: "Listing translation", quantity: 6, amountUsd: 30 }
  ]
});

const result = await sendUsageStatement(new InfraiClient(apiKey), sample);
console.log(JSON.stringify(result, null, 2));
