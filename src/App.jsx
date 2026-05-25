import React, { useState, useEffect, useMemo, useRef } from "react";
import api from "./api";

// =============================================================================
// KAIROS — v1 SELF-SERVE PRODUCT (single-file React app)
// -----------------------------------------------------------------------------
// The full loop: landing -> address/from-values -> loading -> scan ->
// categories -> subscription -> payment(sim) -> onboarding -> monthly digest ->
// account shell. The activation engine below is a faithful JS port of
// KAIROS_ACTIVATION_ENGINE.py (same strengths, same discipline invariants).
//
// Product = reduced operational surprise. System = silent operational bodyguard.
// Engineering invariants enforced in code:
//   - activation != alerting
//   - no category ACTIVE on assumption alone (capped at provisional)
//   - no immediate alert without a verified change to a verified fact
//   - every active category carries a "so what"; else it's downgraded
//   - silence (no change) is reported as proof-of-work, never hidden
// =============================================================================

// ----------------------------- design tokens -------------------------------
const C = {
  ink: "#0e1113",        // near-black ground
  panel: "#15191c",
  panel2: "#1b2024",
  line: "#2a3137",
  fog: "#8a969e",        // muted text
  mist: "#c4ccd1",       // secondary text
  bone: "#eef1f2",       // primary text
  active: "#7fb6a6",     // restrained sage — "active"
  prov: "#c9a96a",       // muted brass — "provisional/attention"
  weak: "#5c666d",
  alert: "#c08457",      // warm, never red — "needs review"
};

const FONT_DISPLAY = "'Newsreader', 'Iowan Old Style', Georgia, serif";
const FONT_BODY = "'Spline Sans', ui-sans-serif, system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";

// ----------------------------- provenance ----------------------------------
const PROV = { VERIFIED: "VERIFIED", VERIFIED_APPROX: "VERIFIED~", ASSUMPTION: "ASSUMPTION", NEEDED: "NEEDED" };
const ACTIVATING = new Set([PROV.VERIFIED, PROV.VERIFIED_APPROX]);
const STR = { ACTIVE: "●", PROVISIONAL: "◐", WEAK: "○", DORMANT: "—" };
const RANK = { "—": 0, "○": 1, "◐": 2, "●": 3 };
const maxStr = (a, b) => (RANK[a] >= RANK[b] ? a : b);

// ============================ ACTIVATION ENGINE (JS port) ====================
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

// ----------------------------- sample inputs --------------------------------
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

// ----------------------------- small UI atoms -------------------------------
const Tag = ({ t }) => {
  const map = { VERIFIED: C.active, "VERIFIED~": C.prov, ASSUMPTION: C.weak, NEEDED: C.alert };
  return <span style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".06em",
    color: map[t] || C.fog, border: `1px solid ${map[t] || C.line}`, borderRadius: 3,
    padding: "1px 6px", whiteSpace: "nowrap" }}>{t}</span>;
};
const StrengthDot = ({ s }) => {
  const map = { "●": C.active, "◐": C.prov, "○": C.weak, "—": C.line };
  return <span style={{ color: map[s], fontSize: 14, lineHeight: 1 }}>{s}</span>;
};
const Btn = ({ children, onClick, kind = "primary", disabled, style }) => {
  const base = { fontFamily: FONT_BODY, fontSize: 14, letterSpacing: ".02em", cursor: disabled ? "not-allowed" : "pointer",
    borderRadius: 7, padding: "12px 22px", transition: "all .25s ease", border: "1px solid transparent", opacity: disabled ? 0.5 : 1 };
  const kinds = {
    primary: { background: C.bone, color: C.ink, border: `1px solid ${C.bone}` },
    ghost: { background: "transparent", color: C.mist, border: `1px solid ${C.line}` },
    quiet: { background: "transparent", color: C.fog, border: "1px solid transparent", padding: "8px 4px" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...kinds[kind], ...style }}
    onMouseEnter={(e) => { if (!disabled && kind === "ghost") e.currentTarget.style.borderColor = C.fog; }}
    onMouseLeave={(e) => { if (!disabled && kind === "ghost") e.currentTarget.style.borderColor = C.line; }}>{children}</button>;
};

// =============================================================================
// ROOT
// =============================================================================
export default function App() {
  const [route, setRoute] = useState("landing"); // landing|privacy|loading|scan|subscribe|pay|onboard|account
  const [attrs, setAttrs] = useState(null);
  const [results, setResults] = useState([]);
  const [account, setAccount] = useState(null); // {email, plan, status, property, since, digests:[]}
  const [showValues, setShowValues] = useState(false);
  const [scanId, setScanId] = useState(null);     // real id from backend (persisted in Supabase)
  const [apiError, setApiError] = useState(null);
  const reco = useMemo(() => (results.length ? recommend(results) : null), [results]);

  // On load: (1) if returning from Stripe Checkout, confirm the real payment and
  // activate; (2) otherwise restore an existing session from real backend digests.
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
      api.getDigests(saved.subscriptionId).then((res) => {
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

  // Verified path: always /scan/from-values (real, persisted). This NEVER routes
  // to manual-verification — that's reserved for live typed-address pulls below.
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

  // Honest typed-address path: really attempt a live county pull. If the source
  // can't be reached, the backend returns manual_needed (no fabrication) and we
  // show the manual screen — we never silently substitute the example property.
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
    <div style={{ minHeight: "100vh", background: C.ink, color: C.bone, fontFamily: FONT_BODY,
      backgroundImage: `radial-gradient(1200px 600px at 70% -10%, #1a2024 0%, ${C.ink} 60%)` }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300&family=Spline+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform: translateY(14px);} to {opacity:1; transform:none;} }
        @keyframes pulseLine { 0%,100%{opacity:.35} 50%{opacity:1} }
        @keyframes scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(2400%)} }
        .fu { animation: fadeUp .7s cubic-bezier(.2,.7,.2,1) both; }
      `}</style>

      <Header route={route} account={account} go={setRoute} />

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px 120px" }}>
        {route === "landing" && <Landing onStart={() => setRoute("privacy")} onSample={() => runPipeline(UNIT_1001)} />}
        {route === "privacy" && <AddressEntry onRun={runPipeline} onRunLive={runLive} showValues={showValues} setShowValues={setShowValues}
          onLowFit={() => runPipeline(LOW_FIT)} />}
        {route === "loading" && <Loading />}
        {route === "manual" && <ManualNeeded onBack={() => setRoute("privacy")} />}
        {route === "error" && <ErrorScreen message={apiError} onRetry={() => (attrs ? runPipeline(attrs) : setRoute("privacy"))} onBack={() => setRoute("privacy")} />}
        {route === "scan" && attrs && <Scan attrs={attrs} results={results} reco={reco}
          onSubscribe={() => setRoute("subscribe")} onBack={() => setRoute("landing")} />}
        {route === "subscribe" && <Subscribe reco={reco} onChoose={(plan) => { setAccount((a) => ({ ...(a || {}), pendingPlan: plan })); setRoute("pay"); }}
          onSkip={() => setRoute("scan")} />}
        {route === "pay" && <Pay
          plan={account?.pendingPlan}
          scanId={scanId}
          propertyName={attrs?.nickname}
          onActivated={(acc) => {
            try {
              localStorage.setItem("kairos_session", JSON.stringify({
                subscriptionId: acc.subscriptionId, email: acc.email,
                property: acc.property, plan: acc.plan, since: acc.since,
              }));
            } catch { /* ignore storage errors */ }
            setAccount(acc); setRoute("onboard");
          }}
          onBack={() => setRoute("subscribe")} />}
        {route === "onboard" && account && <Onboard account={account} onGo={() => setRoute("account")} />}
        {route === "account" && account && <Account account={account} setAccount={setAccount} attrs={attrs} results={results} />}
      </div>
      <Footer />
    </div>
  );
}

function today() { return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }

// ----------------------------- header / footer ------------------------------
function Header({ route, account, go }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(10px)",
      background: "rgba(14,17,19,.7)", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "16px 24px", display: "flex",
        alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => go(account ? "account" : "landing")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: C.active,
            boxShadow: `0 0 14px ${C.active}`, animation: "pulseLine 3.5s ease-in-out infinite" }} />
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, letterSpacing: ".14em" }}>KAIROS</span>
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.fog, letterSpacing: ".05em" }}>
          {account ? `${account.email} · ${account.status}` : "operational vigilance"}
        </div>
      </div>
    </div>
  );
}
function Footer() {
  return (
    <div style={{ borderTop: `1px solid ${C.line}`, padding: "28px 24px", textAlign: "center" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", color: C.fog, fontSize: 12, lineHeight: 1.7 }}>
        We do not predict the future. We do not place insurance. We do not sell your data. We do not guarantee savings.<br />
        <span style={{ fontFamily: FONT_MONO, fontSize: 11 }}>support@kairos.example · founder-led · estimates are labeled, uncertainty stays visible</span>
      </div>
    </div>
  );
}

// ----------------------------- landing --------------------------------------
function Landing({ onStart, onSample }) {
  return (
    <div style={{ paddingTop: 96 }}>
      <div className="fu" style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.active, letterSpacing: ".2em", marginBottom: 26 }}>
        A SILENT BODYGUARD FOR PROPERTY OWNERSHIP
      </div>
      <h1 className="fu" style={{ fontFamily: FONT_DISPLAY, fontWeight: 300, fontSize: 60, lineHeight: 1.04,
        margin: 0, letterSpacing: "-.01em", animationDelay: ".05s" }}>
        Never get blindsided<br />at renewal again.
      </h1>
      <p className="fu" style={{ fontSize: 18, color: C.mist, maxWidth: 560, lineHeight: 1.6, marginTop: 26, animationDelay: ".15s" }}>
        KAIROS quietly watches the operational conditions on your property that quietly become
        expensive — and tells you before renewal, not after.
      </p>
      <div className="fu" style={{ display: "flex", gap: 14, marginTop: 38, alignItems: "center", flexWrap: "wrap", animationDelay: ".25s" }}>
        <Btn onClick={onStart}>Run a free baseline scan</Btn>
        <Btn kind="ghost" onClick={onSample}>See a sample scan</Btn>
      </div>
      <div className="fu" style={{ marginTop: 14, color: C.fog, fontSize: 13, animationDelay: ".3s" }}>
        Not alerts. Not predictions. Just a quiet watch on what matters.
      </div>

      <div style={{ marginTop: 90, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
        {[
          ["Monitored continuously", "Not a one-time report. Conditions change; so does what we watch."],
          ["Surfaced before renewal", "The point is timing. We bring conditions forward while you can still act."],
          ["Organized for clarity", "Verified facts, estimates, and open questions kept separate — always."],
        ].map(([h, b], i) => (
          <div key={h} className="fu" style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10,
            padding: 22, animationDelay: `${.35 + i * .08}s` }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 8 }}>{h}</div>
            <div style={{ color: C.fog, fontSize: 13.5, lineHeight: 1.6 }}>{b}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, padding: 22, border: `1px solid ${C.line}`, borderRadius: 10, background: C.panel }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, marginBottom: 10 }}>The whole promise, in one line</div>
        <div style={{ color: C.mist, fontSize: 15, lineHeight: 1.7 }}>
          Enter your property. We identify what deserves watching. We quietly monitor it. We tell you only when it matters.
        </div>
      </div>
    </div>
  );
}

// ----------------------------- address entry / from-values ------------------
function AddressEntry({ onRun, onRunLive, showValues, setShowValues, onLowFit }) {
  const [addr, setAddr] = useState("");
  return (
    <div style={{ paddingTop: 80, maxWidth: 620 }}>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 300, fontSize: 34, margin: 0 }}>Start with your property</h2>

      <div style={{ marginTop: 22, padding: 18, border: `1px solid ${C.line}`, borderRadius: 10, background: C.panel2 }}>
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
          <div style={{ color: C.active, marginTop: 2 }}>◆</div>
          <div style={{ color: C.mist, fontSize: 13.5, lineHeight: 1.65 }}>
            Your address is used only to run your scan against <b style={{ color: C.bone }}>public records</b> —
            the kind anyone can look up, organized in one place. No account or payment needed to see your scan.
            We don't sell your data. We don't share it. Ever.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="5445 Collins Ave, Miami Beach, FL 33140"
          style={{ width: "100%", background: C.panel, border: `1px solid ${C.line}`, color: C.bone,
            borderRadius: 8, padding: "15px 16px", fontSize: 15, fontFamily: FONT_BODY, outline: "none" }}
          onFocus={(e) => (e.target.style.borderColor = C.active)} onBlur={(e) => (e.target.style.borderColor = C.line)} />
        <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
          <Btn onClick={() => onRun(UNIT_1001)}>Run my baseline scan</Btn>
        </div>
        <div style={{ marginTop: 12, color: C.fog, fontSize: 12.5, lineHeight: 1.6 }}>
          During our alpha, your baseline runs against a verified reference coastal property so you can see
          exactly what KAIROS monitors — and how it stays disciplined, never fabricating a value. Your own
          property is verified during onboarding. To scan your real figures now, open From-values mode below.
        </div>
      </div>

      <div style={{ marginTop: 30, borderTop: `1px solid ${C.line}`, paddingTop: 20 }}>
        <Btn kind="quiet" onClick={() => setShowValues((s) => !s)}>
          {showValues ? "▾" : "▸"} From-values mode (paste verified figures)
        </Btn>
        {showValues && <FromValues onRun={onRun} />}
      </div>

      <div style={{ marginTop: 24 }}>
        <Btn kind="quiet" onClick={onLowFit} style={{ color: C.fog, fontSize: 12.5 }}>
          ▸ Run a low-fit property (see KAIROS decline to oversell)
        </Btn>
      </div>
    </div>
  );
}

// From-values: build verified attrs from pasted figures (no fabrication).
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
      <span style={{ color: C.mist, fontSize: 13 }}>{label}</span>{node}
    </div>
  );
  const inp = (k, ph) => <input value={f[k]} placeholder={ph} onChange={(e) => set(k, e.target.value)}
    style={{ background: C.ink, border: `1px solid ${C.line}`, color: C.bone, borderRadius: 6, padding: "6px 10px", fontSize: 13, width: 150, fontFamily: FONT_MONO }} />;
  const sel = (k, opts) => <select value={f[k]} onChange={(e) => set(k, e.target.value)}
    style={{ background: C.ink, border: `1px solid ${C.line}`, color: C.bone, borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: FONT_MONO }}>
    {opts.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
  const chk = (k) => <input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} style={{ accentColor: C.active, width: 16, height: 16 }} />;
  return (
    <div style={{ marginTop: 14, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 }}>
      <div style={{ color: C.fog, fontSize: 12, marginBottom: 8 }}>
        Enter only what you've verified. Anything left blank/unchecked stays <Tag t="NEEDED" />. Nothing is invented.
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
    </div>
  );
}

// ----------------------------- loading --------------------------------------
function Loading() {
  const steps = ["Locating your property in public records…", "Checking FEMA flood mapping…",
    "Reviewing assessment and ownership records…", "Identifying what deserves ongoing attention…"];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 520); return () => clearInterval(t); }, []);
  return (
    <div style={{ paddingTop: 150, maxWidth: 520 }}>
      <div style={{ position: "relative", height: 2, background: C.line, overflow: "hidden", borderRadius: 2, marginBottom: 40 }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: 40, width: "100%",
          background: `linear-gradient(${C.active}, transparent)`, animation: "scan 2.1s linear infinite" }} />
      </div>
      {steps.map((s, idx) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
          opacity: idx <= i ? 1 : 0.3, transition: "opacity .4s" }}>
          <StrengthDot s={idx < i ? "●" : idx === i ? "◐" : "—"} />
          <span style={{ color: idx <= i ? C.mist : C.fog, fontSize: 14.5 }}>{s}</span>
        </div>
      ))}
      <div style={{ marginTop: 30, color: C.fog, fontSize: 12.5, fontFamily: FONT_MONO }}>
        A careful watch takes a moment. That's the point.
      </div>
    </div>
  );
}

// ----------------------------- manual-needed + error states ----------------
function ManualNeeded({ onBack }) {
  return (
    <div style={{ paddingTop: 90, maxWidth: 560 }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.prov, letterSpacing: ".14em" }}>MANUAL VERIFICATION NEEDED</div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 300, fontSize: 30, margin: "8px 0 12px" }}>This one needs a hand-checked scan</h2>
      <p style={{ color: C.mist, fontSize: 15, lineHeight: 1.65 }}>
        Automated lookup couldn't reach this property's public records right now. KAIROS will not fabricate values —
        a person verifies the missing facts before your scan is completed. During our private alpha, scans like this
        are completed manually rather than instantly.
      </p>
      <p style={{ color: C.fog, fontSize: 13.5, lineHeight: 1.6, marginTop: 10 }}>
        Reach us at support@kairos.example to have yours run.
      </p>
      <div style={{ marginTop: 22 }}><Btn kind="ghost" onClick={onBack}>← Try another property</Btn></div>
    </div>
  );
}
function ErrorScreen({ message, onRetry, onBack }) {
  return (
    <div style={{ paddingTop: 90, maxWidth: 540 }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.alert, letterSpacing: ".14em" }}>COULDN'T COMPLETE THE SCAN</div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 300, fontSize: 30, margin: "8px 0 12px" }}>Let's try that again</h2>
      <p style={{ color: C.mist, fontSize: 15, lineHeight: 1.65 }}>{message || "Something interrupted the scan."}</p>
      <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
        <Btn onClick={onRetry}>Retry scan</Btn>
        <Btn kind="ghost" onClick={onBack}>← Back</Btn>
      </div>
    </div>
  );
}

// ----------------------------- scan results ---------------------------------
function Scan({ attrs, results, reco, onSubscribe, onBack }) {
  const active = results.filter((r) => r.strength === STR.ACTIVE);
  const prov = results.filter((r) => r.strength === STR.PROVISIONAL);
  const shown = [...active, ...prov];
  const needed = [...new Set(results.flatMap((r) => r.needed))];
  const facts = [
    ["Property type", attrs.property_type, attrs.property_type_prov],
    ["Owner type", attrs.ownership_type, attrs.ownership_type_prov],
    ["Year built", attrs.year_built, attrs.year_built_prov],
    ["Flood zone", attrs.flood_zone, attrs.flood_zone_prov],
    ["BFE (ft)", attrs.bfe_ft, attrs.flood_zone_prov],
    ["Use type", attrs.use_type, attrs.use_type_prov],
    ["Entity status", attrs.entity_status, attrs.entity_status_prov],
  ].filter(([, v]) => v != null && v !== "");

  return (
    <div style={{ paddingTop: 70 }}>
      <Btn kind="quiet" onClick={onBack} style={{ marginBottom: 10 }}>← back</Btn>
      <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.active, letterSpacing: ".14em" }}>BASELINE SCAN</div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 300, fontSize: 34, margin: "6px 0 4px" }}>{attrs.nickname}</h2>
      <div style={{ color: C.mist, fontSize: 15 }}>
        {shown.length === 0
          ? "We found little that warrants ongoing monitoring here."
          : <>We found <b style={{ color: C.bone }}>{shown.length}</b> operational {shown.length === 1 ? "condition" : "conditions"} worth watching on this property.</>}
      </div>

      {facts.length > 0 && (
        <div style={{ marginTop: 26, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.line}`, fontFamily: FONT_MONO, fontSize: 11, color: C.fog, letterSpacing: ".1em" }}>VERIFIED FIELDS</div>
          {facts.map(([k, v, p]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 18px", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ color: C.fog, fontSize: 13 }}>{k}</span>
              <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: C.bone, fontSize: 13.5, fontFamily: FONT_MONO }}>{String(v)}</span><Tag t={p} />
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 30, fontFamily: FONT_MONO, fontSize: 12, color: C.fog, letterSpacing: ".1em" }}>
        WHAT DESERVES WATCHING — {active.length} ACTIVE · {prov.length} PROVISIONAL
      </div>
      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {shown.map((r) => <CategoryCard key={r.key} r={r} />)}
      </div>

      {needed.length > 0 && (
        <div style={{ marginTop: 22, padding: 18, border: `1px dashed ${C.alert}`, borderRadius: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <Tag t="NEEDED" /><span style={{ color: C.mist, fontSize: 13 }}>To sharpen these watch points (we never fill these with guesses):</span>
          </div>
          {needed.map((n) => <div key={n} style={{ color: C.fog, fontSize: 13, padding: "3px 0" }}>— {n}</div>)}
        </div>
      )}

      <div style={{ marginTop: 30, background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, marginBottom: 6 }}>Recommendation</div>
        <div style={{ color: C.mist, fontSize: 14.5, lineHeight: 1.6, marginBottom: 18 }}>{reco?.line}</div>
        {reco?.tier === "none" ? (
          <Btn kind="ghost" onClick={onBack}>Keep my free scan</Btn>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Btn onClick={onSubscribe}>Keep KAIROS watching this property</Btn>
            <Btn kind="ghost" onClick={onBack}>Just keep my free scan for now</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
function CategoryCard({ r }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18, cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <StrengthDot s={r.strength} />
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, flex: 1 }}>{r.name}</span>
        {r.alert_eligible && <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.fog }}>alert-eligible</span>}
        <span style={{ color: C.fog }}>{open ? "−" : "+"}</span>
      </div>
      <div style={{ color: C.mist, fontSize: 13.5, lineHeight: 1.6, marginTop: 8 }}>{r.user_explanation}</div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          <Line label="Why" v={r.reasons.join(" ")} />
          <Line label="So what, operationally" v={r.so_what} accent />
          {r.needed.length > 0 && <Line label="Needed" v={r.needed.join("; ")} />}
        </div>
      )}
    </div>
  );
}
const Line = ({ label, v, accent }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: accent ? C.active : C.fog, letterSpacing: ".08em", marginBottom: 3 }}>{label.toUpperCase()}</div>
    <div style={{ color: C.mist, fontSize: 13.5, lineHeight: 1.55 }}>{v}</div>
  </div>
);

// ----------------------------- subscribe ------------------------------------
function Subscribe({ reco, onChoose, onSkip }) {
  const suggested = reco?.tier === "light" ? "starter" : "starter";
  return (
    <div style={{ paddingTop: 70 }}>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 300, fontSize: 32, margin: 0 }}>Keep the watch running</h2>
      <p style={{ color: C.mist, fontSize: 15, maxWidth: 560, lineHeight: 1.6 }}>
        Most months, most conditions stay stable — and we tell you so. You're paying for the month one doesn't.
        Cancel anytime.
      </p>
      <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
        {PLANS.map((pl) => (
          <div key={pl.id} style={{ background: pl.id === suggested ? C.panel2 : C.panel,
            border: `1px solid ${pl.id === suggested ? C.active : C.line}`, borderRadius: 12, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22 }}>{pl.name}</span>
              {pl.id === suggested && <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: C.active }}>SUGGESTED</span>}
            </div>
            <div style={{ color: C.fog, fontSize: 13, margin: "4px 0 14px" }}>{pl.range}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, marginBottom: 16 }}>
              {pl.price ? <>${pl.price}<span style={{ fontSize: 14, color: C.fog }}>/mo</span></> : <span style={{ fontSize: 18, color: C.mist }}>Custom</span>}
            </div>
            <Btn kind={pl.id === suggested ? "primary" : "ghost"} onClick={() => onChoose(pl)} style={{ width: "100%" }}>
              {pl.price ? "Choose" : "Contact us"}
            </Btn>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18 }}><Btn kind="quiet" onClick={onSkip}>← back to my scan</Btn></div>
    </div>
  );
}

// ----------------------------- activation (real backend) -------------------
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
    // No real Stripe session means the backend is in mock mode (Stripe keys not
    // loaded). We do NOT silently activate — surface it honestly.
    setBusy(false);
    setErr("Live billing isn't enabled yet. Please try again shortly, or contact support@kairos.example.");
  };

  return (
    <div style={{ paddingTop: 80, maxWidth: 460 }}>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 300, fontSize: 30, margin: 0 }}>Start your watch</h2>
      <div style={{ color: C.mist, fontSize: 14, marginTop: 6 }}>
        {plan?.name} · {plan?.price ? `$${plan.price}/mo` : "custom"} · cancel anytime
      </div>
      <div style={{ marginTop: 22, display: "grid", gap: 12 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email for your account + monthly digest"
          style={inpStyle} onFocus={(e) => (e.target.style.borderColor = C.active)} onBlur={(e) => (e.target.style.borderColor = C.line)} />
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.fog, lineHeight: 1.6 }}>
          You'll continue to secure checkout (Stripe) to start your subscription. Cancel anytime.
        </div>
        {err && <div style={{ color: C.alert, fontSize: 13, lineHeight: 1.5 }}>{err}</div>}
        <Btn onClick={activate} disabled={!ok || busy}>{busy ? "Activating…" : "Activate monitoring"}</Btn>
        <Btn kind="quiet" onClick={onBack}>← back</Btn>
      </div>
    </div>
  );
}
const inpStyle = { width: "100%", background: C.panel, border: `1px solid ${C.line}`, color: C.bone,
  borderRadius: 8, padding: "13px 15px", fontSize: 14, fontFamily: FONT_BODY, outline: "none" };

// ----------------------------- onboarding -----------------------------------
function Onboard({ account, onGo }) {
  return (
    <div style={{ paddingTop: 110, maxWidth: 540, textAlign: "center", margin: "0 auto" }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.active, margin: "0 auto 24px", boxShadow: `0 0 22px ${C.active}` }} />
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 300, fontSize: 30, margin: 0 }}>The watch is on.</h2>
      <p style={{ color: C.mist, fontSize: 15, lineHeight: 1.65, marginTop: 14 }}>
        KAIROS is now monitoring <b style={{ color: C.bone }}>{account.property}</b>. Your first digest is
        ready below — so you can feel the work immediately, not in thirty days. After that, you'll hear from us
        monthly, and the moment anything verified changes.
      </p>
      <div style={{ marginTop: 26 }}><Btn onClick={onGo}>See my first digest</Btn></div>
    </div>
  );
}

// ----------------------------- account shell + digest -----------------------
function Account({ account, setAccount, attrs, results }) {
  const [tab, setTab] = useState("digest");
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
    <div style={{ paddingTop: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.active, letterSpacing: ".14em" }}>UNDER WATCH</div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 300, fontSize: 30, margin: "4px 0 0" }}>{account.property}</h2>
          <div style={{ color: C.fog, fontSize: 13, marginTop: 4 }}>{account.plan?.name} · active since {account.since}</div>
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: C.fog, letterSpacing: ".04em" }}>Next digest · monthly</div>
      </div>

      <div style={{ display: "flex", gap: 18, margin: "26px 0 18px", borderBottom: `1px solid ${C.line}` }}>
        {["digest", "archive", "account"].map((t) => (
          <div key={t} onClick={() => setTab(t)} style={{ paddingBottom: 12, cursor: "pointer",
            color: tab === t ? C.bone : C.fog, borderBottom: tab === t ? `2px solid ${C.active}` : "2px solid transparent",
            fontSize: 14, textTransform: "capitalize" }}>{t === "archive" ? "Digest archive" : t}</div>
        ))}
      </div>

      {tab === "digest" && <DigestView d={account.digests[0]} />}
      {tab === "archive" && (
        <div style={{ display: "grid", gap: 10 }}>
          {account.digests.map((d) => (
            <div key={d.n} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 9, padding: 16, display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.mist }}>{d.month}</span>
              <span style={{ color: C.fog, fontSize: 13, fontFamily: FONT_MONO }}>{d.stable} stable · {d.attention} attention</span>
            </div>
          ))}
        </div>
      )}
      {tab === "account" && (
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22, maxWidth: 460 }}>
          {[["Email", account.email], ["Plan", account.plan?.name], ["Status", account.status], ["Property", account.property]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ color: C.fog, fontSize: 13 }}>{k}</span><span style={{ color: C.bone, fontSize: 13.5 }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <Btn kind="ghost" onClick={cancelWatch} disabled={cancelBusy || account.status === "cancelled"}>
              {cancelBusy ? "Cancelling…" : account.status === "cancelled" ? "Cancelled" : "Cancel monitoring"}
            </Btn>
            {cancelErr && <div style={{ color: C.alert, fontSize: 12.5, marginTop: 8 }}>{cancelErr}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// Build a digest from the live results. Month 1 restates baseline; later months
// model an honest "mostly stable" cadence with one optional change/escalation.
function buildDigest(attrs, results, n) {
  const active = results.filter((r) => r.strength === STR.ACTIVE || r.strength === STR.PROVISIONAL);
  const monthDate = new Date(); monthDate.setMonth(monthDate.getMonth() + (n - 1));
  const month = monthDate.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  // Month 1: baseline. Later: one category may show a change (deterministic by n).
  const changeIdx = n === 1 ? -1 : (n % active.length);
  const rows = active.map((r, i) => {
    let status = "No change";
    if (n > 1 && i === changeIdx && r.alert_eligible) status = "Change detected";
    else if (r.needed.length && i === ((n + 1) % active.length)) status = "Awaiting your input";
    return { name: r.name, status, line: r.user_explanation, alert: r.alert_eligible };
  });
  const attention = rows.filter((x) => x.status !== "No change").length;
  return { n, month, rows, stable: rows.length - attention, attention,
    checked: active.length,
    escalation: rows.find((x) => x.status === "Change detected" && x.alert) || null };
}

function DigestView({ d }) {
  if (!d) return null;
  const statusColor = { "No change": C.active, "Change detected": C.alert, "Awaiting your input": C.prov };
  const statusDot = { "No change": "✓", "Change detected": "⚠", "Awaiting your input": "◐" };
  return (
    <div className="fu">
      {/* escalation banner — calm, never red */}
      {d.escalation && (
        <div style={{ background: C.panel2, border: `1px solid ${C.alert}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: C.alert }}>⚠</span>
            <span style={{ color: C.bone, fontSize: 14 }}>
              One condition changed this month and was sent to you when it happened — not held for the digest: <b>{d.escalation.name}</b>.
            </span>
          </div>
        </div>
      )}

      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.fog, letterSpacing: ".12em" }}>MONITORING DIGEST · {d.month.toUpperCase()}</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, margin: "10px 0 4px", lineHeight: 1.4 }}>
          KAIROS checked {d.checked} operational conditions this month.
        </div>
        <div style={{ color: C.mist, fontSize: 15 }}>
          {d.stable} remain stable.{d.attention > 0 ? ` ${d.attention} ${d.attention === 1 ? "needs" : "need"} your attention.` : " Nothing needs action."}
        </div>

        <div style={{ marginTop: 22, display: "grid", gap: 8 }}>
          {d.rows.map((row) => (
            <div key={row.name} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ color: statusColor[row.status], marginTop: 1 }}>{statusDot[row.status]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <span style={{ color: C.bone, fontSize: 14.5 }}>{row.name}</span>
                  <span style={{ color: statusColor[row.status], fontSize: 12, fontFamily: FONT_MONO, whiteSpace: "nowrap" }}>{row.status}</span>
                </div>
                <div style={{ color: C.fog, fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>{row.line}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, padding: 14, background: C.ink, borderRadius: 8, color: C.fog, fontSize: 12.5, lineHeight: 1.6 }}>
          <b style={{ color: C.mist }}>What KAIROS watched this month:</b> every condition above was checked against
          public records — including the quiet ones. Watching the quiet ones is the job. A condition only reaches you
          immediately if a verified fact verifiably changes; everything else waits for this calm monthly note.
        </div>
      </div>
    </div>
  );
}
