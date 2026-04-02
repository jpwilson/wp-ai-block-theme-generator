/**
 * Core block allowlist for WordPress Block Theme generation.
 *
 * Source of truth: packages/block-library/src in the WordPress/gutenberg repo (WP 6.7+).
 * Strategy: include every stable core block EXCEPT the explicitly forbidden/internal ones.
 *
 * EXCLUDED (never generated in FSE themes):
 *   core/html, core/freeform    — forbidden: bypass the block system
 *   core/missing                — WP internal error-state block
 *   core/block-keyboard-shortcuts — editor UI, not theme content
 *   core/more, core/nextpage    — classic "read more" tag, not used in FSE
 *   core/shortcode              — shortcodes bypass FSE; not suitable for block themes
 *   core/accordion*, core/tab*, core/form*, core/math,
 *   core/icon, core/playlist*   — Gutenberg-plugin experimental blocks, not in WP core
 */

export const ALLOWED_BLOCKS = new Set([
  // ── Layout ────────────────────────────────────────────────────────────────
  'core/group',
  'core/columns',
  'core/column',
  'core/cover',
  'core/spacer',
  'core/separator',
  'core/details',

  // ── Text ──────────────────────────────────────────────────────────────────
  'core/paragraph',
  'core/heading',
  'core/list',
  'core/list-item',
  'core/quote',
  'core/pullquote',
  'core/verse',
  'core/code',
  'core/preformatted',
  'core/table',
  'core/table-of-contents',
  'core/footnotes',

  // ── Media ─────────────────────────────────────────────────────────────────
  'core/image',
  'core/gallery',
  'core/video',
  'core/audio',
  'core/file',
  'core/media-text',
  'core/embed',

  // ── Interactive / Navigation ───────────────────────────────────────────────
  'core/buttons',
  'core/button',
  'core/navigation',
  'core/navigation-link',
  'core/navigation-submenu',
  'core/navigation-overlay-close',
  'core/page-list',
  'core/page-list-item',
  'core/home-link',
  'core/search',
  'core/loginout',
  'core/social-links',
  'core/social-link',
  'core/rss',

  // ── Site / Theme Identity ─────────────────────────────────────────────────
  'core/site-title',
  'core/site-tagline',
  'core/site-logo',
  'core/template-part',
  'core/pattern',
  'core/breadcrumbs',

  // ── Post Meta / Single ────────────────────────────────────────────────────
  'core/post-title',
  'core/post-content',
  'core/post-excerpt',
  'core/post-date',
  'core/post-author',
  'core/post-author-name',
  'core/post-author-biography',
  'core/post-featured-image',
  'core/post-terms',
  'core/post-navigation-link',
  'core/post-time-to-read',
  'core/read-more',
  'core/avatar',

  // ── Query Loop / Archive ──────────────────────────────────────────────────
  'core/query',
  'core/post-template',
  'core/query-title',
  'core/query-no-results',
  'core/query-total',
  'core/query-pagination',
  'core/query-pagination-previous',
  'core/query-pagination-next',
  'core/query-pagination-numbers',
  'core/term-description',
  'core/archives',
  'core/categories',
  'core/tag-cloud',
  'core/calendar',
  'core/latest-posts',
  'core/latest-comments',

  // ── Comments ──────────────────────────────────────────────────────────────
  'core/comments',
  'core/comments-title',
  'core/comment-template',
  'core/comment-author-avatar',
  'core/comment-author-name',
  'core/comment-date',
  'core/comment-content',
  'core/comment-edit-link',
  'core/comment-reply-link',
  'core/comments-pagination',
  'core/comments-pagination-previous',
  'core/comments-pagination-numbers',
  'core/comments-pagination-next',
  'core/post-comments-form',
  'core/post-comments-count',
  'core/post-comments-link',
]);

/** Blocks that are explicitly forbidden — hard validation failure */
export const FORBIDDEN_BLOCKS = new Set([
  'core/html',
  'core/freeform',
]);

/** Self-closing blocks — no innerBlocks, no innerContent children */
export const SELF_CLOSING_BLOCKS = new Set([
  'core/site-title',
  'core/site-tagline',
  'core/site-logo',
  'core/search',
  'core/spacer',
  'core/separator',
  'core/post-title',
  'core/post-content',
  'core/post-excerpt',
  'core/post-date',
  'core/post-author',
  'core/post-author-name',
  'core/post-author-biography',
  'core/post-featured-image',
  'core/post-terms',
  'core/post-navigation-link',
  'core/post-time-to-read',
  'core/read-more',
  'core/avatar',
  'core/query-title',
  'core/query-total',
  'core/query-pagination-previous',
  'core/query-pagination-next',
  'core/query-pagination-numbers',
  'core/term-description',
  'core/archives',
  'core/categories',
  'core/tag-cloud',
  'core/calendar',
  'core/latest-comments',
  'core/comment-author-avatar',
  'core/comment-author-name',
  'core/comment-date',
  'core/comment-content',
  'core/comment-edit-link',
  'core/comment-reply-link',
  'core/comments-pagination-previous',
  'core/comments-pagination-numbers',
  'core/comments-pagination-next',
  'core/post-comments-form',
  'core/post-comments-count',
  'core/post-comments-link',
  'core/template-part',
  'core/loginout',
  'core/breadcrumbs',
  'core/home-link',
  'core/rss',
  'core/navigation-overlay-close',
]);

/** Blocks that can contain innerBlocks */
export const CONTAINER_BLOCKS = new Set([
  'core/group',
  'core/columns',
  'core/column',
  'core/cover',
  'core/details',
  'core/media-text',
  'core/gallery',
  'core/buttons',
  'core/list',
  'core/quote',
  'core/pullquote',
  'core/table',
  'core/navigation',
  'core/navigation-link',
  'core/navigation-submenu',
  'core/page-list',
  'core/social-links',
  'core/query',
  'core/post-template',
  'core/query-pagination',
  'core/query-no-results',
  'core/latest-posts',
  'core/comments',
  'core/comments-title',
  'core/comment-template',
  'core/comments-pagination',
  'core/pattern',
]);
