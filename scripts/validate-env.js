#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 *
 * Validates .env files against .env.example schemas by parsing metadata
 * from comments and checking for required variables, valid formats, and
 * allowed values.
 *
 * Usage:
 *   node scripts/validate-env.js [options]
 *
 * Options:
 *   --path <path>       Path to .env file (default: .env)
 *   --example <path>    Path to .env.example file (default: .env.example)
 *   --workspace <path>  Validate workspace-level .env (e.g., apps/web-dashboard)
 *   --strict            Exit with error on warnings
 *   --quiet             Suppress success messages
 *   --dry-run           Check without failing (exit code always 0)
 *
 * Exit Codes:
 *   0 - Validation successful
 *   1 - Validation errors found
 *   2 - File not found or parsing error
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Validation regex patterns
const validationPatterns = {
  // URLs
  url: /^https?:\/\/.+/,
  urlStrict: /^https?:\/\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+$/,
  wsUrl: /^wss?:\/\/.+/,

  // Database connections
  postgresql: /^postgres(ql)?:\/\/.+/,
  redis: /^rediss?:\/\/.+/,
  amqp: /^amqps?:\/\/.+/,

  // API keys and tokens
  openaiKey: /^sk-[a-zA-Z0-9]+$/,
  anthropicKey: /^sk-ant-[a-zA-Z0-9-]+$/,
  stripeTestKey: /^sk_test_[a-zA-Z0-9]+$/,
  stripeLiveKey: /^sk_live_[a-zA-Z0-9]+$/,
  sendgridKey: /^SG\.[a-zA-Z0-9_-]+$/,

  // Identifiers
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+[1-9]\d{1,14}$/,
  awsRegion: /^[a-z]{2}-[a-z]+-\d{1}$/,
  semver: /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/,

  // Numbers
  port: /^\d{4,5}$/,
  positiveInt: /^\d+$/,
  float: /^\d+(\.\d+)?$/,

  // Time formats
  duration: /^\d+[smhdy]$/,

  // Boolean
  boolean: /^(true|false)$/,

  // Generic
  alphanumeric: /^[a-zA-Z0-9_-]+$/,
  base64: /^[A-Za-z0-9+/]+=*$/,
};

/**
 * Parse command line arguments
 */
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

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
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
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        console.error(`${colors.red}Unknown option: ${args[i]}${colors.reset}`);
        printHelp();
        process.exit(2);
    }
  }

  // Adjust paths for workspace validation
  if (options.workspace) {
    options.envPath = path.join(options.workspace, '.env');
    options.examplePath = path.join(options.workspace, '.env.example');
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
${colors.bright}Environment Variable Validation Script${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node scripts/validate-env.js [options]

${colors.cyan}Options:${colors.reset}
  --path <path>       Path to .env file (default: .env)
  --example <path>    Path to .env.example file (default: .env.example)
  --workspace <path>  Validate workspace-level .env (e.g., apps/web-dashboard)
  --strict            Exit with error on warnings
  --quiet             Suppress success messages
  --dry-run           Check without failing (exit code always 0)
  --help, -h          Show this help message

${colors.cyan}Examples:${colors.reset}
  # Validate root .env
  node scripts/validate-env.js

  # Validate workspace .env
  node scripts/validate-env.js --workspace apps/web-dashboard

  # Dry run (never fails)
  node scripts/validate-env.js --dry-run

${colors.cyan}Exit Codes:${colors.reset}
  0 - Validation successful
  1 - Validation errors found
  2 - File not found or parsing error
`);
}

/**
 * Parse .env.example file to extract variable schema
 */
function parseEnvExample(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const schema = {};

  let currentComment = [];
  let currentMetadata = {
    required: false,
    description: '',
    validation: null,
    default: null,
    enum: null,
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and section headers
    if (!trimmed || trimmed.startsWith('#=') || trimmed.startsWith('# ---')) {
      currentComment = [];
      continue;
    }

    // Parse comment lines for metadata
    if (trimmed.startsWith('#')) {
      const comment = trimmed.substring(1).trim();

      // Check for [REQUIRED] or [OPTIONAL]
      if (comment.startsWith('[REQUIRED]')) {
        currentMetadata.required = true;
        currentMetadata.description = comment.substring(10).trim();
      } else if (comment.startsWith('[OPTIONAL]')) {
        currentMetadata.required = false;
        currentMetadata.description = comment.substring(10).trim();
      } else if (comment.startsWith('Validation:')) {
        const validationText = comment.substring(11).trim();
        currentMetadata.validation = parseValidation(validationText);
      } else if (comment.startsWith('Default:')) {
        currentMetadata.default = comment.substring(8).trim();
      } else if (!currentMetadata.description) {
        currentMetadata.description = comment;
      }

      currentComment.push(comment);
      continue;
    }

    // Parse variable definition
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (match) {
      const varName = match[1];
      const example = trimmed.substring(match[0].length);

      schema[varName] = {
        ...currentMetadata,
        example,
        comments: [...currentComment],
      };

      // Reset metadata for next variable
      currentComment = [];
      currentMetadata = {
        required: false,
        description: '',
        validation: null,
        default: null,
        enum: null,
      };
    }
  }

  return schema;
}

/**
 * Parse validation string from comment into executable validation
 */
function parseValidation(validationText) {
  const validation = {
    type: null,
    pattern: null,
    enum: null,
    min: null,
    max: null,
  };

  // Check for "Must be one of:" enum validation
  const enumMatch = validationText.match(/Must be one of: ([a-zA-Z0-9|, ]+)/);
  if (enumMatch) {
    validation.type = 'enum';
    validation.enum = enumMatch[1]
      .split(/[,|]/)
      .map(v => v.trim())
      .filter(Boolean);
    return validation;
  }

  // Check for "Must start with"
  if (validationText.includes('Must start with')) {
    const match = validationText.match(/Must start with (.+)/);
    if (match) {
      validation.type = 'startsWith';
      validation.pattern = match[1].trim();
      return validation;
    }
  }

  // Check for "Must end with"
  if (validationText.includes('Must end with')) {
    const match = validationText.match(/Must end with (.+)/);
    if (match) {
      validation.type = 'endsWith';
      validation.pattern = match[1].trim();
      return validation;
    }
  }

  // Check for numeric range
  const rangeMatch = validationText.match(/Integer between (\d+)-(\d+)/);
  if (rangeMatch) {
    validation.type = 'range';
    validation.min = parseInt(rangeMatch[1], 10);
    validation.max = parseInt(rangeMatch[2], 10);
    return validation;
  }

  // Check for minimum length
  const minMatch = validationText.match(/Minimum (\d+) characters/);
  if (minMatch) {
    validation.type = 'minLength';
    validation.min = parseInt(minMatch[1], 10);
    return validation;
  }

  // Check for common patterns
  const patterns = {
    'Valid email format': validationPatterns.email,
    'Valid URL': validationPatterns.url,
    'PostgreSQL connection': validationPatterns.postgresql,
    'Redis connection': validationPatterns.redis,
    'RabbitMQ connection': validationPatterns.amqp,
    'Semver format': validationPatterns.semver,
    'AWS region': validationPatterns.awsRegion,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    if (validationText.includes(key)) {
      validation.type = 'regex';
      validation.pattern = pattern;
      return validation;
    }
  }

  return validation;
}

/**
 * Parse .env file into key-value pairs
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const env = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.substring(1, value.length - 1);
      }

      env[key] = value;
    }
  }

  return env;
}

/**
 * Validate a value against validation rules
 */
function validateValue(value, validation, varName) {
  if (!validation || !validation.type) {
    return { valid: true };
  }

  switch (validation.type) {
    case 'enum':
      if (!validation.enum.includes(value)) {
        return {
          valid: false,
          message: `Must be one of: ${validation.enum.join(', ')}. Got: ${value}`,
        };
      }
      break;

    case 'startsWith':
      if (!value.startsWith(validation.pattern)) {
        return {
          valid: false,
          message: `Must start with ${validation.pattern}`,
        };
      }
      break;

    case 'endsWith':
      if (!value.endsWith(validation.pattern)) {
        return {
          valid: false,
          message: `Must end with ${validation.pattern}`,
        };
      }
      break;

    case 'regex':
      if (!validation.pattern.test(value)) {
        return {
          valid: false,
          message: `Invalid format`,
        };
      }
      break;

    case 'range':
      const num = parseInt(value, 10);
      if (isNaN(num) || num < validation.min || num > validation.max) {
        return {
          valid: false,
          message: `Must be between ${validation.min} and ${validation.max}`,
        };
      }
      break;

    case 'minLength':
      if (value.length < validation.min) {
        return {
          valid: false,
          message: `Must be at least ${validation.min} characters`,
        };
      }
      break;
  }

  return { valid: true };
}

/**
 * Validate .env file against schema
 */
function validate(envData, schema) {
  const errors = [];
  const warnings = [];
  const info = [];

  // Check for missing required variables
  for (const [varName, metadata] of Object.entries(schema)) {
    if (metadata.required && !(varName in envData)) {
      errors.push({
        type: 'missing_required',
        variable: varName,
        message: `Required variable missing: ${varName}`,
        description: metadata.description,
      });
    }
  }

  // Validate existing variables
  for (const [varName, value] of Object.entries(envData)) {
    const metadata = schema[varName];

    // Check if variable is documented
    if (!metadata) {
      warnings.push({
        type: 'undocumented',
        variable: varName,
        message: `Variable not documented in .env.example: ${varName}`,
      });
      continue;
    }

    // Skip empty values for optional variables
    if (!value && !metadata.required) {
      continue;
    }

    // Validate empty required variables
    if (!value && metadata.required) {
      errors.push({
        type: 'empty_required',
        variable: varName,
        message: `Required variable is empty: ${varName}`,
        description: metadata.description,
      });
      continue;
    }

    // Validate value format
    const validationResult = validateValue(value, metadata.validation, varName);
    if (!validationResult.valid) {
      errors.push({
        type: 'invalid_format',
        variable: varName,
        message: `Invalid value for ${varName}: ${validationResult.message}`,
        value: value.substring(0, 50) + (value.length > 50 ? '...' : ''),
      });
    }
  }

  return { errors, warnings, info };
}

/**
 * Print validation results
 */
function printResults(results, options) {
  const { errors, warnings, info } = results;

  // Print errors
  if (errors.length > 0) {
    console.log(`\n${colors.red}${colors.bright}✗ Validation Errors:${colors.reset}`);
    for (const error of errors) {
      console.log(
        `\n  ${colors.red}●${colors.reset} ${colors.bright}${error.variable}${colors.reset}`
      );
      console.log(`    ${error.message}`);
      if (error.description) {
        console.log(`    ${colors.dim}${error.description}${colors.reset}`);
      }
      if (error.value) {
        console.log(`    ${colors.dim}Current value: ${error.value}${colors.reset}`);
      }
    }
    console.log('');
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bright}⚠ Warnings:${colors.reset}`);
    for (const warning of warnings) {
      console.log(`  ${colors.yellow}●${colors.reset} ${warning.message}`);
    }
    console.log('');
  }

  // Print summary
  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(
    `  Errors:   ${errors.length > 0 ? colors.red : colors.green}${errors.length}${colors.reset}`
  );
  console.log(
    `  Warnings: ${warnings.length > 0 ? colors.yellow : colors.green}${warnings.length}${colors.reset}`
  );

  // Determine exit code
  let exitCode = 0;
  if (errors.length > 0) {
    exitCode = 1;
  } else if (warnings.length > 0 && options.strict) {
    exitCode = 1;
  }

  if (exitCode === 0 && !options.quiet) {
    console.log(
      `\n${colors.green}${colors.bright}✓ Environment validation passed!${colors.reset}\n`
    );
  }

  return exitCode;
}

/**
 * Main execution
 */
function main() {
  try {
    const options = parseArgs();

    console.log(`${colors.bright}Validating environment configuration...${colors.reset}\n`);
    console.log(`  Example: ${colors.cyan}${options.examplePath}${colors.reset}`);
    console.log(`  Env:     ${colors.cyan}${options.envPath}${colors.reset}\n`);

    // Parse schema from .env.example
    const schema = parseEnvExample(options.examplePath);
    const schemaVarCount = Object.keys(schema).length;
    console.log(`  Schema variables: ${colors.cyan}${schemaVarCount}${colors.reset}`);

    // Parse .env file
    const envData = parseEnvFile(options.envPath);
    if (!envData) {
      console.warn(
        `${colors.yellow}Warning: ${options.envPath} not found. Checking required variables only.${colors.reset}\n`
      );

      // Check only for required variables
      const errors = Object.entries(schema)
        .filter(([_, metadata]) => metadata.required)
        .map(([varName, metadata]) => ({
          type: 'missing_required',
          variable: varName,
          message: `Required variable missing: ${varName}`,
          description: metadata.description,
        }));

      const results = { errors, warnings: [], info: [] };
      const exitCode = printResults(results, options);
      process.exit(options.dryRun ? 0 : exitCode);
    }

    const envVarCount = Object.keys(envData).length;
    console.log(`  Env variables:    ${colors.cyan}${envVarCount}${colors.reset}\n`);

    // Validate
    const results = validate(envData, schema);
    const exitCode = printResults(results, options);

    process.exit(options.dryRun ? 0 : exitCode);
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}Error:${colors.reset} ${error.message}\n`);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(2);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  parseEnvExample,
  parseEnvFile,
  validate,
  validateValue,
};
