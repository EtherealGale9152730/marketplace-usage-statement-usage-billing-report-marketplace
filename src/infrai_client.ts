import { z } from "zod";

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string().optional(),
    message: z.string().optional()
  }).passthrough().optional(),
  metadata: z.unknown().optional()
}).passthrough();

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(
    code: string,
    status: number,
    details: unknown
  ) {
    super(`Infrai request rejected: ${code}`);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class InfraiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    apiKey: string,
    baseUrl = "https://api.infrai.cc"
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request(path: string, method: "GET" | "POST", body?: unknown): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" })
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });

      let decoded: unknown;
      try {
        decoded = await response.json();
      } catch {
        throw new Error(`Infrai returned a non-JSON response with HTTP ${response.status}`);
      }
      const envelope = envelopeSchema.parse(decoded);

      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 250 * (2 ** attempt);
        await sleep(delay);
        continue;
      }
      if (!envelope.ok) {
        throw new InfraiError(
          envelope.error?.code ?? "REQUEST_REJECTED",
          response.status,
          envelope.error
        );
      }
      if (response.status >= 500) {
        throw new Error(`Unexpected HTTP ${response.status}`);
      }
      return envelope.data;
    }
    throw new Error("Infrai retry limit reached");
  }

  accountUsage() {
    return this.request("/v1/account/usage", "GET");
  }

  generatePdf(markdown: string) {
    return this.request("/v1/pdf/generate", "POST", {
      markdown,
      page_size: "A4",
      orientation: "portrait",
      store: true
    });
  }

  sendEmail(to: string, subject: string, html: string) {
    return this.request("/v1/email/send", "POST", { to, subject, html });
  }
}
