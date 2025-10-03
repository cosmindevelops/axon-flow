#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 *
 * Validates .env files against .env.example metadata, interpreting comment
 * annotations for required variables and validation rules.
 */

const fs = require('node:fs');
const path = require('node:path');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const validationPatterns = {
  url: /^https?:\/\/.+/i,
  urlStrict: /^https?:\/\/[^\s]+$/i,
  wsUrl: /^wss?:\/\/.+/i,
  postgresql: /^postgres(ql)?:\/\/.+/i,
  redis: /^rediss?:\/\/.+/i,
  amqp: /^amqps?:\/\/.+/i,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+[1-9]\d{1,14}$/,
  awsRegion: /^[a-z]{2}-[a-z]+-\d$/i,
  s3Bucket: /^(?!xn--)(?!.*\.\.)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/,
  alphanumeric: /^[a-z0-9_-]+$/i,
  base64: /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    envPath: '.env',
    examplePath: '.env.example',
    workspace: null,
    strict: false,
    quiet: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    switch (arg) {
      case '--path':
        options.envPath = args[++i];
        break;
      case '--example':
        options.examplePath = args[++i];
        break;
      case '--workspace':
        options.workspace = args[++i];
        break;
      case '--strict':
        options.strict = true;
        break;
      case '--quiet':
        options.quiet = true;
        break;
      case '--dry-run':
      case '--dryRun':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`${colors.red}Unknown option: ${arg}${colors.reset}`);
        printHelp();
        process.exit(2);
    }
  }

  if (options.workspace) {
    options.envPath = path.join(options.workspace, '.env');
    options.examplePath = path.join(options.workspace, '.env.example');
  }

  return options;
}

function printHelp() {
  console.log(`\n${colors.bold}Environment Variable Validation${colors.reset}\n
${colors.cyan}Usage:${colors.reset}
  node scripts/validate-env.js [options]

${colors.cyan}Options:${colors.reset}
  --path <path>       Path to .env file (default: .env)
  --example <path>    Path to .env.example file (default: .env.example)
  --workspace <path>  Validate workspace .env (sets both paths)
  --strict            Exit with error on warnings
  --quiet             Suppress success output
  --dry-run           Never fail (exit code always 0)
  --help, -h          Show this message
`);
}

function parseEnvExample(filePath) {
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Example file not found at ${absolute}`);
  }

  const schema = new Map();
  const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/);
  let commentBlock = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.length === 0) {
      commentBlock = [];
      continue;
    }

    if (trimmed.startsWith('#')) {
      commentBlock.push(trimmed.slice(1).trim());
      continue;
    }

    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) {
      commentBlock = [];
      continue;
    }

    const varName = match[1];
    const example = match[2];
    const metadata = extractMetadata(commentBlock);
    metadata.example = example;
    schema.set(varName, metadata);
    commentBlock = [];
  }

  return schema;
}

function extractMetadata(comments) {
  const metadata = {
    required: false,
    description: '',
    defaultValue: null,
    validations: [],
  };

  for (const rawComment of comments) {
    const comment = rawComment.trim();

    if (/^\[(required)([^\]]*)\]/i.test(comment)) {
      metadata.required = true;
      const remainder = comment.replace(/^\[[^\]]+\]\s*/, '').trim();
      if (remainder) metadata.description = remainder;
      continue;
    }

    if (/^\[(optional|auto-set)([^\]]*)\]/i.test(comment)) {
      metadata.required = false;
      const remainder = comment.replace(/^\[[^\]]+\]\s*/, '').trim();
      if (remainder && !metadata.description) metadata.description = remainder;
      continue;
    }

    if (/^validation\s*:/i.test(comment)) {
      const directives = parseValidationDirectives(comment.replace(/^validation\s*:/i, '').trim());
      metadata.validations.push(...directives);
      continue;
    }

    if (/^default\s*:/i.test(comment)) {
      metadata.defaultValue = comment.replace(/^default\s*:/i, '').trim();
      continue;
    }

    if (!metadata.description && comment) {
      metadata.description = comment;
    }
  }

  return metadata;
}

function parseValidationDirectives(text) {
  if (!text) return [];

  const directives = [];
  const lowered = text.toLowerCase();

  const enumMatch = text.match(/must be one of:\s*(.+)$/i);
  if (enumMatch) {
    const values = enumMatch[1]
      .split(/[,|]/)
      .map(value => value.trim())
      .filter(Boolean);
    if (values.length) directives.push({ type: 'enum', values });
  }

  const rangeMatch = text.match(/integer between\s*(\d+)\s*[-–]\s*(\d+)/i);
  if (rangeMatch) {
    directives.push({ type: 'range', min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) });
  }

  if (/positive integer/.test(lowered)) {
    directives.push({ type: 'positiveInteger' });
  }

  if (/must be true or false/.test(lowered)) {
    directives.push({ type: 'boolean' });
  }

  const minLengthMatch = text.match(/(?:minimum|min)\s+(\d+)\s+characters?/i);
  if (minLengthMatch) {
    directives.push({ type: 'minLength', min: Number(minLengthMatch[1]) });
  }

  const exactLengthMatch =
    text.match(/exact(?:ly)?\s*(\d+)\s+chars?/i) ||
    (!minLengthMatch && text.match(/\b(\d+)\s+chars?\b/i));
  if (exactLengthMatch) {
    directives.push({ type: 'exactLength', length: Number(exactLengthMatch[1]) });
  }

  const regexMatch = text.match(/must match pattern:\s*(.+)$/i);
  if (regexMatch) {
    const patternText = regexMatch[1].trim().replace(/^`|`$/g, '');
    const normalized = patternText.replace(/\\/g, '\\');
    try {
      directives.push({ type: 'regex', pattern: new RegExp(`^${normalized}$`) });
    } catch {
      directives.push({ type: 'regex', pattern: new RegExp(normalized) });
    }
  }

  const startsWithMatch = text.match(/starts with\s+([^.,]+)/i);
  if (startsWithMatch) {
    const prefixes = startsWithMatch[1]
      .split(/\s+or\s+/i)
      .map(prefix => prefix.replace(/[()]/g, '').replace(/\.$/, '').trim())
      .filter(Boolean);
    if (prefixes.length) directives.push({ type: 'startsWithAny', prefixes });
  }

  const endsWithMatch = text.match(/ends with\s+([^.,]+)/i);
  if (endsWithMatch) {
    const suffixes = endsWithMatch[1]
      .split(/\s+or\s+/i)
      .map(suffix => suffix.replace(/[()]/g, '').replace(/\.$/, '').trim())
      .filter(Boolean);
    if (suffixes.length) directives.push({ type: 'endsWithAny', suffixes });
  }

  if (/base64 encoded/.test(lowered)) {
    directives.push({
      type: 'pattern',
      pattern: validationPatterns.base64,
      label: 'base64 encoded string',
    });
  }

  if (/valid email/.test(lowered)) {
    directives.push({
      type: 'pattern',
      pattern: validationPatterns.email,
      label: 'valid email',
    });
  }

  if (/valid url/.test(lowered)) {
    directives.push({
      type: 'pattern',
      pattern: validationPatterns.urlStrict,
      label: 'valid URL',
    });
  }

  if (/aws region/.test(lowered)) {
    directives.push({
      type: 'pattern',
      pattern: validationPatterns.awsRegion,
      label: 'AWS region format',
    });
  }

  if (/e\.164/.test(lowered)) {
    directives.push({
      type: 'pattern',
      pattern: validationPatterns.phone,
      label: 'E.164 phone',
    });
  }

  if (/alphanumeric string/.test(lowered)) {
    directives.push({
      type: 'pattern',
      pattern: validationPatterns.alphanumeric,
      label: 'alphanumeric',
    });
  }

  if (/alphanumeric with underscores\/hyphens/.test(lowered)) {
    directives.push({
      type: 'pattern',
      pattern: /^[A-Za-z0-9_-]+$/,
      label: 'alphanumeric with underscores or hyphens',
    });
  }

  if (/valid s3 bucket name/.test(lowered)) {
    directives.push({
      type: 'pattern',
      pattern: validationPatterns.s3Bucket,
      label: 'S3 bucket name',
    });
  }

  if (/starts with postgresql:\/\//.test(lowered) || /postgres:\/\//.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['postgresql://', 'postgres://'] });
  }

  if (/starts with redis:\/\//.test(lowered) || /rediss:\/\//.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['redis://', 'rediss://'] });
  }

  if (/starts with amqp:\/\//.test(lowered) || /amqps:\/\//.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['amqp://', 'amqps://'] });
  }

  if (/starts with sk_test_ or sk_live_/.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['sk_test_', 'sk_live_'] });
  }

  if (/starts with pk_test_ or pk_live_/.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['pk_test_', 'pk_live_'] });
  }

  if (/starts with whsec_/.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['whsec_'] });
  }

  if (/starts with sg\./.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['SG.'] });
  }

  if (/starts with ac/.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['AC'] });
  }

  if (/starts with akia/.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['AKIA'] });
  }

  if (/starts with iv1\./.test(lowered) || /starts with iv23\./.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['Iv1.', 'Iv23.'] });
  }

  if (/starts with sk-/.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['sk-'] });
  }

  if (/starts with http:\/\//.test(lowered) || /starts with https:\/\//.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['http://', 'https://'] });
  }

  if (/starts with https:\/\/hooks\.slack\.com\//.test(lowered)) {
    directives.push({ type: 'startsWithAny', prefixes: ['https://hooks.slack.com/'] });
  }

  return directives;
}

function parseEnvFile(filePath) {
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) {
    return null;
  }

  const env = {};
  const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/);

  for (const rawLine of lines) {
    if (
      typeof rawLine !== 'string' ||
      rawLine.trim().length === 0 ||
      rawLine.trim().startsWith('#')
    ) {
      continue;
    }

    const exportMatch = rawLine.match(/^export\s+([A-Z_][A-Z0-9_]*)=(.*)$/);
    const basicMatch = rawLine.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    const match = exportMatch || basicMatch;

    if (!match) continue;

    const key = match[1];
    let value = match[2] ?? '';

    if (!value.trim().startsWith('"') && !value.trim().startsWith("'")) {
      const hashIndex = value.indexOf(' #');
      if (hashIndex !== -1) {
        value = value.slice(0, hashIndex);
      }
    }

    value = value.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function validateValue(value, validation) {
  switch (validation.type) {
    case 'enum':
      if (!validation.values.includes(value)) {
        return `Must be one of: ${validation.values.join(', ')}`;
      }
      break;
    case 'range':
      if (
        Number.isNaN(Number(value)) ||
        Number(value) < validation.min ||
        Number(value) > validation.max
      ) {
        return `Must be an integer between ${validation.min} and ${validation.max}`;
      }
      break;
    case 'positiveInteger': {
      const num = Number(value);
      if (!Number.isInteger(num) || num <= 0) {
        return 'Must be a positive integer';
      }
      break;
    }
    case 'boolean':
      if (!['true', 'false'].includes(value.toLowerCase())) {
        return 'Must be true or false';
      }
      break;
    case 'minLength':
      if (value.length < validation.min) {
        return `Must be at least ${validation.min} characters`;
      }
      break;
    case 'exactLength':
      if (value.length !== validation.length) {
        return `Must be exactly ${validation.length} characters`;
      }
      break;
    case 'regex':
      if (!validation.pattern.test(value)) {
        return 'Does not match expected pattern';
      }
      break;
    case 'pattern':
      if (!validation.pattern.test(value)) {
        return validation.label ? `Must be a valid ${validation.label}` : 'Invalid value';
      }
      break;
    case 'startsWithAny':
      if (!validation.prefixes.some(prefix => value.startsWith(prefix))) {
        return `Must start with one of: ${validation.prefixes.join(', ')}`;
      }
      break;
    case 'endsWithAny':
      if (!validation.suffixes.some(suffix => value.endsWith(suffix))) {
        return `Must end with one of: ${validation.suffixes.join(', ')}`;
      }
      break;
    default:
      break;
  }

  return null;
}

function validateEnvironment(schema, env) {
  const errors = [];
  const warnings = [];

  for (const [key, metadata] of schema) {
    const value = env[key];
    const hasValue = value !== undefined && value !== '';

    if (!hasValue) {
      if (metadata.required) {
        const missingMessage = metadata.description
          ? `${key}: missing value (${metadata.description})`
          : `${key}: missing value`;
        errors.push(missingMessage);
      } else if (metadata.defaultValue) {
        warnings.push(`${key}: missing, defaults to ${metadata.defaultValue}`);
      }
      continue;
    }

    for (const validation of metadata.validations) {
      const message = validateValue(value, validation);
      if (message) {
        errors.push(`${key}: ${message}`);
        break;
      }
    }
  }

  const extraKeys = Object.keys(env).filter(key => !schema.has(key));
  for (const extraKey of extraKeys) {
    warnings.push(`${extraKey}: not defined in example file`);
  }

  return { errors, warnings };
}

function run() {
  const options = parseArgs();

  try {
    const schema = parseEnvExample(options.examplePath);
    const envData = parseEnvFile(options.envPath);

    if (!envData) {
      const message = `Environment file not found at ${path.resolve(options.envPath)}`;
      if (options.dryRun) {
        console.warn(`${colors.yellow}${message}${colors.reset}`);
        process.exit(0);
      } else {
        console.error(`${colors.red}${message}${colors.reset}`);
        process.exit(2);
      }
    }

    const { errors, warnings } = validateEnvironment(schema, envData);

    if (errors.length) {
      console.error(`\n${colors.red}Environment validation failed:${colors.reset}`);
      for (const error of errors) {
        console.error(`  • ${error}`);
      }
    }

    if (warnings.length) {
      console.warn(`\n${colors.yellow}Warnings:${colors.reset}`);
      for (const warning of warnings) {
        console.warn(`  • ${warning}`);
      }
    }

    if (!errors.length && (!warnings.length || !options.strict) && !options.quiet) {
      console.log(`${colors.green}✓ Environment configuration looks good${colors.reset}`);
    }

    if (options.dryRun) {
      process.exit(0);
    }

    if (errors.length) {
      process.exit(1);
    }

    if (warnings.length && options.strict) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.dryRun) {
      console.warn(`${colors.yellow}${message}${colors.reset}`);
      process.exit(0);
    } else {
      console.error(`${colors.red}${message}${colors.reset}`);
      process.exit(2);
    }
  }
}

if (require.main === module) {
  run();
}
