import { aiResponseSchema, AIResponse, BlockNode } from '@/lib/schema';
import { ALLOWED_BLOCKS, FORBIDDEN_BLOCKS } from '@/lib/schema/allowed-blocks';
import { validateMarkup } from './markup-validator';
import { serializeBlocks } from '@/lib/serializer';

export interface ValidationResult {
  valid: boolean;
  data?: AIResponse;
  errors: ValidationError[];
}

export interface ValidationError {
  layer: 'schema' | 'allowlist' | 'markup';
  message: string;
  path?: string;
}

/**
 * Three-layer validation pipeline.
 *
 * Layer 1: JSON parse + Zod schema validation
 * Layer 2: Block allowlist — reject forbidden/unknown blocks
 * Layer 3: Serialize + round-trip through WP block parser
 */
export function validateAIResponse(rawJson: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // Layer 1: Zod schema validation
  const parseResult = aiResponseSchema.safeParse(rawJson);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        layer: 'schema',
        message: issue.message,
        path: issue.path.join('.'),
      });
    }
    return { valid: false, errors };
  }

  const data = parseResult.data;

  // Layer 2: Block allowlist check
  const allBlocks = collectAllBlocks(data);
  for (const { block, location } of allBlocks) {
    if (FORBIDDEN_BLOCKS.has(block.name)) {
      errors.push({
        layer: 'allowlist',
        message: `Forbidden block "${block.name}" detected. Custom HTML and Classic blocks are not allowed.`,
        path: location,
      });
    } else if (!ALLOWED_BLOCKS.has(block.name)) {
      errors.push({
        layer: 'allowlist',
        message: `Unknown block "${block.name}" is not in the allowed blocks list.`,
        path: location,
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Layer 3: Serialize and round-trip through WP parser
  try {
    // Validate templates
    for (const template of data.templates) {
      const markup = serializeBlocks(template.blocks);
      const markupErrors = validateMarkup(markup, `template:${template.name}`);
      errors.push(...markupErrors);
    }

    // Validate template parts
    if (data.templateParts) {
      for (const part of data.templateParts) {
        const markup = serializeBlocks(part.blocks);
        const markupErrors = validateMarkup(markup, `part:${part.name}`);
        errors.push(...markupErrors);
      }
    }

    // Validate patterns
    if (data.patterns) {
      for (const pattern of data.patterns) {
        const markup = serializeBlocks(pattern.blocks);
        const markupErrors = validateMarkup(markup, `pattern:${pattern.slug}`);
        errors.push(...markupErrors);
      }
    }
  } catch (e) {
    errors.push({
      layer: 'markup',
      message: `Serialization error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors,
  };
}

/** Collect all blocks from the AI response with their location paths */
function collectAllBlocks(
  data: AIResponse
): Array<{ block: BlockNode; location: string }> {
  const results: Array<{ block: BlockNode; location: string }> = [];

  function walkBlocks(blocks: BlockNode[], prefix: string) {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const path = `${prefix}[${i}]:${block.name}`;
      results.push({ block, location: path });
      if (block.innerBlocks?.length) {
        walkBlocks(block.innerBlocks, path);
      }
    }
  }

  for (const template of data.templates) {
    walkBlocks(template.blocks, `template:${template.name}`);
  }

  if (data.templateParts) {
    for (const part of data.templateParts) {
      walkBlocks(part.blocks, `part:${part.name}`);
    }
  }

  if (data.patterns) {
    for (const pattern of data.patterns) {
      walkBlocks(pattern.blocks, `pattern:${pattern.slug}`);
    }
  }

  return results;
}
