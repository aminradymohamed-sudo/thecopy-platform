#!/usr/bin/env node
/**
 * Hook: verify-bundle-complete.js
 * Ensures handoff bundle is complete before idle
 * Exit code 2 = prevent idle (keep teammate active)
 */

const fs = require('fs');
const path = require('path');

const handoffDir = path.join(process.cwd(), 'HANDOFF_BUNDLE');

if (!fs.existsSync(handoffDir)) {
  console.error('HANDOFF BUNDLE NOT FOUND: HANDOFF_BUNDLE/ directory does not exist.');
  process.exit(2);
}

const requiredFiles = [
  'design-tokens.json',
  'COMPONENTS.md',
  'ASSETS.md',
  'README.md'
];

const missingFiles = [];
const existingFiles = [];

for (const file of requiredFiles) {
  const filePath = path.join(handoffDir, file);
  if (fs.existsSync(filePath)) {
    existingFiles.push(file);
  } else {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.error(`HANDOFF BUNDLE INCOMPLETE: Missing files: ${missingFiles.join(', ')}`);
  console.error(`Existing files: ${existingFiles.join(', ')}`);
  console.error('All required files must be present before handoff can be marked complete.');
  process.exit(2);
}

// Check that assets directory exists and is not empty
const assetsDir = path.join(handoffDir, 'assets');
if (fs.existsSync(assetsDir)) {
  const assets = fs.readdirSync(assetsDir);
  if (assets.length === 0) {
    console.error('ASSETS DIRECTORY EMPTY: assets/ directory exists but contains no files.');
    process.exit(2);
  }
}

console.log('HANDOFF BUNDLE COMPLETE: All required files present. Ready for delivery.');
process.exit(0);
