BEGIN;
CREATE TABLE IF NOT EXISTS yoki_community_players (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  invite_code text NOT NULL UNIQUE,
  home jsonb NOT NULL DEFAULT '{}',
  visits_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS yoki_community_friends (
  player_id uuid NOT NULL REFERENCES yoki_community_players(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES yoki_community_players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(player_id, friend_id), CHECK(player_id <> friend_id)
);
CREATE TABLE IF NOT EXISTS yoki_community_blocks (
  player_id uuid NOT NULL REFERENCES yoki_community_players(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES yoki_community_players(id) ON DELETE CASCADE,
  PRIMARY KEY(player_id, blocked_id), CHECK(player_id <> blocked_id)
);
CREATE TABLE IF NOT EXISTS yoki_community_visits (
  host_id uuid NOT NULL REFERENCES yoki_community_players(id) ON DELETE CASCADE,
  visitor_id uuid NOT NULL REFERENCES yoki_community_players(id) ON DELETE CASCADE,
  day date NOT NULL,
  greeting integer NOT NULL CHECK(greeting BETWEEN 0 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(host_id, visitor_id, day)
);
CREATE TABLE IF NOT EXISTS yoki_bonus_claims (
  id uuid PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES yoki_community_players(id) ON DELETE CASCADE,
  receipt_id text NOT NULL,
  quota_key text NOT NULL,
  day date NOT NULL,
  mode text NOT NULL CHECK(mode IN ('ad','pass')),
  state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','earned','expired')),
  amount integer NOT NULL DEFAULT 30 CHECK(amount = 30),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  earned_at timestamptz,
  acknowledged_at timestamptz,
  transaction_id text UNIQUE,
  estimated_revenue_micros bigint,
  revenue_currency text,
  revenue_test boolean,
  UNIQUE(player_id, receipt_id)
);
CREATE INDEX IF NOT EXISTS yoki_bonus_day ON yoki_bonus_claims(player_id, day);
CREATE TABLE IF NOT EXISTS yoki_feature_metrics (
  id uuid PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES yoki_community_players(id) ON DELETE CASCADE,
  event text NOT NULL,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS yoki_metrics_date ON yoki_feature_metrics(created_at);
COMMIT;
