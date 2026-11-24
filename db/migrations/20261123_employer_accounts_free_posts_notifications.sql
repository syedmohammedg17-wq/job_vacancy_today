-- Apply this migration to databases that were created with an earlier schema.sql.
ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'paid';
DO $$ BEGIN
  ALTER TABLE job_posts ADD CONSTRAINT job_posts_listing_type_check CHECK (listing_type IN ('free','paid'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS job_posts_phone_created_idx ON job_posts(contact_mobile, created_at DESC);
CREATE INDEX IF NOT EXISTS job_posts_free_cooldown_idx ON job_posts(contact_mobile, created_at DESC) WHERE listing_type='free';
CREATE TABLE IF NOT EXISTS employers(
  phone TEXT PRIMARY KEY CHECK (phone ~ '^[6-9][0-9]{9}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_login_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS notifications(
  id BIGSERIAL PRIMARY KEY, employer_phone TEXT NOT NULL REFERENCES employers(phone),
  job_post_id BIGINT REFERENCES job_posts(id), kind TEXT NOT NULL,
  message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), read_at TIMESTAMPTZ);
CREATE INDEX IF NOT EXISTS notifications_employer_created_idx ON notifications(employer_phone, created_at DESC);
