#!/usr/bin/env node

/**
 * Documentation Coverage Report Script
 * Generates a detailed JSON report of documentation coverage
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

const REPORT_PATH = 'docs/_audit/coverage-report.json';

async function main() {
  console.log('📊 Generating documentation coverage report...');

  const report = {
    timestamp: new Date().toISOString(),
    totalRequired: REQUIRED_DOCS.length,
    existing: 0,
    missing: 0,
    coverage: 0,
    files: []
  };

  // Ensure audit directory exists
  const auditDir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  for (const docPath of REQUIRED_DOCS) {
    const fileInfo = {
      path: docPath,
      exists: fs.existsSync(docPath),
      size: 0,
      lastModified: null
    };

    if (fileInfo.exists) {
      const stats = fs.statSync(docPath);
      fileInfo.size = stats.size;
      fileInfo.lastModified = stats.mtime.toISOString();
      report.existing++;
    } else {
      report.missing++;
    }

    report.files.push(fileInfo);
  }

  report.coverage = ((report.existing / report.totalRequired) * 100).toFixed(2);

  // Write JSON report
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`✅ Coverage report generated: ${REPORT_PATH}`);
  console.log(`📊 Coverage: ${report.coverage}% (${report.existing}/${report.totalRequired})`);

  if (report.missing > 0) {
    console.log(`⚠️  ${report.missing} files missing`);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Coverage report generation failed:', error);
  process.exit(1);
});