#!/usr/bin/env node
/**
 * Hook: verify-wcag-aa.js
 * Prevents task completion if WCAG AA audit contains failures
 * Exit code 2 = block task completion
 */

const fs = require('fs');
const path = require('path');

// Read the accessibility report
const reportPath = path.join(process.cwd(), 'A11Y_REPORT.md');

if (!fs.existsSync(reportPath)) {
  console.error('ERROR: A11Y_REPORT.md not found. Accessibility audit must be completed first.');
  process.exit(2);
}

const report = fs.readFileSync(reportPath, 'utf8');

// WCAG AA required criteria (simplified check)
const wcagCriteria = [
  '1.1.1', // Non-text Content
  '1.2.1', // Audio-only and Video-only
  '1.2.2', // Captions
  '1.2.3', // Audio Description
  '1.3.1', // Info and Relationships
  '1.3.2', // Meaningful Sequence
  '1.4.1', // Use of Color
  '1.4.2', // Audio Control
  '1.4.3', // Contrast (Minimum)
  '1.4.4', // Resize text
  '1.4.5', // Images of Text
  '2.1.1', // Keyboard
  '2.1.2', // No Keyboard Trap
  '2.4.1', // Bypass Blocks
  '2.4.2', // Page Titled
  '2.4.3', // Focus Order
  '2.4.4', // Link Purpose
  '2.4.5', // Multiple Ways
  '2.4.6', // Headings and Labels
  '2.4.7', // Focus Visible
  '2.5.1', // Pointer Gestures
  '2.5.2', // Pointer Cancellation
  '2.5.3', // Label in Name
  '3.1.1', // Language of Page
  '3.2.1', // On Focus
  '3.2.2', // On Input
  '3.3.1', // Error Identification
  '3.3.2', // Labels or Instructions
  '4.1.1', // Parsing
  '4.1.2'  // Name, Role, Value
];

// Check for any FAIL status on WCAG AA criteria
let hasCriticalFail = false;
for (const criterion of wcagCriteria) {
  const failPattern = new RegExp(` ${criterion}.*FAIL`, 'i');
  if (failPattern.test(report)) {
    console.error(`WCAG AA FAILED: Criterion ${criterion} not met.`);
    hasCriticalFail = true;
  }
}

// Also check for general FAIL in RTL-specific checks
const rtlChecks = ['RTL', 'bidirectional', 'Arabic', 'dir="rtl"'];
for (const check of rtlChecks) {
  const failPattern = new RegExp(`.*${check}.*FAIL`, 'i');
  if (failPattern.test(report)) {
    console.error(`RTL/Accessibility FAILED: ${check} check failed.`);
    hasCriticalFail = true;
  }
}

if (hasCriticalFail) {
  console.error('WCAG 2.2 AA AUDIT FAILED: Critical accessibility issues must be resolved.');
  console.error('Check A11Y_REPORT.md for details.');
  process.exit(2);
}

console.log('WCAG 2.2 AA AUDIT PASSED: All AA criteria met. Proceeding...');
process.exit(0);
