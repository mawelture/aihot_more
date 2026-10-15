CREATE TABLE theme_report_revisions (
  report_id      bigint NOT NULL REFERENCES theme_reports (id) ON DELETE CASCADE,
  revision       integer NOT NULL,
  content        jsonb NOT NULL,
  generated_at   timestamptz NOT NULL,
  reason         text,
  PRIMARY KEY (report_id, revision)
);
