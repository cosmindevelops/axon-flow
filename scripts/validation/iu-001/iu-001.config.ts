import type { IUValidationConfig } from '../shared/types';

/**
 * IU-001 configuration per docs/main/003-validation_criteria.md (IU-1 V1.1-V1.20).
 */
export const iu001Config: IUValidationConfig = {
  id: 1,
  name: 'Project Foundation & Monorepo Setup',
  dependencies: [],
  timeout: 60_000,
  retries: 0,
  parallel: false,
  environment: {
    NODE_ENV: 'test',
    SKIP_EXTERNAL_DEPS: 'true',
  },
  fixtures: {
    required: [],
    cleanup: true,
  },
  reporting: {
    captureScreenshots: false,
    captureLogs: true,
    verbose: true,
  },
};
