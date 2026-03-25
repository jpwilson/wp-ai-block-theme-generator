import { z } from 'zod';

/**
 * Zod schema for the block-tree JSON structure.
 * This is the intermediate representation between AI output and WordPress block markup.
 * The AI produces this JSON; the serializer converts it to <!-- wp:* --> markup.
 */

/** Attributes that can appear on any block */
const blockAttributesSchema = z.record(z.string(), z.unknown()).optional();

/** A single block node in the tree */
export interface BlockNode {
  name: string;
  attributes?: Record<string, unknown>;
  innerBlocks?: BlockNode[];
  /** Inner HTML content for content blocks (paragraph, heading, etc.) */
  innerContent?: string;
}

/** Recursive Zod schema for a block node */
export const blockNodeSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    attributes: blockAttributesSchema,
    innerBlocks: z.array(blockNodeSchema).optional(),
    innerContent: z.string().optional(),
  })
);

/** A template file (e.g., index.html, single.html) as a list of block nodes */
export const templateSchema = z.object({
  name: z.string().min(1),
  blocks: z.array(blockNodeSchema),
});

/** A template part (e.g., header.html, footer.html) */
export const templatePartSchema = z.object({
  name: z.string().min(1),
  area: z.enum(['header', 'footer', 'uncategorized']),
  blocks: z.array(blockNodeSchema),
});

/** A pattern definition */
export const patternSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  categories: z.array(z.string()).optional(),
  description: z.string().optional(),
  blocks: z.array(blockNodeSchema),
});

export type Template = z.infer<typeof templateSchema>;
export type TemplatePart = z.infer<typeof templatePartSchema>;
export type Pattern = z.infer<typeof patternSchema>;
