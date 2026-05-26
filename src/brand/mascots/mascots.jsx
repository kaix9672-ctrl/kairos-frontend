// =============================================================================
// KAIROS — MASCOT COMPONENTS.  Single source of truth: ./mascots.data.js
// Usage:  <Mascot type="scan" />   <Mascot type="alerts" size={40} />
// Every surface renders mascots through these components — never hardcode an icon.
// Figures are the APPROVED master set (mascots_overview.png), served from
// MASCOT_BASE_PATH; override per-app with <Mascot basePath="/your/path/">.
// =============================================================================
import { MASCOTS, MASCOT_BY_KEY, MASCOT_TYPES, MASCOT_BASE_PATH, MASCOT_CONTRACT } from "./mascots.data.js";

export { MASCOTS, MASCOT_BY_KEY, MASCOT_TYPES, MASCOT_BASE_PATH, MASCOT_CONTRACT };

// The figure for a subject. type = one of MASCOT_TYPES.
// `motion` adds the subtle idle animation from mascots.css (import that file once).
export function Mascot({ type, size = 108, basePath = MASCOT_BASE_PATH, title, motion = true, style }) {
  const m = MASCOT_BY_KEY[type];
  if (!m) return null;
  const img = (
    <img
      src={basePath + m.asset}
      width={size}
      height={size}
      alt={title || `${m.name} — ${m.meaning}`}
      style={{ objectFit: "contain", display: "block" }}
    />
  );
  if (!motion) return <span style={{ display: "inline-block", lineHeight: 0, ...style }}>{img}</span>;
  return (
    <span className={`kx-m kx-m--${type}`} style={{ "--kx": m.deep, ...style }}>{img}</span>
  );
}

// Reference-style subject card (number chip · title · emotion words · figure · behavior caption).
export function MascotCard({ type, index, basePath = MASCOT_BASE_PATH }) {
  const m = MASCOT_BY_KEY[type];
  if (!m) return null;
  const n = (index ?? MASCOT_TYPES.indexOf(type)) + 1;
  return (
    <div style={{ background: "#fff", border: "1px solid #eef2f9", borderRadius: 22, padding: 16, boxShadow: "0 10px 28px rgba(28,68,128,.08)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, color: "#fff", fontWeight: 900, background: m.deep, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>{m.name}</div>
          <div style={{ fontSize: 12.5, fontWeight: 800, marginTop: 2, color: m.deep }}>{m.emotion.join(" • ")}</div>
        </div>
      </div>
      <div style={{ borderRadius: 16, height: 200, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 10, background: `radial-gradient(circle at 50% 42%, ${m.bg}, #ffffff)` }}>
        <Mascot type={type} size={180} basePath={basePath} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontWeight: 800, fontSize: 13, color: m.deep }}>
        <span style={{ width: 12, height: 12, borderRadius: 5, background: m.deep }} />{m.behavior}
      </div>
    </div>
  );
}

export function MascotGrid({ basePath = MASCOT_BASE_PATH }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18 }}>
      {MASCOTS.map((m, i) => <MascotCard key={m.key} type={m.key} index={i} basePath={basePath} />)}
    </div>
  );
}

export default Mascot;
