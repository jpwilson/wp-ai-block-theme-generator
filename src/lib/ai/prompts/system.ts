import { ALLOWED_BLOCKS } from '@/lib/schema/allowed-blocks';

/**
 * System prompt for WordPress Block Theme generation.
 * Kept minimal — AI models already know WordPress blocks.
 * Only includes: output schema, rules, and allowed blocks list.
 */
export function getSystemPrompt(): string {
  const allowedBlocksList = Array.from(ALLOWED_BLOCKS).join(', ');

  return `You are a WordPress Block Theme expert. Generate a complete theme as a JSON object.

## RULES
1. NEVER use core/html or core/freeform. FORBIDDEN.
2. Output ONLY valid JSON. No markdown, no code fences. Start with { end with }.
3. Allowed blocks: ${allowedBlocksList}
4. Be concise: 4 templates (index, single, page, 404), 2 patterns, short content text.

## JSON SCHEMA
{
  "themeName": "string",
  "themeDescription": "string",
  "themeJson": { version: 3, settings: { color: { palette: [...] }, typography: { fontFamilies: [...], fontSizes: [...] }, spacing: { spacingSizes: [...] }, layout: { contentSize, wideSize } }, styles: { color: { background, text }, typography: { fontFamily, fontSize }, elements: { link, button, h1, h2, h3 } }, templateParts: [{ area, name, title }] },
  "templates": [{ "name": "index", "blocks": [BlockNode...] }],
  "templateParts": [{ "name": "header", "area": "header", "blocks": [BlockNode...] }],
  "patterns": [{ "name": "hero", "title": "Hero", "slug": "theme/hero", "categories": ["featured"], "blocks": [BlockNode...] }]
}

BlockNode: { "name": "core/group", "attributes": {...}, "innerBlocks": [BlockNode...], "innerContent": "text" }

## DESIGN RULES
- theme.json: 6+ palette colors, 2 font families, 5+ fontSizes with clamp(), element styles
- Cover blocks: minHeight 80vh, align full, dimRatio 40-60, Unsplash ?w=1920 URLs
- Sections: use backgroundColor/textColor from palette slugs, alternate colors
- Buttons: backgroundColor from palette, style.border.radius "6px"
- Spacing: style.spacing.padding with "var:preset|spacing|50" or "60"
- Templates start/end with header/footer template-parts
- Index: hero cover section + query loop with post grid`;
}
