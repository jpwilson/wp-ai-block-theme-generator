import { BlockNode } from '@/lib/schema';
import { SELF_CLOSING_BLOCKS } from '@/lib/schema/allowed-blocks';
import { serializeBlockInner } from './blocks';

/**
 * Serialize a block-tree (array of BlockNode) into WordPress block markup.
 * This is the deterministic core: given valid JSON, it always produces valid markup.
 */
export function serializeBlocks(blocks: BlockNode[]): string {
  return blocks.map(serializeBlock).join('\n\n');
}

/**
 * Serialize a single BlockNode into WordPress block markup.
 */
export function serializeBlock(block: BlockNode): string {
  const blockName = stripCorePrefix(block.name);
  const attrs = block.attributes && Object.keys(block.attributes).length > 0
    ? ` ${JSON.stringify(block.attributes)}`
    : '';

  // Self-closing blocks (no inner content or innerBlocks)
  if (SELF_CLOSING_BLOCKS.has(block.name)) {
    return `<!-- wp:${blockName}${attrs} /-->`;
  }

  // Get inner HTML from the block-specific serializer
  const innerHTML = serializeBlockInner(block);
  const innerBlocksMarkup = block.innerBlocks?.length
    ? '\n' + serializeBlocks(block.innerBlocks) + '\n'
    : '';

  // Blocks with both inner HTML wrapper and inner blocks (e.g., group, cover, columns)
  if (innerHTML !== null) {
    return `<!-- wp:${blockName}${attrs} -->\n${innerHTML.open}${innerBlocksMarkup}${innerHTML.close}\n<!-- /wp:${blockName} -->`;
  }

  // Simple content blocks without a wrapper element (shouldn't normally happen)
  if (innerBlocksMarkup) {
    return `<!-- wp:${blockName}${attrs} -->${innerBlocksMarkup}<!-- /wp:${blockName} -->`;
  }

  // Empty block
  return `<!-- wp:${blockName}${attrs} -->\n<!-- /wp:${blockName} -->`;
}

/** Strip the 'core/' prefix for serialization (WordPress convention) */
function stripCorePrefix(name: string): string {
  return name.startsWith('core/') ? name.slice(5) : name;
}
