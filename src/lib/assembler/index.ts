import { AIResponse } from '@/lib/schema';
import { serializeBlocks } from '@/lib/serializer';
import { generateStyleCss } from './style-css';
import { generateFunctionsPhp } from './functions-php';
import { generatePatternPhp } from './patterns';

/**
 * A theme file with its path and content.
 */
export interface ThemeFile {
  path: string;
  content: string;
}

/**
 * Assemble all theme files from a validated AI response.
 * Returns an array of { path, content } ready for ZIP packaging.
 */
export function assembleTheme(data: AIResponse, slug: string): ThemeFile[] {
  const files: ThemeFile[] = [];

  // style.css (theme metadata)
  files.push({
    path: `${slug}/style.css`,
    content: generateStyleCss(data.themeName, data.themeDescription || '', slug),
  });

  // theme.json
  files.push({
    path: `${slug}/theme.json`,
    content: JSON.stringify(data.themeJson, null, 2),
  });

  // functions.php
  files.push({
    path: `${slug}/functions.php`,
    content: generateFunctionsPhp(slug),
  });

  // Templates
  for (const template of data.templates) {
    const markup = serializeBlocks(template.blocks);
    files.push({
      path: `${slug}/templates/${template.name}.html`,
      content: markup,
    });
  }

  // Template parts
  if (data.templateParts) {
    for (const part of data.templateParts) {
      const markup = serializeBlocks(part.blocks);
      files.push({
        path: `${slug}/parts/${part.name}.html`,
        content: markup,
      });
    }
  }

  // Patterns
  if (data.patterns) {
    for (const pattern of data.patterns) {
      const markup = serializeBlocks(pattern.blocks);
      files.push({
        path: `${slug}/patterns/${pattern.name}.php`,
        content: generatePatternPhp(pattern, slug, markup),
      });
    }
  }

  return files;
}
