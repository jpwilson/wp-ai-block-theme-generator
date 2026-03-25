import { describe, it, expect } from 'vitest';
import { serializeBlock, serializeBlocks } from '@/lib/serializer';
import { BlockNode } from '@/lib/schema';

describe('serializeBlock', () => {
  describe('self-closing blocks', () => {
    it('serializes site-title as self-closing', () => {
      const block: BlockNode = { name: 'core/site-title' };
      expect(serializeBlock(block)).toBe('<!-- wp:site-title /-->');
    });

    it('serializes site-title with attributes', () => {
      const block: BlockNode = {
        name: 'core/site-title',
        attributes: { textAlign: 'center' },
      };
      expect(serializeBlock(block)).toBe('<!-- wp:site-title {"textAlign":"center"} /-->');
    });

    it('serializes template-part as self-closing', () => {
      const block: BlockNode = {
        name: 'core/template-part',
        attributes: { slug: 'header', tagName: 'header' },
      };
      expect(serializeBlock(block)).toContain('<!-- wp:template-part');
      expect(serializeBlock(block)).toContain('/-->');
    });

    it('serializes navigation as self-closing', () => {
      const block: BlockNode = { name: 'core/navigation' };
      expect(serializeBlock(block)).toBe('<!-- wp:navigation /-->');
    });

    it('serializes post-title as self-closing', () => {
      const block: BlockNode = {
        name: 'core/post-title',
        attributes: { isLink: true },
      };
      expect(serializeBlock(block)).toContain('<!-- wp:post-title');
      expect(serializeBlock(block)).toContain('/-->');
    });

    it('serializes spacer as self-closing', () => {
      const block: BlockNode = {
        name: 'core/spacer',
        attributes: { height: '50px' },
      };
      expect(serializeBlock(block)).toContain('<!-- wp:spacer');
      expect(serializeBlock(block)).toContain('/-->');
    });

    it('serializes separator as self-closing', () => {
      const block: BlockNode = { name: 'core/separator' };
      expect(serializeBlock(block)).toBe('<!-- wp:separator /-->');
    });
  });

  describe('text blocks', () => {
    it('serializes paragraph', () => {
      const block: BlockNode = {
        name: 'core/paragraph',
        innerContent: 'Hello world',
      };
      const result = serializeBlock(block);
      expect(result).toContain('<!-- wp:paragraph -->');
      expect(result).toContain('<p>Hello world</p>');
      expect(result).toContain('<!-- /wp:paragraph -->');
    });

    it('serializes paragraph with alignment', () => {
      const block: BlockNode = {
        name: 'core/paragraph',
        attributes: { align: 'center' },
        innerContent: 'Centered text',
      };
      const result = serializeBlock(block);
      expect(result).toContain('has-text-align-center');
    });

    it('escapes HTML in paragraph content', () => {
      const block: BlockNode = {
        name: 'core/paragraph',
        innerContent: '<script>alert("xss")</script>',
      };
      const result = serializeBlock(block);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('serializes heading with level', () => {
      const block: BlockNode = {
        name: 'core/heading',
        attributes: { level: 1, textAlign: 'center' },
        innerContent: 'Main Title',
      };
      const result = serializeBlock(block);
      expect(result).toContain('<!-- wp:heading');
      expect(result).toContain('<h1');
      expect(result).toContain('Main Title');
      expect(result).toContain('has-text-align-center');
    });

    it('defaults heading to h2', () => {
      const block: BlockNode = {
        name: 'core/heading',
        innerContent: 'Section Title',
      };
      const result = serializeBlock(block);
      expect(result).toContain('<h2');
    });

    it('serializes list with items', () => {
      const block: BlockNode = {
        name: 'core/list',
        innerBlocks: [
          { name: 'core/list-item', innerContent: 'Item 1' },
          { name: 'core/list-item', innerContent: 'Item 2' },
        ],
      };
      const result = serializeBlock(block);
      expect(result).toContain('<!-- wp:list -->');
      expect(result).toContain('<ul');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
    });

    it('serializes ordered list', () => {
      const block: BlockNode = {
        name: 'core/list',
        attributes: { ordered: true },
        innerBlocks: [
          { name: 'core/list-item', innerContent: 'First' },
        ],
      };
      const result = serializeBlock(block);
      expect(result).toContain('<ol');
    });
  });

  describe('layout blocks', () => {
    it('serializes group with constrained layout', () => {
      const block: BlockNode = {
        name: 'core/group',
        attributes: { layout: { type: 'constrained' } },
        innerBlocks: [
          { name: 'core/paragraph', innerContent: 'Inside group' },
        ],
      };
      const result = serializeBlock(block);
      expect(result).toContain('<!-- wp:group');
      expect(result).toContain('wp-block-group');
      expect(result).toContain('Inside group');
      expect(result).toContain('<!-- /wp:group -->');
    });

    it('serializes group with custom tagName', () => {
      const block: BlockNode = {
        name: 'core/group',
        attributes: { tagName: 'main' },
        innerBlocks: [],
      };
      const result = serializeBlock(block);
      expect(result).toContain('<main');
      expect(result).toContain('</main>');
    });

    it('serializes columns with nested column blocks', () => {
      const block: BlockNode = {
        name: 'core/columns',
        innerBlocks: [
          {
            name: 'core/column',
            attributes: { width: '50%' },
            innerBlocks: [
              { name: 'core/paragraph', innerContent: 'Left column' },
            ],
          },
          {
            name: 'core/column',
            innerBlocks: [
              { name: 'core/paragraph', innerContent: 'Right column' },
            ],
          },
        ],
      };
      const result = serializeBlock(block);
      expect(result).toContain('<!-- wp:columns');
      expect(result).toContain('<!-- wp:column');
      expect(result).toContain('Left column');
      expect(result).toContain('Right column');
      expect(result).toContain('flex-basis:50%');
    });

    it('serializes cover with background image', () => {
      const block: BlockNode = {
        name: 'core/cover',
        attributes: { url: 'https://example.com/bg.jpg', dimRatio: 50 },
        innerBlocks: [
          { name: 'core/heading', attributes: { level: 1 }, innerContent: 'Hero Title' },
        ],
      };
      const result = serializeBlock(block);
      expect(result).toContain('<!-- wp:cover');
      expect(result).toContain('wp-block-cover');
      expect(result).toContain('wp-block-cover__background');
      expect(result).toContain('wp-block-cover__inner-container');
      expect(result).toContain('Hero Title');
    });
  });

  describe('media blocks', () => {
    it('serializes image', () => {
      const block: BlockNode = {
        name: 'core/image',
        attributes: { url: 'https://example.com/photo.jpg', alt: 'A photo', sizeSlug: 'large' },
      };
      const result = serializeBlock(block);
      expect(result).toContain('<!-- wp:image');
      expect(result).toContain('wp-block-image');
      expect(result).toContain('size-large');
      expect(result).toContain('src="https://example.com/photo.jpg"');
      expect(result).toContain('alt="A photo"');
    });

    it('serializes button', () => {
      const block: BlockNode = {
        name: 'core/button',
        attributes: { url: 'https://example.com' },
        innerContent: 'Click Me',
      };
      const result = serializeBlock(block);
      expect(result).toContain('wp-block-button__link');
      expect(result).toContain('Click Me');
      expect(result).toContain('href="https://example.com"');
    });
  });

  describe('query blocks', () => {
    it('serializes a complete query loop', () => {
      const block: BlockNode = {
        name: 'core/query',
        attributes: { query: { perPage: 10, postType: 'post' } },
        innerBlocks: [
          {
            name: 'core/post-template',
            innerBlocks: [
              { name: 'core/post-title', attributes: { isLink: true } },
              { name: 'core/post-excerpt' },
              { name: 'core/post-date' },
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
      };
      const result = serializeBlock(block);
      expect(result).toContain('<!-- wp:query');
      expect(result).toContain('<!-- wp:post-template');
      expect(result).toContain('<!-- wp:post-title');
      expect(result).toContain('<!-- wp:post-excerpt /-->');
      expect(result).toContain('<!-- wp:query-pagination');
      expect(result).toContain('<!-- wp:query-pagination-numbers /-->');
    });
  });
});

describe('serializeBlocks', () => {
  it('serializes multiple blocks separated by newlines', () => {
    const blocks: BlockNode[] = [
      { name: 'core/site-title' },
      { name: 'core/navigation' },
    ];
    const result = serializeBlocks(blocks);
    expect(result).toContain('<!-- wp:site-title /-->');
    expect(result).toContain('<!-- wp:navigation /-->');
  });

  it('strips core/ prefix in output', () => {
    const block: BlockNode = { name: 'core/paragraph', innerContent: 'test' };
    const result = serializeBlock(block);
    expect(result).toContain('wp:paragraph');
    expect(result).not.toContain('wp:core/paragraph');
  });
});
