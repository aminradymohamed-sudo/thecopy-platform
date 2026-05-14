// reporter.ts — نمط field-test reporter (متسق مع artifacts/art-director/run-art-director-field-test.cjs)

import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { Page } from '@playwright/test';

export type Status = 'ناجح' | 'فاشل' | 'محجوب' | 'غير موجود';
export type Severity = 'حرجة' | 'مرتفعة' | 'متوسطة' | 'منخفضة';

export interface Result {
  id: string;
  domain: string;
  status: Status;
  action: string;
  actual: string;
  evidence: string[];
  severity: Severity;
}

export class FieldReporter {
  private results: Result[] = [];
  private logs = {
    console: [] as string[],
    pageErrors: [] as string[],
    requests: [] as Array<{ url: string; method: string; ts: string }>,
    responses: [] as Array<{ url: string; status: number; ts: string }>,
    downloads: [] as string[],
  };
  private runDate = new Date().toISOString();

  constructor(public outDir: string, public targetUrl: string, public charter: string) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(path.join(outDir, 'screenshots'), { recursive: true });
  }

  addResult(
    id: string,
    domain: string,
    status: Status,
    action: string,
    actual: string,
    evidence: string[] = [],
    severity?: Severity,
  ) {
    const sev: Severity = severity ?? this.statusSeverity(status);
    this.results.push({ id, domain, status, action, actual, evidence, severity: sev });
    this.flushProgress();
  }

  attachPage(page: Page) {
    page.on('console', (msg) => {
      this.logs.console.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      this.logs.pageErrors.push(err.message);
    });
    page.on('request', (req) => {
      this.logs.requests.push({ url: req.url(), method: req.method(), ts: new Date().toISOString() });
    });
    page.on('response', (res) => {
      this.logs.responses.push({ url: res.url(), status: res.status(), ts: new Date().toISOString() });
    });
    page.on('download', (d) => {
      this.logs.downloads.push(d.suggestedFilename());
    });
  }

  async screenshot(page: Page, name: string): Promise<string> {
    const safe = name.replace(/[^a-zA-Z0-9_.-]+/g, '_');
    const file = path.join(this.outDir, 'screenshots', `${safe}.png`);
    await page.screenshot({ path: file, fullPage: true }).catch(() => {});
    return file;
  }

  async writeJson(name: string, data: unknown): Promise<string> {
    const file = path.join(this.outDir, name);
    await fsp.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
    return file;
  }

  private statusSeverity(status: Status): Severity {
    if (status === 'فاشل') return 'متوسطة';
    if (status === 'محجوب') return 'متوسطة';
    if (status === 'غير موجود') return 'منخفضة';
    return 'منخفضة';
  }

  private progressCounts() {
    return this.results.reduce(
      (acc, r) => {
        acc.total++;
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { total: 0, 'ناجح': 0, 'فاشل': 0, 'محجوب': 0, 'غير موجود': 0 } as Record<string, number>,
    );
  }

  private flushProgress() {
    try {
      fs.writeFileSync(
        path.join(this.outDir, 'run-results-progress.json'),
        JSON.stringify(
          {
            runDate: this.runDate,
            charter: this.charter,
            targetUrl: this.targetUrl,
            results: this.results,
            counts: this.progressCounts(),
            lastResult: this.results[this.results.length - 1] ?? null,
          },
          null,
          2,
        ),
        'utf8',
      );
    } catch { /* best-effort */ }
  }

  async finalize() {
    const counts = this.progressCounts();
    await this.writeJson('run-results.json', {
      runDate: this.runDate,
      charter: this.charter,
      targetUrl: this.targetUrl,
      results: this.results,
      counts,
      logs: this.logs,
    });
    await fsp.writeFile(path.join(this.outDir, 'report.md'), this.toMarkdown(counts), 'utf8');
  }

  private toMarkdown(counts: Record<string, number>): string {
    const lines: string[] = [];
    lines.push(`# تقرير استكشاف — ${this.charter}`);
    lines.push('');
    lines.push(`- **تاريخ التشغيل:** ${this.runDate}`);
    lines.push(`- **الـ URL:** ${this.targetUrl}`);
    lines.push(`- **إجمالي البنود:** ${counts.total}`);
    lines.push(`- **ناجح:** ${counts['ناجح'] ?? 0} · **فاشل:** ${counts['فاشل'] ?? 0} · **محجوب:** ${counts['محجوب'] ?? 0} · **غير موجود:** ${counts['غير موجود'] ?? 0}`);
    lines.push('');
    lines.push('## النتائج');
    lines.push('');
    lines.push('| ID | المجال | الحالة | الخطورة | الفعل | النتيجة الفعلية |');
    lines.push('|---|---|---|---|---|---|');
    for (const r of this.results) {
      lines.push(`| ${r.id} | ${r.domain} | ${r.status} | ${r.severity} | ${r.action} | ${r.actual.replace(/\|/g, '\\|').slice(0, 200)} |`);
    }
    lines.push('');
    lines.push(`## السجلات`);
    lines.push(`- console: ${this.logs.console.length}`);
    lines.push(`- pageErrors: ${this.logs.pageErrors.length}`);
    lines.push(`- requests: ${this.logs.requests.length}`);
    lines.push(`- responses: ${this.logs.responses.length}`);
    return lines.join('\n');
  }
}
