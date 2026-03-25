import fs from 'fs';
import path from 'path';
import Link from 'next/link';

export default function ChangelogPage() {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  let content = 'No changelog found.';

  try {
    content = fs.readFileSync(changelogPath, 'utf-8');
  } catch {
    // File not found — use default
  }

  // Simple markdown-to-HTML conversion for changelog format
  const html = content
    .split('\n')
    .map(line => {
      if (line.startsWith('# ')) return `<h1 class="text-3xl font-bold mb-6">${line.slice(2)}</h1>`;
      if (line.startsWith('## ')) return `<h2 class="text-xl font-semibold mt-8 mb-4">${line.slice(3)}</h2>`;
      if (line.startsWith('### ')) return `<h3 class="text-lg font-medium mt-4 mb-2">${line.slice(4)}</h3>`;
      if (line.startsWith('- ')) return `<li class="ml-4 text-sm text-muted-foreground">${line.slice(2)}</li>`;
      if (line.trim() === '') return '<br/>';
      return `<p class="text-sm">${line}</p>`;
    })
    .join('\n');

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">&larr; Back to generator</Link>
      </div>
    </main>
  );
}
