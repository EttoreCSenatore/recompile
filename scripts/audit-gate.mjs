// Fails on high/critical npm advisories, except the explicitly allowed ones below.
// Usage: node ../scripts/audit-gate.mjs [--omit=dev]   (run inside game/ or website/)
import { spawnSync } from 'node:child_process';

// Each exception needs a reason and a removal condition.
const ALLOWED = {
  // picomatch ReDoS: affects every release (<= 4.0.7), no patched version exists, and it is only
  // reachable through build/dev tooling (vite, docusaurus). Remove once picomatch ships a fix.
  'GHSA-fc5q-39xc-vjpf': 'picomatch ReDoS, no patched version',
};

const r = spawnSync('npm', ['audit', '--json', ...process.argv.slice(2)], { encoding: 'utf8', shell: process.platform === 'win32' });
let report;
try {
  report = JSON.parse(r.stdout);
} catch {
  console.error('audit-gate: could not parse npm audit output\n', r.stdout, r.stderr);
  process.exit(1);
}
if (report.error) {
  console.error('audit-gate: npm audit failed:', report.error.summary ?? report.error);
  process.exit(1);
}

const bad = new Map();
for (const v of Object.values(report.vulnerabilities ?? {})) {
  for (const via of v.via) {
    if (typeof via === 'string' || !['high', 'critical'].includes(via.severity)) continue;
    const id = via.url?.split('/').pop() ?? String(via.source);
    if (id in ALLOWED) continue;
    bad.set(id, `${v.name}: ${via.title} (${via.url})`);
  }
}
for (const id of Object.keys(ALLOWED)) console.log(`audit-gate: allowed ${id} (${ALLOWED[id]})`);
if (bad.size) {
  console.error('audit-gate: unallowed high/critical advisories:');
  for (const line of bad.values()) console.error(' -', line);
  process.exit(1);
}
console.log('audit-gate: ok');
