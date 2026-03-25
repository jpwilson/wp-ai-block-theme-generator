import { describe, it, expect } from 'vitest';
import { blockNodeSchema } from '@/lib/schema/block-tree';
import { themeJsonSchema } from '@/lib/schema/theme-json';
import { aiResponseSchema } from '@/lib/schema/ai-response';

describe('blockNodeSchema', () => {
  it('accepts a simple block', () => {
    const result = blockNodeSchema.safeParse({
      name: 'core/paragraph',
      innerContent: 'Hello',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a block with attributes', () => {
    const result = blockNodeSchema.safeParse({
      name: 'core/heading',
      attributes: { level: 2, textAlign: 'center' },
      innerContent: 'Title',
    });
    expect(result.success).toBe(true);
  });

  it('accepts nested blocks', () => {
    const result = blockNodeSchema.safeParse({
      name: 'core/group',
      innerBlocks: [
        { name: 'core/paragraph', innerContent: 'nested' },
        {
          name: 'core/columns',
          innerBlocks: [
            { name: 'core/column', innerBlocks: [] },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects block without name', () => {
    const result = blockNodeSchema.safeParse({
      innerContent: 'no name',
    });
    expect(result.success).toBe(false);
  });

  it('rejects block with empty name', () => {
    const result = blockNodeSchema.safeParse({
      name: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('themeJsonSchema', () => {
  it('accepts a minimal theme.json', () => {
    const result = themeJsonSchema.safeParse({
      version: 3,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a full theme.json', () => {
    const result = themeJsonSchema.safeParse({
      $schema: 'https://schemas.wp.org/trunk/theme.json',
      version: 3,
      settings: {
        appearanceTools: true,
        color: {
          palette: [
            { slug: 'primary', color: '#1a4548', name: 'Primary' },
            { slug: 'background', color: '#ffffff', name: 'Background' },
          ],
        },
        typography: {
          fontFamilies: [
            { fontFamily: 'system-ui, sans-serif', name: 'System', slug: 'system' },
          ],
          fontSizes: [
            { slug: 'medium', size: '1rem', name: 'Medium' },
          ],
        },
        layout: {
          contentSize: '800px',
          wideSize: '1200px',
        },
      },
      styles: {
        color: { background: '#ffffff', text: '#000000' },
        typography: { fontFamily: 'var:preset|font-family|system' },
        elements: {
          link: { color: { text: '#1a4548' } },
          h1: { typography: { fontSize: '3rem' } },
        },
      },
      templateParts: [
        { area: 'header', name: 'header', title: 'Header' },
        { area: 'footer', name: 'footer', title: 'Footer' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects version 1', () => {
    const result = themeJsonSchema.safeParse({ version: 1 });
    expect(result.success).toBe(false);
  });

  it('accepts version 2', () => {
    const result = themeJsonSchema.safeParse({ version: 2 });
    expect(result.success).toBe(true);
  });
});

describe('aiResponseSchema', () => {
  it('accepts a minimal valid response', () => {
    const result = aiResponseSchema.safeParse({
      themeName: 'Test Theme',
      themeJson: { version: 3 },
      templates: [
        {
          name: 'index',
          blocks: [{ name: 'core/paragraph', innerContent: 'Hello' }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects response without themeName', () => {
    const result = aiResponseSchema.safeParse({
      themeJson: { version: 3 },
      templates: [{ name: 'index', blocks: [] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects response with empty templates array', () => {
    const result = aiResponseSchema.safeParse({
      themeName: 'Test',
      themeJson: { version: 3 },
      templates: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = aiResponseSchema.safeParse({
      themeName: 'Test Theme',
      themeDescription: 'A cool theme',
      themeJson: { version: 3 },
      templates: [
        { name: 'index', blocks: [{ name: 'core/site-title' }] },
      ],
      templateParts: [
        { name: 'header', area: 'header', blocks: [{ name: 'core/navigation' }] },
      ],
      patterns: [
        {
          name: 'hero',
          title: 'Hero Section',
          slug: 'test/hero',
          categories: ['featured'],
          blocks: [{ name: 'core/cover', innerBlocks: [] }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
