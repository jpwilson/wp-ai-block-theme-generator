'use client';

import { useEffect, useRef, useState } from 'react';

interface PlaygroundPreviewProps {
  zipBase64: string | null;
  themeSlug: string | null;
}

/** Convert base64 string to Uint8Array */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function PlaygroundPreview({ zipBase64, themeSlug }: PlaygroundPreviewProps) {
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

        // Convert base64 ZIP to Uint8Array
        const zipBytes = base64ToUint8Array(zipBase64!);

        const client = await startPlaygroundWeb({
          iframe: iframeRef.current,
          remoteUrl: 'https://playground.wordpress.net/remote.html',
          blueprint: {
            landingPage: '/',
            preferredVersions: {
              php: '8.0',
              wp: 'latest',
            },
            steps: [
              // Write the ZIP file to the virtual filesystem
              {
                step: 'writeFile',
                path: '/tmp/theme.zip',
                data: zipBytes,
              },
              // Unzip and install via wp-cli
              {
                step: 'wp-cli',
                command: `wp theme install /tmp/theme.zip --activate`,
              },
            ],
          },
        });

        if (cancelled) return;

        await client.isReady();
        setLoaded(true);
      } catch (e) {
        if (!cancelled) {
          console.error('Playground error:', e);
          setError(
            'Failed to load WordPress Playground. This feature requires an internet connection to load the Playground runtime.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlayground();

    return () => {
      cancelled = true;
    };
  }, [zipBase64, themeSlug]);

  if (!zipBase64 || !themeSlug) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg font-medium mb-2">WordPress Playground Preview</p>
        <p className="text-sm">Generate a theme to see a live preview here.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ minHeight: '500px' }}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading WordPress Playground...</p>
          <p className="text-xs text-muted-foreground mt-1">This may take 10-20 seconds on first load.</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <p className="text-xs text-muted-foreground">
            You can still download the ZIP and install it in a local WordPress instance.
          </p>
        </div>
      )}

      <iframe
        ref={iframeRef}
        className={`w-full border-0 rounded-md ${loaded ? '' : 'opacity-0'}`}
        style={{ height: '500px' }}
        title="WordPress Playground Preview"
      />
    </div>
  );
}
