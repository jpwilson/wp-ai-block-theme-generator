/**
 * Build the user prompt for theme generation from user input.
 */

export interface ThemeInput {
  description: string;
  siteType?: string;
  industry?: string;
  style?: string;
  colorMood?: string;
  headerStyle?: string;
  pages?: string;
  promptSize?: string;
  colorPalette?: string;
  typography?: string;
  layoutStyle?: string;
}

const SITE_TYPE_HINTS: Record<string, string> = {
  blog: 'Focus on readability, post listings with featured images, category navigation, and a prominent query loop on the home page.',
  business: 'Professional look with services section, team members, testimonials, contact information, and clear call-to-action buttons.',
  portfolio: 'Visual-first design with image galleries, project showcases, minimal text, and dramatic full-width imagery.',
  ecommerce: 'Product-focused with grid layouts for products, prominent cart/shop CTAs, featured products section, and trust signals.',
  restaurant: 'Appetizing imagery, menu sections, hours/location info, reservation CTA, and warm inviting atmosphere.',
  agency: 'Case studies, client logos, services grid, team section, and a bold hero showcasing capabilities.',
  nonprofit: 'Mission-driven with impact stats, donation CTA, volunteer section, and emotional storytelling imagery.',
  personal: 'Clean resume-style with bio, skills, experience timeline, and contact form.',
  saas: 'Feature highlights, pricing comparison, social proof/testimonials, integration logos, and prominent signup CTA.',
  community: 'Member-focused with forums, events, group highlights, and community activity feeds.',
};

const STYLE_HINTS: Record<string, string> = {
  minimal: 'Lots of whitespace, thin fonts, subtle colors, clean lines, understated elegance.',
  bold: 'Large typography, strong contrasts, dramatic hero sections, vibrant accent colors.',
  elegant: 'Serif fonts for headings, refined color palette, generous spacing, luxury feel.',
  playful: 'Rounded shapes, bright colors, fun typography, casual and approachable.',
  corporate: 'Structured layouts, professional typography, muted colors, trust-building design.',
  brutalist: 'Raw, unpolished aesthetic, bold type, minimal decoration, high contrast.',
  editorial: 'Magazine-style layouts, strong typographic hierarchy, multi-column sections.',
  warm: 'Earth tones, rounded corners, friendly typography, welcoming feel.',
};

const COLOR_MOOD_HINTS: Record<string, string> = {
  dark: 'Dark background (#1a1a2e or similar), light text, glowing accents. Think premium night-mode.',
  light: 'White/cream backgrounds, dark text, soft accent colors. Clean and bright.',
  warm: 'Amber, terracotta, olive, cream. Earthy and inviting.',
  cool: 'Blues, teals, slate, ice white. Calm and professional.',
  vibrant: 'Saturated primary colors, energetic combinations. Bold and attention-grabbing.',
  monochrome: 'Single color in multiple shades plus black/white. Sophisticated and focused.',
  pastel: 'Soft muted colors — lavender, mint, blush, sky. Gentle and modern.',
  neon: 'Electric colors on dark backgrounds — cyan, magenta, lime. Futuristic and edgy.',
};

const HEADER_HINTS: Record<string, string> = {
  sticky: 'Header stays fixed at top on scroll. Use a compact design that doesn\'t take too much vertical space.',
  transparent: 'Header overlays the hero section with transparent background. Text should be white/light over the hero image.',
  centered: 'Logo centered above the navigation. Symmetrical, elegant layout.',
  minimal: 'Small logo + hamburger menu icon. Maximum content focus.',
  classic: 'Logo on the left, navigation links on the right. The most common and user-friendly pattern.',
};

export function buildThemePrompt(input: ThemeInput): string {
  const parts: string[] = [];

  parts.push(`Generate a complete WordPress Block Theme based on this description:\n\n"${input.description}"`);

  if (input.siteType) {
    const hint = SITE_TYPE_HINTS[input.siteType] || '';
    parts.push(`\n\nSite type: ${input.siteType}. ${hint}`);
  }

  if (input.industry) {
    parts.push(`\nIndustry: ${input.industry}. Choose imagery, icons, and content that feel authentic to this industry.`);
  }

  if (input.style) {
    const hint = STYLE_HINTS[input.style] || '';
    parts.push(`\nDesign style: ${input.style}. ${hint}`);
  }

  if (input.colorMood) {
    const hint = COLOR_MOOD_HINTS[input.colorMood] || '';
    parts.push(`\nColor mood: ${input.colorMood}. ${hint}`);
  }

  if (input.headerStyle) {
    const hint = HEADER_HINTS[input.headerStyle] || '';
    parts.push(`\nHeader style: ${input.headerStyle}. ${hint}`);
  }

  if (input.pages) {
    parts.push(`\nKey pages needed: ${input.pages}. Create patterns and templates that support these pages.`);
  }

  if (input.colorPalette) {
    parts.push(`\nSpecific color preference: ${input.colorPalette}`);
  }

  if (input.typography) {
    parts.push(`\nTypography preference: ${input.typography}`);
  }

  if (input.layoutStyle) {
    parts.push(`\nLayout preference: ${input.layoutStyle}`);
  }

  parts.push('\n\nGenerate the complete theme JSON now. Include all templates (index, single, page, archive, 404, search), header and footer template parts, and at least 3 patterns (hero, features/content, CTA). Make it look like a premium $79 theme, not a default WordPress install.');

  return parts.join('');
}

/**
 * Build the user prompt for iterative refinement.
 */
export function buildIterationPrompt(
  currentThemeJson: string,
  instruction: string,
): string {
  return `Here is the current theme JSON:

\`\`\`json
${currentThemeJson}
\`\`\`

Apply this change to the theme: "${instruction}"

Return the COMPLETE updated theme JSON (not just the changed parts). Maintain all existing templates, parts, and patterns unless the change specifically requires removing them.`;
}
