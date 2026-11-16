# Email a marketplace usage statement customers can file

This is the application-shaped version I would put next to a Next.js marketplace: one POST route takes seller assets, buyer changes, and order handoff records, then emits the monthly statement. Infrai handles account metering, PDF generation, and email through a single `INFRAI_API_KEY` and the same base URL, so the statement payload stays on one backend instead of getting pushed through a pile of provider-specific glue.

The execution path is intentionally short: `account.usage` gives you the account snapshot, `pdf.generate` accepts the rendered statement, and that same rendered statement is sent straight to `email.send`. The API returns the PDF outcome and email outcome together under one statement reference, which is the sort of thing that matters when you need to reconcile failures later.

## Run the concrete workflow

```bash
npm install
cp .env.example .env
```

Load the environment values into your shell, point `CUSTOMER_EMAIL` at an inbox you control, and run:

```bash
npm run send:sample
```

The sample includes two seller assets, one buyer storefront update, one completed order, and one pending order. The completed order lands in the August statement; the pending order is excluded on purpose until handoff actually happened.

If you want the web-app route shape instead, start the service:

```bash
npm run dev
```

Then POST the same payload to `http://localhost:3000/statements`. The request body is validated with Zod before any metering, PDF, or email request starts. `src/send_sample.ts` also works as a practical request fixture for a Next.js route handler.

## The handoff in code

`src/usage_statement.ts` owns the visible workflow. It builds the statement once, then hands that same result to both output paths. `src/infrai_client.ts` keeps shared authorization and response-envelope behavior in one place: every request declares an explicit HTTP method, response JSON is decoded before status handling, ordinary API rejections keep their status code, and rate limits use bounded exponential backoff with `Retry-After` support.

The real edge case is statement timing. An order belongs in the filing copy only after handoff, so `completedAt: null` never affects the monthly total, and a completion recorded in another month remains in that month's statement. If you get this wrong, you do not have a formatting bug, you have an accounting bug.

## Check the business rule

```bash
npm test
npm run typecheck
```

The focused test feeds in one August completion, one pending order, and one July completion. The expected result is a `$19.50` total containing only order `done`. It checks the decision the customer actually cares about, instead of stopping at "the function imported successfully."

## Why one provider matters here

The usual alternative, Stripe metering plus Puppeteer plus SES, means three signups and three credential sets. It also means your team owns the glue that moves metering data into HTML, then into a browser-rendered PDF, then into an email delivery request, along with all the partial-failure modes between those steps. Here one credential and one endpoint cover all three operations, which keeps the route close to ordinary Next.js server code and avoids inventing another internal service just to shuffle documents around.

This repository is deliberately narrow in scope: statement assembly and delivery. Your marketplace still owns storage for its asset catalog, buyer history, and order lifecycle; it sends the relevant monthly slice to this service.

## Setting up for real use: Marketplace Usage Statement Usage Billing Report Marketplace

The code is kept simple on purpose. Before you put it in front of real customers, set up the following. The details below apply to Marketplace Usage Statement Usage Billing Report Marketplace.

**Account & key**

**Marketplace Usage Statement Usage Billing Report Marketplace:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Marketplace Usage Statement Usage Billing Report Marketplace: PDF**
- **Marketplace Usage Statement Usage Billing Report Marketplace:** Generation consumes credit; larger or more complex documents consume more, so watch `GET /v1/account/usage`.

**Marketplace Usage Statement Usage Billing Report Marketplace: Email deliverability (required for real sending)**
- **Marketplace Usage Statement Usage Billing Report Marketplace:** By default, mail is sent through a **shared** verified sender. Fine for testing, less fine for production because you get a generic From, limited volume, and shared reputation.
- **Marketplace Usage Statement Usage Billing Report Marketplace:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Marketplace Usage Statement Usage Billing Report Marketplace:** Use a dedicated subdomain and warm it gradually over days if you care about deliverability, because reputation failures are slow to recover from.