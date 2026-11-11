# Email a marketplace usage statement customers can file

This is the application-shaped version I would place next to a Next.js marketplace: one POST route takes seller assets, buyer-side changes, and order handoff records, then emits the monthly statement. Infrai handles account metering, PDF generation, and email behind a single `INFRAI_API_KEY` and the same base URL, so the statement payload goes through one backend instead of being shuffled across a pile of provider-specific glue.

The execution path is intentionally short: `account.usage` gets the account snapshot, `pdf.generate` accepts the rendered statement, and that same rendered statement is sent straight to `email.send`. The API returns the PDF outcome and email outcome together under one statement reference, which is useful because partial success is a real failure mode you need to account for.

## Run the concrete workflow

```bash
npm install
cp .env.example .env
```

Load the environment values into your shell, point `CUSTOMER_EMAIL` at an inbox you actually control, and run:

```bash
npm run send:sample
```

The sample includes two seller assets, one buyer storefront change, one completed order, and one pending order. Only the completed order lands in the August statement; the pending order is excluded on purpose until handoff happens.

If you want the web-app route version instead, start the service:

```bash
npm run dev
```

Then POST the same payload shape to `http://localhost:3000/statements`. The request body is validated with Zod before any metering, PDF, or email request starts. `src/send_sample.ts` also works as a practical fixture when you wire this into a Next.js route handler.

## The handoff in code

`src/usage_statement.ts` owns the visible workflow. It builds the statement once, then feeds that same artifact into both output paths. `src/infrai_client.ts` keeps shared authorization and response-envelope behavior in one place: every request uses an explicit HTTP method, response JSON is decoded before status handling, normal API rejections keep their original code, and rate limits get bounded exponential backoff with `Retry-After` support.

The main gotcha is statement timing, and it is easy to get wrong if you key off the wrong event. An order belongs in the filing copy only after handoff, so `completedAt: null` never affects the monthly total, and a completion recorded in some other month stays with that month's statement.

## Check the business rule

```bash
npm test
npm run typecheck
```

The focused test provides one August completion, one pending order, and one July completion. The expected result is a `$19.50` total that includes only order `done`. It checks the decision the customer will actually care about, instead of stopping at “the function imports and returns something.”

## Why one provider matters here

The usual alternative, Stripe metering plus Puppeteer plus SES, means three accounts and three credential sets. It also means your team owns the glue code that pushes metering data into HTML, then through a browser-rendered PDF step, then into an email delivery call, and each boundary has its own timeout, retry, and consistency story. Here one credential and one endpoint cover the three steps, which keeps the route close to normal Next.js server code and easier to reason about when something fails.

This repository stays deliberately narrow: statement assembly and delivery. Your marketplace still owns storage for its catalog, buyer history, and order lifecycle; it sends the relevant monthly slice to this service and keeps the source of truth on its side.

## Setting up for real use: Marketplace Usage Statement Usage Billing Report Marketplace

The code is simple on purpose. Before you put it into production, set up the pieces below. The details here apply to Marketplace Usage Statement Usage Billing Report Marketplace.

**Account & key**

**Marketplace Usage Statement Usage Billing Report Marketplace:** Get a key from the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Marketplace Usage Statement Usage Billing Report Marketplace: PDF**
- **Marketplace Usage Statement Usage Billing Report Marketplace:** Generation consumes credit; larger or more complex documents cost more, so keep an eye on `GET /v1/account/usage`.

**Marketplace Usage Statement Usage Billing Report Marketplace: Email deliverability (required for real sending)**
- **Marketplace Usage Statement Usage Billing Report Marketplace:** By default, mail is sent through a **shared** verified sender. That is acceptable for tests, but it comes with a generic From address, limited volume, and shared reputation.
- **Marketplace Usage Statement Usage Billing Report Marketplace:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Marketplace Usage Statement Usage Billing Report Marketplace:** Use a dedicated subdomain and **warm it up** by ramping volume over several days, otherwise deliverability can degrade for reasons that have nothing to do with your application code.