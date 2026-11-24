CREATE TABLE job_posts(
  id BIGSERIAL PRIMARY KEY,
  business_name TEXT NOT NULL, business_type TEXT NOT NULL,
  address TEXT NOT NULL, city TEXT NOT NULL, locality TEXT,
  title TEXT NOT NULL, description TEXT, vacancies INT NOT NULL CHECK (vacancies BETWEEN 1 AND 500),
  salary_text TEXT NOT NULL, work_timings TEXT,
  contact_mobile TEXT NOT NULL, whatsapp_mobile TEXT, contact_email TEXT,
  duration_days INT NOT NULL, featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','published','expired','rejected','removed')),
  risk_flag BOOLEAN NOT NULL DEFAULT false, report_count INT NOT NULL DEFAULT 0,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  listing_type TEXT NOT NULL DEFAULT 'paid' CHECK (listing_type IN ('free','paid')),
  published_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX ON job_posts(status, expires_at); CREATE INDEX ON job_posts(contact_mobile);
CREATE INDEX IF NOT EXISTS job_posts_phone_created_idx ON job_posts(contact_mobile, created_at DESC);

-- Verified phone numbers are the employer account identifier (registration and login use OTP).
CREATE TABLE employers(
  phone TEXT PRIMARY KEY CHECK (phone ~ '^[6-9][0-9]{9}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_login_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE notifications(
  id BIGSERIAL PRIMARY KEY, employer_phone TEXT NOT NULL REFERENCES employers(phone),
  job_post_id BIGINT REFERENCES job_posts(id), kind TEXT NOT NULL,
  message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), read_at TIMESTAMPTZ);
CREATE INDEX ON notifications(employer_phone, created_at DESC);
CREATE INDEX ON job_posts(contact_mobile, created_at DESC) WHERE listing_type='free';

CREATE TABLE payments(
  id BIGSERIAL PRIMARY KEY, job_post_id BIGINT NOT NULL REFERENCES job_posts(id),
  gateway_order_id TEXT UNIQUE, gateway_payment_id TEXT,
  amount_paise INT NOT NULL, currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed','mismatch','refunded')),
  webhook_verified BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE otp_requests(
  id BIGSERIAL PRIMARY KEY, phone TEXT NOT NULL, ip_hash TEXT NOT NULL, code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0, verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX ON otp_requests(phone, created_at);

CREATE TABLE reports(
  id BIGSERIAL PRIMARY KEY, job_post_id BIGINT NOT NULL REFERENCES job_posts(id),
  reporter_hash TEXT NOT NULL, reason TEXT NOT NULL, details TEXT,
  status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_post_id, reporter_hash));

CREATE TABLE agreement_acceptances(
  id BIGSERIAL PRIMARY KEY, user_type TEXT NOT NULL CHECK (user_type IN ('employer','applicant')),
  job_post_id BIGINT REFERENCES job_posts(id), agreement_version TEXT NOT NULL,
  ip_hash TEXT NOT NULL, accepted_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE blacklist(phone TEXT PRIMARY KEY, reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE moderation_log(
  id BIGSERIAL PRIMARY KEY, job_post_id BIGINT, action TEXT NOT NULL, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
