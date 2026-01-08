import { z } from 'zod';

// Common validation schemas for OpenInsights

export const idSchema = z.string().cuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const projectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const tagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#3B82F6'),
  description: z.string().max(500).optional(),
});

export const sourceSchema = z.object({
  name: z.string().min(1).max(255),
  fileType: z.enum(['video/mp4', 'video/webm', 'audio/mp3', 'audio/wav', 'audio/mpeg']),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type TagInput = z.infer<typeof tagSchema>;
export type SourceInput = z.infer<typeof sourceSchema>;
