#!/usr/bin/env tsx
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, 'iu-template');

const program = new Command();
program
  .name('scaffold')
  .description('Generate new IU validation skeleton')
  .requiredOption('--iu <number>', 'IU identifier (1-35)', value => Number.parseInt(value, 10))
  .requiredOption('--name <string>', 'IU description')
  .option('--deps <items>', 'Comma separated dependency list', '')
  .option(
    '--criteria <number>',
    'Number of validation criteria',
    value => Number.parseInt(value, 10),
    20
  )
  .action(options => {
    const iuNumber: number = options.iu;
    if (Number.isNaN(iuNumber) || iuNumber < 1 || iuNumber > 35) {
      throw new Error('IU number must be between 1 and 35');
    }

    const iuSegment = `iu-${iuNumber.toString().padStart(3, '0')}`;
    const targetDir = join(__dirname, '..', iuSegment);
    if (existsSync(targetDir)) {
      throw new Error(`Directory ${targetDir} already exists`);
    }

    const deps = options.deps ? String(options.deps) : '';
    const criteriaCount: number = options.criteria;

    mkdirSync(targetDir, { recursive: true });
    mkdirSync(join(targetDir, 'validators'));
    mkdirSync(join(targetDir, 'fixtures'));
    mkdirSync(join(targetDir, 'helpers'));
    mkdirSync(join(targetDir, 'results'));

    const packageTemplate = readFileSync(join(TEMPLATES_DIR, 'package.json.template'), 'utf-8')
      .replace(/{{IU_NUM}}/g, iuSegment)
      .replace(/{{IU_NAME}}/g, options.name);
    writeFileSync(join(targetDir, 'package.json'), packageTemplate);

    const configTemplate = readFileSync(join(TEMPLATES_DIR, 'iu-XXX.config.ts.template'), 'utf-8')
      .replace(/{{IU_NUM}}/g, iuNumber.toString().padStart(3, '0'))
      .replace(/{{IU_NAME}}/g, options.name)
      .replace(/{{DEPENDENCIES}}/g, deps);
    writeFileSync(join(targetDir, `${iuSegment}.config.ts`), configTemplate);

    const validatorTemplate = readFileSync(
      join(TEMPLATES_DIR, 'validators', 'validator.spec.ts.template'),
      'utf-8'
    );
    for (let index = 1; index <= criteriaCount; index += 1) {
      const out = validatorTemplate
        .replace(/{{IU_NUM}}/g, iuNumber.toString().padStart(3, '0'))
        .replace(/{{CRITERIA}}/g, index.toString())
        .replace(/{{VALIDATION_NAME}}/g, `Validation Criterion ${index}`)
        .replace(/{{CRITERIA_DESCRIPTION}}/g, `criterion ${index}`);

      const filename = `v${iuNumber.toString().padStart(3, '0')}.${index}-placeholder.spec.ts`;
      writeFileSync(join(targetDir, 'validators', filename), out);
    }

    writeFileSync(join(targetDir, 'results', '.gitkeep'), '');
    process.stdout.write(`Created ${targetDir}\n`);
  });

program.parse(process.argv);
