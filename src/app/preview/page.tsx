'use client';

import { useEffect, useRef, useState } from 'react';
import { loadPreviewPayload, PreviewPayload } from '@/lib/theme-library';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default function PreviewPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  // Read payload from localStorage on mount (client only)
  useEffect(() => {
    const data = loadPreviewPayload();
    setPayload(data);
    setReady(true);
  }, []);

  // Load the playground once we have the payload
  useEffect(() => {
    if (!payload || !iframeRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setLoaded(false);

    async function load() {
      try {
        const { startPlaygroundWeb } = await import('@wp-playground/client');
        if (cancelled || !iframeRef.current) return;

        const zipBytes = base64ToUint8Array(payload!.zipBase64);
        const client = await startPlaygroundWeb({
          iframe: iframeRef.current,
          remoteUrl: 'https://playground.wordpress.net/remote.html',
          blueprint: {
            landingPage: '/',
            preferredVersions: { php: '8.0', wp: 'latest' },
            steps: [
              { step: 'writeFile', path: '/tmp/theme.zip', data: zipBytes },
              { step: 'wp-cli', command: 'wp theme install /tmp/theme.zip --activate' },
            ],
          },
        });

        if (cancelled) return;
        await client.isReady();
        if (!cancelled) setLoaded(true);
      } catch (e) {
        if (!cancelled) setError('Failed to load WordPress Playground. Internet connection required.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [payload]);

  // Don't render until localStorage has been read (avoids hydration mismatch)
  if (!ready) return null;

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      {/* Slim header — same gradient as main app */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: '40px',
          background: 'linear-gradient(135deg, oklch(0.18 0.04 260) 0%, oklch(0.28 0.08 255) 50%, oklch(0.22 0.06 270) 100%)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center text-white font-bold text-xs"
            style={{ background: 'linear-gradient(135deg, oklch(0.52 0.14 250), oklch(0.42 0.18 280))' }}>
            W
          </div>
          <span className="text-white text-sm font-medium">
            {payload?.slug ?? 'Theme Preview'}
          </span>
          {loaded && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'oklch(0.35 0.12 145)', color: 'oklch(0.9 0.08 145)' }}>
              Live
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: 'oklch(0.65 0.05 250)' }}>
          Close this tab to return to the generator
        </span>
      </div>

      {/* Full remaining height — WP Playground fills this including its own toolbar */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading WordPress Playground...</p>
            <p className="text-xs text-muted-foreground">Installing theme, this takes ~15 seconds</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {!payload && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-8">
            <p className="text-muted-foreground text-sm">
              No theme found. Generate a theme and click <strong>Preview in New Tab</strong>.
            </p>
          </div>
        )}

        {/* iframe fills the full remaining height — WP Playground shows its own
            Wide / Medium / Narrow toolbar at the bottom of the iframe */}
        <iframe
          ref={iframeRef}
          className={`w-full border-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ height: '100%' }}
          title="WordPress Playground Preview"
        />
      </div>
    </div>
  );
}
