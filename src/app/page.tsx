'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';

const PlaygroundPreview = dynamic(() => import('@/components/playground-preview'), { ssr: false });

type ProviderName = 'openrouter' | 'anthropic' | 'openai' | 'grok' | 'custom';

interface ToolCall {
  id: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  retryCount: number;
  timestamp: number;
}

interface ThemeFile {
  path: string;
  content: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const PROVIDER_LABELS: Record<ProviderName, string> = {
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  grok: 'Grok (xAI)',
  custom: 'Custom (OpenAI-compatible)',
};

/** Models available per provider, grouped by company for OpenRouter */
interface ModelOption {
  id: string;
  label: string;
  group?: string;
}

const PROVIDER_MODELS: Record<ProviderName, ModelOption[]> = {
  openrouter: [
    // Anthropic
    { id: 'anthropic/claude-opus-4', label: 'Claude Opus 4', group: 'Anthropic' },
    { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', group: 'Anthropic' },
    { id: 'anthropic/claude-haiku-4', label: 'Claude Haiku 4', group: 'Anthropic' },
    { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', group: 'Anthropic' },
    // OpenAI
    { id: 'openai/gpt-4.1', label: 'GPT-4.1', group: 'OpenAI' },
    { id: 'openai/gpt-4.1-mini', label: 'GPT-4.1 Mini', group: 'OpenAI' },
    { id: 'openai/gpt-4o', label: 'GPT-4o', group: 'OpenAI' },
    { id: 'openai/o3', label: 'o3', group: 'OpenAI' },
    { id: 'openai/o3-mini', label: 'o3-mini', group: 'OpenAI' },
    // Google
    { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', group: 'Google' },
    { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', group: 'Google' },
    // xAI
    { id: 'x-ai/grok-3', label: 'Grok 3', group: 'xAI' },
    { id: 'x-ai/grok-3-mini', label: 'Grok 3 Mini', group: 'xAI' },
    // Meta
    { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', group: 'Meta' },
    { id: 'meta-llama/llama-4-scout', label: 'Llama 4 Scout', group: 'Meta' },
    // DeepSeek
    { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1', group: 'DeepSeek' },
    { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3', group: 'DeepSeek' },
  ],
  anthropic: [
    { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { id: 'claude-haiku-4-20250414', label: 'Claude Haiku 4' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  ],
  openai: [
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'o3', label: 'o3' },
    { id: 'o3-mini', label: 'o3 Mini' },
  ],
  grok: [
    { id: 'grok-3', label: 'Grok 3' },
    { id: 'grok-3-mini', label: 'Grok 3 Mini' },
  ],
  custom: [
    { id: 'gpt-4o', label: 'GPT-4o (default)' },
  ],
};

const DEFAULT_MODELS: Record<ProviderName, string> = {
  openrouter: 'anthropic/claude-sonnet-4',
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4.1',
  grok: 'grok-3',
  custom: 'gpt-4o',
};

export default function Home() {
  // Provider state
  const [provider, setProvider] = useState<ProviderName>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [useEnvKey, setUseEnvKey] = useState(true);
  const [rememberKey, setRememberKey] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [siteType, setSiteType] = useState('');
  const [industry, setIndustry] = useState('');
  const [style, setStyle] = useState('');
  const [colorMood, setColorMood] = useState('');
  const [headerStyle, setHeaderStyle] = useState('');
  const [pages, setPages] = useState('');
  // Keep for backward compat with API
  const [colorPalette] = useState('');
  const [typography] = useState('');
  const [layoutStyle] = useState('');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<ThemeFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [zipBase64, setZipBase64] = useState<string | null>(null);
  const [themeName, setThemeName] = useState<string | null>(null);
  const [themeSlug, setThemeSlug] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [themeData, setThemeData] = useState<any>(null);

  // Chat state (for iteration)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [iterating, setIterating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setFiles([]);
    setZipBase64(null);
    setToolCalls([]);
    setThemeData(null);
    setChatMessages([]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: useEnvKey ? undefined : apiKey,
          model: model || undefined,
          baseUrl: provider === 'custom' ? customBaseUrl : undefined,
          description,
          siteType: siteType || undefined,
          industry: industry || undefined,
          style: style || undefined,
          colorMood: colorMood || undefined,
          headerStyle: headerStyle || undefined,
          pages: pages || undefined,
          colorPalette: colorPalette || undefined,
          typography: typography || undefined,
          layoutStyle: layoutStyle || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = data.error || 'Generation failed';
        if (data.errors?.length) {
          errorMsg += '\n\nDetails:\n' + data.errors.map((e: { layer: string; message: string; path?: string }) =>
            `[${e.layer}] ${e.message}${e.path ? ` (at ${e.path})` : ''}`
          ).join('\n');
        }
        setError(errorMsg);
        if (data.toolCalls) setToolCalls(data.toolCalls);
        return;
      }

      setFiles(data.files);
      setZipBase64(data.zip);
      setThemeName(data.themeName);
      setThemeSlug(data.slug);
      setToolCalls(data.toolCalls || []);
      setThemeData(data.themeData);
      if (data.files.length > 0) {
        setSelectedFile(data.files[0].path);
      }

      // Save key if user opted in
      if (rememberKey && apiKey) {
        localStorage.setItem('wp-theme-gen-api-key', apiKey);
        localStorage.setItem('wp-theme-gen-provider', provider);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  }, [provider, apiKey, model, customBaseUrl, description, colorPalette, typography, layoutStyle, useEnvKey, rememberKey]);

  const handleIterate = useCallback(async () => {
    if (!chatInput.trim() || !themeData) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: Date.now(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIterating(true);
    setError(null);

    try {
      const response = await fetch('/api/iterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: useEnvKey ? undefined : apiKey,
          model: model || undefined,
          baseUrl: provider === 'custom' ? customBaseUrl : undefined,
          currentThemeJson: themeData,
          instruction: chatInput.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.error || 'Iteration failed';
        setChatMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Error: ${errMsg}`, timestamp: Date.now() },
        ]);
        if (data.toolCalls) setToolCalls(prev => [...prev, ...data.toolCalls]);
        return;
      }

      setFiles(data.files);
      setZipBase64(data.zip);
      setThemeName(data.themeName);
      setThemeSlug(data.slug);
      setToolCalls(prev => [...prev, ...(data.toolCalls || [])]);
      setThemeData(data.themeData);
      if (data.files.length > 0) {
        setSelectedFile(data.files[0].path);
      }

      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Theme updated successfully! Changes applied to "${data.themeName}".`, timestamp: Date.now() },
      ]);
    } catch (e) {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Network error'}`, timestamp: Date.now() },
      ]);
    } finally {
      setIterating(false);
    }
  }, [chatInput, themeData, provider, apiKey, model, customBaseUrl, useEnvKey]);

  const handleDownload = useCallback(() => {
    if (!zipBase64 || !themeSlug) return;
    const byteString = atob(zipBase64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${themeSlug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [zipBase64, themeSlug]);

  const selectedFileContent = files.find(f => f.path === selectedFile)?.content || '';

  return (
    <main className="flex-1 container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">WP Block Theme Generator</h1>
        <p className="text-muted-foreground mt-2">
          Generate complete WordPress Block Themes from natural language. No Custom HTML blocks — only native core blocks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Input */}
        <div className="space-y-6">
          {/* Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Provider</CardTitle>
              <CardDescription>Choose your AI provider and enter your API key</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provider">Provider</Label>
                  <Select value={provider} onValueChange={(v) => { setProvider(v as ProviderName); setModel(''); }}>
                    <SelectTrigger id="provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Select
                    value={model || DEFAULT_MODELS[provider]}
                    onValueChange={(v) => setModel(v ?? '')}
                  >
                    <SelectTrigger id="model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const models = PROVIDER_MODELS[provider];
                        const groups = [...new Set(models.map(m => m.group).filter(Boolean))];

                        if (groups.length > 0) {
                          // Grouped display (OpenRouter)
                          return groups.map(group => (
                            <div key={group}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                {group}
                              </div>
                              {models
                                .filter(m => m.group === group)
                                .map(m => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.label}
                                  </SelectItem>
                                ))}
                            </div>
                          ));
                        }

                        // Flat display (direct providers)
                        return models.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.label}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {provider === 'custom' && (
                <div>
                  <Label htmlFor="baseUrl">Base URL</Label>
                  <Input
                    id="baseUrl"
                    placeholder="https://api.example.com/v1"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                  />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useEnvKey}
                      onChange={(e) => setUseEnvKey(e.target.checked)}
                      className="rounded"
                    />
                    Use server-configured key
                  </label>
                </div>
                {!useEnvKey && (
                  <>
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <label className="flex items-center gap-2 text-sm text-muted-foreground mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberKey}
                        onChange={(e) => setRememberKey(e.target.checked)}
                        className="rounded"
                      />
                      Remember key in browser (localStorage)
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your key is sent per-request and never stored on the server.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Theme Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Theme Description</CardTitle>
              <CardDescription>Describe the theme you want to generate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="A dark mode photography portfolio with a full-width hero, grid gallery, and minimal navigation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Site Type</Label>
                  <Select value={siteType} onValueChange={(v) => setSiteType(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blog">Blog / Magazine</SelectItem>
                      <SelectItem value="business">Business / Corporate</SelectItem>
                      <SelectItem value="portfolio">Portfolio / Creative</SelectItem>
                      <SelectItem value="ecommerce">eCommerce / Shop</SelectItem>
                      <SelectItem value="restaurant">Restaurant / Food</SelectItem>
                      <SelectItem value="agency">Agency / Studio</SelectItem>
                      <SelectItem value="nonprofit">Nonprofit / Charity</SelectItem>
                      <SelectItem value="personal">Personal / Resume</SelectItem>
                      <SelectItem value="saas">SaaS / Tech Product</SelectItem>
                      <SelectItem value="community">Community / Forum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={(v) => setIndustry(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Select industry..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="creative">Creative / Design</SelectItem>
                      <SelectItem value="health">Health / Wellness</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="finance">Finance / Legal</SelectItem>
                      <SelectItem value="food">Food / Hospitality</SelectItem>
                      <SelectItem value="fashion">Fashion / Beauty</SelectItem>
                      <SelectItem value="real-estate">Real Estate</SelectItem>
                      <SelectItem value="sports">Sports / Fitness</SelectItem>
                      <SelectItem value="travel">Travel / Tourism</SelectItem>
                      <SelectItem value="music">Music / Entertainment</SelectItem>
                      <SelectItem value="photography">Photography</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Style</Label>
                  <Select value={style} onValueChange={(v) => setStyle(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Select style..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Minimal / Clean</SelectItem>
                      <SelectItem value="bold">Bold / Striking</SelectItem>
                      <SelectItem value="elegant">Elegant / Luxury</SelectItem>
                      <SelectItem value="playful">Playful / Fun</SelectItem>
                      <SelectItem value="corporate">Corporate / Professional</SelectItem>
                      <SelectItem value="brutalist">Brutalist / Raw</SelectItem>
                      <SelectItem value="editorial">Editorial / Magazine</SelectItem>
                      <SelectItem value="warm">Warm / Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color Mood</Label>
                  <Select value={colorMood} onValueChange={(v) => setColorMood(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Select mood..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark / Moody</SelectItem>
                      <SelectItem value="light">Light / Airy</SelectItem>
                      <SelectItem value="warm">Warm (earth tones)</SelectItem>
                      <SelectItem value="cool">Cool (blues, greens)</SelectItem>
                      <SelectItem value="vibrant">Vibrant / Colorful</SelectItem>
                      <SelectItem value="monochrome">Monochrome</SelectItem>
                      <SelectItem value="pastel">Pastel / Soft</SelectItem>
                      <SelectItem value="neon">Neon / Electric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Header</Label>
                  <Select value={headerStyle} onValueChange={(v) => setHeaderStyle(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Select header..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sticky">Sticky Navigation</SelectItem>
                      <SelectItem value="transparent">Transparent over Hero</SelectItem>
                      <SelectItem value="centered">Centered Logo</SelectItem>
                      <SelectItem value="minimal">Minimal / Hamburger</SelectItem>
                      <SelectItem value="classic">Classic Left Logo + Right Nav</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Key Pages</Label>
                <Input
                  placeholder="Home, About, Services, Blog, Contact, Shop, Portfolio..."
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated list of pages your site needs</p>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || !description.trim()}
                className="w-full"
                size="lg"
              >
                {generating ? 'Generating...' : 'Generate Theme'}
              </Button>

              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Iteration Chat */}
          {themeData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Refine Theme</CardTitle>
                <CardDescription>Send follow-up instructions to modify the generated theme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {chatMessages.length > 0 && (
                  <ScrollArea className="h-48 border rounded-md p-3">
                    <div className="space-y-3">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-right' : ''}`}>
                          <Badge variant={msg.role === 'user' ? 'default' : 'secondary'} className="mb-1">
                            {msg.role === 'user' ? 'You' : 'AI'}
                          </Badge>
                          <p className={`${msg.role === 'user' ? 'bg-primary/10' : 'bg-muted'} p-2 rounded-md inline-block max-w-[80%]`}>
                            {msg.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Make the header sticky, change colors to blue..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleIterate()}
                    disabled={iterating}
                  />
                  <Button onClick={handleIterate} disabled={iterating || !chatInput.trim()}>
                    {iterating ? '...' : 'Send'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Output */}
        <div className="space-y-6">
          {files.length > 0 && (
            <>
              {/* Download + Theme Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{themeName}</CardTitle>
                      <CardDescription>{files.length} files generated</CardDescription>
                    </div>
                    <Button onClick={handleDownload} size="lg">
                      Download ZIP
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* File Preview */}
              <Card className="flex-1">
                <CardContent className="p-0">
                  <Tabs defaultValue="files" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b">
                      <TabsTrigger value="files">Files</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="stats">AI Stats</TabsTrigger>
                    </TabsList>

                    <TabsContent value="files" className="m-0">
                      <div className="grid grid-cols-[200px_1fr] divide-x min-h-[400px]">
                        {/* File tree */}
                        <ScrollArea className="h-[500px]">
                          <div className="p-2 space-y-0.5">
                            {files.map((file) => (
                              <button
                                key={file.path}
                                onClick={() => setSelectedFile(file.path)}
                                className={`w-full text-left text-xs px-2 py-1.5 rounded font-mono truncate ${
                                  selectedFile === file.path
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted'
                                }`}
                              >
                                {file.path}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>

                        {/* File content */}
                        <ScrollArea className="h-[500px]">
                          <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                            {selectedFileContent}
                          </pre>
                        </ScrollArea>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview" className="m-0">
                      <PlaygroundPreview zipBase64={zipBase64} themeSlug={themeSlug} />
                    </TabsContent>

                    <TabsContent value="stats" className="m-0 p-4">
                      <div className="space-y-4">
                        <h3 className="font-semibold">AI Tool Call Log</h3>
                        {toolCalls.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No tool calls yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {toolCalls.map((call, i) => (
                              <div key={i} className="border rounded-md p-3 text-sm space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={call.success ? 'default' : 'destructive'}>
                                      {call.success ? 'Success' : 'Failed'}
                                    </Badge>
                                    <span className="font-mono text-xs">{call.provider}</span>
                                    <span className="text-muted-foreground">{call.model}</span>
                                  </div>
                                  <span className="text-muted-foreground">
                                    {(call.latencyMs / 1000).toFixed(1)}s
                                  </span>
                                </div>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>Tokens in: {call.tokensIn.toLocaleString()}</span>
                                  <span>Tokens out: {call.tokensOut.toLocaleString()}</span>
                                  {call.retryCount > 0 && <span>Retry: #{call.retryCount}</span>}
                                </div>
                                {call.error && (
                                  <p className="text-xs text-destructive mt-1">{call.error}</p>
                                )}
                              </div>
                            ))}

                            <Separator />

                            <div className="grid grid-cols-3 gap-4 text-center text-sm">
                              <div>
                                <p className="text-2xl font-bold">{toolCalls.length}</p>
                                <p className="text-muted-foreground">Total Calls</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">
                                  {toolCalls.reduce((s, c) => s + c.tokensIn + c.tokensOut, 0).toLocaleString()}
                                </p>
                                <p className="text-muted-foreground">Total Tokens</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold">
                                  {toolCalls.length > 0
                                    ? (toolCalls.reduce((s, c) => s + c.latencyMs, 0) / toolCalls.length / 1000).toFixed(1)
                                    : 0}s
                                </p>
                                <p className="text-muted-foreground">Avg Latency</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </>
          )}

          {!files.length && !generating && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-4 font-bold">W</div>
                <h3 className="text-lg font-semibold mb-2">No Theme Generated Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Describe your ideal WordPress theme and click Generate. The AI will create a complete block theme
                  using only native WordPress core blocks.
                </p>
              </CardContent>
            </Card>
          )}

          {generating && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
                <p className="text-sm text-muted-foreground">Generating your theme...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sonnet/GPT-4: ~20-40s. Opus: ~60-90s. The AI is generating a complete theme with 6+ templates.
                </p>
                <ElapsedTimer />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <p className="text-xs text-muted-foreground mt-2 font-mono">
      {elapsed}s elapsed
    </p>
  );
}
