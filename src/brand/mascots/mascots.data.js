// =============================================================================
// KAIROS — MASCOT SYSTEM · SINGLE SOURCE OF TRUTH  (APPROVED · LOCKED)
// Master visual reference: mascots_overview.png
// This is a permanent identity / memory system — NOT decorative art. Every surface
// (website, dashboard, emails, notifications, alerts, AI responses, reports, mobile,
// onboarding, future agent UIs) must reference THIS file. No hardcoded icons.
// Add subjects only by EXTENDING this list — never replace an existing mascot.
// =============================================================================

// Where the figure PNGs live when served (override via <Mascot basePath="...">).
export const MASCOT_BASE_PATH = "/brand/mascots/";

export const MASCOTS = [
  { key:"scan",       name:"Property Scan",      color:"#4c8df6", deep:"#2f6fd0", bg:"#eaf2ff",
    shape:"Ring scanner",            object:"Magnifier",          meaning:"Investigate / detect / discover",
    behavior:"Rotating scan motion", emotion:["Investigative","Discover","Detect"],     asset:"mascot_scan.png" },
  { key:"ownership",  name:"Ownership Risk",      color:"#f7941d", deep:"#d9730b", bg:"#fff1e0",
    shape:"Document with folded corner", object:"Warning shield", meaning:"Ownership / title / deed risk",
    behavior:"Caution pulse",        emotion:["Cautionary","Verify","Protect"],         asset:"mascot_ownership.png" },
  { key:"flood",      name:"Flood / Climate",     color:"#19b6b6", deep:"#0f8a8a", bg:"#e3f8f8",
    shape:"Water drop / wave body",  object:"Water shield",       meaning:"Climate / water / environmental risk",
    behavior:"Wave motion",          emotion:["Protective","Water","Climate"],          asset:"mascot_flood.png" },
  { key:"legal",      name:"Legal / Compliance",  color:"#9b72f2", deep:"#6c43c0", bg:"#f1ebff",
    shape:"Hexagon seal",            object:"Document + seal",     meaning:"Rules / legal / compliance",
    behavior:"Subtle glow",          emotion:["Precise","Official","Trustworthy"],      asset:"mascot_legal.png" },
  { key:"monitoring", name:"Monitoring",          color:"#2fb457", deep:"#1f8e41", bg:"#e9f9ee",
    shape:"Shield body",             object:"Radar system",        meaning:"Watch / protect / monitor",
    behavior:"Radar sweep",          emotion:["Watchful","Calm","Continuous"],          asset:"mascot_monitoring.png" },
  { key:"alerts",     name:"Alerts",              color:"#ff6f51", deep:"#e0492f", bg:"#fff0ec",
    shape:"Starburst signal shape",  object:"Bell",                meaning:"Immediate attention",
    behavior:"Signal pulse",         emotion:["Urgent","Immediate","Attention"],        asset:"mascot_alerts.png" },
  { key:"advisor",    name:"AI Advisor",          color:"#8fb6ff", deep:"#5b8def", bg:"#f4f8ff",
    shape:"Orbital intelligent core", object:"Gear + satellites",  meaning:"Guidance / recommendations",
    behavior:"Orbit movement",       emotion:["Intelligent","Guidance","Insight"],      asset:"mascot_advisor.png" },
  { key:"reports",    name:"Reports / Digest",    color:"#ffc83c", deep:"#d9a514", bg:"#fff7e0",
    shape:"Stacked cards / pages",   object:"Charts / report",     meaning:"Summary / organization",
    behavior:"Stack movement",       emotion:["Organized","Summary","Clarity"],         asset:"mascot_reports.png" },
];

export const MASCOT_BY_KEY = Object.fromEntries(MASCOTS.map((m) => [m.key, m]));
export const MASCOT_TYPES = MASCOTS.map((m) => m.key);

// Frozen rules — see MASCOT_SYSTEM.md for the full governance spec.
export const MASCOT_CONTRACT = {
  status: "APPROVED · LOCKED",
  masterReference: "mascots_overview.png",
  style: ["soft premium 3D","adult SaaS feel","friendly not childish","rounded & memorable",
          "expressive faces","object integrated into figure","no background scenery",
          "clean card presentation","subtle motion only"],
  recognition: ["color","silhouette","expression","object","behavior"], // recognizable without reading text
  rule: "Extend only — never replace, restyle, or swap an existing subject's mascot.",
};

export default MASCOTS;
