import { BlockNode } from '@/lib/schema';

/**
 * Block-specific inner HTML serializers.
 *
 * WordPress stores text content in block *attributes* (e.g. attributes.content
 * for headings/paragraphs, attributes.text for buttons). The innerContent field
 * in our simplified schema is a fallback only — the AI correctly puts content
 * in attributes per the WP block spec.
 *
 * Rule: always read from the correct attribute first, fall back to innerContent.
 * Content from attributes is raw HTML — do NOT escape it.
 * Content from innerContent is plain text — DO escape it.
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
  'core/code': serializeCode,
  'core/preformatted': serializePreformatted,
  'core/details': serializeDetails,
  'core/gallery': serializeGallery,
  'core/audio': serializeAudio,
  'core/video': serializeVideo,
  'core/file': serializeFile,
  'core/media-text': serializeMediaText,
  'core/social-links': serializeSocialLinks,
  'core/social-link': serializeSocialLink,
  'core/navigation': serializeNavigation,
  'core/navigation-link': serializeNavigationLink,
  'core/navigation-submenu': serializeNavigationSubmenu,
  'core/query': serializeQuery,
  'core/post-template': serializePostTemplate,
  'core/query-pagination': serializeQueryPagination,
  'core/query-no-results': serializeQueryNoResults,
  'core/comments': serializeComments,
  'core/comment-template': serializeCommentTemplate,
  'core/comments-pagination': serializeCommentsPagination,
  'core/latest-posts': serializeLatestPosts,
};

export function serializeBlockInner(block: BlockNode): InnerHTML | null {
  const serializer = serializers[block.name];
  return serializer ? serializer(block) : null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get text content: prefer attributes.content (raw HTML), fall back to innerContent (plain text, escaped) */
function getContent(block: BlockNode): string {
  const fromAttr = block.attributes?.content as string | undefined;
  if (fromAttr) return fromAttr; // raw HTML from AI — output as-is
  const fromInner = block.innerContent;
  if (fromInner) return escapeHtml(fromInner); // plain text — escape
  return '';
}

/** Get button label: prefer attributes.text, then attributes.content, then innerContent */
function getButtonText(block: BlockNode): string {
  const text = (block.attributes?.text as string)
    || (block.attributes?.content as string)
    || block.innerContent
    || '';
  return text;
}

// ── Layout blocks ─────────────────────────────────────────────────────────────

function serializeGroup(block: BlockNode): InnerHTML {
  const tagName = (block.attributes?.tagName as string) || 'div';
  const className = buildClassName('wp-block-group', block.attributes);
  const style = buildStyleAttr(block.attributes);
  return {
    open: `<${tagName} class="${className}"${style}>`,
    close: `</${tagName}>`,
  };
}

function serializeColumns(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-columns', block.attributes);
  const style = buildStyleAttr(block.attributes);
  return {
    open: `<div class="${className}"${style}>`,
    close: `</div>`,
  };
}

function serializeColumn(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-column', block.attributes);
  const style = buildStyleAttr(block.attributes);
  const widthStyle = block.attributes?.width ? `flex-basis:${block.attributes.width};` : '';
  const combinedStyle = widthStyle
    ? ` style="${widthStyle}${style ? style.slice(8, -1) : ''}"` // merge styles
    : style;
  return {
    open: `<div class="${className}"${combinedStyle}>`,
    close: `</div>`,
  };
}

function serializeCover(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-cover', block.attributes);
  const dimRatio = (block.attributes?.dimRatio as number) ?? 50;
  const url = (block.attributes?.url as string) || '';
  const minHeight = (block.attributes?.minHeight as number | string) || 500;
  const minHeightUnit = (block.attributes?.minHeightUnit as string) || 'px';
  const styleObj = block.attributes?.style as Record<string, Record<string, string>> | undefined;
  const customMinHeight = styleObj?.dimensions?.minHeight;
  const heightStyle = customMinHeight
    ? `min-height:${customMinHeight}`
    : `min-height:${minHeight}${minHeightUnit}`;
  const extraStyle = buildStyleAttr(block.attributes);
  const fullStyle = extraStyle || ` style="${heightStyle}"`;

  const parts: string[] = [];
  parts.push(`<div class="${className}"${fullStyle}>`);
  parts.push(`<span aria-hidden="true" class="wp-block-cover__background has-background-dim" style="opacity:${dimRatio / 100}"></span>`);
  if (url) {
    parts.push(`<img class="wp-block-cover__image-background" src="${escapeAttr(url)}" alt="" data-object-fit="cover" />`);
  }
  parts.push(`<div class="wp-block-cover__inner-container">`);
  return {
    open: parts.join('\n'),
    close: `</div>\n</div>`,
  };
}

// ── Text blocks ───────────────────────────────────────────────────────────────

function serializeParagraph(block: BlockNode): InnerHTML {
  const content = getContent(block);
  const className = buildClassName('', block.attributes).trim();
  const style = buildStyleAttr(block.attributes);
  const classAttr = className ? ` class="${className}"` : '';
  return {
    open: `<p${classAttr}${style}>${content}</p>`,
    close: '',
  };
}

function serializeHeading(block: BlockNode): InnerHTML {
  const level = (block.attributes?.level as number) || 2;
  const tag = `h${level}`;
  const content = getContent(block);
  const className = buildClassName('wp-block-heading', block.attributes);
  const style = buildStyleAttr(block.attributes);
  return {
    open: `<${tag} class="${className}"${style}>${content}</${tag}>`,
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
  const content = getContent(block);
  return {
    open: `<li>${content}`,
    close: `</li>`,
  };
}

function serializeQuote(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-quote', block.attributes);
  // If the AI put quote text in attributes.value (older WP convention), render it
  const value = block.attributes?.value as string | undefined;
  const citation = block.attributes?.citation as string | undefined;
  if (value && !block.innerBlocks?.length) {
    const citeHtml = citation ? `<cite>${escapeHtml(citation)}</cite>` : '';
    return {
      open: `<blockquote class="${className}"><p>${value}</p>${citeHtml}</blockquote>`,
      close: '',
    };
  }
  return {
    open: `<blockquote class="${className}">`,
    close: `</blockquote>`,
  };
}

function serializePullquote(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-pullquote', block.attributes);
  const value = block.attributes?.value as string | undefined;
  const citation = block.attributes?.citation as string | undefined;
  if (value && !block.innerBlocks?.length) {
    const citeHtml = citation ? `<cite>${escapeHtml(citation)}</cite>` : '';
    return {
      open: `<figure class="${className}"><blockquote><p>${value}</p>${citeHtml}</blockquote></figure>`,
      close: '',
    };
  }
  return {
    open: `<figure class="${className}"><blockquote>`,
    close: `</blockquote></figure>`,
  };
}

function serializeVerse(block: BlockNode): InnerHTML {
  const content = getContent(block);
  return {
    open: `<pre class="wp-block-verse">${content}</pre>`,
    close: '',
  };
}

function serializeCode(block: BlockNode): InnerHTML {
  const content = getContent(block);
  return {
    open: `<pre class="wp-block-code"><code>${escapeHtml(content)}</code></pre>`,
    close: '',
  };
}

function serializePreformatted(block: BlockNode): InnerHTML {
  const content = getContent(block);
  return {
    open: `<pre class="wp-block-preformatted">${content}</pre>`,
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

// ── Media blocks ──────────────────────────────────────────────────────────────

function serializeImage(block: BlockNode): InnerHTML {
  const sizeSlug = (block.attributes?.sizeSlug as string) || 'large';
  const src = (block.attributes?.url as string) || '';
  const alt = (block.attributes?.alt as string) || '';
  const href = (block.attributes?.href as string) || '';
  const aspectRatio = (block.attributes?.aspectRatio as string) || '';
  const className = buildClassName(`wp-block-image size-${sizeSlug}`, block.attributes);
  const style = buildStyleAttr(block.attributes);
  const imgStyle = aspectRatio ? ` style="aspect-ratio:${aspectRatio};object-fit:cover"` : '';
  const img = `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${imgStyle} />`;
  const inner = href ? `<a href="${escapeAttr(href)}">${img}</a>` : img;
  return {
    open: `<figure class="${className}"${style}>${inner}</figure>`,
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

function serializeAudio(block: BlockNode): InnerHTML {
  const src = (block.attributes?.src as string) || '';
  return {
    open: `<figure class="wp-block-audio"><audio controls src="${escapeAttr(src)}"></audio></figure>`,
    close: '',
  };
}

function serializeVideo(block: BlockNode): InnerHTML {
  const src = (block.attributes?.src as string) || '';
  return {
    open: `<figure class="wp-block-video"><video controls src="${escapeAttr(src)}"></video></figure>`,
    close: '',
  };
}

function serializeFile(block: BlockNode): InnerHTML {
  const href = (block.attributes?.href as string) || '#';
  const fileName = (block.attributes?.fileName as string) || 'Download';
  return {
    open: `<div class="wp-block-file"><a href="${escapeAttr(href)}">${escapeHtml(fileName)}</a></div>`,
    close: '',
  };
}

function serializeMediaText(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-media-text', block.attributes);
  // AI may use "url" or "mediaUrl"
  const mediaUrl = (block.attributes?.mediaUrl as string)
    || (block.attributes?.url as string)
    || '';
  const mediaType = (block.attributes?.mediaType as string) || 'image';
  const mediaMarkup = mediaType === 'video'
    ? `<video controls src="${escapeAttr(mediaUrl)}"></video>`
    : `<img src="${escapeAttr(mediaUrl)}" alt="" />`;
  return {
    open: `<div class="${className}"><figure class="wp-block-media-text__media">${mediaMarkup}</figure><div class="wp-block-media-text__content">`,
    close: `</div></div>`,
  };
}

// ── Interactive blocks ────────────────────────────────────────────────────────

function serializeButtons(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-buttons', block.attributes);
  const style = buildStyleAttr(block.attributes);
  return {
    open: `<div class="${className}"${style}>`,
    close: `</div>`,
  };
}

function serializeButton(block: BlockNode): InnerHTML {
  // AI uses attributes.text (WP spec) — getButtonText handles all variants
  const text = getButtonText(block);
  const url = (block.attributes?.url as string) || '#';
  const className = buildClassName('wp-block-button', block.attributes);
  const style = buildStyleAttr(block.attributes);
  const linkClass = buildClassName('wp-block-button__link wp-element-button', block.attributes);
  return {
    open: `<div class="${className}"${style}><a class="${linkClass}" href="${escapeAttr(url)}">${text}</a></div>`,
    close: '',
  };
}

function serializeNavigation(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-navigation', block.attributes);
  const style = buildStyleAttr(block.attributes);
  return {
    open: `<nav class="${className}"${style}>`,
    close: `</nav>`,
  };
}

function serializeNavigationLink(block: BlockNode): InnerHTML {
  const label = (block.attributes?.label as string) || '';
  const url = (block.attributes?.url as string) || '#';
  const className = buildClassName('wp-block-navigation-item wp-block-navigation-link', block.attributes);
  return {
    open: `<li class="${className}"><a class="wp-block-navigation-item__content" href="${escapeAttr(url)}">${escapeHtml(label)}</a>`,
    close: `</li>`,
  };
}

function serializeNavigationSubmenu(block: BlockNode): InnerHTML {
  const label = (block.attributes?.label as string) || '';
  const url = (block.attributes?.url as string) || '#';
  const className = buildClassName('wp-block-navigation-item wp-block-navigation-submenu', block.attributes);
  return {
    open: `<li class="${className}"><button class="wp-block-navigation-item__content wp-block-navigation-submenu__toggle"><a href="${escapeAttr(url)}">${escapeHtml(label)}</a></button><ul class="wp-block-navigation__submenu-container">`,
    close: `</ul></li>`,
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
  const label = (block.attributes?.label as string) || service;
  return {
    open: `<li class="wp-social-link wp-social-link-${escapeAttr(service)}"><a href="${escapeAttr(url)}" class="wp-block-social-link-anchor" aria-label="${escapeAttr(label)}"><span class="wp-block-social-link-label screen-reader-text">${escapeHtml(label)}</span></a></li>`,
    close: '',
  };
}

// ── Query / Post blocks ───────────────────────────────────────────────────────

function serializeQuery(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-query', block.attributes);
  return {
    open: `<div class="${className}">`,
    close: `</div>`,
  };
}

function serializePostTemplate(_block: BlockNode): InnerHTML {
  return { open: '', close: '' };
}

function serializeQueryPagination(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-query-pagination', block.attributes);
  return {
    open: `<div class="${className}">`,
    close: `</div>`,
  };
}

function serializeQueryNoResults(_block: BlockNode): InnerHTML {
  return { open: '', close: '' };
}

function serializeComments(_block: BlockNode): InnerHTML {
  return {
    open: `<div class="wp-block-comments">`,
    close: `</div>`,
  };
}

function serializeCommentTemplate(_block: BlockNode): InnerHTML {
  return { open: '', close: '' };
}

function serializeCommentsPagination(_block: BlockNode): InnerHTML {
  return {
    open: `<div class="wp-block-comments-pagination">`,
    close: `</div>`,
  };
}

function serializeLatestPosts(block: BlockNode): InnerHTML {
  const className = buildClassName('wp-block-latest-posts', block.attributes);
  return {
    open: `<ul class="${className}">`,
    close: `</ul>`,
  };
}

// ── Class / style builders ────────────────────────────────────────────────────

function buildClassName(base: string, attributes?: Record<string, unknown>): string {
  const classes = base ? [base] : [];

  if (attributes?.align) classes.push(`align${attributes.align}`);
  if (attributes?.className) classes.push(attributes.className as string);

  // Text alignment — WP uses textAlign attribute
  if (attributes?.textAlign) classes.push(`has-text-align-${attributes.textAlign}`);

  // Preset color classes — apply theme.json palette
  if (attributes?.backgroundColor) {
    classes.push(`has-${attributes.backgroundColor}-background-color`, 'has-background');
  }
  if (attributes?.textColor) {
    classes.push(`has-${attributes.textColor}-color`, 'has-text-color');
  }
  if (attributes?.gradient) {
    classes.push(`has-${attributes.gradient}-gradient-background`, 'has-background');
  }
  if (attributes?.fontSize) classes.push(`has-${attributes.fontSize}-font-size`);
  if (attributes?.fontFamily) classes.push(`has-${attributes.fontFamily}-font-family`);

  return classes.filter(Boolean).join(' ');
}

function buildStyleAttr(attributes?: Record<string, unknown>): string {
  const style = attributes?.style as Record<string, unknown> | undefined;
  if (!style) return '';

  const parts: string[] = [];

  // Spacing
  const spacing = style.spacing as Record<string, unknown> | undefined;
  if (spacing?.padding) {
    const p = spacing.padding as Record<string, string>;
    if (typeof p === 'string') {
      parts.push(`padding:${p}`);
    } else {
      if (p.top) parts.push(`padding-top:${p.top}`);
      if (p.right) parts.push(`padding-right:${p.right}`);
      if (p.bottom) parts.push(`padding-bottom:${p.bottom}`);
      if (p.left) parts.push(`padding-left:${p.left}`);
    }
  }
  if (spacing?.margin) {
    const m = spacing.margin as Record<string, string>;
    if (m.top) parts.push(`margin-top:${m.top}`);
    if (m.bottom) parts.push(`margin-bottom:${m.bottom}`);
    if (m.left) parts.push(`margin-left:${m.left}`);
    if (m.right) parts.push(`margin-right:${m.right}`);
  }
  if (spacing?.blockGap) {
    const g = spacing.blockGap as string | Record<string, string>;
    if (typeof g === 'string') parts.push(`gap:${g}`);
  }

  // Color
  const color = style.color as Record<string, string> | undefined;
  if (color?.background) parts.push(`background-color:${color.background}`);
  if (color?.text) parts.push(`color:${color.text}`);
  if (color?.gradient) parts.push(`background:${color.gradient}`);

  // Typography
  const typography = style.typography as Record<string, string> | undefined;
  if (typography?.fontSize) parts.push(`font-size:${typography.fontSize}`);
  if (typography?.fontWeight) parts.push(`font-weight:${typography.fontWeight}`);
  if (typography?.lineHeight) parts.push(`line-height:${typography.lineHeight}`);
  if (typography?.letterSpacing) parts.push(`letter-spacing:${typography.letterSpacing}`);
  if (typography?.textTransform) parts.push(`text-transform:${typography.textTransform}`);
  if (typography?.textDecoration) parts.push(`text-decoration:${typography.textDecoration}`);
  if (typography?.fontStyle) parts.push(`font-style:${typography.fontStyle}`);

  // Border
  const border = style.border as Record<string, string> | undefined;
  if (border?.radius) parts.push(`border-radius:${border.radius}`);
  if (border?.width) parts.push(`border-width:${border.width}`);
  if (border?.color) parts.push(`border-color:${border.color}`);
  if (border?.style) parts.push(`border-style:${border.style}`);

  // Dimensions
  const dimensions = style.dimensions as Record<string, string> | undefined;
  if (dimensions?.minHeight) parts.push(`min-height:${dimensions.minHeight}`);

  if (parts.length === 0) return '';
  return ` style="${parts.join(';')}"`;
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
