import { Mascot } from "./brand/mascots/mascots.jsx";
import "./brand/mascots/mascots.css";
import React, { useState, useEffect, useMemo } from "react";
import api from "./api";
import { COPY } from "./copy";

// Support contact — env-driven (VITE_SUPPORT_EMAIL) so prod can override without a code
// change; falls back to the project's real contact address (also used in ManualNeeded/copy).
const SUPPORT_EMAIL = (import.meta.env && import.meta.env.VITE_SUPPORT_EMAIL) || "kai@kairosaiagent.com";

// =============================================================================
// KAIROS — v1 SELF-SERVE PRODUCT (single-file React app) — PLAYGROUND REDESIGN
// -----------------------------------------------------------------------------
// VISUAL/EMOTIONAL redesign ONLY. Every data/engine/API/checkout/cancel/restore
// behavior is preserved exactly:
//   - activation engine is the faithful JS port (unchanged)
//   - api.js contract unchanged; same calls, same fields
//   - Stripe Checkout redirect + confirm-on-return + session restore unchanged
//   - cancel = api.cancelSubscription (cancel-at-period-end) unchanged
//   - NO fabricated values, NO invented savings $; provenance stays visible
// New: bright/white playful theme + tabbed dashboard
//   (Overview · Property · Savings · Alerts · Digest · Account).
// =============================================================================

// ----------------------------- design tokens (bright playground) ------------
const C = {
  bg: "#ffffff",
  bg2: "#f3f8ff",        // soft sky wash
  ink: "#16263a",        // friendly deep-navy text
  sub: "#5d7088",        // muted text
  faint: "#8ca0b8",      // hints
  line: "#e6eef9",       // soft borders
  card: "#ffffff",
  green: "#2fb457", greenDk: "#1f8e41", greenBg: "#e9f9ee",
  blue: "#4c8df6", blueDk: "#356fd6", blueBg: "#eaf2ff",
  yellow: "#ffc23c", yellowDk: "#d99a16", yellowBg: "#fff6e0",
  purple: "#9b72f2", purpleBg: "#f1ebff",
  coral: "#ff8a5c", coralBg: "#fff0e8",
  // semantic (kept compatible with engine vocabulary)
  active: "#2fb457", prov: "#4c8df6", weak: "#8ca0b8", alert: "#ff8a5c",
};
const FONT_DISPLAY = "'Baloo 2', 'Nunito', ui-rounded, system-ui, sans-serif";
const FONT_BODY = "'Nunito', ui-rounded, system-ui, sans-serif";
const SHADOW = "0 8px 24px rgba(28,68,128,.10)";
const SHADOW_SM = "0 3px 10px rgba(28,68,128,.08)";

// ----------------------------- provenance (UNCHANGED) -----------------------
const PROV = { VERIFIED: "VERIFIED", VERIFIED_APPROX: "VERIFIED~", ASSUMPTION: "ASSUMPTION", NEEDED: "NEEDED" };
const ACTIVATING = new Set([PROV.VERIFIED, PROV.VERIFIED_APPROX]);
const STR = { ACTIVE: "●", PROVISIONAL: "◐", WEAK: "○", DORMANT: "—" };
const RANK = { "—": 0, "○": 1, "◐": 2, "●": 3 };
const maxStr = (a, b) => (RANK[a] >= RANK[b] ? a : b);

// ============================ ACTIVATION ENGINE (JS port — UNCHANGED) ========
function evaluate(p) {
  const results = [flood(p), recert(p), insurance(p), entity(p), tax(p), ownership(p), use(p)];
  results.forEach(enforce);
  return results;
}
function blank(key, name) {
  return { key, name, strength: STR.DORMANT, reasons: [], provenance: [], so_what: "",
    user_explanation: "", internal: [], needed: [], scan: false, digest: false, alert_eligible: false,
    get active() { return this.strength === STR.ACTIVE || this.strength === STR.PROVISIONAL; } };
}
function enforce(r) {
  if ((r.strength === STR.ACTIVE || r.strength === STR.PROVISIONAL) && !r.so_what.trim()) {
    r.strength = STR.DORMANT; r.internal.push("INVARIANT: downgraded — no so_what.");
  }
  if (r.strength === STR.ACTIVE && !r.provenance.some((x) => ACTIVATING.has(x))) {
    r.strength = STR.PROVISIONAL; r.internal.push("INVARIANT: no VERIFIED trigger — capped at provisional.");
  }
}
function flood(p) {
  const r = blank("flood", "Flood / FEMA Exposure");
  if (p.coastal && ACTIVATING.has(p.coastal_prov)) { r.strength = maxStr(r.strength, STR.ACTIVE); r.reasons.push("Coastal / oceanfront location."); r.provenance.push(p.coastal_prov); }
  else if (p.near_water) { r.strength = maxStr(r.strength, STR.WEAK); r.reasons.push("Near inland water."); }
  if (["VE", "AE", "A"].includes(p.flood_zone)) {
    r.strength = maxStr(r.strength, ACTIVATING.has(p.flood_zone_prov) ? STR.ACTIVE : STR.PROVISIONAL);
    r.reasons.push(`Mapped flood zone ${p.flood_zone} (SFHA).`); r.provenance.push(p.flood_zone_prov);
    if (p.flood_zone === "VE") r.internal.push("VE = coastal high-hazard, worst residential zone.");
  } else if (p.flood_zone === "X") { r.strength = maxStr(r.strength, STR.WEAK); r.reasons.push("Zone X (outside SFHA)."); }
  if (p.fema_panel_amended) { r.strength = maxStr(r.strength, STR.ACTIVE); r.reasons.push("FEMA panel has revision history."); r.provenance.push(PROV.VERIFIED); }
  if (p.preliminary_map_pending) { r.reasons.push("Preliminary FEMA map pending."); r.provenance.push(PROV.VERIFIED); }
  if (r.active) {
    r.so_what = "Flood mapping drives flood-insurance rating; a zone/BFE change can reset cost — and lands at renewal if unwatched.";
    r.user_explanation = "Your property sits in coastal flood-mapping territory that can change. We watch the map and tell you before a change reaches your renewal.";
    r.scan = true; r.digest = true; r.alert_eligible = true;
    if (!ACTIVATING.has(p.flood_zone_prov) || p.bfe_ft == null) r.needed.push("Exact zone + BFE read from the FEMA panel fields.");
  }
  return r;
}
function recert(p) {
  const r = blank("recert", "Condo / Recertification / Structural");
  const isCondo = ["condo", "condo_hotel"].includes(p.property_type);
  const old = p.year_built != null && p.year_built < 1992;
  if (isCondo && ACTIVATING.has(p.property_type_prov)) { r.reasons.push("Condominium structure."); r.provenance.push(p.property_type_prov); r.strength = maxStr(r.strength, STR.PROVISIONAL); }
  if (old) { r.reasons.push(`Built ${p.year_built} — within milestone-inspection scope.`); r.provenance.push(p.year_built_prov); r.strength = maxStr(r.strength, STR.PROVISIONAL); }
  if (p.coastal && (isCondo || old)) r.reasons.push("Coastal high-rise exposure.");
  if (r.active) {
    if (p.has_building_record_fact && ACTIVATING.has(p.has_building_record_prov)) {
      r.strength = STR.ACTIVE; r.reasons.push("Verified building record on file."); r.provenance.push(p.has_building_record_prov);
    } else {
      r.strength = STR.PROVISIONAL;
      r.needed.push("One verified building fact (recert status, permit, reserve study, or special-assessment notice).");
      r.internal.push("Provisional until a property-specific building fact de-theaters this category.");
    }
    r.so_what = "Recertification findings and reserve obligations can trigger special assessments and shift insurance posture — a direct hit to a single owner's cash.";
    r.user_explanation = "Older coastal buildings face inspection and reserve rules that can produce special assessments. We watch for notices and deadlines.";
    r.scan = true; r.digest = true; r.alert_eligible = true;
  }
  return r;
}
function insurance(p) {
  const r = blank("insurance", "Insurance Renewal Risk");
  const coastalRisk = p.coastal || ["VE", "AE", "A"].includes(p.flood_zone) || p.hurricane_region;
  const condoHotel = p.property_type === "condo_hotel" || p.use_type === "str_hotel";
  if (coastalRisk && (ACTIVATING.has(p.coastal_prov) || ACTIVATING.has(p.flood_zone_prov))) { r.reasons.push("High-risk coastal/flood/wind geography."); r.provenance.push(PROV.VERIFIED); r.strength = maxStr(r.strength, STR.ACTIVE); }
  if (condoHotel) { r.reasons.push("Condo-hotel / short-term-rental structure."); r.provenance.push(p.property_type_prov); r.strength = maxStr(r.strength, STR.ACTIVE); }
  if (r.active) {
    r.so_what = "Coastal carriers withdraw or reprice and master policies may exclude actual use; the owner's exposure surfaces at renewal unless watched ahead.";
    r.user_explanation = "Insurance timing matters more here than for an ordinary property. We track the carrier environment and your renewal windows.";
    r.scan = true; r.digest = true; r.alert_eligible = true;
    if (!p.owner_renewal_date_known) r.needed.push("Owner's policy form + renewal date (private).");
    if (!p.master_renewal_date_known && (p.in_condo_association || condoHotel)) r.needed.push("Association master policy terms + renewal date.");
    if (condoHotel && !p.str_listing_confirmed) r.internal.push("Master-vs-STR mismatch is ASSUMPTION until STR listing + policy form confirmed.");
  }
  return r;
}
function entity(p) {
  const r = blank("entity", "LLC / Entity Compliance");
  if (["llc", "lp", "corp"].includes(p.ownership_type) && ACTIVATING.has(p.ownership_type_prov)) {
    r.reasons.push(`Owner is an entity (${p.ownership_type.toUpperCase()}).`); r.provenance.push(p.ownership_type_prov); r.strength = STR.ACTIVE;
    r.so_what = "A lapsed/dissolved entity holding the property can disrupt claims, sale, and refinance — quiet but fixable.";
    r.user_explanation = "We watch your entity's state registration and annual filing window so it never lapses unnoticed.";
    r.scan = true; r.digest = true; r.alert_eligible = true;
    if (!ACTIVATING.has(p.entity_status_prov)) r.needed.push("Confirmed Sunbiz record match (status, doc#, next filing).");
    else if (["inactive", "admin_dissolved"].includes(p.entity_status)) r.internal.push("Entity NOT in good standing — high-priority surface.");
  } else if (p.ownership_type === "trust") { r.strength = STR.WEAK; r.reasons.push("Trust ownership — limited entity surface."); }
  return r;
}
function tax(p) {
  const r = blank("tax", "Tax / Assessment Drift");
  if (p.assessment_moving) { r.reasons.push("Material assessed-value movement."); r.provenance.push(p.assessment_prov); r.strength = STR.ACTIVE; }
  else if (p.coastal || p.recent_sale) { r.reasons.push("Coastal valuation pressure / recent sale."); r.strength = STR.PROVISIONAL; }
  if (r.active) {
    r.so_what = "Assessment shifts feed insured-value adequacy and tax budgeting; appeal windows are time-boxed.";
    r.user_explanation = "We watch your assessment and flag appeal windows so value changes don't slip past you.";
    r.scan = true; r.digest = true; r.alert_eligible = true;
    if (!p.assessment_moving) r.internal.push("Quiet: values flat — keep active but low-priority.");
  }
  return r;
}
function ownership(p) {
  const r = blank("ownership", "Ownership / Transaction Monitoring");
  if (p.recent_sale || p.active_mortgage_or_lien || p.frequent_transfers) {
    if (p.recent_sale) r.reasons.push("Recent sale (<2yr).");
    if (p.active_mortgage_or_lien) { r.reasons.push("Active mortgage/lien."); r.internal.push("Lender insurance requirements may apply."); }
    if (p.frequent_transfers) r.reasons.push("Frequent prior transfers.");
    r.provenance.push(PROV.VERIFIED); r.strength = STR.PROVISIONAL;
    r.so_what = "New deeds, mortgages, or liens change obligations (often lender-driven insurance terms); detecting them early avoids renewal/compliance surprises.";
    r.user_explanation = "We watch for new recorded documents against your property and flag anything new.";
    r.scan = true; r.digest = true; r.alert_eligible = true;
    r.needed.push("Itemized baseline of existing recordings to detect 'new'.");
  }
  return r;
}
function use(p) {
  const r = blank("use", "Use / Occupancy Drift");
  const condoHotel = p.property_type === "condo_hotel";
  if (condoHotel || ["str_hotel", "mixed", "commercial"].includes(p.use_type)) {
    r.reasons.push("Hotel/STR/mixed-use environment."); r.provenance.push(p.property_type_prov);
    r.strength = condoHotel ? STR.ACTIVE : STR.PROVISIONAL;
    r.so_what = "If actual use (e.g. short-term rental) doesn't match the insured use, a claim can be denied; we watch for that gap.";
    r.user_explanation = "We watch how the unit is actually used versus how it's insured, so a mismatch doesn't surface at claim time.";
    r.scan = true; r.digest = true; r.alert_eligible = false; // observed, not a hard verified fact
    if (!p.str_listing_confirmed) { r.needed.push("Confirm whether THIS unit is actively listed short-term."); r.internal.push("Use-vs-coverage mismatch stays ASSUMPTION until listing + policy confirmed; not alert-eligible."); }
  }
  return r;
}
function recommend(results) {
  const strong = results.filter((r) => r.strength === STR.ACTIVE).length;
  const prov = results.filter((r) => r.strength === STR.PROVISIONAL).length;
  if (strong >= 3) return { tier: "full", line: "Multiple strong active conditions. Continuous monitoring is genuinely worthwhile here." };
  if (strong + prov >= 3) return { tier: "full_framed", line: "Several active conditions, some pending verification. Monitoring recommended, honestly framed." };
  if (strong + prov >= 1) return { tier: "light", line: "A limited set of live conditions. A light, single-category watch — not a full subscription." };
  return { tier: "none", line: "Not enough live conditions to justify monthly monitoring. Keep your free scan; we'll suggest an annual re-check." };
}

// ----------------------------- sample inputs (UNCHANGED) --------------------
const UNIT_1001 = {
  nickname: "Castle Beach Club — Unit 1001",
  property_type: "condo_hotel", property_type_prov: PROV.VERIFIED,
  coastal: true, coastal_prov: PROV.VERIFIED, hurricane_region: true,
  flood_zone: "VE", flood_zone_prov: PROV.VERIFIED_APPROX, bfe_ft: 11,
  on_fema_panel: true, fema_panel_amended: true, preliminary_map_pending: true,
  ownership_type: "llc", ownership_type_prov: PROV.VERIFIED,
  entity_status: "active", entity_status_prov: PROV.VERIFIED_APPROX,
  year_built: 1966, year_built_prov: PROV.VERIFIED, in_condo_association: true,
  use_type: "str_hotel", use_type_prov: PROV.VERIFIED,
  str_listing_confirmed: null, str_listing_prov: PROV.NEEDED,
  frequent_transfers: true, assessment_moving: false, assessment_prov: PROV.VERIFIED_APPROX,
  owner_renewal_date_known: false, master_renewal_date_known: false,
  has_building_record_fact: null, has_building_record_prov: PROV.NEEDED,
};
const LOW_FIT = {
  nickname: "Suburban single-family (low-fit example)",
  property_type: "single_family", property_type_prov: PROV.VERIFIED,
  coastal: false, near_water: false, hurricane_region: false,
  flood_zone: "X", flood_zone_prov: PROV.VERIFIED,
  on_fema_panel: true, fema_panel_amended: false, preliminary_map_pending: false,
  ownership_type: "individual", ownership_type_prov: PROV.VERIFIED,
  year_built: 2008, year_built_prov: PROV.VERIFIED, in_condo_association: false,
  use_type: "owner_occupied", use_type_prov: PROV.VERIFIED,
  recent_sale: false, frequent_transfers: false, active_mortgage_or_lien: false,
  assessment_moving: false, assessment_prov: PROV.VERIFIED,
};
const PLANS = [
  { id: "starter", name: "Starter", range: "1–3 properties", price: 39 },
  { id: "standard", name: "Standard", range: "4–15 properties", price: 149 },
  { id: "professional", name: "Professional", range: "15–50 properties", price: 599 },
  { id: "portfolio", name: "Portfolio", range: "50+ properties", price: null },
];

// ----------------------------- friendly UI atoms ----------------------------
const Btn = ({ children, onClick, kind = "primary", disabled, style }) => {
  const kinds = {
    primary: { bg: C.green, edge: C.greenDk, color: "#fff" },
    blue: { bg: C.blue, edge: C.blueDk, color: "#fff" },
    ghost: { bg: "#fff", edge: C.line, color: C.ink },
    quiet: { bg: "transparent", edge: "transparent", color: C.sub },
  };
  const k = kinds[kind] || kinds.primary;
  const chunky = kind === "primary" || kind === "blue";
  return (
    <button className="kai-btn" onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 14, padding: kind === "quiet" ? "8px 6px" : "13px 22px", border: "none",
        background: k.bg, color: k.color, letterSpacing: ".01em",
        boxShadow: chunky ? `0 4px 0 ${k.edge}` : (kind === "ghost" ? `inset 0 0 0 2px ${C.line}` : "none"),
        opacity: disabled ? 0.55 : 1, transition: "transform .08s ease, box-shadow .08s ease",
        ...style }}
      onMouseDown={(e) => { if (chunky && !disabled) { e.currentTarget.style.transform = "translateY(3px)"; e.currentTarget.style.boxShadow = `0 1px 0 ${k.edge}`; } }}
      onMouseUp={(e) => { if (chunky && !disabled) { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 0 ${k.edge}`; } }}
      onMouseLeave={(e) => { if (chunky && !disabled) { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 0 ${k.edge}`; } }}>
      {children}
    </button>
  );
};
// Provenance tag — friendly, encouraging (no scary language)
const Tag = ({ t }) => {
  const map = {
    VERIFIED: { bg: C.greenBg, fg: C.greenDk, label: "Verified ✓" },
    "VERIFIED~": { bg: C.blueBg, fg: C.blueDk, label: "Verified ~" },
    ASSUMPTION: { bg: "#eef2f7", fg: C.sub, label: "Estimate" },
    NEEDED: { bg: C.yellowBg, fg: C.yellowDk, label: "Add to unlock" },
  };
  const m = map[t] || { bg: "#eef2f7", fg: C.sub, label: t };
  return <span style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 11.5, color: m.fg,
    background: m.bg, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>{m.label}</span>;
};
// Strength → friendly status pill
const StatusPill = ({ s }) => {
  const map = {
    "●": { bg: C.greenBg, fg: C.greenDk, label: "Watching 👀" },
    "◐": { bg: C.blueBg, fg: C.blueDk, label: "Keeping an eye" },
    "○": { bg: "#eef2f7", fg: C.sub, label: "Quiet" },
    "—": { bg: "#eef2f7", fg: C.faint, label: "Resting" },
  };
  const m = map[s] || map["—"];
  return <span style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 12, color: m.fg,
    background: m.bg, borderRadius: 999, padding: "4px 11px", whiteSpace: "nowrap" }}>{m.label}</span>;
};
const Card = ({ children, style, accent }) => (
  <div className="kai-card" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, boxShadow: SHADOW_SM,
    padding: 20, position: "relative", overflow: "hidden", ...style }}>
    {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: accent }} />}
    {children}
  </div>
);
const Progress = ({ value, max, color = C.green }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ background: C.bg2, borderRadius: 999, height: 14, overflow: "hidden", border: `1px solid ${C.line}` }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width .8s cubic-bezier(.2,.8,.2,1)" }} />
    </div>
  );
};
const Blobs = () => (
  <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: -120, right: -80, width: 360, height: 360, borderRadius: "50%",
      background: C.blueBg, filter: "blur(8px)", opacity: 0.6 }} />
    <div style={{ position: "absolute", top: 220, left: -120, width: 300, height: 300, borderRadius: "50%",
      background: C.greenBg, filter: "blur(8px)", opacity: 0.55 }} />
    <div style={{ position: "absolute", bottom: -100, right: 120, width: 260, height: 260, borderRadius: "50%",
      background: C.yellowBg, filter: "blur(8px)", opacity: 0.5 }} />
  </div>
);

// =============================================================================
// ROOT  (state + effects + handlers — UNCHANGED LOGIC)
// =============================================================================
export default function App() {
  const [route, setRoute] = useState("landing");
  const [attrs, setAttrs] = useState(null);
  const [results, setResults] = useState([]);
  const [account, setAccount] = useState(null);
  const [showValues, setShowValues] = useState(false);
  const [scanId, setScanId] = useState(null);
  const [apiError, setApiError] = useState(null);
  const reco = useMemo(() => (results.length ? recommend(results) : null), [results]);

  // On load: confirm Stripe return, else restore session (UNCHANGED).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      let pending = null;
      try { pending = JSON.parse(localStorage.getItem("kairos_pending") || "null"); } catch { pending = null; }
      if (pending && pending.scan_id && pending.plan) {
        api.confirmBilling({ session_id: sessionId, user_email: pending.email,
          scan_id: pending.scan_id, plan: pending.plan.id }).then((res) => {
          if (res.ok && res.data) {
            const acc = {
              email: pending.email, plan: pending.plan, status: "active",
              property: pending.property, since: today(),
              subscriptionId: res.data.subscription_id,
              accessToken: res.data.access_token || null,
              digests: res.data.first_digest ? [res.data.first_digest] : [],
            };
            try {
              localStorage.setItem("kairos_session", JSON.stringify({
                subscriptionId: acc.subscriptionId, email: acc.email,
                property: acc.property, plan: acc.plan, since: acc.since,
                accessToken: acc.accessToken }));
              localStorage.removeItem("kairos_pending");
            } catch { /* ignore */ }
            setAccount(acc); setRoute("account");
          } else {
            setApiError(res.error || "We couldn't confirm your payment. If you were charged, contact support.");
            setRoute("error");
          }
          window.history.replaceState({}, "", "/");
        });
        return;
      }
      window.history.replaceState({}, "", "/");
    }
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("kairos_session") || "null"); } catch { saved = null; }
    if (saved && saved.subscriptionId) {
      api.getDigests(saved.subscriptionId, saved.accessToken).then((res) => {
        // Deterministic restore: ONLY land on the account if the backend confirms
        // a real subscription that has at least one digest. A stale, cancelled, or
        // corrupt session must never hijack the flow — clear it and stay on landing.
        if (res.ok && res.data && Array.isArray(res.data.digests) && res.data.digests.length > 0) {
          setAccount({
            email: saved.email, plan: saved.plan, status: "active",
            property: saved.property, since: saved.since || today(),
            subscriptionId: saved.subscriptionId, accessToken: saved.accessToken || null,
            digests: res.data.digests,
          });
          setRoute("account");
        } else {
          try { localStorage.removeItem("kairos_session"); } catch { /* ignore */ }
        }
      }).catch(() => { try { localStorage.removeItem("kairos_session"); } catch { /* ignore */ } });
    }
  }, []);

  const runPipeline = async (input) => {
    setAttrs(input);
    setApiError(null);
    setRoute("loading");
    const res = await api.scanFromValues(input);
    if (res.ok && res.data && Array.isArray(res.data.results)) {
      setResults(res.data.results);
      setScanId(res.data.scan_id || null);
      setRoute("scan");
    } else {
      setApiError(res.error || "We couldn't complete the scan. Please try again.");
      setRoute("error");
    }
  };

  const runLive = async (address) => {
    setApiError(null);
    setRoute("loading");
    const res = await api.scanLive({ address });
    if (res.ok && res.data && res.data.mode === "manual_needed") {
      setRoute("manual");
    } else if (res.ok && res.data && Array.isArray(res.data.results)) {
      setAttrs(res.data.attributes || null);
      setResults(res.data.results);
      setScanId(res.data.scan_id || null);
      setRoute("scan");
    } else {
      setApiError(res.error || "We couldn't reach this property's records. Please try again.");
      setRoute("error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bg2} 100%)`,
      color: C.ink, fontFamily: FONT_BODY, position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
        body { margin: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
        img { max-width: 100%; }
        h1, h2 { letter-spacing: -0.015em; }
        @keyframes fadeUp { from { opacity:0; transform: translateY(14px);} to {opacity:1; transform:none;} }
        @keyframes pop { 0%{transform:scale(.8);opacity:0} 60%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
        @keyframes floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes fill { from { width:0 } }
        .fu { animation: fadeUp .55s cubic-bezier(.2,.7,.2,1) both; }
        .pop { animation: pop .5s cubic-bezier(.2,.8,.2,1) both; }
        .floaty { animation: floaty 4s ease-in-out infinite; }
        .kai-hero { font-size: clamp(30px, 7vw, 46px); }
        .kai-tabs { display: flex; gap: 8px; }
        .kai-card { transition: transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s ease; }
        .kai-card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(28,68,128,.12) !important; }
        .kai-btn:focus-visible { outline: 3px solid rgba(76,141,246,.45); outline-offset: 2px; }
        @media (hover: none) { .kai-card:hover { transform: none; box-shadow: 0 3px 10px rgba(28,68,128,.08) !important; } }
        @media (max-width: 640px) {
          .kai-app { padding-left: 16px !important; padding-right: 16px !important; }
          .kai-card { padding: 16px !important; }
          .kai-tabs { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
          .kai-tabs button { flex: 0 0 auto; }
          .kai-grid-3 { grid-template-columns: 1fr 1fr !important; }
          .kai-hero { font-size: clamp(26px, 8.5vw, 38px); }
        }
        @media (max-width: 420px) {
          .kai-grid-3 { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fu, .pop, .floaty { animation: none !important; }
          html { scroll-behavior: auto; }
        }
      `}</style>
      <Blobs />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Header route={route} account={account} go={setRoute} />
        <div className="kai-app" style={{ maxWidth: 940, margin: "0 auto", padding: "0 20px 110px" }}>
          {route === "landing" && <Landing onStart={() => setRoute("privacy")} onSample={() => runPipeline(UNIT_1001)} />}
          {route === "privacy" && <AddressEntry onRun={runPipeline} onRunLive={runLive} showValues={showValues} setShowValues={setShowValues} onLowFit={() => runPipeline(LOW_FIT)} />}
          {route === "loading" && <Loading />}
          {route === "manual" && <ManualNeeded onBack={() => setRoute("privacy")} />}
          {route === "error" && <ErrorScreen message={apiError} onRetry={() => (attrs ? runPipeline(attrs) : setRoute("privacy"))} onBack={() => setRoute("privacy")} />}
          {route === "scan" && attrs && <Scan attrs={attrs} results={results} reco={reco} onSubscribe={() => setRoute("subscribe")} onBack={() => setRoute("landing")} />}
          {route === "subscribe" && <Subscribe reco={reco} onChoose={(plan) => { setAccount((a) => ({ ...(a || {}), pendingPlan: plan })); setRoute("pay"); }} onSkip={() => setRoute("scan")} />}
          {route === "pay" && <Pay plan={account?.pendingPlan} scanId={scanId} propertyName={attrs?.nickname}
            onActivated={(acc) => {
              try { localStorage.setItem("kairos_session", JSON.stringify({ subscriptionId: acc.subscriptionId, email: acc.email, property: acc.property, plan: acc.plan, since: acc.since })); } catch { /* ignore */ }
              setAccount(acc); setRoute("onboard");
            }}
            onBack={() => setRoute("subscribe")} />}
          {route === "onboard" && account && <Onboard account={account} onGo={() => setRoute("account")} />}
          {route === "account" && account && <Dashboard account={account} setAccount={setAccount} attrs={attrs} results={results} />}
        </div>
        <Footer />
      </div>
    </div>
  );
}

function today() { return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }

// ----------------------------- header / footer ------------------------------
function Header({ route, account, go }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(8px)",
      background: "rgba(255,255,255,.82)", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => go(account ? "account" : "landing")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
          <div className="floaty" style={{ width: 30, height: 30, borderRadius: 10, background: `linear-gradient(135deg, ${C.green}, ${C.blue})`,
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, boxShadow: SHADOW_SM }}>K</div>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: C.ink }}>KAIROS</span>
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: C.sub }}>
          {account?.email || "your property's friendly watcher"}
        </div>
      </div>
    </div>
  );
}
function Footer() {
  return (
    <div style={{ borderTop: `1px solid ${C.line}`, padding: "26px 20px", textAlign: "center" }}>
      <div style={{ maxWidth: 940, margin: "0 auto", color: C.faint, fontSize: 12.5, lineHeight: 1.7, fontWeight: 600 }}>
        {COPY.trust.footer}<br />
        <span style={{ fontSize: 11.5 }}>{COPY.trust.footerSmall}</span>
      </div>
    </div>
  );
}

// ----------------------------- landing --------------------------------------
function Landing({ onStart, onSample }) {
  return (
    <div style={{ paddingTop: 28 }}>
      <div className="fu" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.greenBg, color: C.greenDk,
        fontWeight: 800, fontSize: 13, padding: "7px 14px", borderRadius: 999, marginBottom: 16 }}>
        <Mascot type="monitoring" size={18} motion={false} /> {COPY.hero.badge}
      </div>
      <div className="fu kai-hero" style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", animationDelay: ".05s" }}>
        <Mascot type="monitoring" size={84} title="KAIROS watches your property" />
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(30px,7vw,46px)", lineHeight: 1.1, margin: 0,
          color: C.ink, maxWidth: 640 }}>
          You already have enough notifications. <span style={{ color: C.green }}>KAIROS does the watching for you.</span>
        </h1>
      </div>
      <p className="fu" style={{ fontSize: 18, color: C.sub, maxWidth: 640, lineHeight: 1.6, marginTop: 18, fontWeight: 600, animationDelay: ".12s" }}>
        {COPY.hero.sub}
      </p>
      <div className="fu" style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap", animationDelay: ".18s" }}>
        <Btn onClick={onStart}>{COPY.hero.ctaPrimary}</Btn>
        <Btn kind="ghost" onClick={onSample}>{COPY.hero.ctaSecondary}</Btn>
      </div>

      <div className="kai-grid-3" style={{ marginTop: 44, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16 }}>
        {COPY.philosophy.map(([, h, b], i) => (
          <Card key={h} className="fu" style={{ animationDelay: `${.24 + i * .07}s`, textAlign: "center" }} accent={[C.blue, C.green, C.yellow][i]}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <Mascot type={["scan", "monitoring", "reports"][i] || "monitoring"} size={52} title={h} />
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, marginBottom: 6 }}>{h}</div>
            <div style={{ color: C.sub, fontSize: 14, lineHeight: 1.55, fontWeight: 600 }}>{b}</div>
          </Card>
        ))}
      </div>

      {/* founder voice — preserved verbatim from the copy system */}
      <Card className="fu" style={{ marginTop: 22, background: `linear-gradient(135deg, ${C.purpleBg}, ${C.blueBg})`, border: "none" }} accent={C.purple}>
        <div style={{ marginBottom: 10 }}><Mascot type="advisor" size={48} title="From the founder" /></div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, lineHeight: 1.5, color: C.ink }}>
          “{COPY.founder.quote}”
        </div>
        <div style={{ color: C.sub, fontWeight: 800, fontSize: 13.5, marginTop: 10 }}>{COPY.founder.attribution}</div>
      </Card>

      <Card style={{ marginTop: 16, background: C.bg2 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, marginBottom: 6 }}>The whole idea, in one line ✨</div>
        <div style={{ color: C.sub, fontSize: 15.5, lineHeight: 1.6, fontWeight: 600 }}>{COPY.oneLiner}</div>
      </Card>
    </div>
  );
}

// ----------------------------- address entry / from-values ------------------
function AddressEntry({ onRun, onRunLive, showValues, setShowValues, onLowFit }) {
  const [addr, setAddr] = useState("");
  return (
    <div style={{ paddingTop: 48, maxWidth: 640 }}>
      <Btn kind="quiet" onClick={() => onRun(UNIT_1001)} style={{ display: "none" }} />
      <div style={{ marginBottom: 10 }}><Mascot type="scan" size={64} title="Property scan" /></div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 34, margin: 0 }}>Let's check your property</h2>
      <Card style={{ marginTop: 18, background: C.greenBg, border: "none" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Mascot type="legal" size={32} motion={false} />
          <div style={{ color: C.ink, fontSize: 14, lineHeight: 1.6, fontWeight: 600 }}>
            {COPY.trust.promise}
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 20 }}>
        <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="5445 Collins Ave, Miami Beach, FL 33140"
          style={{ width: "100%", background: "#fff", border: `2px solid ${C.line}`, color: C.ink, borderRadius: 14,
            padding: "15px 16px", fontSize: 15, fontFamily: FONT_BODY, fontWeight: 700, outline: "none" }}
          onFocus={(e) => (e.target.style.borderColor = C.blue)} onBlur={(e) => (e.target.style.borderColor = C.line)} />
        <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          <Btn onClick={() => onRun(UNIT_1001)}>🚀 Run my baseline scan</Btn>
        </div>
        <div style={{ marginTop: 12, color: C.sub, fontSize: 13, lineHeight: 1.6, fontWeight: 600 }}>
          During our alpha, your baseline runs against a verified reference coastal property so you can see exactly
          what KAIROS watches — and how it stays honest, never inventing a value. Your own property is verified during
          onboarding. To scan real figures now, open From-values mode below.
        </div>
      </div>

      <div style={{ marginTop: 24, borderTop: `1px solid ${C.line}`, paddingTop: 18 }}>
        <Btn kind="quiet" onClick={() => setShowValues((s) => !s)} style={{ fontWeight: 800, color: C.blueDk }}>
          {showValues ? "▾" : "▸"} From-values mode (paste verified figures)
        </Btn>
        {showValues && <FromValues onRun={onRun} />}
      </div>
      <div style={{ marginTop: 18 }}>
        <Btn kind="quiet" onClick={onLowFit} style={{ color: C.faint, fontSize: 13 }}>
          ▸ Try a low-fit property (watch KAIROS honestly decline to oversell)
        </Btn>
      </div>
    </div>
  );
}

function FromValues({ onRun }) {
  const [f, setF] = useState({ nickname: "", property_type: "condo_hotel", coastal: true,
    flood_zone: "VE", flood_zone_known: true, bfe_ft: "", year_built: "", ownership_type: "llc",
    entity_status_known: false, str_listing_confirmed: false, building_fact: false, fema_amended: true });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const build = () => {
    const a = {
      nickname: f.nickname || "Property (from values)",
      property_type: f.property_type, property_type_prov: PROV.VERIFIED,
      coastal: !!f.coastal, coastal_prov: PROV.VERIFIED, hurricane_region: !!f.coastal,
      flood_zone: f.flood_zone || null,
      flood_zone_prov: f.flood_zone ? (f.flood_zone_known ? PROV.VERIFIED : PROV.VERIFIED_APPROX) : PROV.NEEDED,
      bfe_ft: f.bfe_ft ? Number(f.bfe_ft) : null,
      on_fema_panel: !!f.flood_zone, fema_panel_amended: !!f.fema_amended, preliminary_map_pending: false,
      ownership_type: f.ownership_type || null,
      ownership_type_prov: f.ownership_type === "individual" || !f.ownership_type ? PROV.VERIFIED : PROV.VERIFIED,
      entity_status: f.entity_status_known ? "active" : null,
      entity_status_prov: f.entity_status_known ? PROV.VERIFIED : PROV.NEEDED,
      year_built: f.year_built ? Number(f.year_built) : null,
      year_built_prov: f.year_built ? PROV.VERIFIED : PROV.NEEDED,
      in_condo_association: ["condo", "condo_hotel"].includes(f.property_type),
      use_type: f.property_type === "condo_hotel" ? "str_hotel" : null,
      use_type_prov: f.property_type === "condo_hotel" ? PROV.VERIFIED : PROV.NEEDED,
      str_listing_confirmed: !!f.str_listing_confirmed, str_listing_prov: f.str_listing_confirmed ? PROV.VERIFIED : PROV.NEEDED,
      frequent_transfers: false, assessment_moving: false, assessment_prov: PROV.VERIFIED,
      owner_renewal_date_known: false, master_renewal_date_known: false,
      has_building_record_fact: !!f.building_fact, has_building_record_prov: f.building_fact ? PROV.VERIFIED : PROV.NEEDED,
    };
    onRun(a);
  };
  const field = (label, node) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
      <span style={{ color: C.sub, fontSize: 13.5, fontWeight: 700 }}>{label}</span>{node}
    </div>
  );
  const inp = (k, ph) => <input value={f[k]} placeholder={ph} onChange={(e) => set(k, e.target.value)}
    style={{ background: "#fff", border: `2px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "6px 10px", fontSize: 13, width: 150, fontWeight: 700, fontFamily: FONT_BODY }} />;
  const sel = (k, opts) => <select value={f[k]} onChange={(e) => set(k, e.target.value)}
    style={{ background: "#fff", border: `2px solid ${C.line}`, color: C.ink, borderRadius: 10, padding: "6px 10px", fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY }}>
    {opts.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
  const chk = (k) => <input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} style={{ accentColor: C.green, width: 18, height: 18 }} />;
  return (
    <Card style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Mascot type="legal" size={40} motion={false} title="Verified figures" />
        <div style={{ color: C.sub, fontSize: 12.5, fontWeight: 600 }}>
          Enter only what you've verified. Anything left blank stays <Tag t="NEEDED" />. Nothing is invented.
        </div>
      </div>
      {field("Property nickname", inp("nickname", "Unit 1001"))}
      {field("Property type", sel("property_type", ["condo_hotel", "condo", "multifamily", "single_family", "commercial", "warehouse"]))}
      {field("Coastal / oceanfront", chk("coastal"))}
      {field("FEMA flood zone", sel("flood_zone", ["", "VE", "AE", "A", "X"]))}
      {field("Zone read exactly from panel fields?", chk("flood_zone_known"))}
      {field("BFE (ft)", inp("bfe_ft", "11"))}
      {field("FEMA panel has amendment history", chk("fema_amended"))}
      {field("Year built", inp("year_built", "1966"))}
      {field("Ownership type", sel("ownership_type", ["llc", "lp", "corp", "individual", "trust"]))}
      {field("Entity status confirmed on Sunbiz", chk("entity_status_known"))}
      {field("Unit confirmed listed short-term", chk("str_listing_confirmed"))}
      {field("Verified building record on file", chk("building_fact"))}
      <div style={{ marginTop: 16 }}><Btn onClick={build}>Build verified scan</Btn></div>
    </Card>
  );
}

// ----------------------------- loading (game-like) --------------------------
function Loading() {
  const steps = ["Finding your property in public records…", "Checking FEMA flood mapping…",
    "Reviewing assessment & ownership records…", "Spotting what's worth watching…"];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 560); return () => clearInterval(t); }, []);
  return (
    <div style={{ paddingTop: 90, maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="floaty" style={{ marginBottom: 18, display: "flex", justifyContent: "center" }}>
        <Mascot type="scan" size={76} title="Scanning your property" />
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24, marginBottom: 20 }}>Scanning your property…</div>
      <Progress value={i + 1} max={steps.length} />
      <div style={{ marginTop: 24, display: "grid", gap: 10, textAlign: "left" }}>
        {steps.map((s, idx) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, opacity: idx <= i ? 1 : 0.4, transition: "opacity .4s", fontWeight: 700, color: idx <= i ? C.ink : C.faint }}>
            <span>{idx < i ? "✅" : idx === i ? "⏳" : "⚪"}</span><span style={{ fontSize: 14.5 }}>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 22, color: C.faint, fontSize: 13, fontWeight: 600 }}>A careful check takes a few seconds — that's the point 💚</div>
    </div>
  );
}

function ManualNeeded({ onBack }) {
  return (
    <div style={{ paddingTop: 64, maxWidth: 560 }}>
      <div style={{ marginBottom: 8 }}><Mascot type="advisor" size={56} title="Hand-checked by a person" /></div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28, margin: "0 0 10px" }}>This one needs a friendly hand-check</h2>
      <p style={{ color: C.sub, fontSize: 15, lineHeight: 1.6, fontWeight: 600 }}>
        We couldn't reach this property's public records automatically right now — and KAIROS never makes up values.
        A person verifies the missing facts before your scan is ready. During our alpha, scans like this are completed by hand.
      </p>
      <p style={{ color: C.faint, fontSize: 13.5, marginTop: 10, fontWeight: 600 }}>Reach us at kai@kairosaiagent.com to have yours run.</p>
      <div style={{ marginTop: 20 }}><Btn kind="ghost" onClick={onBack}>← Try another property</Btn></div>
    </div>
  );
}
function ErrorScreen({ message, onRetry, onBack }) {
  return (
    <div style={{ paddingTop: 64, maxWidth: 540 }}>
      <div style={{ marginBottom: 8 }}><Mascot type="alerts" size={56} title="Something needs attention" /></div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28, margin: "0 0 10px" }}>Let's try that again</h2>
      <p style={{ color: C.sub, fontSize: 15, lineHeight: 1.6, fontWeight: 600 }}>{message || "Something interrupted the scan."}</p>
      <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
        <Btn onClick={onRetry}>Retry scan</Btn>
        <Btn kind="ghost" onClick={onBack}>← Back</Btn>
      </div>
    </div>
  );
}

// ----------------------------- scan results (joyful) ------------------------
function Scan({ attrs, results, reco, onSubscribe, onBack }) {
  const active = results.filter((r) => r.strength === STR.ACTIVE);
  const prov = results.filter((r) => r.strength === STR.PROVISIONAL);
  const shown = [...active, ...prov];
  const needed = [...new Set(results.flatMap((r) => r.needed))];
  return (
    <div style={{ paddingTop: 44 }}>
      <Btn kind="quiet" onClick={onBack} style={{ marginBottom: 6 }}>← back</Btn>
      <div className="pop" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.greenBg, color: C.greenDk,
        fontWeight: 800, fontSize: 13, padding: "6px 13px", borderRadius: 999 }}><Mascot type="scan" size={16} motion={false} style={{ marginRight: 4 }} /> Scan complete!</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "12px 0 4px" }}>
        <Mascot type="scan" size={48} title="Scan complete" />
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 32, margin: 0 }}>{attrs.nickname}</h2>
      </div>
      <div style={{ color: C.sub, fontSize: 16, fontWeight: 600 }}>
        {shown.length === 0
          ? "Good news — we found little that needs ongoing watching here."
          : <>KAIROS found <b style={{ color: C.green }}>{shown.length}</b> {shown.length === 1 ? "thing" : "things"} worth protecting on this property.</>}
      </div>

      <div style={{ marginTop: 22, display: "grid", gap: 12 }}>
        {shown.map((r, i) => <CategoryCard key={r.key} r={r} idx={i} />)}
      </div>

      {needed.length > 0 && (
        <Card style={{ marginTop: 16, background: C.yellowBg, border: "none" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <Mascot type="legal" size={28} motion={false} />
            <span style={{ color: C.ink, fontSize: 14, fontWeight: 800 }}>Add these to sharpen your watch (we never guess them):</span>
          </div>
          {needed.map((n) => <div key={n} style={{ color: C.yellowDk, fontSize: 13.5, padding: "3px 0", fontWeight: 700 }}>• {n}</div>)}
        </Card>
      )}

      <Card style={{ marginTop: 20, background: `linear-gradient(135deg, ${C.blueBg}, ${C.greenBg})`, border: "none" }} accent={C.green}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Mascot type="advisor" size={40} motion={false} />
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20 }}>What we'd suggest</div>
        </div>
        <div style={{ color: C.ink, fontSize: 14.5, lineHeight: 1.6, marginBottom: 16, fontWeight: 600 }}>{reco?.line}</div>
        {reco?.tier === "none" ? (
          <Btn kind="ghost" onClick={onBack}>Keep my free scan</Btn>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Btn onClick={onSubscribe}>🛡️ Keep KAIROS watching</Btn>
            <Btn kind="ghost" onClick={onBack}>Just keep my free scan</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}
const CAT_MASCOT = (r) => {
  const t = (((r && r.key) || "") + " " + ((r && r.name) || "")).toLowerCase();
  if (/flood|coastal|climate|water/.test(t)) return "flood";
  if (/own|deed|title|transaction|entity|registration/.test(t)) return "ownership";
  if (/legal|complian|disclos|assessment|appeal|recert|inspection|reserve/.test(t)) return "legal";
  return "monitoring";
};
function CategoryCard({ r, idx }) {
  const [open, setOpen] = useState(false);
  const accent = r.strength === STR.ACTIVE ? C.green : C.blue;
  return (
    <Card className="fu" style={{ animationDelay: `${(idx || 0) * .05}s`, cursor: "pointer", padding: 18 }} accent={accent} >
      <div onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Mascot type={CAT_MASCOT(r)} size={44} title={r.name} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17, flex: 1 }}>{r.name}</span>
        <StatusPill s={r.strength} />
        <span style={{ color: C.faint, fontWeight: 800 }}>{open ? "−" : "+"}</span>
      </div>
      <div style={{ color: C.sub, fontSize: 14, lineHeight: 1.55, marginTop: 8, fontWeight: 600 }}>{r.user_explanation}</div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          <Line label="Why" v={r.reasons.join(" ")} />
          <Line label="Why it matters to your wallet" v={r.so_what} accent />
          {r.needed.length > 0 && <Line label="Add to unlock" v={r.needed.join("; ")} />}
        </div>
      )}
    </Card>
  );
}
const Line = ({ label, v, accent }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontWeight: 800, fontSize: 11, color: accent ? C.greenDk : C.faint, letterSpacing: ".04em", marginBottom: 3, textTransform: "uppercase" }}>{label}</div>
    <div style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.55, fontWeight: 600 }}>{v}</div>
  </div>
);

// ----------------------------- subscribe ------------------------------------
function Subscribe({ reco, onChoose, onSkip }) {
  const suggested = "starter";
  return (
    <div style={{ paddingTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Mascot type="monitoring" size={44} title="Keep the watch running" />
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 32, margin: 0 }}>Keep the watch running</h2>
      </div>
      <p style={{ color: C.sub, fontSize: 15.5, maxWidth: 580, lineHeight: 1.6, fontWeight: 600 }}>
        Most months, everything stays calm — and we'll tell you so. You're really paying for the one month it doesn't. Cancel anytime, no hard feelings.
      </p>
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        {PLANS.map((pl) => (
          <Card key={pl.id} accent={pl.id === suggested ? C.green : undefined}
            style={{ border: pl.id === suggested ? `2px solid ${C.green}` : `1px solid ${C.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21 }}>{pl.name}</span>
              {pl.id === suggested && <span style={{ fontWeight: 800, fontSize: 11, color: "#fff", background: C.green, borderRadius: 999, padding: "2px 9px" }}>BEST START</span>}
            </div>
            <div style={{ color: C.faint, fontSize: 13, margin: "4px 0 12px", fontWeight: 700 }}>{pl.range}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, marginBottom: 14 }}>
              {pl.price ? <>${pl.price}<span style={{ fontSize: 14, color: C.faint }}>/mo</span></> : <span style={{ fontSize: 18, color: C.sub }}>Custom</span>}
            </div>
            <Btn kind={pl.id === suggested ? "primary" : "ghost"} onClick={() => onChoose(pl)} style={{ width: "100%" }}>
              {pl.price ? "Choose" : "Contact us"}
            </Btn>
          </Card>
        ))}
      </div>
      <div style={{ marginTop: 16 }}><Btn kind="quiet" onClick={onSkip}>← back to my scan</Btn></div>
    </div>
  );
}

// ----------------------------- activation (real backend — UNCHANGED logic) --
function Pay({ plan, scanId, propertyName, onActivated, onBack }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const ok = email.includes("@") && email.length > 4 && !!scanId && !!plan;

  const activate = async () => {
    setErr(null); setBusy(true);
    const sub = await api.createSubscription({ email, scan_id: scanId, plan: plan.id });
    if (!sub.ok) { setBusy(false); setErr(sub.error || "Could not start your subscription."); return; }
    const checkout = sub.data && sub.data.checkout;
    // Real Stripe Checkout: persist context across the redirect, then go to the
    // hosted payment page. On return, the app confirms the payment (see App load).
    if (checkout && checkout.mock === false && checkout.url) {
      try {
        localStorage.setItem("kairos_pending", JSON.stringify({
          scan_id: scanId, email, plan, property: propertyName }));
      } catch { /* ignore */ }
      window.location.href = checkout.url;
      return;
    }
    // Local / mock mode (no Stripe keys): there is no hosted page to redirect to, so
    // settle the mock checkout server-side via /billing/confirm — the backend's OWN mock
    // path (no card, no real Stripe) — and continue into the dashboard so the full flow
    // is usable locally. Real Stripe still uses the redirect branch above.
    const conf = await api.confirmBilling({
      session_id: checkout && checkout.session_id, user_email: email,
      scan_id: scanId, plan: plan.id });
    setBusy(false);
    if (!conf.ok || !conf.data) {
      setErr(conf.error || `Could not activate locally. Please try again, or contact ${SUPPORT_EMAIL}.`);
      return;
    }
    onActivated({
      email, plan, status: "active", property: propertyName, since: today(),
      subscriptionId: sub.data.subscription_id, accessToken: sub.data.access_token || null,
      digests: conf.data.first_digest ? [conf.data.first_digest] : [],
    });
  };

  return (
    <div style={{ paddingTop: 56, maxWidth: 460 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Mascot type="monitoring" size={44} title="Start your watch" />
        <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28, margin: 0 }}>Start your watch</h2>
      </div>
      <div style={{ color: C.sub, fontSize: 14.5, marginTop: 6, fontWeight: 700 }}>
        {plan?.name} · {plan?.price ? `$${plan.price}/mo` : "custom"} · cancel anytime
      </div>
      <Card style={{ marginTop: 18 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email for your account + monthly digest"
            style={{ width: "100%", background: "#fff", border: `2px solid ${C.line}`, color: C.ink, borderRadius: 12, padding: "13px 15px", fontSize: 14, fontWeight: 700, fontFamily: FONT_BODY, outline: "none" }}
            onFocus={(e) => (e.target.style.borderColor = C.blue)} onBlur={(e) => (e.target.style.borderColor = C.line)} />
          <div style={{ fontSize: 12, color: C.faint, lineHeight: 1.6, fontWeight: 600 }}>
            You'll continue to secure checkout (Stripe) to start your subscription. Cancel anytime.
          </div>
          {err && <div style={{ color: C.coral, fontSize: 13, fontWeight: 700 }}>{err}</div>}
          <Btn onClick={activate} disabled={!ok || busy}>{busy ? "Activating…" : "🛡️ Activate monitoring"}</Btn>
          <Btn kind="quiet" onClick={onBack}>← back</Btn>
        </div>
      </Card>
    </div>
  );
}

// ----------------------------- onboarding (reward moment) -------------------
function Onboard({ account, onGo }) {
  return (
    <div style={{ paddingTop: 80, maxWidth: 540, textAlign: "center", margin: "0 auto" }}>
      <div className="pop" style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}><Mascot type="monitoring" size={84} title="The watch is on" /></div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, margin: 0 }}>The watch is on!</h2>
      <p style={{ color: C.sub, fontSize: 15.5, lineHeight: 1.65, marginTop: 14, fontWeight: 600 }}>
        KAIROS is now watching <b style={{ color: C.green }}>{account.property}</b>. Your first digest is ready —
        so you feel the work right away, not in thirty days. After that, we'll check in monthly, and the moment
        anything verified changes.
      </p>
      <div style={{ marginTop: 24 }}><Btn onClick={onGo}>See my dashboard →</Btn></div>
    </div>
  );
}

// =============================================================================
// DASHBOARD — tabbed IA (Overview · Property · Savings · Alerts · Digest · Account)
//   Uses real API data only; never fabricates values or savings $.
// =============================================================================
const TAB_MASCOT = { overview: "monitoring", property: "scan", savings: "reports", alerts: "alerts", digest: "reports" };
function Dashboard({ account, setAccount, attrs, results }) {
  const [tab, setTab] = useState("overview");
  const active = (results || []).filter((r) => r.strength === STR.ACTIVE || r.strength === STR.PROVISIONAL);
  const needed = [...new Set((results || []).flatMap((r) => r.needed))];
  const verifiedFacts = factsFromAttrs(attrs);
  const latest = account.digests && account.digests[0];
  const TABS = [
    ["overview", "Overview", "🏠"], ["property", "Property", "📍"], ["savings", "Savings", "💰"],
    ["alerts", "Alerts", "🔔"], ["digest", "Digest", "📬"], ["account", "Account", "⚙️"],
  ];
  return (
    <div style={{ paddingTop: 36 }}>
      {/* stable property identity header */}
      <Card accent={C.green} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Mascot type="monitoring" size={48} />
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>{account.property}</div>
            <div style={{ color: C.sub, fontSize: 13, fontWeight: 700 }}>{account.plan?.name} · watching since {account.since}</div>
          </div>
        </div>
        <span style={{ background: C.greenBg, color: C.greenDk, fontWeight: 800, fontSize: 13, padding: "7px 13px", borderRadius: 999 }}>
          🟢 On watch
        </span>
      </Card>

      {/* segmented tabs */}
      <div className="kai-tabs" style={{ margin: "16px 0 18px", flexWrap: "wrap" }}>
        {TABS.map(([id, label, emo]) => (
          <button key={id} onClick={() => setTab(id)} style={{ border: "none", cursor: "pointer",
            fontFamily: FONT_BODY, fontWeight: 800, fontSize: 13.5, padding: "9px 14px", borderRadius: 999,
            background: tab === id ? C.ink : "#fff", color: tab === id ? "#fff" : C.sub,
            boxShadow: tab === id ? "none" : `inset 0 0 0 1px ${C.line}` }}>
            {TAB_MASCOT[id]
              ? <span style={{ display: "inline-flex", marginRight: 6, verticalAlign: "middle" }}><Mascot type={TAB_MASCOT[id]} size={22} motion={false} /></span>
              : <span style={{ marginRight: 6 }}>{emo}</span>}{label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab account={account} active={active} needed={needed} verifiedFacts={verifiedFacts} latest={latest} go={setTab} />}
      {tab === "property" && <PropertyTab account={account} verifiedFacts={verifiedFacts} />}
      {tab === "savings" && <SavingsTab active={active} />}
      {tab === "alerts" && <AlertsTab active={active} needed={needed} />}
      {tab === "digest" && <DigestView d={latest} />}
      {tab === "account" && <AccountTab account={account} setAccount={setAccount} />}
    </div>
  );
}

function Stat({ emo, mascot, big, label, color }) {
  return (
    <Card style={{ textAlign: "center", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "center", minHeight: 32, marginBottom: 2 }}>
        {mascot ? <Mascot type={mascot} size={32} motion={false} /> : <span style={{ fontSize: 26 }}>{emo}</span>}
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, color: color || C.ink, lineHeight: 1.1 }}>{big}</div>
      <div style={{ color: C.sub, fontSize: 12.5, fontWeight: 700 }}>{label}</div>
    </Card>
  );
}

// retention metrics — derived ONLY from real engine results + backend digests (no fabrication)
function protectionScore(active, needed, latest) {
  const watched = active.length, gaps = needed.length;
  if (watched + gaps > 0) return Math.round((100 * watched) / (watched + gaps));
  if (latest && latest.checked > 0) return Math.round((100 * (latest.stable ?? 0)) / latest.checked);
  return 100;
}
function calmStreak(digests) {
  if (!Array.isArray(digests)) return 0;
  let n = 0;
  for (const d of digests) { if ((d && d.attention ? d.attention : 0) === 0) n++; else break; }
  return n;
}
function winsFromDigests(digests, verifiedCount, protectedCount) {
  const wins = [];
  if (protectedCount > 0) wins.push(["🛡️", `${protectedCount} ${protectedCount === 1 ? "thing" : "things"} under watch`]);
  if (verifiedCount > 0) wins.push(["✅", `${verifiedCount} ${verifiedCount === 1 ? "fact" : "facts"} verified`]);
  (digests || []).slice(0, 4).forEach((d) => {
    if ((d.attention || 0) === 0) wins.push(["🎉", `${d.month}: all quiet — nothing to do`]);
    else wins.push(["🔔", `${d.month}: ${d.attention} caught early`]);
  });
  return wins;
}
function ScoreRing({ value }) {
  const r = 34, circ = 2 * Math.PI * r, off = circ * (1 - value / 100);
  const color = value >= 75 ? C.green : value >= 45 ? C.blue : C.yellow;
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" aria-label={`Protection score ${value}`}>
      <circle cx="46" cy="46" r={r} fill="none" stroke={C.line} strokeWidth="9" />
      <circle cx="46" cy="46" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 46 46)"
        style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)" }} />
      <text x="46" y="52" textAnchor="middle" fontFamily={FONT_DISPLAY} fontWeight="800" fontSize="22" fill={C.ink}>{value}</text>
    </svg>
  );
}

function OverviewTab({ account, active, needed, verifiedFacts, latest, go }) {
  const checked = latest?.checked ?? active.length;
  const attention = latest?.attention ?? 0;
  const score = protectionScore(active, needed, latest);
  const streak = calmStreak(account.digests);
  const wins = winsFromDigests(account.digests, verifiedFacts.length, active.length);
  return (
    <div className="fu" style={{ display: "grid", gap: 14 }}>
      {/* 1. Is my property okay?  +  2. What changed? */}
      <Card style={{ background: attention > 0 ? C.yellowBg : C.greenBg, border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Mascot type={attention > 0 ? "alerts" : "monitoring"} size={52} />
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20 }}>
              {attention > 0 ? COPY.retention.attention(attention) : COPY.retention.allClear}
            </div>
            <div style={{ color: C.sub, fontSize: 14, fontWeight: 600 }}>
              {attention > 0 ? COPY.retention.attentionSub : COPY.retention.allClearSub}
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Did KAIROS help? — protection score + reward stats */}
      <Card>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <ScoreRing value={score} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>{COPY.dashboard.protectionScore}</span>
              {streak > 0 && <span style={{ background: C.purpleBg, color: C.purple, fontWeight: 800, fontSize: 11.5, borderRadius: 999, padding: "3px 10px" }}>🔥 {COPY.retention.streak(streak)}</span>}
            </div>
            <div style={{ color: C.sub, fontSize: 12.5, marginTop: 4, fontWeight: 600 }}>{COPY.dashboard.protectionScoreSub}</div>
          </div>
        </div>
        <div className="kai-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 14 }}>
          <Stat mascot="monitoring" big={active.length} label={COPY.dashboard.statsProtected} color={C.green} />
          <Stat mascot="scan" big={checked} label={COPY.dashboard.statsChecked} color={C.blue} />
          <Stat mascot="legal" big={verifiedFacts.length} label={COPY.dashboard.statsVerified} color={C.purple} />
        </div>
      </Card>

      {/* wins feed */}
      {wins.length > 0 && (
        <Card>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{COPY.retention.winsTitle}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {wins.map(([emo, text], i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", background: C.bg2, borderRadius: 12, padding: "10px 12px" }}>
                <span style={{ fontSize: 18 }}>{emo}</span>
                <span style={{ color: C.ink, fontSize: 13.5, fontWeight: 700 }}>{text}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* coverage progress */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>Your watch coverage</span>
          <span style={{ color: C.green, fontWeight: 800, fontSize: 13 }}>{active.length} active</span>
        </div>
        <Progress value={active.length} max={Math.max(active.length + needed.length, 1)} />
        <div style={{ color: C.sub, fontSize: 13, marginTop: 10, fontWeight: 600 }}>
          {COPY.retention.coverageNote(needed.length)}{needed.length > 0 && <> <b style={{ color: C.blueDk, cursor: "pointer" }} onClick={() => go("alerts")}>See how →</b></>}
        </div>
      </Card>

      {/* 4. Do I need to do anything? */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Btn onClick={() => go("digest")}>📬 Open my latest digest</Btn>
        <Btn kind="ghost" onClick={() => go("savings")}>See the value →</Btn>
      </div>
    </div>
  );
}

function PropertyTab({ account, verifiedFacts }) {
  return (
    <div className="fu" style={{ display: "grid", gap: 14 }}>
      <Card accent={C.blue}>
        <div style={{ color: C.faint, fontWeight: 800, fontSize: 12, textTransform: "uppercase", marginBottom: 4 }}>Property</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{account.property}</div>
      </Card>
      {verifiedFacts.length > 0 ? (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Mascot type="legal" size={28} motion={false} />
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16 }}>Verified facts</span>
          </div>
          {verifiedFacts.map(([k, v, p]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ color: C.sub, fontSize: 13.5, fontWeight: 700 }}>{k}</span>
              <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: C.ink, fontSize: 13.5, fontWeight: 800 }}>{String(v)}</span><Tag t={p} />
              </span>
            </div>
          ))}
        </Card>
      ) : (
        <Card style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}><Mascot type="scan" size={48} /></div>
          <div style={{ fontWeight: 800, marginTop: 6 }}>Your property facts live in your digests</div>
          <div style={{ color: C.sub, fontSize: 13.5, marginTop: 4, fontWeight: 600 }}>
            Open the Digest tab to see what KAIROS checked. Run a fresh scan anytime to refresh the detailed fact list.
          </div>
        </Card>
      )}
    </div>
  );
}

// Value/Savings — honest: NO fabricated dollar figures; visualizes protection.
function SavingsTab({ active }) {
  return (
    <div className="fu" style={{ display: "grid", gap: 14 }}>
      <Card accent={C.green} style={{ background: C.greenBg, border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Mascot type="reports" size={44} />
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20 }}>
              {COPY.value.savingsHeader(active.length)}
            </div>
            <div style={{ color: C.sub, fontSize: 13.5, fontWeight: 600 }}>
              {COPY.value.savingsSub}
            </div>
          </div>
        </div>
      </Card>
      {active.map((r) => (
        <Card key={r.key} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Mascot type={CAT_MASCOT(r)} size={34} motion={false} />
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15.5 }}>{r.name}</div>
            <div style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.55, marginTop: 3, fontWeight: 600 }}>{r.so_what}</div>
          </div>
        </Card>
      ))}
      {active.length === 0 && (
        <Card style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}><Mascot type="monitoring" size={48} /></div>
          <div style={{ fontWeight: 800, marginTop: 6 }}>Nothing high-cost to watch right now</div>
          <div style={{ color: C.sub, fontSize: 13.5, marginTop: 4, fontWeight: 600 }}>That's the cheapest outcome of all.</div>
        </Card>
      )}
      <div style={{ color: C.faint, fontSize: 12, fontWeight: 600, textAlign: "center", lineHeight: 1.6 }}>
        {COPY.trust.honesty}
      </div>
    </div>
  );
}

function AlertsTab({ active, needed }) {
  return (
    <div className="fu" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Mascot type="alerts" size={40} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18 }}>Things KAIROS is watching for you</span>
      </div>
      {active.length === 0 && (
        <Card style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}><Mascot type="monitoring" size={48} /></div>
          <div style={{ fontWeight: 800, marginTop: 6 }}>Nothing active to watch — enjoy the quiet.</div>
        </Card>
      )}
      {active.map((r, i) => <CategoryCard key={r.key} r={r} idx={i} />)}
      {needed.length > 0 && (
        <Card style={{ background: C.yellowBg, border: "none" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <Mascot type="legal" size={28} motion={false} />
            <span style={{ color: C.ink, fontSize: 14, fontWeight: 800 }}>Add to unlock sharper watching (never guessed):</span>
          </div>
          {needed.map((n) => <div key={n} style={{ color: C.yellowDk, fontSize: 13.5, padding: "3px 0", fontWeight: 700 }}>• {n}</div>)}
        </Card>
      )}
    </div>
  );
}

function AccountTab({ account, setAccount }) {
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelErr, setCancelErr] = useState(null);
  // Owner-only cancellation against the real backend. Sends the capability token as a
  // Bearer header; only flips local state / clears the session when the backend confirms
  // the cancel, so a failed call never shows a false "cancelled" while billing continues.
  const cancelWatch = async () => {
    setCancelErr(null);
    if (!window.confirm("Cancel monitoring for this property? This ends your subscription.")) return;
    setCancelBusy(true);
    const res = await api.cancelSubscription(account.subscriptionId, account.accessToken);
    setCancelBusy(false);
    if (res.ok) {
      try { localStorage.removeItem("kairos_session"); } catch { /* ignore */ }
      setAccount({ ...account, status: "cancelled" });
    } else {
      setCancelErr(res.error || "We couldn't cancel right now. Please try again or contact support.");
    }
  };
  return (
    <div className="fu" style={{ display: "grid", gap: 14 }}>
      <Card>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Your account ⚙️</div>
        {[["Email", account.email], ["Plan", account.plan?.name], ["Status", account.status], ["Property", account.property]].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
            <span style={{ color: C.sub, fontSize: 13.5, fontWeight: 700 }}>{k}</span>
            <span style={{ color: C.ink, fontSize: 13.5, fontWeight: 800 }}>{v}</span>
          </div>
        ))}
      </Card>
      <Card style={{ background: C.bg2 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Manage subscription</div>
        {account.status === "cancelled" ? (
          <div style={{ color: C.greenDk, fontSize: 13.5, fontWeight: 700, background: C.greenBg, borderRadius: 12, padding: "12px 14px" }}>
            ✓ Monitoring cancelled. You're always welcome back.
          </div>
        ) : (
          <>
            <div style={{ color: C.sub, fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
              Cancel anytime — no hard feelings.
            </div>
            <Btn kind="ghost" onClick={cancelWatch} disabled={cancelBusy || account.status === "cancelled"}>
              {cancelBusy ? "Cancelling…" : "Cancel monitoring"}
            </Btn>
          </>
        )}
        {cancelErr && <div style={{ color: C.coral, fontSize: 12.5, marginTop: 8, fontWeight: 700 }}>{cancelErr}</div>}
      </Card>
    </div>
  );
}

// ----------------------------- digest view (cheerful) -----------------------
function buildDigest(attrs, results, n) {
  const active = results.filter((r) => r.strength === STR.ACTIVE || r.strength === STR.PROVISIONAL);
  const monthDate = new Date(); monthDate.setMonth(monthDate.getMonth() + (n - 1));
  const month = monthDate.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  const changeIdx = n === 1 ? -1 : (n % active.length);
  const rows = active.map((r, i) => {
    let status = "No change";
    if (n > 1 && i === changeIdx && r.alert_eligible) status = "Change detected";
    else if (r.needed.length && i === ((n + 1) % active.length)) status = "Awaiting your input";
    return { name: r.name, status, line: r.user_explanation, alert: r.alert_eligible };
  });
  const attention = rows.filter((x) => x.status !== "No change").length;
  return { n, month, rows, stable: rows.length - attention, attention, checked: active.length,
    escalation: rows.find((x) => x.status === "Change detected" && x.alert) || null };
}

function DigestView({ d }) {
  if (!d) return (
    <Card className="fu" style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center" }}><Mascot type="reports" size={56} /></div>
      <div style={{ fontWeight: 800, marginTop: 8 }}>Your first digest is on its way</div>
      <div style={{ color: C.sub, fontSize: 13.5, marginTop: 4, fontWeight: 600 }}>KAIROS will drop a friendly monthly note here — and the moment anything verified changes.</div>
    </Card>
  );
  const meta = {
    "No change": { fg: C.greenDk, bg: C.greenBg, dot: "✅", label: "All good" },
    "Change detected": { fg: C.coral, bg: C.coralBg, dot: "🔔", label: "Heads up" },
    "Awaiting your input": { fg: C.yellowDk, bg: C.yellowBg, dot: "🔑", label: "Add info" },
  };
  return (
    <div className="fu" style={{ display: "grid", gap: 14 }}>
      {d.escalation && (
        <Card style={{ background: C.coralBg, border: "none" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Mascot type="alerts" size={32} motion={false} />
            <span style={{ color: C.ink, fontSize: 14, fontWeight: 700 }}>
              One condition changed this month and was sent to you the moment it happened — not held for the digest: <b>{d.escalation.name}</b>.
            </span>
          </div>
        </Card>
      )}
      <Card accent={d.attention > 0 ? C.yellow : C.green}>
        <div style={{ color: C.faint, fontWeight: 800, fontSize: 12, textTransform: "uppercase" }}>Monthly digest · {d.month}</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, margin: "8px 0 4px", lineHeight: 1.3 }}>
          KAIROS checked {d.checked} {d.checked === 1 ? "condition" : "conditions"} this month 🔎
        </div>
        <div style={{ color: C.sub, fontSize: 15, fontWeight: 600 }}>
          <b style={{ color: C.green }}>{d.stable} stable.</b>{d.attention > 0 ? ` ${d.attention} ${d.attention === 1 ? "needs" : "need"} a glance.` : " Nothing needs you. Enjoy the calm 💚"}
        </div>
        <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
          {d.rows.map((row) => {
            const m = meta[row.status] || meta["No change"];
            return (
              <div key={row.name} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
                <span style={{ fontSize: 18 }}>{m.dot}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                    <span style={{ color: C.ink, fontSize: 14.5, fontWeight: 800 }}>{row.name}</span>
                    <span style={{ color: m.fg, background: m.bg, fontSize: 11.5, fontWeight: 800, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>{m.label}</span>
                  </div>
                  <div style={{ color: C.sub, fontSize: 13, lineHeight: 1.5, marginTop: 3, fontWeight: 600 }}>{row.line}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, padding: 14, background: C.bg2, borderRadius: 14, color: C.sub, fontSize: 12.5, lineHeight: 1.6, fontWeight: 600 }}>
          <b style={{ color: C.ink }}>What KAIROS watched:</b> every condition above was checked against public records — including the quiet ones.
          Watching the quiet ones is the job. A condition only reaches you immediately if a verified fact verifiably changes; everything else waits for this calm monthly note.
        </div>
      </Card>
    </div>
  );
}

// helper: build the verified-facts list from attrs (same fields as before)
function factsFromAttrs(attrs) {
  if (!attrs) return [];
  return [
    ["Property type", attrs.property_type, attrs.property_type_prov],
    ["Owner type", attrs.ownership_type, attrs.ownership_type_prov],
    ["Year built", attrs.year_built, attrs.year_built_prov],
    ["Flood zone", attrs.flood_zone, attrs.flood_zone_prov],
    ["BFE (ft)", attrs.bfe_ft, attrs.flood_zone_prov],
    ["Use type", attrs.use_type, attrs.use_type_prov],
    ["Entity status", attrs.entity_status, attrs.entity_status_prov],
  ].filter(([, v]) => v != null && v !== "");
}
