// Summarises Lighthouse CI reports in .lighthouseci as the median of all runs: node scripts/perf-summary.mjs
import { readdirSync, readFileSync } from "node:fs";
const dir = ".lighthouseci";
const runs = readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f)).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
if (!runs.length) { console.error("no reports found"); process.exit(1); }
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const audit = (id) => med(runs.map((r) => r.audits[id].numericValue));
const cat = (id) => med(runs.map((r) => r.categories[id].score));
console.log(JSON.stringify({
  runs: runs.length, lighthouse: runs[0].lighthouseVersion,
  performance: cat("performance"), accessibility: cat("accessibility"), bestPractices: cat("best-practices"),
  fcpMs: Math.round(audit("first-contentful-paint")), lcpMs: Math.round(audit("largest-contentful-paint")),
  tbtMs: Math.round(audit("total-blocking-time")), cls: +audit("cumulative-layout-shift").toFixed(4),
}));
