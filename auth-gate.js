import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0?bundle";
import { checkCloudAccess } from "./auth-gate-core.js";

const sb = createClient("https://vehfrjgifzjjgamrgwze.supabase.co", "sb_publishable_tyqE-YM_Ap0SVkrVMtw-Lg_l82NwQMy", {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const gate = document.getElementById("authGate");
const status = document.getElementById("authStatus");
const login = document.getElementById("googleSignIn");
const logout = document.getElementById("signOut");
let loaded = false;
let seq = 0;

function locked(message, canSignIn = true) {
  document.body.classList.add("auth-locked");
  gate.hidden = false;
  status.textContent = message;
  login.hidden = !canSignIn;
  logout.hidden = true;
}

async function refreshAccess() {
  const own = ++seq;
  let outcome = "error";
  try { outcome = await checkCloudAccess(sb); } catch { outcome = "error"; }
  if (own !== seq) return;

  if (outcome === "allowed") {
    gate.hidden = true;
    login.hidden = true;
    document.body.classList.remove("auth-locked");
    logout.hidden = false;
    if (!loaded) {
      loaded = true;
      try { await import("./dist/game.js?v=0.12.0"); }
      catch {
        loaded = false;
        locked("Il simulatore non può essere caricato. Ricarica la pagina.");
      }
    }
    return;
  }
  if (loaded) { window.location.reload(); return; }
  if (outcome === "login") locked("Accedi con il tuo account Google autorizzato.");
  else if (outcome === "denied") locked("Questo account non è autorizzato ad accedere a SerieN.");
  else locked("Verifica dell'accesso non disponibile. Riprova più tardi.");
}

login.addEventListener("click", async () => {
  login.disabled = true;
  status.textContent = "Reindirizzamento a Google…";
  try {
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } }
    });
    if (error) throw error;
  } catch {
    locked("Login Google non disponibile. Verifica la configurazione di accesso.");
  } finally {
    login.disabled = false;
  }
});

logout.addEventListener("click", async () => {
  document.body.classList.add("auth-locked");
  try { await sb.auth.signOut(); } finally { window.location.reload(); }
});

sb.auth.onAuthStateChange((event) => {
  // Do not await Supabase API calls inside this callback.
  if (event === "SIGNED_OUT" && loaded) { window.location.reload(); return; }
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "SIGNED_OUT") {
    queueMicrotask(() => { void refreshAccess(); });
  }
});
window.addEventListener("focus", () => { if (loaded) void refreshAccess(); });
void refreshAccess();
