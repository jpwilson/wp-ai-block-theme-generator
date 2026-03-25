import { ALLOWED_BLOCKS } from '@/lib/schema/allowed-blocks';

export type PromptSize = 'minimal' | 'standard' | 'detailed';

/**
 * System prompt for WordPress Block Theme generation.
 * Three sizes: minimal (fastest), standard, detailed (richest output).
 */
export function getSystemPrompt(size: PromptSize = 'standard'): string {
  const allowedBlocksList = Array.from(ALLOWED_BLOCKS).join(', ');

  const rules = `## RULES
1. NEVER use core/html or core/freeform. FORBIDDEN.
2. Output ONLY valid JSON. Start with { end with }. No markdown.
3. Allowed blocks: ${allowedBlocksList}`;

  const schema = `## JSON SCHEMA
{ "themeName": "string", "themeDescription": "string",
  "themeJson": { version: 3, settings: { color: { palette: [...] }, typography: { fontFamilies: [...], fontSizes: [...] }, layout: { contentSize, wideSize } }, styles: { color, typography, elements: { link, button, h1, h2 } }, templateParts: [...] },
  "templates": [{ "name": "index", "blocks": [BlockNode...] }],
  "templateParts": [{ "name": "header", "area": "header", "blocks": [...] }],
  "patterns": [{ "name": "hero", "title": "Hero", "slug": "theme/hero", "categories": ["featured"], "blocks": [...] }] }
BlockNode: { "name": "core/group", "attributes": {...}, "innerBlocks": [...], "innerContent": "text" }`;

  if (size === 'minimal') {
    return `WordPress Block Theme expert. Generate theme JSON.
${rules}
${schema}
Only 2 templates (index, page), 1 pattern. Short content. Use backgroundColor/textColor from palette.`;
  }

  if (size === 'detailed') {
    return `WordPress Block Theme expert. Generate a premium-quality theme JSON.
${rules}
${schema}
## DESIGN
- theme.json: 6+ palette colors, 2 fonts, 5+ fontSizes with clamp(), spacingSizes, element styles for link/button/h1/h2/h3
- Cover: minHeight 80vh, align full, dimRatio 40-60, Unsplash ?w=1920 URLs
- Sections: backgroundColor/textColor from palette, alternate colors for rhythm
- Buttons: backgroundColor, style.border.radius "6px"
- Spacing: style.spacing.padding "var:preset|spacing|50"
- Templates: header/footer parts, index has hero + query loop
- 6 templates (index, single, page, archive, 404, search), 3 patterns (hero, features, CTA)
- Make it look like a premium $79 theme.`;
  }

  // Standard
  return `WordPress Block Theme expert. Generate theme JSON.
${rules}
${schema}
## DESIGN
- theme.json: 6+ colors, 2 fonts, fontSizes with clamp(), element styles
- Cover: minHeight 80vh, align full, Unsplash URLs
- Sections: alternate backgroundColor/textColor from palette
- 4 templates (index, single, page, 404), 2 patterns, header/footer parts`;
}
