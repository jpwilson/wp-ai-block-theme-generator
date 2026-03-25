// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parse } = require('@wordpress/block-serialization-default-parser');
import { ValidationError } from './index';

/**
 * Layer 3: Validate serialized block markup by round-tripping
 * through WordPress's official block parser.
 *
 * If the parser can parse the markup without errors, the markup is valid.
 */
export function validateMarkup(
  markup: string,
  location: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  try {
    const parsed = parse(markup);

    if (!Array.isArray(parsed)) {
      errors.push({
        layer: 'markup',
        message: `Parser returned non-array result for ${location}`,
        path: location,
      });
      return errors;
    }

    // Check for blocks that the parser couldn't recognize (null blockName)
    for (const block of parsed) {
      if (block.blockName === null && block.innerHTML?.trim()) {
        // Freeform content outside of blocks — could indicate malformed markup
        const content = block.innerHTML.trim();
        // Skip whitespace-only freeform blocks (these are normal between blocks)
        if (content.length > 0 && !content.match(/^[\s\n]*$/)) {
          errors.push({
            layer: 'markup',
            message: `Freeform content detected outside blocks in ${location}: "${content.slice(0, 100)}..."`,
            path: location,
          });
        }
      }
    }
  } catch (e) {
    errors.push({
      layer: 'markup',
      message: `Parser error in ${location}: ${e instanceof Error ? e.message : String(e)}`,
      path: location,
    });
  }

  return errors;
}
