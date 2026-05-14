#!/usr/bin/env node

/**
 * Documentation Drift Detection Script
 * Checks for inconsistencies between code and documentation
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

const DRIFT_REPORT_PATH = 'docs/_audit/drift-report.json';

async function main() {
  console.log('🔍 Starting documentation drift detection...');

  const issues = {
    missingCodeReferences: [],
    undocumentedEndpoints: [],
    missingEnvVars: [],
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Check code references in documentation
    await checkCodeReferences(issues);

    // 2. Check API endpoints documentation
    await checkApiEndpoints(issues);

    // 3. Check environment variables documentation
    await checkEnvVariables(issues);

    // Generate report
    generateReport(issues);

    if (issues.missingCodeReferences.length > 0 ||
        issues.undocumentedEndpoints.length > 0 ||
        issues.missingEnvVars.length > 0) {
      console.error('❌ Documentation drift detected!');
      process.exit(1);
    } else {
      console.log('✅ No documentation drift detected!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Drift detection failed:', error);
    process.exit(1);
  }
}

// Check code references in markdown files
async function checkCodeReferences(issues) {
  console.log('📖 Checking code references in documentation...');

  const markdownFiles = await glob('docs/**/*.md');
  const codeRefRegex = /`([^`]+):(\d+)`/g;

  for (const file of markdownFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match;

    while ((match = codeRefRegex.exec(content)) !== null) {
      const [fullMatch, filePath, lineNumber] = match;
      const absolutePath = path.resolve(filePath);

      if (!fs.existsSync(absolutePath)) {
        issues.missingCodeReferences.push({
          file,
          reference: fullMatch,
          path: absolutePath,
          line: getLineNumber(content, match.index)
        });
      } else {
        // Check if line number is valid
        const fileContent = fs.readFileSync(absolutePath, 'utf8');
        const lines = fileContent.split('\n');

        if (parseInt(lineNumber) > lines.length) {
          issues.missingCodeReferences.push({
            file,
            reference: fullMatch,
            path: absolutePath,
            line: getLineNumber(content, match.index),
            issue: 'invalid_line_number'
          });
        }
      }
    }
  }

  console.log(`✅ Checked ${markdownFiles.length} markdown files`);
}

// Check API endpoints documentation
async function checkApiEndpoints(issues) {
  console.log('🌐 Checking API endpoints documentation...');

  // Load OpenAPI spec
  const openapiPath = 'docs/api/openapi.yaml';
  if (!fs.existsSync(openapiPath)) {
    console.warn('⚠️  OpenAPI spec not found, skipping endpoint check');
    return;
  }

  const openapiContent = fs.readFileSync(openapiPath, 'utf8');
  const openapiSpec = yaml.load(openapiContent);
  const documentedEndpoints = new Set();

  // Extract documented endpoints
  if (openapiSpec.paths) {
    Object.keys(openapiSpec.paths).forEach(path => {
      Object.keys(openapiSpec.paths[path]).forEach(method => {
        documentedEndpoints.add(`${method.toUpperCase()} ${path}`);
      });
    });
  }

  // Find actual API routes
  try {
    const routes = findApiRoutes();
    const actualEndpoints = new Set(routes.map(r => `${r.method} ${r.path}`));

    // Check for undocumented endpoints
    for (const endpoint of actualEndpoints) {
      if (!documentedEndpoints.has(endpoint)) {
        issues.undocumentedEndpoints.push({
          endpoint,
          status: 'missing'
        });
      }
    }

    console.log(`✅ Checked ${actualEndpoints.size} API endpoints`);
  } catch (error) {
    console.warn('⚠️  Could not find API routes:', error.message);
  }
}

// Find API routes in the codebase
function findApiRoutes() {
  const routes = [];

  // Check web API routes
  const webApiDir = 'apps/web/src/app/api';
  if (fs.existsSync(webApiDir)) {
    const files = fs.readdirSync(webApiDir, { recursive: true });
    files.forEach(file => {
      if (file.endsWith('route.ts') || file.endsWith('route.js')) {
        const relativePath = path.relative(webApiDir, file);
        const apiPath = `/api/${relativePath.replace(/\\/g, '/').replace(/route\.ts$/, '').replace(/route\.js$/, '')}`;
        routes.push({ method: 'GET', path: apiPath });
        routes.push({ method: 'POST', path: apiPath });
      }
    });
  }

  // Check backend routes
  const routeRegistrarPath = 'apps/backend/src/server/route-registrars.ts';
  if (fs.existsSync(routeRegistrarPath)) {
    const content = fs.readFileSync(routeRegistrarPath, 'utf8');
    const routeMatches = content.matchAll(/app\.(get|post|put|delete|patch)\(["']([^"']+)["']/g);

    for (const match of routeMatches) {
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2]
      });
    }
  }

  return routes;
}

// Check environment variables documentation
async function checkEnvVariables(issues) {
  console.log('🔧 Checking environment variables documentation...');

  // Find all process.env references
  const tsFiles = await glob('apps/**/*.ts');
  const envVarRegex = /process\.env\.([A-Z_]+)/g;

  const usedVars = new Set();
  const documentedVars = new Set();

  // Find used environment variables
  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match;

    while ((match = envVarRegex.exec(content)) !== null) {
      usedVars.add(match[1]);
    }
  }

  // Find documented environment variables
  const configFiles = [
    'docs/CONFIGURATION.md',
    '.env.example'
  ];

  for (const file of configFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const varMatches = content.matchAll(/`([A-Z_]+)`/g);

      for (const match of varMatches) {
        documentedVars.add(match[1]);
      }
    }
  }

  // Check for undocumented variables
  for (const varName of usedVars) {
    if (!documentedVars.has(varName)) {
      issues.missingEnvVars.push({
        variable: varName,
        status: 'undocumented'
      });
    }
  }

  console.log(`✅ Checked ${usedVars.size} environment variables`);
}

// Generate drift report
function generateReport(issues) {
  console.log('📊 Generating drift report...');

  // Ensure audit directory exists
  const auditDir = path.dirname(DRIFT_REPORT_PATH);
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  // Write JSON report
  fs.writeFileSync(DRIFT_REPORT_PATH, JSON.stringify(issues, null, 2));

  // Generate summary
  console.log('\n📋 Drift Detection Summary:');
  console.log(`📖 Missing code references: ${issues.missingCodeReferences.length}`);
  console.log(`🌐 Undocumented endpoints: ${issues.undocumentedEndpoints.length}`);
  console.log(`🔧 Undocumented env vars: ${issues.missingEnvVars.length}`);

  if (issues.missingCodeReferences.length > 0) {
    console.log('\n📖 Missing Code References:');
    issues.missingCodeReferences.slice(0, 5).forEach(issue => {
      console.log(`  - ${issue.reference} in ${issue.file}`);
    });
    if (issues.missingCodeReferences.length > 5) {
      console.log(`  ... and ${issues.missingCodeReferences.length - 5} more`);
    }
  }

  if (issues.undocumentedEndpoints.length > 0) {
    console.log('\n🌐 Undocumented Endpoints:');
    issues.undocumentedEndpoints.slice(0, 5).forEach(issue => {
      console.log(`  - ${issue.endpoint}`);
    });
    if (issues.undocumentedEndpoints.length > 5) {
      console.log(`  ... and ${issues.undocumentedEndpoints.length - 5} more`);
    }
  }

  if (issues.missingEnvVars.length > 0) {
    console.log('\n🔧 Undocumented Environment Variables:');
    issues.missingEnvVars.slice(0, 5).forEach(issue => {
      console.log(`  - ${issue.variable}`);
    });
    if (issues.missingEnvVars.length > 5) {
      console.log(`  ... and ${issues.missingEnvVars.length - 5} more`);
    }
  }
}

// Helper function to get line number
function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

// Run the script
main().catch(error => {
  console.error('❌ Drift detection failed:', error);
  process.exit(1);
});