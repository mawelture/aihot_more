CREATE TABLE themes (
  id          text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  name        text NOT NULL,
  path_prefix text NOT NULL UNIQUE,
  enabled     boolean NOT NULL DEFAULT true,
  is_default  boolean NOT NULL DEFAULT false,
  pack_key    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
)
