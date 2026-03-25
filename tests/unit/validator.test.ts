import { describe, it, expect } from 'vitest';
import { validateAIResponse } from '@/lib/validator';

/** Helper to build a minimal valid AI response */
function buildValidResponse(overrides: Record<string, unknown> = {}) {
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
          { name: 'core/template-part', attributes: { slug: 'header', tagName: 'header' } },
          {
            name: 'core/group',
            attributes: { tagName: 'main', layout: { type: 'constrained' } },
            innerBlocks: [
              { name: 'core/paragraph', innerContent: 'Hello world' },
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
          { name: 'core/site-title' },
          { name: 'core/navigation' },
        ],
      },
      {
        name: 'footer',
        area: 'footer',
        blocks: [
          { name: 'core/paragraph', innerContent: '2024 Test Theme' },
        ],
      },
    ],
    ...overrides,
  };
}

describe('validateAIResponse', () => {
  describe('Layer 1: Schema validation', () => {
    it('accepts a valid response', () => {
      const result = validateAIResponse(buildValidResponse());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toBeDefined();
    });

    it('rejects null input', () => {
      const result = validateAIResponse(null);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.layer === 'schema')).toBe(true);
    });

    it('rejects empty object', () => {
      const result = validateAIResponse({});
      expect(result.valid).toBe(false);
    });

    it('rejects response without templates', () => {
      const result = validateAIResponse({
        themeName: 'Test',
        themeJson: { version: 3 },
        templates: [],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects response with empty template blocks array name', () => {
      const result = validateAIResponse({
        themeName: 'Test',
        themeJson: { version: 3 },
        templates: [{ name: '', blocks: [] }],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects response with invalid theme.json version', () => {
      const result = validateAIResponse(buildValidResponse({
        themeJson: { version: 1 },
      }));
      expect(result.valid).toBe(false);
    });
  });

  describe('Layer 2: Block allowlist', () => {
    it('rejects core/html in templates', () => {
      const response = buildValidResponse({
        templates: [
          {
            name: 'index',
            blocks: [
              { name: 'core/html', innerContent: '<div>Raw HTML</div>' },
            ],
          },
        ],
      });
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e =>
        e.layer === 'allowlist' && e.message.includes('core/html')
      )).toBe(true);
    });

    it('rejects core/freeform in templates', () => {
      const response = buildValidResponse({
        templates: [
          {
            name: 'index',
            blocks: [
              { name: 'core/freeform', innerContent: 'Classic editor content' },
            ],
          },
        ],
      });
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e =>
        e.layer === 'allowlist' && e.message.includes('core/freeform')
      )).toBe(true);
    });

    it('rejects core/html in nested innerBlocks', () => {
      const response = buildValidResponse({
        templates: [
          {
            name: 'index',
            blocks: [
              {
                name: 'core/group',
                innerBlocks: [
                  { name: 'core/html', innerContent: '<div>Nested HTML</div>' },
                ],
              },
            ],
          },
        ],
      });
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('core/html'))).toBe(true);
    });

    it('rejects core/html in template parts', () => {
      const response = buildValidResponse({
        templateParts: [
          {
            name: 'header',
            area: 'header',
            blocks: [
              { name: 'core/html', innerContent: '<nav>Custom nav</nav>' },
            ],
          },
        ],
      });
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
    });

    it('rejects core/html in patterns', () => {
      const response = buildValidResponse({
        patterns: [
          {
            name: 'hero',
            title: 'Hero',
            slug: 'test/hero',
            blocks: [
              { name: 'core/html', innerContent: '<section>Custom hero</section>' },
            ],
          },
        ],
      });
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
    });

    it('rejects unknown block names', () => {
      const response = buildValidResponse({
        templates: [
          {
            name: 'index',
            blocks: [
              { name: 'core/nonexistent-block' },
            ],
          },
        ],
      });
      const result = validateAIResponse(response);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e =>
        e.layer === 'allowlist' && e.message.includes('Unknown block')
      )).toBe(true);
    });

    it('accepts all allowed core blocks', () => {
      const response = buildValidResponse({
        templates: [
          {
            name: 'index',
            blocks: [
              { name: 'core/group', innerBlocks: [] },
              { name: 'core/paragraph', innerContent: 'text' },
              { name: 'core/heading', innerContent: 'title', attributes: { level: 2 } },
              { name: 'core/image', attributes: { url: 'test.jpg', alt: 'test' } },
              { name: 'core/site-title' },
              { name: 'core/navigation' },
            ],
          },
        ],
      });
      const result = validateAIResponse(response);
      expect(result.valid).toBe(true);
    });
  });

  describe('Layer 3: Markup validation', () => {
    it('passes with valid serialized markup', () => {
      const result = validateAIResponse(buildValidResponse());
      expect(result.valid).toBe(true);
      // If we got here without markup errors, layer 3 passed
      expect(result.errors.filter(e => e.layer === 'markup')).toHaveLength(0);
    });
  });
});
