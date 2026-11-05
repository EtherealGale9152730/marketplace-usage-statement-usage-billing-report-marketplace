import { z } from "zod";

const money = z.number().finite().nonnegative();

export const statementRequestSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email()
  }),
  sellerAssets: z.array(z.object({
    name: z.string().min(1),
    unit: z.string().min(1)
  })).min(1),
  buyerUpdates: z.array(z.object({
    occurredAt: z.string().datetime(),
    summary: z.string().min(1)
  })),
  orders: z.array(z.object({
    orderId: z.string().min(1),
    completedAt: z.string().datetime().nullable(),
    assetName: z.string().min(1),
    quantity: z.number().int().positive(),
    amountUsd: money
  }))
});

export type StatementRequest = z.infer<typeof statementRequestSchema>;

export function selectStatementOrders(input: StatementRequest) {
  return input.orders.filter((order) =>
    order.completedAt !== null && order.completedAt.slice(0, 7) === input.month
  );
}

export function calculateStatement(input: StatementRequest) {
  const orders = selectStatementOrders(input);
  const totalUsd = orders.reduce((sum, order) => sum + order.amountUsd, 0);
  return { orders, totalUsd: Math.round(totalUsd * 100) / 100 };
}

export function statementMarkdown(input: StatementRequest, accountUsage: unknown): string {
  const { orders, totalUsd } = calculateStatement(input);
  const orderRows = orders.length
    ? orders.map((order) =>
      `| ${order.orderId} | ${order.assetName} | ${order.quantity} | $${order.amountUsd.toFixed(2)} |`
    ).join("\n")
    : "| None | - | - | $0.00 |";
  const updates = input.buyerUpdates.length
    ? input.buyerUpdates.map((update) => `- ${update.occurredAt.slice(0, 10)}: ${update.summary}`).join("\n")
    : "- No buyer changes recorded";
  const assets = input.sellerAssets.map((asset) => `- ${asset.name} (${asset.unit})`).join("\n");

  return `# Monthly usage statement: ${input.month}\n\n` +
    `Customer: ${input.customer.name}\n\n` +
    `## Seller assets\n${assets}\n\n` +
    `## Buyer updates\n${updates}\n\n` +
    `## Completed order handoff\n| Order | Asset | Quantity | Amount |\n|---|---|---:|---:|\n${orderRows}\n\n` +
    `**Statement total: $${totalUsd.toFixed(2)}**\n\n` +
    `## Account metering snapshot\n\n\`\`\`json\n${JSON.stringify(accountUsage, null, 2)}\n\`\`\`\n`;
}
