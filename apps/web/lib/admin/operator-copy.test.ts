import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  hasSchemaJargon,
  OPERATOR_STRINGS,
  billingStatusLabel,
} from "./operator-copy";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const UI_FILES = [
  "app/admin/login/page.tsx",
  "app/admin/actions.ts",
  "app/admin/(console)/accounts/page.tsx",
  "app/admin/(console)/accounts/[userId]/preview/page.tsx",
  "app/admin/(console)/plans/page.tsx",
  "app/admin/(console)/prompt/page.tsx",
  "app/admin/(console)/observability/page.tsx",
  "app/admin/(console)/console-actions.ts",
  "components/features/admin/AdminLoginForm.tsx",
  "components/features/admin/AdminConsoleNav.tsx",
  "components/features/admin/AccountPlanForm.tsx",
  "components/features/admin/PlanEditForm.tsx",
  "components/features/admin/PlanSharedForm.tsx",
  "components/features/admin/PromptUploadForm.tsx",
  "components/features/admin/RefreshLabModelsForm.tsx",
];

const FORBIDDEN = [
  "invoices.status",
  "families.plan_id",
  "families.billing_status",
  "plans.allowed_model_ids",
  "plans.who_copy",
  "model_catalog.thesis_class",
  "prompt_versions.body",
  "upserts model_catalog",
];

describe("operator copy", () => {
  it("headlines and notices have no table or RPC names", () => {
    for (const text of OPERATOR_STRINGS) {
      assert.equal(hasSchemaJargon(text), false, text);
    }
  });

  it("maps billing_status slugs for the Accounts table", () => {
    assert.equal(billingStatusLabel("subscribed"), "Active");
    assert.equal(billingStatusLabel("trial"), "Trial");
    assert.equal(billingStatusLabel("cancelled"), "Cancelled");
    assert.equal(billingStatusLabel("—"), "—");
  });

  it("admin screens do not dump schema into headlines or notices", () => {
    for (const rel of UI_FILES) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      for (const needle of FORBIDDEN) {
        assert.equal(
          src.includes(needle),
          false,
          `${rel} still contains ${needle}`,
        );
      }
    }
  });
});
