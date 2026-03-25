/**
 * Core block allowlist for WordPress Block Theme generation.
 * Only these blocks may appear in generated themes.
 * core/html and core/freeform are explicitly FORBIDDEN.
 */

export const ALLOWED_BLOCKS = new Set([
  // Layout
  'core/group',
  'core/columns',
  'core/column',
  'core/cover',
  'core/spacer',
  'core/separator',

  // Text
  'core/paragraph',
  'core/heading',
  'core/list',
  'core/list-item',
  'core/quote',
  'core/pullquote',
  'core/verse',
  'core/details',

  // Media
  'core/image',
  'core/gallery',
  'core/video',
  'core/media-text',

  // Interactive
  'core/buttons',
  'core/button',
  'core/navigation',
  'core/search',
  'core/social-links',
  'core/social-link',

  // Theme / Site
  'core/site-title',
  'core/site-tagline',
  'core/site-logo',
  'core/template-part',

  // Post / Query
  'core/query',
  'core/post-template',
  'core/post-title',
  'core/post-content',
  'core/post-excerpt',
  'core/post-date',
  'core/post-author',
  'core/post-featured-image',
  'core/post-terms',
  'core/query-pagination',
  'core/query-pagination-previous',
  'core/query-pagination-next',
  'core/query-pagination-numbers',
  'core/query-no-results',
]);

/** Blocks that are explicitly forbidden — hard validation failure */
export const FORBIDDEN_BLOCKS = new Set([
  'core/html',
  'core/freeform',
]);

/** Self-closing blocks that have no inner content or innerBlocks */
export const SELF_CLOSING_BLOCKS = new Set([
  'core/site-title',
  'core/site-tagline',
  'core/site-logo',
  'core/navigation',
  'core/search',
  'core/spacer',
  'core/separator',
  'core/post-title',
  'core/post-content',
  'core/post-excerpt',
  'core/post-date',
  'core/post-author',
  'core/post-featured-image',
  'core/post-terms',
  'core/query-pagination-previous',
  'core/query-pagination-next',
  'core/query-pagination-numbers',
  'core/template-part',
]);

/** Blocks that can contain innerBlocks */
export const CONTAINER_BLOCKS = new Set([
  'core/group',
  'core/columns',
  'core/column',
  'core/cover',
  'core/query',
  'core/post-template',
  'core/query-pagination',
  'core/query-no-results',
  'core/buttons',
  'core/list',
  'core/quote',
  'core/pullquote',
  'core/details',
  'core/gallery',
  'core/media-text',
  'core/social-links',
]);
