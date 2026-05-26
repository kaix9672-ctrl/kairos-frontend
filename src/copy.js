// =============================================================================
// KAIROS — COPY SYSTEM (single source of truth for product language)
// -----------------------------------------------------------------------------
// Stable, reusable copy so visual redesigns NEVER overwrite strong founder
// language. Edit copy HERE, not inside components. Categories below are the
// contract; add to them, don't delete the founder's words.
// =============================================================================

export const COPY = {
  // ---- mission --------------------------------------------------------------
  mission:
    "KAIROS quietly connects the hidden dots behind your investments and helps you maximize their potential.",

  // ---- homepage hero --------------------------------------------------------
  hero: {
    badge: "Your investments, quietly watched",
    headline: "You already have enough notifications. KAIROS does the watching for you.",
    sub:
      "KAIROS connects the hidden dots behind your property — turning scattered public records into a " +
      "calm, friendly picture of what's worth watching, and quietly keeping an eye on it so you don't have to. " +
      "Every check is progress. Every quiet month is a win.",
    ctaPrimary: "🚀 Run my free scan",
    ctaSecondary: "See a sample",
    footnote: "Not alerts. Not predictions. Just a quiet watch on what matters.",
  },

  // ---- founder statements (preserve verbatim) ------------------------------
  founder: {
    quote:
      "As a founder, I was always curious about the hidden mechanisms that prevented me from connecting " +
      "the dots and maximizing my own profit. I built KAIROS to help connect those dots and help maximize " +
      "the potential of people’s investments.",
    attribution: "— Kai, founder of KAIROS",
  },

  // ---- product philosophy ---------------------------------------------------
  philosophy: [
    ["🔍", "Connect the dots", "We turn scattered public records into one clear picture of what's worth watching — no noise."],
    ["🛡️", "We keep watch", "KAIROS quietly monitors your investment every month so you don't have to."],
    ["🎉", "Calm is the product", "Most months everything's fine — and we say so. That quiet is what you're paying for."],
  ],
  oneLiner:
    "Tell us your property → we connect the dots → we quietly keep watch → you only hear from us when it matters.",

  // ---- trust language -------------------------------------------------------
  trust: {
    promise:
      "We only use your address to check public records — the kind anyone can look up, neatly in one place. " +
      "No account or payment needed to see your scan. We never sell or share your data. Ever.",
    footer:
      "We don't predict the future. We don't place insurance. We don't sell your data. We don't guarantee savings.",
    footerSmall: "kai@kairosaiagent.com · founder-led · estimates are labeled, uncertainty stays visible",
    honesty: "KAIROS helps you act early — we don't guarantee specific savings, and we never invent numbers.",
  },

  // ---- value propositions ---------------------------------------------------
  value: {
    savingsHeader: (n) => `${n} ${n === 1 ? "way" : "ways"} KAIROS is protecting your investment`,
    savingsSub: "Each is a hidden surprise we aim to catch early — before it turns into a bill.",
  },

  // ---- retention / dashboard mood ------------------------------------------
  retention: {
    allClear: "Nothing urgent today. That's a good thing.",
    allClearSub: "KAIROS connected the dots and nothing needs you right now. Enjoy the calm 💚",
    attention: (n) => `${n} thing${n === 1 ? "" : "s"} to glance at`,
    attentionSub: "Pop into your Digest to see what KAIROS caught.",
    streak: (n) => `${n}-month calm streak`,
    winsTitle: "Your wins so far 🏆",
    onWatch: "🟢 On watch",
    coverageNote: (n) =>
      n > 0
        ? `Add ${n} more verified ${n === 1 ? "fact" : "facts"} to sharpen your coverage.`
        : "Your coverage is fully sharpened. Nice work! 💚",
  },

  // ---- dashboard microcopy --------------------------------------------------
  dashboard: {
    protectionScore: "Protection score",
    protectionScoreSub: "How sharp your watch coverage is right now (based on what's verified vs. still open).",
    statsProtected: "things protected",
    statsChecked: "conditions checked",
    statsVerified: "facts verified",
  },

  // ---- email copy (for transactional templates; used by backend later) ------
  email: {
    welcomeSubject: "KAIROS is now watching your property 🛡️",
    digestSubjectCalm: "Your KAIROS month: all quiet 💚",
    digestSubjectHeadsUp: "Your KAIROS month: one thing to glance at",
    signoff: "— KAIROS, quietly on watch",
  },
};

export default COPY;
