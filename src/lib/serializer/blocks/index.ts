import { BlockNode } from '@/lib/schema';

/**
 * Block-specific inner HTML serializers.
 * Each returns an { open, close } pair for the wrapper element,
 * or null if the block has no wrapper.
 *
 * The inner blocks are serialized separately and placed between open/close.
 */

export interface InnerHTML {
  open: string;
  close: string;
}

type BlockSerializer = (block: BlockNode) => InnerHTML | null;

const serializers: Record<string, BlockSerializer> = {
  'core/group': serializeGroup,
  'core/columns': serializeColumns,
  'core/column': serializeColumn,
  'core/cover': serializeCover,
  'core/paragraph': serializeParagraph,
  'core/heading': serializeHeading,
  'core/image': serializeImage,
  'core/buttons': serializeButtons,
  'core/button': serializeButton,
  'core/list': serializeList,
  'core/list-item': serializeListItem,
  'core/quote': serializeQuote,
  'core/pullquote': serializePullquote,
  'core/verse': serializeVerse,
  'core/details': serializeDetails,
  'core/gallery': serializeGallery,
  'core/video': serializeVideo,
  'core/media-text': serializeMediaText,
  'core/social-links': serializeSocialLinks,
  'core/social-link': serializeSocialLink,
  'core/query': serializeQuery,
  'core/post-template': serializePostTemplate,
  'core/query-pagination': serializeQueryPagination,
  'core/query-no-results': serializeQueryNoResults,
};

export function serializeBlockInner(block: BlockNode): InnerHTML | null {
  const serializer = serializers[block.name];
  if (serializer) {
    return serializer(block);
  }
  return null;
}

// --- Layout blocks ---

function serializeGroup(block: BlockNode): InnerHTML {
  const tagName = (block.attributes?.tagName as string) || 'div';
  const className = buildClassName('wp-block-group', block.attributes);
  return {
    open: `<${tagName} class="${className}">`,
    close: `</${tagName}>`,
  };
}

function serializeColumns(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-columns', block.attributes);
  return {
    open: `<div class="${className}">`,
    close: `</div>`,
  };
}

function serializeColumn(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-column', block.attributes);
  const style = block.attributes?.width
    ? ` style="flex-basis:${block.attributes.width}"`
    : '';
  return {
    open: `<div class="${className}"${style}>`,
    close: `</div>`,
  };
}

function serializeCover(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-cover', block.attributes);
  const parts: string[] = [];
  parts.push(`<div class="${className}">`);
  parts.push(`<span class="wp-block-cover__background has-background-dim"></span>`);
  if (block.attributes?.url) {
    parts.push(`<img class="wp-block-cover__image-background" src="${escapeAttr(block.attributes.url as string)}" alt="" />`);
  }
  parts.push(`<div class="wp-block-cover__inner-container">`);
  return {
    open: parts.join('\n'),
    close: `</div>\n</div>`,
  };
}

// --- Text blocks ---

function serializeParagraph(block: BlockNode): InnerHTML {
  const content = block.innerContent || '';
  const alignClass = block.attributes?.align
    ? ` has-text-align-${block.attributes.align}`
    : '';
  const className = alignClass ? ` class="${alignClass.trim()}"` : '';
  return {
    open: `<p${className}>${escapeHtml(content)}</p>`,
    close: '',
  };
}

function serializeHeading(block: BlockNode): InnerHTML {
  const level = (block.attributes?.level as number) || 2;
  const tag = `h${level}`;
  const content = block.innerContent || '';
  const alignClass = block.attributes?.textAlign
    ? ` has-text-align-${block.attributes.textAlign}`
    : '';
  const className = `wp-block-heading${alignClass}`;
  return {
    open: `<${tag} class="${className}">${escapeHtml(content)}</${tag}>`,
    close: '',
  };
}

function serializeList(block: BlockNode): InnerHTML {
  const ordered = block.attributes?.ordered as boolean;
  const tag = ordered ? 'ol' : 'ul';
  const className = buildClassName('wp-block-list', block.attributes);
  return {
    open: `<${tag} class="${className}">`,
    close: `</${tag}>`,
  };
}

function serializeListItem(block: BlockNode): InnerHTML {
  const content = block.innerContent || '';
  return {
    open: `<li>${escapeHtml(content)}</li>`,
    close: '',
  };
}

function serializeQuote(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-quote', block.attributes);
  return {
    open: `<blockquote class="${className}">`,
    close: `</blockquote>`,
  };
}

function serializePullquote(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-pullquote', block.attributes);
  return {
    open: `<figure class="${className}"><blockquote>`,
    close: `</blockquote></figure>`,
  };
}

function serializeVerse(block: BlockNode): InnerHTML {
  const content = block.innerContent || '';
  return {
    open: `<pre class="wp-block-verse">${escapeHtml(content)}</pre>`,
    close: '',
  };
}

function serializeDetails(block: BlockNode): InnerHTML {
  const summary = (block.attributes?.summary as string) || 'Details';
  return {
    open: `<details class="wp-block-details"><summary>${escapeHtml(summary)}</summary>`,
    close: `</details>`,
  };
}

// --- Media blocks ---

function serializeImage(block: BlockNode): InnerHTML {
  const sizeSlug = (block.attributes?.sizeSlug as string) || 'large';
  const src = (block.attributes?.url as string) || '';
  const alt = (block.attributes?.alt as string) || '';
  const className = buildClassName(`wp-block-image size-${sizeSlug}`, block.attributes);
  return {
    open: `<figure class="${className}"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" /></figure>`,
    close: '',
  };
}

function serializeGallery(block: BlockNode): InnerHTML {
  const columns = (block.attributes?.columns as number) || 3;
  const className = `wp-block-gallery has-nested-images columns-${columns}`;
  return {
    open: `<figure class="${className}">`,
    close: `</figure>`,
  };
}

function serializeVideo(block: BlockNode): InnerHTML {
  const src = (block.attributes?.src as string) || '';
  return {
    open: `<figure class="wp-block-video"><video controls src="${escapeAttr(src)}"></video></figure>`,
    close: '',
  };
}

function serializeMediaText(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-media-text', block.attributes);
  const mediaUrl = (block.attributes?.mediaUrl as string) || '';
  const mediaType = (block.attributes?.mediaType as string) || 'image';
  const mediaMarkup = mediaType === 'video'
    ? `<video controls src="${escapeAttr(mediaUrl)}"></video>`
    : `<img src="${escapeAttr(mediaUrl)}" alt="" />`;
  return {
    open: `<div class="${className}"><figure class="wp-block-media-text__media">${mediaMarkup}</figure><div class="wp-block-media-text__content">`,
    close: `</div></div>`,
  };
}

// --- Interactive blocks ---

function serializeButtons(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-buttons', block.attributes);
  return {
    open: `<div class="${className}">`,
    close: `</div>`,
  };
}

function serializeButton(block: BlockNode): InnerHTML {
  const text = block.innerContent || '';
  const url = (block.attributes?.url as string) || '#';
  const className = buildClassName('wp-block-button', block.attributes);
  return {
    open: `<div class="${className}"><a class="wp-block-button__link wp-element-button" href="${escapeAttr(url)}">${escapeHtml(text)}</a></div>`,
    close: '',
  };
}

function serializeSocialLinks(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-social-links', block.attributes);
  return {
    open: `<ul class="${className}">`,
    close: `</ul>`,
  };
}

function serializeSocialLink(block: BlockNode): InnerHTML {
  const service = (block.attributes?.service as string) || '';
  const url = (block.attributes?.url as string) || '#';
  return {
    open: `<li class="wp-social-link wp-social-link-${escapeAttr(service)}"><a href="${escapeAttr(url)}" class="wp-block-social-link-anchor">${escapeHtml(service)}</a></li>`,
    close: '',
  };
}

// --- Query / Post blocks ---

function serializeQuery(_block: BlockNode): InnerHTML {
  return {
    open: `<div class="wp-block-query">`,
    close: `</div>`,
  };
}

function serializePostTemplate(_block: BlockNode): InnerHTML {
  // Post template is a container — innerBlocks are the loop body
  return {
    open: ``,
    close: ``,
  };
}

function serializeQueryPagination(_block: BlockNode): InnerHTML {
  return {
    open: `<div class="wp-block-query-pagination">`,
    close: `</div>`,
  };
}

function serializeQueryNoResults(_block: BlockNode): InnerHTML {
  return {
    open: ``,
    close: ``,
  };
}

// --- Helpers ---

function buildClassName(base: string, attributes?: Record<string, unknown>): string {
  const classes = [base];
  if (attributes?.align) {
    classes.push(`align${attributes.align}`);
  }
  if (attributes?.className) {
    classes.push(attributes.className as string);
  }
  return classes.join(' ');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
