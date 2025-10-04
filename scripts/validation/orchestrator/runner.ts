import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

import chalk from 'chalk';
import { formatISO } from 'date-fns';
import ora from 'ora';

import { DependencyResolver } from './dependency-resolver';
import { IU_NAMES } from './iu-dependencies';
import { REPORTS_LATEST_DIR, VALIDATION_ROOT } from './paths';

import type {
  ResolvedExecutionPlan,
  ValidationOptions,
  ValidationReport,
  ValidationResult,
  ValidationSummary,
} from '../shared/types';

interface VitestAssertionResult {
  title: string;
  status: 'pass' | 'fail' | 'skip' | 'todo';
  duration?: number;
  failureMessage?: string | string[];
}

interface VitestSuiteResult {
  name: string;
  duration?: number;
  assertionResults: VitestAssertionResult[];
}

interface VitestJsonReport {
  startTime: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  testResults: VitestSuiteResult[];
  success: boolean;
}

function parseIUFromFilename(filePath: string): { iu: number; criteria: number } | null {
  const base = basename(filePath);
  const match = base.match(/v(\d{3})\.(\d{1,2})/i);
  if (!match) {
    return null;
  }
  return { iu: Number.parseInt(match[1], 10), criteria: Number.parseInt(match[2], 10) };
}

function buildSummary(results: readonly ValidationResult[]): ValidationSummary {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let blocked = 0;

  for (const result of results) {
    switch (result.status) {
      case 'passed':
        passed += 1;
        break;
      case 'failed':
        failed += 1;
        break;
      case 'skipped':
        skipped += 1;
        break;
      case 'blocked':
        blocked += 1;
        break;
      default:
        break;
    }
  }

  return {
    total: results.length,
    passed,
    failed,
    skipped,
    blocked,
  };
}

export class ValidationRunner {
  private readonly resolver = new DependencyResolver();

  async run(
    options: ValidationOptions
  ): Promise<{ report: ValidationReport; plan: ResolvedExecutionPlan }> {
    const plan = this.resolver.resolve(options.iu);
    const spinner = ora('Executing IU validations').start();
    const report = await this.executeWithVitest(plan, options);
    spinner.succeed('Validation complete');
    return { report, plan };
  }

  private async executeWithVitest(
    plan: ResolvedExecutionPlan,
    options: ValidationOptions
  ): Promise<ValidationReport> {
    if (plan.orderedIUs.length === 0) {
      const timestamp = formatISO(new Date());
      return {
        timestamp,
        summary: { total: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 },
        results: [],
        duration: 0,
        coverage: 0,
        iusExecuted: [],
        iusSkipped: [...plan.skippedIUs],
      };
    }

    mkdirSync(REPORTS_LATEST_DIR, { recursive: true });
    const vitestReportPath = join(REPORTS_LATEST_DIR, 'vitest-report.json');

    const args = ['exec', 'vitest', 'run'];
    for (const iu of plan.orderedIUs) {
      const segment = `iu-${iu.toString().padStart(3, '0')}/validators`;
      args.push(segment);
    }

    args.push('--reporter=json');
    args.push(`--outputFile=${vitestReportPath}`);

    if (options.bail) {
      args.push('--bail=1');
    }
    if (options.verbose) {
      args.push('--reporter=default');
    }

    await new Promise<void>((resolvePromise, rejectPromise) => {
      const child = spawn('pnpm', args, {
        cwd: VALIDATION_ROOT,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      child.on('exit', code => {
        if (code === 0 || code === null) {
          resolvePromise();
        } else {
          rejectPromise(new Error(`Vitest exited with code ${code}`));
        }
      });

      child.on('error', rejectPromise);
    });

    if (!existsSync(vitestReportPath)) {
      throw new Error('Vitest report not generated');
    }

    const vitestReport = JSON.parse(readFileSync(vitestReportPath, 'utf-8')) as VitestJsonReport;
    const results: ValidationResult[] = [];

    for (const suite of vitestReport.testResults) {
      const iuMeta = parseIUFromFilename(suite.name);
      for (const assertion of suite.assertionResults) {
        const meta = iuMeta ?? parseIUFromFilename(assertion.title);
        const criteriaName = assertion.title;
        const status = this.mapStatus(assertion.status);
        const duration = assertion.duration ?? suite.duration ?? 0;

        const result: ValidationResult = {
          iu: meta?.iu ?? 0,
          criteria: meta?.criteria ?? 0,
          name: criteriaName,
          status,
          duration,
          error:
            status === 'failed'
              ? {
                  message: Array.isArray(assertion.failureMessage)
                    ? assertion.failureMessage.join('\n')
                    : (assertion.failureMessage ?? 'Validation failed'),
                  type: 'assertion',
                }
              : undefined,
        };

        results.push(result);
      }
    }

    const summary = buildSummary(results);
    const coverage = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;

    const timestamp = formatISO(new Date(vitestReport.startTime));

    return {
      timestamp,
      summary,
      results,
      duration: results.reduce((total, current) => total + current.duration, 0),
      coverage,
      iusExecuted: [...plan.orderedIUs],
      iusSkipped: [...plan.skippedIUs],
    };
  }

  private mapStatus(status: VitestAssertionResult['status']): ValidationResult['status'] {
    switch (status) {
      case 'pass':
        return 'passed';
      case 'fail':
        return 'failed';
      case 'skip':
        return 'skipped';
      case 'todo':
        return 'blocked';
      default:
        return 'failed';
    }
  }
}

export function formatPlan(plan: ResolvedExecutionPlan): string {
  const lines: string[] = [];
  lines.push(chalk.bold('Execution Plan:'));
  for (const iu of plan.orderedIUs) {
    lines.push(`  • IU-${iu.toString().padStart(3, '0')} — ${IU_NAMES[iu] ?? 'Unknown'}`);
  }
  if (plan.skippedIUs.length > 0) {
    lines.push(chalk.dim(`Skipped IUs: ${plan.skippedIUs.join(', ')}`));
  }
  return lines.join('\n');
}
