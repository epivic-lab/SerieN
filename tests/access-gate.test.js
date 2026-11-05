import test from "node:test";
import assert from "node:assert/strict";
import { checkCloudAccess } from "../auth-gate-core.js";

function fake({ session = true, user = true, allowed = false, rpcError = null, sessionError = null, userError = null } = {}) {
  let reads = 0;
  return {
    get reads() { return reads; },
    auth: {
      async getSession() { return { data: { session: session ? { access_token: "test" } : null }, error: sessionError }; },
      async getUser() { return { data: { user: user ? { id: "some-user" } : null }, error: userError }; }
    },
    async rpc(name) { reads++; assert.equal(name, "serien_access_allowed"); return { data: allowed, error: rpcError }; }
  };
}
test("unauthenticated never calls authorization RPC", async () => {
  const c = fake({ session: false, allowed: true });
  assert.equal(await checkCloudAccess(c), "login");
  assert.equal(c.reads, 0);
});
test("server-authorized, verified session unlocks", async () => {
  const c = fake({ allowed: true });
  assert.equal(await checkCloudAccess(c), "allowed");
  assert.equal(c.reads, 1);
});
test("server-denied identity cannot unlock", async () => {
  assert.equal(await checkCloudAccess(fake({ allowed: false })), "denied");
});
test("RPC errors are fail-closed", async () => {
  assert.equal(await checkCloudAccess(fake({ rpcError: new Error("unavailable"), allowed: true })), "error");
});
test("identity errors are fail-closed", async () => {
  assert.equal(await checkCloudAccess(fake({ userError: new Error("invalid"), allowed: true })), "login");
});
test("a missing session is fail-closed", async () => {
  assert.equal(await checkCloudAccess(fake({ sessionError: new Error("storage") , allowed: true })), "error");
});
