# Kaam Chai backend (Next.js + Postgres + Razorpay)

## Set up
1. Create a Postgres database (Neon or Supabase) and run `db/schema.sql`. For an existing installation, apply the migrations in order: `db/migrations/20261123_employer_accounts_free_posts_notifications.sql`, then `db/migrations/20261124_job_contact_email.sql`.
2. Copy `.env.example` to `.env.local` and fill in at least `DATABASE_URL` and `APP_SECRET` for OTP registration/sign-in. Run the schema from step 1 first. For local development without MSG91 keys, the OTP is shown in the employer form; production requires an SMS provider.
3. `npm install && npm run dev`. Deploy to Vercel with the same env vars. `vercel.json` already schedules the expiry job.
4. In the Razorpay dashboard: turn on auto-capture, add a webhook to `https://YOUR-DOMAIN/api/razorpay/webhook` for `payment.captured` and `payment.failed`, and paste its secret into `RAZORPAY_WEBHOOK_SECRET`.
5. Register an SMS sender and OTP template under DLT (required in India) and add the MSG91 keys. Without keys, OTPs print to the server log for local development only.
6. Open `/admin` and sign in with `ADMIN_TOKEN`.

## How the pieces connect
| Step | Call |
|---|---|
| Employer taps "Send OTP" | `POST /api/otp/send {phone}` then `POST /api/otp/verify {phone, code}` returns `otpToken` |
| "Agree & pay" | `POST /api/orders {job, otpToken, termsAccepted}` returns `{orderId, amount, keyId}` |
| Checkout | `new Razorpay({key, order_id, amount, handler}).open()` (script `https://checkout.razorpay.com/v1/checkout.js`) |
| After Checkout closes | Poll `GET /api/orders/:orderId` until `job` is `published` or `pending_review` |
| Job list | `GET /api/jobs?q=&type=` (no phone numbers in the response) |
| Applicant taps Apply or Message | `POST /api/jobs/:id/contact {accepted:true}` returns employer contact options after applicant terms are accepted |
| Applicant shares or reports a job | Share uses a job-specific link; Report calls `POST /api/reports {jobId, reason}` |
| Report | `POST /api/reports {jobId, reason}` |

Employer registration and login use phone OTP; the verified phone is the account identifier. The first eligible standard post is free for 15 days. A second free post is available after three calendar months; posts before then use the paid listing options. Featured placements are paid. Notifications are stored against the employer account and the UI refreshes them while signed in.

`job` fields: business_name, business_type, address, city, locality, title, description, vacancies, salary_text, work_timings, contact_mobile, whatsapp_mobile, duration_days (7, 15 or 30), featured.

`public/index.html` uses the API for live listings, contact consent, reports, OTP sign-in, free posting and Razorpay checkout.

## Safety rules built in
- The fee is calculated on the server. The browser total is for display only.
- A listing is published only by the verified webhook, and only when the paid amount matches.
- Duplicate webhooks are ignored.
- Expired listings are also filtered out in every query, so they vanish even if the cron job is late.
- The 1-minute demo duration in the prototype is not in the live pricing.
- Posting needs an OTP-verified phone. Rate limits apply to OTPs, postings and contact requests.
- Scam wording is blocked at submission. Listings with links are held for review after payment.
- 3 different reporters hide a listing until a moderator decides. All moderator actions are logged.
- Employer and applicant agreement acceptances are saved with a version number and a hashed IP.

## Data kept
Listings, payment records and agreement logs. No applicant accounts, CVs or call content. Delete or anonymise payment and log rows after your legal retention period.
