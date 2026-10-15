CREATE TABLE theme_grouping_decisions (
  id           bigserial PRIMARY KEY,
  theme_id     text NOT NULL REFERENCES themes (id) ON DELETE CASCADE,
  article_id   text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  fact_id      bigint,
  story_id     bigint,
  verdict      text NOT NULL,
  candidates   jsonb,
  receipt_id   bigint,
  created_at   timestamptz NOT NULL DEFAULT now()
);
