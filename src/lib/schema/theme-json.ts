import { z } from 'zod';

/**
 * Zod schema for WordPress theme.json (simplified v3-compatible).
 * This validates the AI-generated theme.json structure.
 * Not exhaustive — covers the most common settings/styles used in block themes.
 */

const paletteItemSchema = z.object({
  slug: z.string().min(1),
  color: z.string().min(1),
  name: z.string().min(1),
});

const gradientItemSchema = z.object({
  slug: z.string().min(1),
  gradient: z.string().min(1),
  name: z.string().min(1),
});

const fontFamilySchema = z.object({
  fontFamily: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  fontFace: z.array(z.object({
    fontFamily: z.string(),
    fontWeight: z.string().or(z.number()).optional(),
    fontStyle: z.string().optional(),
    src: z.array(z.string()).optional(),
  })).optional(),
});

const fontSizeSchema = z.object({
  slug: z.string().min(1),
  size: z.string().min(1),
  name: z.string().min(1),
  fluid: z.union([
    z.boolean(),
    z.object({ min: z.string(), max: z.string() }),
  ]).optional(),
});

const spacingSizeSchema = z.object({
  slug: z.string().min(1),
  size: z.string().min(1),
  name: z.string().min(1),
});

const settingsSchema = z.object({
  appearanceTools: z.boolean().optional(),
  color: z.object({
    palette: z.array(paletteItemSchema).optional(),
    gradients: z.array(gradientItemSchema).optional(),
    defaultPalette: z.boolean().optional(),
    defaultGradients: z.boolean().optional(),
    background: z.boolean().optional(),
    text: z.boolean().optional(),
    link: z.boolean().optional(),
    custom: z.boolean().optional(),
  }).optional(),
  typography: z.object({
    fontFamilies: z.array(fontFamilySchema).optional(),
    fontSizes: z.array(fontSizeSchema).optional(),
    fluid: z.boolean().optional(),
    lineHeight: z.boolean().optional(),
    letterSpacing: z.boolean().optional(),
    textTransform: z.boolean().optional(),
    dropCap: z.boolean().optional(),
  }).optional(),
  spacing: z.object({
    blockGap: z.boolean().optional(),
    margin: z.boolean().optional(),
    padding: z.boolean().optional(),
    units: z.array(z.string()).optional(),
    spacingSizes: z.array(spacingSizeSchema).optional(),
  }).optional(),
  layout: z.object({
    contentSize: z.string().optional(),
    wideSize: z.string().optional(),
  }).optional(),
  border: z.object({
    color: z.boolean().optional(),
    radius: z.boolean().optional(),
    style: z.boolean().optional(),
    width: z.boolean().optional(),
  }).optional(),
  shadow: z.object({
    presets: z.array(z.object({
      slug: z.string(),
      name: z.string(),
      shadow: z.string(),
    })).optional(),
  }).optional(),
}).passthrough();

/** Accept string or number — AI often sends lineHeight as 1.2 instead of "1.2" */
const stringOrNumber = z.union([z.string(), z.number()]).transform(v => String(v));

/** Accept string, record, or number for padding/margin — AI sends inconsistent types */
const spacingValue = z.union([
  z.record(z.string(), z.union([z.string(), z.number()]).transform(v => String(v))),
  z.string(),
]).optional();

const spacingStyleSchema = z.object({
  padding: spacingValue,
  margin: spacingValue,
  blockGap: stringOrNumber.optional(),
}).passthrough().optional();

const typographyStyleSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: stringOrNumber.optional(),
  fontWeight: stringOrNumber.optional(),
  lineHeight: stringOrNumber.optional(),
  letterSpacing: stringOrNumber.optional(),
  textTransform: z.string().optional(),
}).passthrough().optional();

const colorStyleSchema = z.object({
  background: z.string().optional(),
  text: z.string().optional(),
  gradient: z.string().optional(),
}).passthrough().optional();

const borderStyleSchema = z.object({
  color: z.string().optional(),
  radius: stringOrNumber.optional(),
  style: z.string().optional(),
  width: stringOrNumber.optional(),
}).passthrough().optional();

const elementStyleSchema = z.object({
  color: colorStyleSchema,
  typography: typographyStyleSchema,
  spacing: spacingStyleSchema,
  border: borderStyleSchema,
}).passthrough().optional();

const stylesSchema = z.object({
  color: colorStyleSchema,
  typography: typographyStyleSchema,
  spacing: spacingStyleSchema,
  elements: z.record(z.string(), elementStyleSchema).optional(),
  blocks: z.record(z.string(), z.object({
    color: colorStyleSchema,
    typography: typographyStyleSchema,
    spacing: spacingStyleSchema,
    border: borderStyleSchema,
  }).passthrough()).optional(),
}).passthrough().optional();

const templatePartDefSchema = z.object({
  area: z.string(),
  name: z.string(),
  title: z.string().optional(),
});

const customTemplateDefSchema = z.object({
  name: z.string(),
  title: z.string(),
  postTypes: z.array(z.string()).optional(),
});

export const themeJsonSchema = z.object({
  $schema: z.string().optional(),
  version: z.number().int().min(2).max(3),
  settings: settingsSchema.optional(),
  styles: stylesSchema,
  templateParts: z.array(templatePartDefSchema).optional(),
  customTemplates: z.array(customTemplateDefSchema).optional(),
  patterns: z.array(z.string()).optional(),
}).passthrough();

export type ThemeJson = z.infer<typeof themeJsonSchema>;
