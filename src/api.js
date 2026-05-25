// =============================================================================
// KAIROS — frontend API client
// Single place that talks to the FastAPI backend. Env-driven base URL, a fetch
// wrapper with a timeout (long enough to absorb Render's cold start), and
// normalized {ok, data, error, status} returns so the UI can render real
// loading / error / cold-start / manual-needed states instead of hanging.
// =============================================================================

// Base URL precedence:
//   1. VITE_API_BASE (set in .env / Vercel env)  — production
//   2. fallback to the live Render backend        — safety net
export const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE) ||
  "https://kairos-backend-9i4a.onrender.com";

// Render free tier can cold-start ~50s; allow generous headroom on the first hit.
const DEFAULT_TIMEOUT_MS = 65000;

async function call(path, { method = "GET", body, headers, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    let data = null;
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
    if (!res.ok) {
      const msg =
        (data && (data.detail || data.message || data.error)) ||
        `Request failed (${res.status})`;
      return { ok: false, status: res.status, error: typeof msg === "string" ? msg : JSON.stringify(msg), data };
    }
    return { ok: true, status: res.status, data, error: null };
  } catch (e) {
    const aborted = e && e.name === "AbortError";
    return {
      ok: false,
      status: 0,
      error: aborted
        ? "The server is waking up (this can take up to a minute on the first request). Please try again."
        : "Could not reach the server. Check your connection and try again.",
      data: null,
      aborted,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ----------------------------- endpoints -----------------------------------
export const api = {
  health: () => call("/health", { timeout: 8000 }),

  // Source of truth for a scan. Returns {mode, scan_id, results, recommendation,
  // needed, source_note, attributes, ...}. This WRITES to Supabase server-side.
  scanFromValues: (values) =>
    call("/scan/from-values", { method: "POST", body: { values } }),

  // Live county pull; backend returns {mode:"manual_needed", ...} when it can't
  // reach the source (no fabrication).
  scanLive: (payload) =>
    call("/scan/live", { method: "POST", body: payload }),

  getScan: (scanId) => call(`/scan/${scanId}`),

  createUser: (email) => call("/users", { method: "POST", body: { email } }),

  createSubscription: ({ email, scan_id, plan }) =>
    call("/subscriptions", { method: "POST", body: { user_email: email, scan_id, plan } }),

  confirmBilling: (payload) =>
    call("/billing/confirm", { method: "POST", body: payload }),

  // Owner-only cancellation. Presents the capability token issued at create/confirm
  // as a Bearer header; the backend (auth.require_access) verifies it binds to this sub.
  cancelSubscription: (subId, accessToken) =>
    call(`/subscriptions/${subId}/cancel`, {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    }),

  // Owner-scoped reads/writes. Send the capability token (issued at create/confirm) as a
  // Bearer header; the backend enforces it only when KAIROS_AUTH_SECRET is set, so passing a
  // null token stays a safe no-op pre-activation.
  getDigests: (subId, accessToken) =>
    call(`/digests/${subId}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    }),
  nextDigest: (subId, accessToken) =>
    call(`/digests/${subId}/next`, {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    }),
};

export default api;
