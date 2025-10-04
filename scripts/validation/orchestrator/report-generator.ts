import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { formatISO } from 'date-fns';

import { REPORTS_HISTORY_DIR, REPORTS_LATEST_DIR } from './paths';

import type { ReportFormat, ValidationReport } from '../shared/types';

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export class ReportGenerator {
  write(
    report: ValidationReport,
    format: ReportFormat = 'json',
    output?: string
  ): { summaryPath: string } {
    ensureDir(REPORTS_LATEST_DIR);
    ensureDir(REPORTS_HISTORY_DIR);

    const timestamp = formatISO(new Date()).replace(/[:]/g, '-');
    const latestJson = join(REPORTS_LATEST_DIR, 'summary.json');
    writeFileSync(latestJson, JSON.stringify(report, null, 2));

    const historyJson = join(REPORTS_HISTORY_DIR, `${timestamp}-summary.json`);
    writeFileSync(historyJson, JSON.stringify(report, null, 2));

    if (format !== 'json') {
      const target =
        output ?? join(REPORTS_LATEST_DIR, `summary.${format === 'html' ? 'html' : 'md'}`);
      const content = this.render(report, format);
      writeFileSync(target, content);
    }

    return { summaryPath: latestJson };
  }

  private render(report: ValidationReport, format: ReportFormat): string {
    switch (format) {
      case 'html':
        return this.renderHtml(report);
      case 'markdown':
        return this.renderMarkdown(report);
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  private renderHtml(report: ValidationReport): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Axon Flow Validation Report</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; }
      table { border-collapse: collapse; width: 100%; margin-top: 1.5rem; }
      th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
      th { background: #f5f5f5; }
      .passed { color: #0f9d58; }
      .failed { color: #db4437; }
    </style>
  </head>
  <body>
    <h1>Axon Flow Validation Report</h1>
    <p>Generated: ${report.timestamp}</p>
    <p>Total Criteria: ${report.summary.total} &middot; Passed: ${report.summary.passed} &middot; Failed: ${report.summary.failed}</p>
    <table>
      <thead>
        <tr>
          <th>IU</th>
          <th>Criteria</th>
          <th>Name</th>
          <th>Status</th>
          <th>Duration (ms)</th>
        </tr>
      </thead>
      <tbody>
        ${report.results
          .map(
            result => `<tr>
              <td>${result.iu}</td>
              <td>${result.criteria}</td>
              <td>${result.name}</td>
              <td class="${result.status}">${result.status}</td>
              <td>${result.duration}</td>
            </tr>`
          )
          .join('\n')}
      </tbody>
    </table>
  </body>
</html>`;
  }

  private renderMarkdown(report: ValidationReport): string {
    const rows = report.results
      .map(
        result =>
          `| ${result.iu} | ${result.criteria} | ${result.name} | ${result.status} | ${result.duration} |`
      )
      .join('\n');

    return `# Axon Flow Validation Report

- Generated: ${report.timestamp}
- Total Criteria: ${report.summary.total}
- Passed: ${report.summary.passed}
- Failed: ${report.summary.failed}
- Skipped: ${report.summary.skipped}
- Blocked: ${report.summary.blocked}
- Coverage: ${report.coverage.toFixed(2)}%

| IU | Criteria | Name | Status | Duration (ms) |
| --- | --- | --- | --- | --- |
${rows}
`;
  }
}
