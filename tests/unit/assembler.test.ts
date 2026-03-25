import { describe, it, expect } from 'vitest';
import { assembleTheme } from '@/lib/assembler';
import { AIResponse } from '@/lib/schema';

function buildTestResponse(): AIResponse {
  return {
    themeName: 'Test Theme',
    themeDescription: 'A test theme',
    themeJson: {
      version: 3,
      settings: {
        color: {
          palette: [
            { slug: 'primary', color: '#000000', name: 'Primary' },
          ],
        },
      },
    },
    templates: [
      {
        name: 'index',
        blocks: [
          { name: 'core/paragraph', innerContent: 'Hello' },
        ],
      },
      {
        name: 'single',
        blocks: [
          { name: 'core/post-title' },
          { name: 'core/post-content' },
        ],
      },
    ],
    templateParts: [
      {
        name: 'header',
        area: 'header' as const,
        blocks: [
          { name: 'core/site-title' },
        ],
      },
    ],
    patterns: [
      {
        name: 'hero',
        title: 'Hero Section',
        slug: 'test-theme/hero',
        categories: ['featured'],
        description: 'A hero section',
        blocks: [
          {
            name: 'core/cover',
            attributes: { url: 'https://example.com/bg.jpg', dimRatio: 50 },
            innerBlocks: [
              { name: 'core/heading', attributes: { level: 1 }, innerContent: 'Welcome' },
            ],
          },
        ],
      },
    ],
  };
}

describe('assembleTheme', () => {
  const slug = 'test-theme';
  const files = assembleTheme(buildTestResponse(), slug);

  it('generates style.css with correct metadata', () => {
    const styleCss = files.find(f => f.path === `${slug}/style.css`);
    expect(styleCss).toBeDefined();
    expect(styleCss!.content).toContain('Theme Name: Test Theme');
    expect(styleCss!.content).toContain(`Text Domain: ${slug}`);
    expect(styleCss!.content).toContain('Requires at least: 6.4');
  });

  it('generates theme.json', () => {
    const themeJson = files.find(f => f.path === `${slug}/theme.json`);
    expect(themeJson).toBeDefined();
    const parsed = JSON.parse(themeJson!.content);
    expect(parsed.version).toBe(3);
    expect(parsed.settings.color.palette).toHaveLength(1);
  });

  it('generates functions.php', () => {
    const functionsPhp = files.find(f => f.path === `${slug}/functions.php`);
    expect(functionsPhp).toBeDefined();
    expect(functionsPhp!.content).toContain('<?php');
    expect(functionsPhp!.content).toContain('wp-block-styles');
    expect(functionsPhp!.content).toContain(slug);
  });

  it('generates template files', () => {
    const indexHtml = files.find(f => f.path === `${slug}/templates/index.html`);
    expect(indexHtml).toBeDefined();
    expect(indexHtml!.content).toContain('wp:paragraph');

    const singleHtml = files.find(f => f.path === `${slug}/templates/single.html`);
    expect(singleHtml).toBeDefined();
    expect(singleHtml!.content).toContain('wp:post-title');
  });

  it('generates template part files', () => {
    const headerHtml = files.find(f => f.path === `${slug}/parts/header.html`);
    expect(headerHtml).toBeDefined();
    expect(headerHtml!.content).toContain('wp:site-title');
  });

  it('generates pattern files with PHP headers', () => {
    const heroPhp = files.find(f => f.path === `${slug}/patterns/hero.php`);
    expect(heroPhp).toBeDefined();
    expect(heroPhp!.content).toContain('<?php');
    expect(heroPhp!.content).toContain('Title: Hero Section');
    expect(heroPhp!.content).toContain(`Slug: ${slug}/hero`);
    expect(heroPhp!.content).toContain('Categories: featured');
    expect(heroPhp!.content).toContain('Viewport Width: 1200');
    expect(heroPhp!.content).toContain('wp:cover');
  });

  it('generates the correct number of files', () => {
    // style.css + theme.json + functions.php + 2 templates + 1 part + 1 pattern = 7
    expect(files).toHaveLength(7);
  });

  it('all file paths start with the slug', () => {
    for (const file of files) {
      expect(file.path.startsWith(`${slug}/`)).toBe(true);
    }
  });

  it('sanitizes CSS comment injection in style.css', () => {
    const maliciousResponse = buildTestResponse();
    maliciousResponse.themeName = 'Theme */ .evil { } /*';
    const maliciousFiles = assembleTheme(maliciousResponse, slug);
    const styleCss = maliciousFiles.find(f => f.path === `${slug}/style.css`);
    // The theme name in the header should have */ and /* stripped
    expect(styleCss!.content).toContain('Theme Name: Theme  .evil { }');
    // There should be exactly one /* and one */ (the CSS comment wrapper itself)
    const openCount = (styleCss!.content.match(/\/\*/g) || []).length;
    const closeCount = (styleCss!.content.match(/\*\//g) || []).length;
    expect(openCount).toBe(1);
    expect(closeCount).toBe(1);
  });
});
