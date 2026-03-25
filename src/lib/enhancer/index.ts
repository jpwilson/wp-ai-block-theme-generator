import { AIResponse, BlockNode, ThemeJson } from '@/lib/schema';

/**
 * Design enhancer — deterministic post-processing of AI output.
 *
 * Runs after validation, before serialization. Applies best-practice
 * design rules that the AI often misses. This is the "deterministic
 * quality floor" — even if the AI produces minimal styling, the
 * output will still look professional.
 */
export function enhanceTheme(data: AIResponse): AIResponse {
  return {
    ...data,
    themeJson: enhanceThemeJson(data.themeJson),
    templates: data.templates.map(t => ({
      ...t,
      blocks: enhanceBlocks(t.blocks, data.themeJson),
    })),
    templateParts: data.templateParts?.map(p => ({
      ...p,
      blocks: enhanceBlocks(p.blocks, data.themeJson),
    })),
    patterns: data.patterns?.map(p => ({
      ...p,
      blocks: enhanceBlocks(p.blocks, data.themeJson),
    })),
  };
}

// --- theme.json enhancement ---

function enhanceThemeJson(themeJson: ThemeJson): ThemeJson {
  const settings = themeJson.settings || {};
  const styles = themeJson.styles || {};

  // Ensure spacing scale exists
  if (!settings.spacing?.spacingSizes?.length) {
    settings.spacing = {
      ...settings.spacing,
      blockGap: true,
      margin: true,
      padding: true,
      units: ['px', 'em', 'rem', '%', 'vw'],
      spacingSizes: [
        { slug: '20', size: '0.5rem', name: '2X-Small' },
        { slug: '30', size: '1rem', name: 'Small' },
        { slug: '40', size: '1.5rem', name: 'Medium' },
        { slug: '50', size: '2.5rem', name: 'Large' },
        { slug: '60', size: '4rem', name: 'X-Large' },
        { slug: '70', size: '6rem', name: '2X-Large' },
        { slug: '80', size: '8rem', name: '3X-Large' },
      ],
    };
  }

  // Ensure font sizes have fluid/clamp values
  if (settings.typography?.fontSizes) {
    settings.typography.fontSizes = settings.typography.fontSizes.map(fs => {
      if (!fs.fluid && !fs.size.includes('clamp')) {
        const px = parseFloat(fs.size);
        if (!isNaN(px) && px > 1) {
          return {
            ...fs,
            fluid: { min: `${Math.max(px * 0.75, 0.875)}rem`, max: fs.size },
          };
        }
      }
      return fs;
    });
  }

  // Ensure element styles exist
  if (!styles.elements) {
    styles.elements = {};
  }

  const palette = settings.color?.palette || [];
  const primary = palette.find(p => p.slug === 'primary')?.color;
  const foreground = palette.find(p => p.slug === 'foreground')?.color;
  const background = palette.find(p => p.slug === 'background')?.color;

  // Ensure link color
  if (!styles.elements.link && primary) {
    styles.elements.link = {
      color: { text: primary },
    };
  }

  // Ensure button styles
  if (!styles.elements.button && primary) {
    styles.elements.button = {
      color: { background: primary, text: background || '#ffffff' },
      border: { radius: '6px' },
      typography: { fontWeight: '600' },
    };
  }

  // Ensure heading styles
  if (!styles.elements.h1) {
    styles.elements.h1 = {
      typography: {
        fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
        fontWeight: '700',
        lineHeight: '1.15',
      },
    };
  }
  if (!styles.elements.h2) {
    styles.elements.h2 = {
      typography: {
        fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
        fontWeight: '600',
        lineHeight: '1.2',
      },
    };
  }
  if (!styles.elements.h3) {
    styles.elements.h3 = {
      typography: {
        fontSize: 'clamp(1.3rem, 3vw, 1.75rem)',
        fontWeight: '600',
        lineHeight: '1.3',
      },
    };
  }

  // Ensure layout
  if (!settings.layout) {
    settings.layout = { contentSize: '800px', wideSize: '1200px' };
  }

  // Ensure appearanceTools
  settings.appearanceTools = true;

  return {
    ...themeJson,
    settings,
    styles,
  };
}

// --- Block enhancement ---

function enhanceBlocks(blocks: BlockNode[], themeJson: ThemeJson): BlockNode[] {
  const palette = themeJson.settings?.color?.palette || [];
  const bgSlugs = getAlternatingSlugs(palette);

  return blocks.map((block, index) => {
    let enhanced = { ...block };

    // Enhance cover blocks
    if (block.name === 'core/cover') {
      enhanced = enhanceCover(enhanced);
    }

    // Enhance top-level group sections with alternating backgrounds
    if (block.name === 'core/group' && isSection(block)) {
      enhanced = enhanceSection(enhanced, bgSlugs, index);
    }

    // Enhance buttons
    if (block.name === 'core/button') {
      enhanced = enhanceButton(enhanced, palette);
    }

    // Recurse into innerBlocks
    if (enhanced.innerBlocks?.length) {
      enhanced = {
        ...enhanced,
        innerBlocks: enhanceBlocks(enhanced.innerBlocks, themeJson),
      };
    }

    return enhanced;
  });
}

function enhanceCover(block: BlockNode): BlockNode {
  const attrs = { ...block.attributes };

  // Ensure minimum height
  if (!attrs.minHeight && !hasStyleDimension(attrs)) {
    attrs.minHeight = '80vh';
  }

  // Ensure full-width alignment
  if (!attrs.align) {
    attrs.align = 'full';
  }

  // Ensure dim ratio for readability
  if (attrs.dimRatio === undefined) {
    attrs.dimRatio = 50;
  }

  return { ...block, attributes: attrs };
}

function enhanceSection(
  block: BlockNode,
  bgSlugs: string[],
  index: number,
): BlockNode {
  const attrs = { ...block.attributes };

  // Add padding if missing
  if (!attrs.style || !(attrs.style as Record<string, unknown>).spacing) {
    attrs.style = {
      ...(attrs.style as Record<string, unknown> || {}),
      spacing: {
        padding: {
          top: 'var:preset|spacing|60',
          bottom: 'var:preset|spacing|60',
          left: 'var:preset|spacing|40',
          right: 'var:preset|spacing|40',
        },
      },
    };
  }

  // Add alternating background if missing
  if (!attrs.backgroundColor && !hasStyleColor(attrs) && bgSlugs.length >= 2) {
    // Even sections get accent background, odd sections stay default
    if (index % 2 === 1) {
      attrs.backgroundColor = bgSlugs[index % bgSlugs.length];
      // If dark background, set light text
      attrs.textColor = attrs.textColor || 'foreground';
    }
  }

  return { ...block, attributes: attrs };
}

function enhanceButton(
  block: BlockNode,
  palette: Array<{ slug: string; color: string; name: string }>,
): BlockNode {
  const attrs = { ...block.attributes };

  // Ensure button has colors
  if (!attrs.backgroundColor && !hasStyleColor(attrs)) {
    const primary = palette.find(p => p.slug === 'primary');
    if (primary) {
      attrs.backgroundColor = 'primary';
    }
  }

  // Ensure border radius
  if (!attrs.style || !(attrs.style as Record<string, Record<string, string>>)?.border?.radius) {
    attrs.style = {
      ...(attrs.style as Record<string, unknown> || {}),
      border: {
        ...((attrs.style as Record<string, Record<string, string>>)?.border || {}),
        radius: '6px',
      },
    };
  }

  return { ...block, attributes: attrs };
}

// --- Helpers ---

function isSection(block: BlockNode): boolean {
  // A "section" is a top-level group with innerBlocks (not a wrapper)
  return (block.innerBlocks?.length || 0) > 0;
}

function hasStyleDimension(attrs: Record<string, unknown>): boolean {
  const style = attrs.style as Record<string, Record<string, string>> | undefined;
  return !!(style?.dimensions?.minHeight);
}

function hasStyleColor(attrs: Record<string, unknown>): boolean {
  const style = attrs.style as Record<string, Record<string, string>> | undefined;
  return !!(style?.color?.background || style?.color?.gradient);
}

function getAlternatingSlugs(
  palette: Array<{ slug: string; color: string; name: string }>,
): string[] {
  // Pick slugs suitable for section backgrounds
  const candidates = ['primary', 'secondary', 'accent', 'muted', 'tertiary'];
  const available = candidates.filter(slug => palette.some(p => p.slug === slug));
  if (available.length === 0 && palette.length >= 2) {
    // Use first two non-background colors
    return palette
      .filter(p => p.slug !== 'background' && p.slug !== 'foreground')
      .slice(0, 2)
      .map(p => p.slug);
  }
  return available;
}
