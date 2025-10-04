/**
 * Commit message rules follow the IU-1 conventions for developer tooling.
 * Allowed types align with docs/main/002-technical-specification.md §9.2 checklist.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore']],
  },
};
