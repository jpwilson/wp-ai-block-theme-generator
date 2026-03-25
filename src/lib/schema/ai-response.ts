import { z } from 'zod';
import { templateSchema, templatePartSchema, patternSchema } from './block-tree';
import { themeJsonSchema } from './theme-json';

/**
 * Schema for the complete AI response.
 * This is what the AI returns: a structured JSON object containing
 * the full theme definition.
 */
export const aiResponseSchema = z.object({
  /** Theme metadata */
  themeName: z.string().min(1).max(200),
  themeDescription: z.string().max(2000).optional(),
  themeUri: z.string().optional(),

  /** The theme.json design system configuration */
  themeJson: themeJsonSchema,

  /** Template files (index.html is required) */
  templates: z.array(templateSchema).min(1),

  /** Template parts (header, footer, etc.) */
  templateParts: z.array(templatePartSchema).optional(),

  /** Pattern definitions */
  patterns: z.array(patternSchema).optional(),
});

export type AIResponse = z.infer<typeof aiResponseSchema>;
