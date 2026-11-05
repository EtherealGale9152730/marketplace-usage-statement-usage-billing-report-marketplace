import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiClient, InfraiError } from "./infrai_client";
import { statementRequestSchema } from "./statement_policy";
import { sendUsageStatement } from "./usage_statement";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const client = new InfraiClient(apiKey);
const port = Number(process.env.PORT ?? 3000);

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/statements") {
    return sendJson(response, 404, { error: "Route not found" });
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = statementRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const result = await sendUsageStatement(client, input);
    return sendJson(response, 201, result);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return sendJson(response, 400, { error: "Invalid statement request" });
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return sendJson(response, status, { error: error.code });
    }
    console.error(error);
    return sendJson(response, 500, { error: "Statement delivery failed" });
  }
}).listen(port, () => console.log(`Statement service listening on http://localhost:${port}`));

function sendJson(response: import("node:http").ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value));
}
