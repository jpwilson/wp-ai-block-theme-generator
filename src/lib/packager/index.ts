import JSZip from 'jszip';
import { ThemeFile } from '@/lib/assembler';

/**
 * Package theme files into a ZIP blob.
 */
export async function packageTheme(files: ThemeFile[]): Promise<Blob> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/**
 * Package theme files into a ZIP buffer (for server-side use).
 */
export async function packageThemeBuffer(files: ThemeFile[]): Promise<Buffer> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const uint8 = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return Buffer.from(uint8);
}
