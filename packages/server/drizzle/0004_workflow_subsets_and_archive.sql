ALTER TABLE "facts" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;
ALTER TABLE "facts" ADD COLUMN IF NOT EXISTS "archived_by" text;

CREATE TABLE IF NOT EXISTS "subset_issues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "firm_id" uuid NOT NULL REFERENCES "firms"("id") ON DELETE CASCADE,
  "matter_id" uuid NOT NULL REFERENCES "matters"("id") ON DELETE CASCADE,
  "subset_id" uuid NOT NULL REFERENCES "subsets"("id") ON DELETE CASCADE,
  "issue_id" uuid NOT NULL REFERENCES "issues"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "subset_issues_subset_issue_unique"
  ON "subset_issues" ("subset_id", "issue_id");
CREATE INDEX IF NOT EXISTS "subset_issues_subset_idx"
  ON "subset_issues" ("subset_id");
