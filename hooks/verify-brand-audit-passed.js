#!/usr/bin/env node
/**
 * Hook: verify-brand-audit-passed.js
 * Prevents task completion if brand audit contains FAIL entries
 * Exit code 2 = block task completion
 */

const fs = require('fs');
const path = require('path');

// Read the audit report
const reportPath = path.join(process.cwd(), 'AUDIT_REPORT.md');

if (!fs.existsSync(reportPath)) {
  console.error('ERROR: AUDIT_REPORT.md not found. Brand audit must be completed first.');
  process.exit(2);
}

const report = fs.readFileSync(reportPath, 'utf8');

// Check for FAIL entries
const hasFail = report.includes('FAIL');
const hasPass = report.includes('PASS');

if (hasFail && !hasPass) {
  console.error('BRAND AUDIT FAILED: Design contains brand violations. Fix required before proceeding.');
  console.error('Check AUDIT_REPORT.md for details.');
  process.exit(2);
}

if (hasFail) {
  console.error('BRAND AUDIT INCOMPLETE: Some checks failed. Fix all FAIL entries before proceeding.');
  console.error('Check AUDIT_REPORT.md for details.');
  process.exit(2);
}

console.log('BRAND AUDIT PASSED: All checks passed. Proceeding...');
process.exit(0);
