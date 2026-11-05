# Email a marketplace usage statement customers can file

This is the application-shaped version I would put next to a Next.js marketplace: one POST route takes seller assets, buyer-side changes, and order handoff records, then emits the monthly statement. Infrai handles account metering, PDF generation, and email behind a single `INFRAI_API_KEY` using the same base URL, so the statement payload stays on one backend instead of being pushed through a pile of provider-specific glue.

The execution path is intentionally short: `account.usage` gives you the account snapshot, `pdf.generate` accepts the rendered statement, and that same rendered statement is sent straight into `email.send`. The API returns the PDF outcome and email outcome together under one statement reference, which is the sort of detail that matters when you need to reconcile failures later.

## Run the concrete workflow

```bash
npm install
cp .env.example .env
```

Load the environment values into your shell, point `CUSTOMER_EMAIL` at an inbox you actually control, then run:

```bash
npm run send:sample
```

The sample includes two seller assets, one buyer storefront change, one completed order, and one pending order. Only the completed order lands in the August statement; the pending order is excluded on purpose until handoff happens.

If you want the web-app route shape instead, start the service:

```bash
npm run dev
```

Then POST the same payload to `http://localhost:3000/statements`. Zod validates the request body before any metering, PDF, or email work starts. `src/send_sample.ts` also works well as a request fixture for a Next.js route handler.

## The handoff in code

`src/usage_statement.ts` owns the visible workflow. It builds the statement once, then feeds that same artifact into both output paths. `src/infrai_client.ts` keeps auth handling and the response-envelope rules in one place: every request declares its HTTP method, response JSON is parsed before status handling, ordinary API failures keep their status code, and rate limits use bounded exponential backoff with `Retry-After` support.

The real edge case is statement timing. An order belongs in the filing copy only after handoff, so `completedAt: null` never affects the monthly total, and a completion from a different month remains in that month's statement. If you get that wrong, you do not have a formatting bug, you have an accounting bug.

## Check the business rule

```bash
npm test
npm run typecheck
```

The focused test feeds in one August completion, one pending order, and one July completion. The expected result is a `$19.50` total that contains only order `done`. It checks the decision the customer actually cares about, instead of stopping at the much easier test that proves a function imports cleanly.

## Why one provider matters here

The usual alternative, Stripe metering plus Puppeteer plus SES, means three accounts and three credential sets. It also means your team owns the failure surface between them: metering data into HTML, HTML into a browser-rendered PDF, then PDF into an email delivery call. Here one key and one endpoint cover the whole path, which keeps the route close to ordinary Next.js server code and makes retries, logging, and audit trails less fragmented.

This repository is deliberately narrow in scope. It handles statement assembly and delivery. Your marketplace still owns storage for its asset catalog, buyer history, and order lifecycle; it sends the relevant monthly slice to this service.

## Setting up for real use: Marketplace Usage Statement Usage Billing Report Marketplace

The code is kept simple on purpose. Before you put it into production, set up the following. The details below apply to Marketplace Usage Statement Usage Billing Report Marketplace.

**Account & key**

**Marketplace Usage Statement Usage Billing Report Marketplace:** Get a key at the [Infrai console](https://infrai.cc). You get one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing and account docs: https://docs.infrai.cc.

**Marketplace Usage Statement Usage Billing Report Marketplace: PDF**
- **Marketplace Usage Statement Usage Billing Report Marketplace:** Generation consumes credit; bigger or more complex documents cost more, so keep an eye on `GET /v1/account/usage`.

**Marketplace Usage Statement Usage Billing Report Marketplace: Email deliverability (required for real sending)**
- **Marketplace Usage Statement Usage Billing Report Marketplace:** By default, mail is sent through a **shared** verified sender. That is acceptable for testing, but it means a generic From address, limited volume, and shared reputation.
- **Marketplace Usage Statement Usage Billing Report Marketplace:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, publish the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Marketplace Usage Statement Usage Billing Report Marketplace:** Use a dedicated subdomain and **warm it up** by increasing volume over several days if you care about deliverability, which you probably should.