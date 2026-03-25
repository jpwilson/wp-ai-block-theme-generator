import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { validateAIResponse } from '@/lib/validator';
import { assembleTheme } from '@/lib/assembler';
import { packageThemeBuffer } from '@/lib/packager';
import { FORBIDDEN_BLOCKS } from '@/lib/schema/allowed-blocks';

/**
 * Integration test: simulates the full pipeline with a mocked AI response.
 * Description → (mocked) AI response → Validation → Serialization → Assembly → ZIP
 */

/** A realistic mocked AI response representing a photography portfolio theme */
const MOCK_AI_RESPONSE = {
  themeName: 'Darkroom Portfolio',
  themeDescription: 'A dark mode photography portfolio with a full-width hero and minimal navigation',
  themeJson: {
    $schema: 'https://schemas.wp.org/trunk/theme.json',
    version: 3,
    settings: {
      appearanceTools: true,
      color: {
        palette: [
          { slug: 'primary', color: '#e2c87f', name: 'Primary' },
          { slug: 'secondary', color: '#8b7355', name: 'Secondary' },
          { slug: 'background', color: '#1a1a1a', name: 'Background' },
          { slug: 'foreground', color: '#f5f5f5', name: 'Foreground' },
          { slug: 'accent', color: '#c9a84c', name: 'Accent' },
        ],
      },
      typography: {
        fontFamilies: [
          { fontFamily: 'system-ui, -apple-system, sans-serif', name: 'System', slug: 'system' },
          { fontFamily: 'Georgia, "Times New Roman", serif', name: 'Serif', slug: 'serif' },
        ],
        fontSizes: [
          { slug: 'small', size: '0.875rem', name: 'Small' },
          { slug: 'medium', size: '1rem', name: 'Medium' },
          { slug: 'large', size: '1.5rem', name: 'Large' },
          { slug: 'x-large', size: '2.25rem', name: 'Extra Large' },
        ],
      },
      layout: {
        contentSize: '800px',
        wideSize: '1200px',
      },
    },
    styles: {
      color: { background: '#1a1a1a', text: '#f5f5f5' },
      typography: {
        fontFamily: 'var:preset|font-family|system',
        fontSize: 'var:preset|font-size|medium',
      },
      elements: {
        link: { color: { text: '#e2c87f' } },
        h1: { typography: { fontSize: 'clamp(2rem, 4vw, 3rem)' } },
        h2: { typography: { fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' } },
        button: { color: { background: '#e2c87f', text: '#1a1a1a' } },
      },
    },
    templateParts: [
      { area: 'header', name: 'header', title: 'Header' },
      { area: 'footer', name: 'footer', title: 'Footer' },
    ],
  },
  templates: [
    {
      name: 'index',
      blocks: [
        { name: 'core/template-part', attributes: { slug: 'header', tagName: 'header' } },
        {
          name: 'core/group',
          attributes: { tagName: 'main', layout: { type: 'constrained' } },
          innerBlocks: [
            {
              name: 'core/query',
              attributes: { query: { perPage: 9, postType: 'post' } },
              innerBlocks: [
                {
                  name: 'core/post-template',
                  innerBlocks: [
                    { name: 'core/post-featured-image' },
                    { name: 'core/post-title', attributes: { isLink: true } },
                    { name: 'core/post-date' },
                    { name: 'core/post-excerpt' },
                  ],
                },
                {
                  name: 'core/query-pagination',
                  innerBlocks: [
                    { name: 'core/query-pagination-previous' },
                    { name: 'core/query-pagination-numbers' },
                    { name: 'core/query-pagination-next' },
                  ],
                },
              ],
            },
          ],
        },
        { name: 'core/template-part', attributes: { slug: 'footer', tagName: 'footer' } },
      ],
    },
    {
      name: 'single',
      blocks: [
        { name: 'core/template-part', attributes: { slug: 'header', tagName: 'header' } },
        {
          name: 'core/group',
          attributes: { tagName: 'main', layout: { type: 'constrained' } },
          innerBlocks: [
            { name: 'core/post-featured-image' },
            { name: 'core/post-title' },
            { name: 'core/post-date' },
            { name: 'core/post-content' },
            { name: 'core/post-terms', attributes: { term: 'category' } },
          ],
        },
        { name: 'core/template-part', attributes: { slug: 'footer', tagName: 'footer' } },
      ],
    },
    {
      name: 'page',
      blocks: [
        { name: 'core/template-part', attributes: { slug: 'header', tagName: 'header' } },
        {
          name: 'core/group',
          attributes: { tagName: 'main', layout: { type: 'constrained' } },
          innerBlocks: [
            { name: 'core/post-title' },
            { name: 'core/post-content' },
          ],
        },
        { name: 'core/template-part', attributes: { slug: 'footer', tagName: 'footer' } },
      ],
    },
    {
      name: '404',
      blocks: [
        { name: 'core/template-part', attributes: { slug: 'header', tagName: 'header' } },
        {
          name: 'core/group',
          attributes: { tagName: 'main', layout: { type: 'constrained' } },
          innerBlocks: [
            { name: 'core/heading', attributes: { level: 1 }, innerContent: 'Page Not Found' },
            { name: 'core/paragraph', innerContent: 'The page you are looking for does not exist.' },
          ],
        },
        { name: 'core/template-part', attributes: { slug: 'footer', tagName: 'footer' } },
      ],
    },
  ],
  templateParts: [
    {
      name: 'header',
      area: 'header',
      blocks: [
        {
          name: 'core/group',
          attributes: { layout: { type: 'flex', justifyContent: 'space-between' }, align: 'wide' },
          innerBlocks: [
            { name: 'core/site-title' },
            { name: 'core/navigation' },
          ],
        },
      ],
    },
    {
      name: 'footer',
      area: 'footer',
      blocks: [
        {
          name: 'core/group',
          attributes: { layout: { type: 'constrained' }, align: 'wide' },
          innerBlocks: [
            { name: 'core/paragraph', attributes: { align: 'center' }, innerContent: '2024 Darkroom Portfolio. All rights reserved.' },
            {
              name: 'core/social-links',
              attributes: { className: 'is-style-logos-only' },
              innerBlocks: [
                { name: 'core/social-link', attributes: { service: 'instagram', url: '#' } },
                { name: 'core/social-link', attributes: { service: 'twitter', url: '#' } },
              ],
            },
          ],
        },
      ],
    },
  ],
  patterns: [
    {
      name: 'hero',
      title: 'Hero Section',
      slug: 'darkroom-portfolio/hero',
      categories: ['featured'],
      description: 'A full-width hero with background image',
      blocks: [
        {
          name: 'core/cover',
          attributes: { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4', dimRatio: 60, align: 'full' },
          innerBlocks: [
            { name: 'core/heading', attributes: { level: 1, textAlign: 'center' }, innerContent: 'Capturing Moments' },
            { name: 'core/paragraph', attributes: { align: 'center' }, innerContent: 'Photography that tells stories.' },
            {
              name: 'core/buttons',
              attributes: { layout: { type: 'flex', justifyContent: 'center' } },
              innerBlocks: [
                { name: 'core/button', attributes: { url: '#portfolio' }, innerContent: 'View Portfolio' },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe('End-to-end theme generation pipeline', () => {
  it('validates a realistic mocked AI response', () => {
    const result = validateAIResponse(MOCK_AI_RESPONSE);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data).toBeDefined();
  });

  it('assembles all expected theme files', () => {
    const result = validateAIResponse(MOCK_AI_RESPONSE);
    expect(result.data).toBeDefined();

    const files = assembleTheme(result.data!, 'darkroom-portfolio');

    // style.css + theme.json + functions.php + 4 templates + 2 parts + 1 pattern = 10
    expect(files).toHaveLength(10);

    const paths = files.map(f => f.path);
    expect(paths).toContain('darkroom-portfolio/style.css');
    expect(paths).toContain('darkroom-portfolio/theme.json');
    expect(paths).toContain('darkroom-portfolio/functions.php');
    expect(paths).toContain('darkroom-portfolio/templates/index.html');
    expect(paths).toContain('darkroom-portfolio/templates/single.html');
    expect(paths).toContain('darkroom-portfolio/templates/page.html');
    expect(paths).toContain('darkroom-portfolio/templates/404.html');
    expect(paths).toContain('darkroom-portfolio/parts/header.html');
    expect(paths).toContain('darkroom-portfolio/parts/footer.html');
    expect(paths).toContain('darkroom-portfolio/patterns/hero.php');
  });

  it('no file contains forbidden blocks', () => {
    const result = validateAIResponse(MOCK_AI_RESPONSE);
    const files = assembleTheme(result.data!, 'darkroom-portfolio');

    for (const file of files) {
      for (const forbidden of FORBIDDEN_BLOCKS) {
        const blockName = forbidden.replace('core/', '');
        expect(file.content).not.toContain(`wp:${blockName}`);
      }
    }
  });

  it('templates contain valid block markup comments', () => {
    const result = validateAIResponse(MOCK_AI_RESPONSE);
    const files = assembleTheme(result.data!, 'darkroom-portfolio');

    const templateFiles = files.filter(f => f.path.includes('/templates/'));
    for (const file of templateFiles) {
      // Every template should have at least one block comment
      expect(file.content).toMatch(/<!-- wp:\w/);
    }
  });

  it('packages into a valid ZIP', async () => {
    const result = validateAIResponse(MOCK_AI_RESPONSE);
    const files = assembleTheme(result.data!, 'darkroom-portfolio');
    const zipBuffer = await packageThemeBuffer(files);

    expect(zipBuffer.length).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(zipBuffer);
    const zipFiles = Object.keys(zip.files);

    // All assembled files should be in the ZIP
    for (const file of files) {
      expect(zipFiles).toContain(file.path);
    }

    // Verify theme.json content in ZIP is valid JSON
    const themeJsonContent = await zip.file('darkroom-portfolio/theme.json')?.async('string');
    expect(themeJsonContent).toBeDefined();
    const themeJson = JSON.parse(themeJsonContent!);
    expect(themeJson.version).toBe(3);
    expect(themeJson.settings.color.palette).toHaveLength(5);
  });

  it('index template contains a query loop', () => {
    const result = validateAIResponse(MOCK_AI_RESPONSE);
    const files = assembleTheme(result.data!, 'darkroom-portfolio');

    const indexHtml = files.find(f => f.path.endsWith('templates/index.html'));
    expect(indexHtml).toBeDefined();
    expect(indexHtml!.content).toContain('wp:query');
    expect(indexHtml!.content).toContain('wp:post-template');
    expect(indexHtml!.content).toContain('wp:post-title');
  });

  it('patterns have correct PHP headers', () => {
    const result = validateAIResponse(MOCK_AI_RESPONSE);
    const files = assembleTheme(result.data!, 'darkroom-portfolio');

    const heroPhp = files.find(f => f.path.endsWith('patterns/hero.php'));
    expect(heroPhp).toBeDefined();
    expect(heroPhp!.content).toContain('<?php');
    expect(heroPhp!.content).toContain('Title: Hero Section');
    expect(heroPhp!.content).toContain('Slug: darkroom-portfolio/hero');
    expect(heroPhp!.content).toContain('Categories: featured');
    expect(heroPhp!.content).toContain('Inserter: true');
  });
});
