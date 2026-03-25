import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { packageThemeBuffer } from '@/lib/packager';
import { ThemeFile } from '@/lib/assembler';

describe('packageThemeBuffer', () => {
  const testFiles: ThemeFile[] = [
    { path: 'test-theme/style.css', content: '/* Theme Name: Test */' },
    { path: 'test-theme/theme.json', content: '{"version": 3}' },
    { path: 'test-theme/templates/index.html', content: '<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->' },
    { path: 'test-theme/parts/header.html', content: '<!-- wp:site-title /-->' },
    { path: 'test-theme/patterns/hero.php', content: '<?php\n/**\n * Title: Hero\n */\n?>\n<!-- wp:cover --><!-- /wp:cover -->' },
  ];

  it('creates a valid ZIP buffer', async () => {
    const buffer = await packageThemeBuffer(testFiles);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('ZIP contains all files', async () => {
    const buffer = await packageThemeBuffer(testFiles);
    const zip = await JSZip.loadAsync(buffer);
    const fileNames = Object.keys(zip.files);

    for (const file of testFiles) {
      expect(fileNames).toContain(file.path);
    }
  });

  it('ZIP file contents match input', async () => {
    const buffer = await packageThemeBuffer(testFiles);
    const zip = await JSZip.loadAsync(buffer);

    for (const file of testFiles) {
      const content = await zip.file(file.path)?.async('string');
      expect(content).toBe(file.content);
    }
  });

  it('handles empty file list', async () => {
    const buffer = await packageThemeBuffer([]);
    expect(buffer).toBeInstanceOf(Buffer);
    const zip = await JSZip.loadAsync(buffer);
    expect(Object.keys(zip.files)).toHaveLength(0);
  });
});
