#!/usr/bin/env node

/**
 * Documentation Drift Detection Script
 *
 * This script checks for documentation drift by verifying:
 * 1. All code references in docs exist
 * 2. All environment variables are documented
 * 3. All API endpoints are documented
 */

import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function main() {
  console.log('🔍 Starting documentation drift detection...');

  const issues = [];

  // 1. Check code references in documentation
  console.log('\n📖 Checking code references in documentation...');
  const codeRefIssues = await checkCodeReferences();
  issues.push(...codeRefIssues);

  // 2. Check environment variables
  console.log('\n🔑 Checking environment variables...');
  const envIssues = await checkEnvironmentVariables();
  issues.push(...envIssues);

  // 3. Check API endpoints
  console.log('\n🌐 Checking API endpoints...');
  try {
    const apiIssues = await checkAPIEndpoints();
    issues.push(...apiIssues);
  } catch (error) {
    console.warn(`⚠️  API endpoint check failed: ${error.message}`);
  }

  // 4. Check ADR references
  console.log('\n📝 Checking ADR references...');
  const adrIssues = await checkADRReferences();
  issues.push(...adrIssues);

  // Report results
  console.log('\n📊 Documentation Drift Report');
  console.log('=' .repeat(50));

  if (issues.length === 0) {
    console.log('✅ No drift detected! Documentation is up to date.');
    process.exit(0);
  } else {
    console.log(`⚠️  Found ${issues.length} documentation drift issue(s):\n`);

    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.type}`);
      console.log(`   File: ${issue.file}`);
      if (issue.line) console.log(`   Line: ${issue.line}`);
      console.log(`   Issue: ${issue.message}`);
      if (issue.suggestion) console.log(`   Suggestion: ${issue.suggestion}`);
      console.log();
    });

    console.log('💡 To fix these issues:');
    console.log('   - Update documentation to match current code');
    console.log('   - Add missing documentation for new features');
    console.log('   - Remove references to deleted code');

    process.exit(1);
  }
}

/**
 * Check that all code references in documentation exist
 */
async function checkCodeReferences() {
  const issues = [];
  const docsFiles = await glob('docs/**/*.md', { cwd: rootDir });
  const codeRefPattern = /`([^`]+):(\d+)`/g;

  for (const docFile of docsFiles) {
    const content = await readFile(join(rootDir, docFile), 'utf-8');
    let match;

    while ((match = codeRefPattern.exec(content)) !== null) {
      const [fullMatch, filePath, lineNumber] = match;

      // Skip URL references (http://, https://, redis://, etc.) and strings with spaces
      if (filePath.includes('://') || filePath.includes(' ')) {
        continue;
      }

      // Only check paths that look like source files (must end with a known extension)
      if (!/\.(ts|tsx|js|jsx|mjs|cjs|vue|py|go|rs|java|md|json|yaml|yml|html|css|scss|sh)$/i.test(filePath)) {
        continue;
      }

      const absolutePath = join(rootDir, filePath);

      try {
        await readFile(absolutePath, 'utf-8');
        const lines = (await readFile(absolutePath, 'utf-8')).split('\n');
        if (parseInt(lineNumber) > lines.length) {
          issues.push({
            type: 'CODE_REFERENCE',
            file: docFile,
            line: getLineNumber(content, match.index),
            message: `Code reference ${filePath}:${lineNumber} exceeds file length (${lines.length} lines)`,
            suggestion: `Update line number or check if code was removed`
          });
        }
      } catch (error) {
        issues.push({
          type: 'CODE_REFERENCE',
          file: docFile,
          line: getLineNumber(content, match.index),
          message: `Code reference ${filePath}:${lineNumber} does not exist`,
          suggestion: `Update documentation or restore missing code`
        });
      }
    }
  }

  return issues;
}

/**
 * Check that all environment variables are documented
 */
async function checkEnvironmentVariables() {
  const issues = [];
  const envExample = await readFile(join(rootDir, '.env.example'), 'utf-8');
  const configMd = await readFile(join(rootDir, 'docs', 'CONFIGURATION.md'), 'utf-8');

  const envVars = envExample.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=')[0].trim());

  const documentedVars = [...configMd.matchAll(/`([A-Z_]+)`/g)]
    .map(match => match[1]);

  const undocumentedVars = envVars.filter(varName =>
    !documentedVars.includes(varName) &&
    !varName.startsWith('#') &&
    varName !== 'NODE_ENV'
  );

  if (undocumentedVars.length > 0) {
    issues.push({
      type: 'ENV_VARIABLE',
      file: 'docs/CONFIGURATION.md',
      message: `Environment variables not documented: ${undocumentedVars.join(', ')}`,
      suggestion: `Add these variables to the configuration documentation`
    });
  }

  return issues;
}

/**
 * Check that all API endpoints are documented in OpenAPI spec
 */
async function checkAPIEndpoints() {
  const issues = [];
  const backendFiles = await glob('apps/backend/src/controllers/**/*.ts', { cwd: rootDir });
  const openapiSpec = await readFile(join(rootDir, 'docs', 'api', 'openapi.yaml'), 'utf-8');

  const endpointPattern = /@(Get|Post|Put|Delete|Patch)\(\s*['"]([^'"]+)['"]/g;
  const documentedPaths = [...openapiSpec.matchAll(/^\s+(\/[^:\s]+):/gm)]
    .map(match => match[1]);

  for (const file of backendFiles) {
    const content = await readFile(join(rootDir, file), 'utf-8');
    let match;

    while ((match = endpointPattern.exec(content)) !== null) {
      const [fullMatch, method, path] = match;
      const normalizedPath = path.replace(/\{([^}]+)\}/g, ':$1');

      if (!documentedPaths.includes(normalizedPath)) {
        issues.push({
          type: 'API_ENDPOINT',
          file: file,
          line: getLineNumber(content, match.index),
          message: `Endpoint ${method.toUpperCase()} ${path} not documented in OpenAPI spec`,
          suggestion: `Add this endpoint to docs/api/openapi.yaml`
        });
      }
    }
  }

  return issues;
}

/**
 * Check that ADR references in code exist
 */
async function checkADRReferences() {
  const issues = [];
  const codeFiles = await glob('apps/**/*.ts', { cwd: rootDir, ignore: 'node_modules' });
  const adrFiles = await glob('docs/adr/*.md', { cwd: rootDir });

  const adrNumbers = adrFiles.map(file => {
    const match = file.match(/(\d{4})-.*\.md/);
    return match ? match[1] : null;
  }).filter(Boolean);

  const adrRefPattern = /ADR-(\d{4})/g;

  for (const codeFile of codeFiles) {
    // Skip node_modules and temporary files
    if (codeFile.includes('node_modules') || codeFile.includes('ai_tmp_')) {
      continue;
    }

    try {
      const content = await readFile(join(rootDir, codeFile), 'utf-8');
      let match;

      while ((match = adrRefPattern.exec(content)) !== null) {
        const [fullMatch, adrNumber] = match;

        if (!adrNumbers.includes(adrNumber)) {
          issues.push({
            type: 'ADR_REFERENCE',
            file: codeFile,
            line: getLineNumber(content, match.index),
            message: `ADR reference ADR-${adrNumber} not found in docs/adr/`,
            suggestion: `Create the ADR document or update the reference`
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Skipping file ${codeFile}: ${error.message}`);
      continue;
    }
  }

  return issues;
}

/**
 * Get line number for a position in content
 */
function getLineNumber(content, position) {
  return content.substring(0, position).split('\n').length;
}

// Run the script
main().catch(error => {
  console.error('❌ Error running drift detection:', error);
  process.exit(1);
});