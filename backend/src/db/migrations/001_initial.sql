-- DevAssist initial schema
-- Copyright (c) 2024 Hemang Parmar

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens (expires_at);

-- Each request is one user-initiated AI engine call (review, explain, etc.).
-- The full output is archived to S3; only metadata lives here.
CREATE TABLE IF NOT EXISTS requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    feature_type    VARCHAR(32) NOT NULL,
    language        VARCHAR(32),
    input_hash      CHAR(64) NOT NULL,
    s3_output_key   TEXT,
    tokens_used     INTEGER NOT NULL DEFAULT 0,
    cached          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_user_created ON requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_feature ON requests (feature_type);
CREATE INDEX IF NOT EXISTS idx_requests_input_hash ON requests (input_hash);

-- Daily roll-up populated by the nightly aggregation Lambda.
CREATE TABLE IF NOT EXISTS usage_stats (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    date               DATE NOT NULL,
    request_count      INTEGER NOT NULL DEFAULT 0,
    tokens_used        INTEGER NOT NULL DEFAULT 0,
    feature_breakdown  JSONB NOT NULL DEFAULT '{}'::JSONB,
    UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date ON usage_stats (user_id, date DESC);
