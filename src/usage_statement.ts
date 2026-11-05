import { randomUUID } from "node:crypto";
import { InfraiClient } from "./infrai_client";
import { statementMarkdown, type StatementRequest } from "./statement_policy";

export async function sendUsageStatement(client: InfraiClient, input: StatementRequest) {
  const statementId = randomUUID();
  const accountUsage = await client.accountUsage();
  const markdown = statementMarkdown(input, accountUsage);
  const pdf = await client.generatePdf(markdown);
  const email = await client.sendEmail(
    input.customer.email,
    `${input.month} marketplace usage statement`,
    `<h1>${input.month} usage statement</h1><p>Your filing copy has been generated.</p><p>Statement reference: ${statementId}</p><pre>${escapeHtml(markdown)}</pre>`
  );
  return { statementId, pdf, email };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[character] ?? character);
}
