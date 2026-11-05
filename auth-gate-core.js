/**
 * Access decisions are made on the server. Never trust email or OAuth metadata
 * supplied by the browser as a substitute for the database allowlist RPC.
 */
export async function checkCloudAccess(client) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) return "error";
  if (!sessionData?.session) return "login";

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData?.user) return "login";

  const { data: allowed, error: rpcError } = await client.rpc("serien_access_allowed");
  if (rpcError) return "error";
  return allowed === true ? "allowed" : "denied";
}
