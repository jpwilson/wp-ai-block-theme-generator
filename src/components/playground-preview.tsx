'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface PlaygroundPreviewProps {
  zipBase64: string | null;
  themeSlug: string | null;
  /** Called when user clicks "Open in New Tab" — caller handles localStorage + window.open */
  onOpenNewTab?: () => void;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default function PlaygroundPreview({ zipBase64, themeSlug, onOpenNewTab }: PlaygroundPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!zipBase64 || !themeSlug) return;

    let cancelled = false;

    async function loadPlayground() {
      setLoading(true);
      setError(null);
      setLoaded(false);

      try {
        const { startPlaygroundWeb } = await import('@wp-playground/client');
        if (cancelled || !iframeRef.current) return;

        const zipBytes = base64ToUint8Array(zipBase64!);
        const client = await startPlaygroundWeb({
          iframe: iframeRef.current,
          remoteUrl: 'https://playground.wordpress.net/remote.html',
          blueprint: {
            landingPage: '/',
            preferredVersions: { php: '8.0', wp: 'latest' },
            steps: [
              { step: 'writeFile', path: '/tmp/theme.zip', data: zipBytes },
              { step: 'wp-cli', command: `wp theme install /tmp/theme.zip --activate` },
            ],
          },
        });

        if (cancelled) return;
        await client.isReady();
        if (!cancelled) setLoaded(true);
      } catch (e) {
        if (!cancelled) {
          console.error('Playground error:', e);
          setError('Failed to load WordPress Playground. An internet connection is required.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlayground();
    return () => { cancelled = true; };
  }, [zipBase64, themeSlug]);

  if (!zipBase64 || !themeSlug) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <p className="text-base font-medium mb-1">WordPress Playground Preview</p>
        <p className="text-sm">Generate a theme to see a live preview here.</p>
      </div>
    );
  }

  return (
    // 680px gives enough room for WP Playground's own Wide/Medium/Narrow toolbar at the bottom
    <div className="relative w-full" style={{ height: '680px' }}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading WordPress Playground...</p>
          <p className="text-xs text-muted-foreground">Installing theme, this takes ~15 seconds</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 gap-2 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">Download the ZIP and install it in a local WordPress instance.</p>
        </div>
      )}

      {/* Open in New Tab button — appears once loaded */}
      {loaded && onOpenNewTab && (
        <div className="absolute top-3 right-3 z-20">
          <Button
            size="sm"
            variant="secondary"
            className="shadow-lg text-xs gap-1.5"
            onClick={onOpenNewTab}
          >
            Open in New Tab
          </Button>
        </div>
      )}

      <iframe
        ref={iframeRef}
        className={`w-full h-full border-0 rounded-md transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        title="WordPress Playground Preview"
      />
    </div>
  );
}
