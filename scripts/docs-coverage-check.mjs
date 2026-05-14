#!/usr/bin/env node

/**
 * Documentation Coverage Check Script
 * Checks if all required documentation files exist
 */

import fs from 'fs';
import path from 'path';

const REQUIRED_DOCS = [
  'README.md',
  'CONTRIBUTING.md',
  'docs/architecture/ARCHITECTURE.md',
  'docs/api/openapi.yaml',
  'docs/api/README.md',
  'docs/operations/DEPLOYMENT.md',
  'docs/operations/RUNBOOK.md',
  'docs/operations/MONITORING.md',
  'docs/operations/ROLLBACK.md',
  'docs/CONFIGURATION.md',
  'docs/security/SECURITY.md',
  'docs/security/THREAT_MODEL.md',
  'docs/development/DEVELOPMENT.md',
  'docs/development/TESTING.md'
];

async function main() {
  console.log('📊 Checking documentation coverage...');

  const missingDocs = [];
  const existingDocs = [];

  for (const docPath of REQUIRED_DOCS) {
    if (fs.existsSync(docPath)) {
      existingDocs.push(docPath);
    } else {
      missingDocs.push(docPath);
    }
  }

  const coveragePercentage = ((existingDocs.length / REQUIRED_DOCS.length) * 100).toFixed(2);

  console.log(`\n📋 Documentation Coverage Report:`);
  console.log(`📖 Total required: ${REQUIRED_DOCS.length}`);
  console.log(`✅ Existing: ${existingDocs.length}`);
  console.log(`❌ Missing: ${missingDocs.length}`);
  console.log(`📊 Coverage: ${coveragePercentage}%`);

  if (missingDocs.length > 0) {
    console.log('\n📖 Missing Documentation Files:');
    missingDocs.forEach(doc => {
      console.log(`  - ${doc}`);
    });
  }

  // Check if coverage meets minimum threshold (80%)
  if (coveragePercentage < 80.0) {
    console.error(`\n❌ Documentation coverage (${coveragePercentage}%) is below minimum threshold (80%)`);
    process.exit(1);
  } else {
    console.log(`\n✅ Documentation coverage (${coveragePercentage}%) meets minimum threshold`);
    process.exit(0);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Coverage check failed:', error);
  process.exit(1);
});