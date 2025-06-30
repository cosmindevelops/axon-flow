import { z } from 'zod';

/**
 * Example schema to validate monorepo setup
 */

// Branded types for type safety
export const UserIdSchema = z.string().uuid().brand<'UserId'>();
export type UserId = z.infer<typeof UserIdSchema>;

// Role enum
export const UserRoleSchema = z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// Main user schema
export const UserSchema = z.object({
  id: UserIdSchema,
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  role: UserRoleSchema,
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type User = z.infer<typeof UserSchema>;

// Create user DTO
export const CreateUserDtoSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;

// Update user DTO
export const UpdateUserDtoSchema = CreateUserDtoSchema.partial();
export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;

// Example workflow schema
export const WorkflowSchema = z.object({
  id: z.string().cuid2(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  userId: UserIdSchema,
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']),
  steps: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      config: z.record(z.unknown()),
    })
  ),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;
