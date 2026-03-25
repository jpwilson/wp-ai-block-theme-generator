/**
 * Build the user prompt for theme generation from user input.
 */

export interface ThemeInput {
  description: string;
  colorPalette?: string;
  typography?: string;
  layoutStyle?: string;
}

export function buildThemePrompt(input: ThemeInput): string {
  const parts: string[] = [];

  parts.push(`Generate a complete WordPress Block Theme based on this description:\n\n"${input.description}"`);

  if (input.colorPalette) {
    parts.push(`\nColor palette preference: ${input.colorPalette}`);
  }

  if (input.typography) {
    parts.push(`\nTypography preference: ${input.typography}`);
  }

  if (input.layoutStyle) {
    parts.push(`\nLayout style preference: ${input.layoutStyle}`);
  }

  parts.push('\nGenerate the complete theme JSON now. Include all templates (index, single, page, archive, 404, search), header and footer template parts, and at least 2-3 patterns.');

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
