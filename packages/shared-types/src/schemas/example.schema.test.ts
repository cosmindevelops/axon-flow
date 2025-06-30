import { describe, it, expect } from 'vitest';

import { UserSchema, CreateUserDtoSchema, UserRoleSchema, WorkflowSchema } from './example.schema.js';

describe('UserSchema', () => {
  it('should validate a valid user object', () => {
    const validUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      username: 'test_user123',
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = UserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('should reject invalid email', () => {
    const invalidUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'not-an-email',
      username: 'test_user',
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Invalid email format');
    }
  });

  it('should reject invalid username', () => {
    const invalidUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      username: 'te', // Too short
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Username must be at least 3 characters');
    }
  });
});

describe('CreateUserDtoSchema', () => {
  it('should validate create user DTO without id and timestamps', () => {
    const createDto = {
      email: 'new@example.com',
      username: 'new_user',
      role: 'USER',
      isActive: true,
    };

    const result = CreateUserDtoSchema.safeParse(createDto);
    expect(result.success).toBe(true);
  });

  it('should provide default value for isActive', () => {
    const createDto = {
      email: 'new@example.com',
      username: 'new_user',
      role: 'USER',
    };

    const result = CreateUserDtoSchema.safeParse(createDto);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });
});

describe('UserRoleSchema', () => {
  it('should accept valid roles', () => {
    expect(UserRoleSchema.safeParse('USER').success).toBe(true);
    expect(UserRoleSchema.safeParse('ADMIN').success).toBe(true);
    expect(UserRoleSchema.safeParse('SUPER_ADMIN').success).toBe(true);
  });

  it('should reject invalid roles', () => {
    expect(UserRoleSchema.safeParse('INVALID').success).toBe(false);
    expect(UserRoleSchema.safeParse('').success).toBe(false);
  });
});

describe('WorkflowSchema', () => {
  it('should validate a complete workflow', () => {
    const workflow = {
      id: 'clh1234567890abcdef',
      name: 'Test Workflow',
      description: 'A test workflow',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'ACTIVE',
      steps: [
        {
          id: 'step1',
          type: 'scraper',
          config: { url: 'https://example.com' },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(true);
  });
});
