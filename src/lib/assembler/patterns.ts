import { Pattern } from '@/lib/schema';

/**
 * Generate a pattern PHP file with proper headers for auto-registration
 * in WordPress's Pattern Library.
 */
export function generatePatternPhp(
  pattern: Pattern,
  themeSlug: string,
  blockMarkup: string,
): string {
  const safeTitle = sanitizePhpString(pattern.title);
  const safeSlug = `${themeSlug}/${sanitizeSlug(pattern.slug)}`;
  const safeDescription = sanitizePhpString(pattern.description || '');
  const categories = (pattern.categories || ['featured']).join(', ');

  return `<?php
/**
 * Title: ${safeTitle}
 * Slug: ${safeSlug}
 * Categories: ${categories}
 * Description: ${safeDescription}
 * Viewport Width: 1200
 * Inserter: true
 */
?>
${blockMarkup}
`;
}

function sanitizePhpString(str: string): string {
  // Remove characters that could break PHP comment syntax or inject code
  return str
    .replace(/\*\//g, '')
    .replace(/\/\*/g, '')
    .replace(/\?>/g, '')
    .replace(/<\?/g, '')
    .trim();
}

function sanitizeSlug(slug: string): string {
  // Remove the theme prefix if already present, keep only the pattern name
  const parts = slug.split('/');
  const name = parts[parts.length - 1];
  return name.replace(/[^a-z0-9-]/g, '');
}
