#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import { Command, Option } from 'commander';
import { table } from 'table';

import { DependencyResolver } from './dependency-resolver';
import { IU_NAMES } from './iu-dependencies';
import { ReportGenerator } from './report-generator';
import { ValidationRunner, formatPlan } from './runner';

import type { ReportFormat, ValidationOptions } from '../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as {
  version: string;
};

const program = new Command();
program.name('validate').description('Axon Flow IU validation orchestrator').version(pkg.version);

program
  .command('run')
  .description('Execute validation suites for specific IUs')
  .addOption(new Option('--iu <numbers...>', 'Specific IU identifiers to run'))
  .addOption(new Option('--from <number>', 'Run from IU identifier').argParser(Number.parseInt))
  .addOption(new Option('--to <number>', 'Run up to IU identifier').argParser(Number.parseInt))
  .addOption(new Option('--all', 'Run all IUs'))
  .addOption(new Option('--parallel <number>', 'Maximum concurrency').argParser(Number.parseInt))
  .addOption(new Option('--bail', 'Stop on first failure'))
  .addOption(new Option('--format <format>', 'Report format').choices(['json', 'html', 'markdown']))
  .addOption(new Option('--output <path>', 'Report output path'))
  .addOption(new Option('--verbose', 'Enable verbose output'))
  .action(async options => {
    try {
      const parsed = normalizeOptions(options);
      const runner = new ValidationRunner();
      const reportGenerator = new ReportGenerator();
      const { report, plan } = await runner.run(parsed);

      process.stdout.write(`\n${formatPlan(plan)}\n\n`);
      reportGenerator.write(report, parsed.format ?? 'json', parsed.output);

      if (report.summary.failed > 0) {
        process.stderr.write(chalk.red(`✖ ${report.summary.failed} validation(s) failed\n`));
        process.exitCode = 1;
      } else {
        process.stdout.write(chalk.green('✔ All validations passed\n'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${chalk.red('Validation failed:')} ${message}\n`);
      process.exitCode = 1;
    }
  });

program
  .command('list')
  .description('List IUs and their descriptions')
  .action(() => {
    const rows = [['IU', 'Name']];
    for (const [id, name] of Object.entries(IU_NAMES)) {
      rows.push([`IU-${Number(id).toString().padStart(3, '0')}`, name]);
    }
    process.stdout.write(`${table(rows)}\n`);
  });

program
  .command('deps')
  .description('Show dependency graph information')
  .option('--iu <number>', 'Show dependencies for a single IU', value => Number.parseInt(value, 10))
  .action(cmdOptions => {
    const resolver = new DependencyResolver();
    if (cmdOptions.iu) {
      const deps = resolver.getDependencies(cmdOptions.iu);
      const formatted =
        deps.length > 0
          ? deps.map(id => `IU-${id.toString().padStart(3, '0')}`).join(', ')
          : 'None';
      process.stdout.write(
        `Dependencies for IU-${cmdOptions.iu.toString().padStart(3, '0')}: ${formatted}\n`
      );
      return;
    }

    const graph = resolver.getGraph();
    const rows = [['IU', 'Dependencies']];
    for (const iu of graph.executionOrder) {
      const deps = graph.dependencies.get(iu) ?? [];
      const formatted =
        deps.length > 0
          ? deps.map(id => `IU-${id.toString().padStart(3, '0')}`).join(', ')
          : 'None';
      rows.push([`IU-${iu.toString().padStart(3, '0')}`, formatted]);
    }
    process.stdout.write(`${table(rows)}\n`);
  });

program
  .command('help-docs')
  .description('Display authoritative documentation references')
  .action(() => {
    process.stdout.write(`Relevant references:\n`);
    process.stdout.write(` - docs/main/003-validation_criteria.md\n`);
    process.stdout.write(` - AGENTS.md Section 9 & Section 16\n`);
    process.stdout.write(` - claudedocs/validation-system-variant1-implementation-guide.md\n`);
  });

function normalizeOptions(options: any): ValidationOptions {
  const all = Boolean(options.all);
  const explicitIUs = Array.isArray(options.iu)
    ? options.iu.map((value: string) => Number.parseInt(value, 10)).filter(Number.isFinite)
    : undefined;
  const from = typeof options.from === 'number' ? options.from : undefined;
  const to = typeof options.to === 'number' ? options.to : undefined;
  const parallel = typeof options.parallel === 'number' ? options.parallel : undefined;
  const bail = Boolean(options.bail);
  const verbose = Boolean(options.verbose);
  const format = options.format ? (options.format as ReportFormat) : undefined;
  const output = typeof options.output === 'string' ? options.output : undefined;

  const resolvedIUs = (() => {
    if (all) {
      return undefined;
    }
    if (explicitIUs && explicitIUs.length > 0) {
      return explicitIUs;
    }
    if (from !== undefined || to !== undefined) {
      const lower = from ?? 1;
      const upper = to ?? 35;
      const values: number[] = [];
      for (let index = lower; index <= upper; index += 1) {
        values.push(index);
      }
      return values;
    }
    return undefined;
  })();

  return {
    ...(resolvedIUs ? { iu: resolvedIUs } : { iu: undefined }),
    ...(from !== undefined ? { from } : {}),
    ...(to !== undefined ? { to } : {}),
    ...(all ? { all } : { all: false }),
    ...(parallel !== undefined ? { parallel } : {}),
    ...(bail ? { bail } : { bail: false }),
    ...(format ? { format } : {}),
    ...(output ? { output } : {}),
    ...(verbose ? { verbose } : { verbose: false }),
  };
}

program.parseAsync(process.argv);
