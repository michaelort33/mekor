import assert from "node:assert/strict";
import test from "node:test";

import {
  isLocalAdminAutologinEnabled,
  resolveLocalAdminNextPath,
} from "../lib/auth/local-admin-autologin";

test("local admin autologin requires development, loopback, and an explicit admin email", () => {
  assert.equal(
    isLocalAdminAutologinEnabled({
      hostname: "localhost",
      nodeEnv: "development",
      adminEmail: "admin@example.com",
    }),
    true,
  );
  assert.equal(
    isLocalAdminAutologinEnabled({
      hostname: "localhost",
      nodeEnv: "production",
      adminEmail: "admin@example.com",
    }),
    false,
  );
  assert.equal(
    isLocalAdminAutologinEnabled({
      hostname: "192.168.1.20",
      nodeEnv: "development",
      adminEmail: "admin@example.com",
    }),
    false,
  );
  assert.equal(
    isLocalAdminAutologinEnabled({
      hostname: "127.0.0.1",
      nodeEnv: "development",
      adminEmail: "",
    }),
    false,
  );
});

test("local admin autologin only redirects back into the admin UI", () => {
  assert.equal(resolveLocalAdminNextPath("/admin/templates/12/studio?mode=edit"), "/admin/templates/12/studio?mode=edit");
  assert.equal(resolveLocalAdminNextPath("//example.com"), "/admin");
  assert.equal(resolveLocalAdminNextPath("/account"), "/admin");
});
