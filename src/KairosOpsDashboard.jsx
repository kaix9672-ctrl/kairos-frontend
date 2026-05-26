// KairosOpsDashboard.jsx — internal KAIROS OS view (TEST / internal preview).
// Self-gating: renders ONLY when the URL hash is #kairos-ops. On open it fetches
// /internal/os/{inbox,tasks,events} from the backend (VITE_API_BASE); shows a "live · test"
// badge when the backend answers, and falls back to built-in MOCK data with a "mock" badge
// when the backend is unavailable. Read-only GETs only — no keys, no Stripe, no payments,
// no production DB, no live sends. Errors are swallowed into the mock fallback (no console noise).
import { useEffect, useState, useCallback } from "react";

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || "";
const KINDS = ["inbox", "tasks", "events"];

// Built-in fallback used only when the backend can't be reached.
const MOCK = {
  inbox: [
    { id: "in_m1", from: "stripe (mock)", subject: "checkout.session.completed — MOCK", status: "unread", ts: 0 },
    { id: "in_m2", from: "resend (mock)", subject: "digest email (mock, not sent)", status: "read", ts: 0 },
  ],
  tasks: [
    { id: "t_m1", title: "Wire Postgres adapter (mock)", lane: "BUILD", status: "in_progress", owner: "backend" },
    { id: "t_m2", title: "Stripe TEST checkout (mock)", lane: "BRIDGE", status: "todo", owner: "founder" },
  ],
  events: [
    { id: "e_m1", type: "scan", detail: "from-values scan (mock)", ts: 0 },
    { id: "e_m2", type: "digest", detail: "first digest (mock)", ts: 0 },
  ],
};

const CSS = `
.kos{position:fixed;inset:0;z-index:9999;overflow:auto;color:#e8eef3;font-family:'IBM Plex Sans',system-ui,sans-serif;
  background:radial-gradient(1200px 600px at 80% -10%,rgba(94,234,212,.06),transparent 60%),radial-gradient(900px 500px at -10% 10%,rgba(124,199,255,.05),transparent 55%),#0a0e13}
.kos-wrap{max-width:1100px;margin:0 auto;padding:28px 22px 60px}
.kos-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:22px}
.kos-title{font-size:26px;font-weight:700;letter-spacing:-.01em}
.kos-os{color:#5eead4}
.kos-sub{font-size:12px;color:#7e8a99;font-weight:500;margin-left:8px}
.kos-actions{display:flex;align-items:center;gap:10px}
.kos-badge{font-size:12px;font-weight:600;padding:5px 11px;border-radius:999px;border:1px solid transparent}
.kos-badge.live{color:#5eead4;background:rgba(94,234,212,.15);border-color:rgba(94,234,212,.4)}
.kos-badge.mock{color:#f4c560;background:rgba(244,197,96,.12);border-color:rgba(244,197,96,.35)}
.kos-badge.load{color:#9fb0c0;background:rgba(159,176,192,.1)}
.kos-refresh,.kos-close{background:#141b24;color:#cdd8e3;border:1px solid #233040;border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;font-family:inherit}
.kos-refresh:hover,.kos-close:hover{border-color:#37506b}
.kos-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.kos-card{background:#0e151d;border:1px solid #1c2733;border-radius:14px;padding:16px}
.kos-h{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9fb0c0;margin-bottom:12px;display:flex;gap:8px;align-items:center}
.kos-n{background:#1c2733;color:#cdd8e3;border-radius:999px;font-size:11px;padding:1px 8px}
.kos-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #161f2a}
.kos-row-main{display:flex;flex-direction:column;gap:2px;min-width:0}
.kos-row-main b{font-size:13.5px;font-weight:600;color:#e8eef3}
.kos-dim{font-size:12px;color:#7e8a99;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kos-pill{font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap}
.kos-pill.ok{color:#5eead4;background:rgba(94,234,212,.12)}
.kos-pill.warn{color:#f4c560;background:rgba(244,197,96,.12)}
.kos-pill.bad{color:#ff8a8a;background:rgba(255,138,138,.12)}
.kos-foot{margin-top:20px;font-size:12px;color:#6b7888;text-align:center}
`;

export default function KairosOpsDashboard({ gate = true }) {
  const [shown, setShown] = useState(
    () => !gate || (typeof window !== "undefined" && window.location.hash.replace(/^#/, "") === "kairos-ops")
  );
  const [data, setData] = useState(MOCK);
  const [source, setSource] = useState("loading"); // "loading" | "live·test" | "mock"

  useEffect(() => {
    // initial value is set by the useState initializer above; the listener handles changes
    const check = () => setShown(!gate || window.location.hash.replace(/^#/, "") === "kairos-ops");
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [gate]);

  const load = useCallback(async () => {
    // no synchronous setState here (initial state is "loading"); updates happen post-await
    try {
      const entries = await Promise.all(
        KINDS.map(async (k) => {
          const res = await fetch(`${API_BASE}/internal/os/${k}`, { headers: { accept: "application/json" } });
          if (!res.ok) throw new Error(`${k} HTTP ${res.status}`);
          const j = await res.json();
          return [k, Array.isArray(j.items) ? j.items : []];
        })
      );
      setData(Object.fromEntries(entries));
      setSource("live·test");
    } catch {
      setData(MOCK); // backend offline -> safe mock fallback (no console error)
      setSource("mock");
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: fetch ops data when the panel opens
  useEffect(() => { if (shown) load(); }, [shown, load]);

  if (gate && !shown) return null;

  const live = source === "live·test";
  return (
    <div className="kos">
      <style>{CSS}</style>
      <div className="kos-wrap">
        <header className="kos-top">
          <div className="kos-title">
            KAIROS <span className="kos-os">OS</span>
            <span className="kos-sub">internal · TEST preview</span>
          </div>
          <div className="kos-actions">
            <span className={"kos-badge " + (source === "loading" ? "load" : live ? "live" : "mock")}>
              {source === "loading" ? "connecting…" : live ? "live · test" : "mock (backend offline)"}
            </span>
            <button className="kos-refresh" onClick={load}>↻ refresh</button>
            <button className="kos-close" onClick={() => { window.location.hash = ""; }}>✕ close</button>
          </div>
        </header>

        <section className="kos-grid">
          <div className="kos-card">
            <div className="kos-h">Inbox <span className="kos-n">{data.inbox.length}</span></div>
            {data.inbox.map((m) => (
              <div className="kos-row" key={m.id}>
                <div className="kos-row-main"><b>{m.from}</b><span className="kos-dim">{m.subject}</span></div>
                <span className={"kos-pill " + (m.status === "unread" ? "warn" : "ok")}>{m.status}</span>
              </div>
            ))}
          </div>

          <div className="kos-card">
            <div className="kos-h">Tasks <span className="kos-n">{data.tasks.length}</span></div>
            {data.tasks.map((t) => (
              <div className="kos-row" key={t.id}>
                <div className="kos-row-main"><b>{t.title}</b><span className="kos-dim">{t.lane} · {t.owner}</span></div>
                <span className={"kos-pill " + (t.status === "done" ? "ok" : t.status === "blocked" ? "bad" : "warn")}>{t.status}</span>
              </div>
            ))}
          </div>

          <div className="kos-card">
            <div className="kos-h">Events <span className="kos-n">{data.events.length}</span></div>
            {data.events.map((e) => (
              <div className="kos-row" key={e.id}>
                <div className="kos-row-main"><b>{e.type}</b><span className="kos-dim">{e.detail}</span></div>
              </div>
            ))}
          </div>
        </section>

        <footer className="kos-foot">
          {live
            ? `Live TEST backend at ${API_BASE || "(same origin)"}/internal/os/* — in-memory fixtures, no production data.`
            : "Backend unavailable — showing built-in mock data. No keys, no Stripe, no live sends."}
        </footer>
      </div>
    </div>
  );
}
