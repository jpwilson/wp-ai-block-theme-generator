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
import {
  saveToLibrary, loadLibrary, deleteFromLibrary,
  storePreviewPayload, ThemeLibraryEntry,
} from '@/lib/theme-library';

const PlaygroundPreview = dynamic(() => import('@/components/playground-preview'), { ssr: false });
const ThemeLibrary = dynamic(() => import('@/components/theme-library'), { ssr: false });

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

/** Model IDs verified against OpenRouter /api/v1/models on 2026-03-24 */
const PROVIDER_MODELS: Record<ProviderName, ModelOption[]> = {
  openrouter: [
    // Anthropic — verified: anthropic/claude-opus-4.6, etc.
    { id: 'anthropic/claude-opus-4.6', label: 'Claude Opus 4.6', group: 'Anthropic' },
    { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6', group: 'Anthropic' },
    { id: 'anthropic/claude-opus-4.5', label: 'Claude Opus 4.5', group: 'Anthropic' },
    { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5', group: 'Anthropic' },
    { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5', group: 'Anthropic' },
    { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', group: 'Anthropic' },
    { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', group: 'Anthropic' },
    // OpenAI — verified: openai/gpt-4.1, openai/o4-mini, etc.
    { id: 'openai/gpt-4.1', label: 'GPT-4.1', group: 'OpenAI' },
    { id: 'openai/gpt-4.1-mini', label: 'GPT-4.1 Mini', group: 'OpenAI' },
    { id: 'openai/gpt-4.1-nano', label: 'GPT-4.1 Nano', group: 'OpenAI' },
    { id: 'openai/gpt-4o', label: 'GPT-4o', group: 'OpenAI' },
    { id: 'openai/o4-mini', label: 'o4-mini', group: 'OpenAI' },
    { id: 'openai/o3', label: 'o3', group: 'OpenAI' },
    { id: 'openai/o3-mini', label: 'o3-mini', group: 'OpenAI' },
    // Google — verified: google/gemini-2.5-pro, google/gemini-3-pro-preview, etc.
    { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', group: 'Google' },
    { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', group: 'Google' },
    { id: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro (preview)', group: 'Google' },
    { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (preview)', group: 'Google' },
    // xAI — verified: x-ai/grok-4, x-ai/grok-3, etc.
    { id: 'x-ai/grok-4', label: 'Grok 4', group: 'xAI' },
    { id: 'x-ai/grok-4-fast', label: 'Grok 4 Fast', group: 'xAI' },
    { id: 'x-ai/grok-3', label: 'Grok 3', group: 'xAI' },
    { id: 'x-ai/grok-3-mini', label: 'Grok 3 Mini', group: 'xAI' },
    // Meta — verified: meta-llama/llama-4-maverick, etc.
    { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', group: 'Meta' },
    { id: 'meta-llama/llama-4-scout', label: 'Llama 4 Scout', group: 'Meta' },
    // DeepSeek — verified: deepseek/deepseek-r1, deepseek/deepseek-v3.2, etc.
    { id: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', group: 'DeepSeek' },
    { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1', group: 'DeepSeek' },
    { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3', group: 'DeepSeek' },
  ],
  anthropic: [
    { id: 'claude-opus-4-20250514', label: 'Claude Opus 4 (recommended — best quality)' },
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (faster)' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest)' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  ],
  openai: [
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'o4-mini', label: 'o4-mini' },
    { id: 'o3', label: 'o3' },
    { id: 'o3-mini', label: 'o3-mini' },
  ],
  grok: [
    { id: 'grok-4', label: 'Grok 4' },
    { id: 'grok-3', label: 'Grok 3' },
    { id: 'grok-3-mini', label: 'Grok 3 Mini' },
  ],
  custom: [
    { id: 'gpt-4o', label: 'GPT-4o (default)' },
  ],
};

const DEFAULT_MODELS: Record<ProviderName, string> = {
  openrouter: 'anthropic/claude-opus-4.6',
  anthropic: 'claude-opus-4-20250514',
  openai: 'gpt-4.1',
  grok: 'grok-4',
  custom: 'gpt-4o',
};

// These are always included — they're the foundation of every WordPress theme
const MANDATORY_PAGES = ['Home', 'About', 'Contact'];

// User can pick up to 6 additional pages on top of the mandatory ones
const OPTIONAL_PAGES = [
  'Services', 'Blog', 'Portfolio', 'Shop', 'Pricing',
  'Team', 'FAQ', 'Testimonials', 'Gallery', 'Events',
  'Careers', 'Press', 'Partners', 'Case Studies', 'Resources',
];

/** Approximate pricing per 1M tokens by model (input, output) in USD */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-sonnet-4.6': { input: 3, output: 15 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'anthropic/claude-sonnet-4.6': { input: 3, output: 15 },
  'claude-opus-4.6': { input: 15, output: 75 },
  'claude-opus-4-6': { input: 15, output: 75 },
  'anthropic/claude-opus-4.6': { input: 15, output: 75 },
  // OpenAI
  'gpt-4.1': { input: 2, output: 8 },
  'openai/gpt-4.1': { input: 2, output: 8 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'openai/gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'openai/gpt-4o': { input: 2.5, output: 10 },
  // Google
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  'google/gemini-2.5-pro': { input: 1.25, output: 10 },
  'gemini-2.5-flash': { input: 0.15, output: 0.6 },
  'google/gemini-2.5-flash': { input: 0.15, output: 0.6 },
};

const DEFAULT_PRICING = { input: 3, output: 15 };

/** Estimate cost in dollars for a single AI call */
function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  // Try exact match first, then partial match on known model substrings
  let pricing = MODEL_PRICING[model];
  if (!pricing) {
    const lower = model.toLowerCase();
    const key = Object.keys(MODEL_PRICING).find((k) => lower.includes(k.toLowerCase()));
    pricing = key ? MODEL_PRICING[key] : DEFAULT_PRICING;
  }
  return (tokensIn * pricing.input + tokensOut * pricing.output) / 1_000_000;
}

const DEMO_DESCRIPTIONS = [
  {
    label: 'Photography Portfolio',
    text: 'A dark, cinematic photography portfolio for a landscape and street photographer. Split hero with a dramatic full-bleed mountain shot on the right and bold typography on the left. Grid gallery of recent work, a minimal about section, and an enquiry form.',
    siteType: 'portfolio', industry: 'photography', style: 'minimal',
    colorMood: 'dark', headerStyle: 'transparent', promptSize: 'detailed',
    extraPages: ['Portfolio', 'Blog'],
  },
  {
    label: 'SaaS Product',
    text: 'A modern SaaS landing page for a project management tool aimed at remote teams. Hero with an animated product screenshot, 3-column feature grid, social proof stats bar, pricing comparison table, testimonials from Fortune 500 companies, and a prominent free trial CTA.',
    siteType: 'saas', industry: 'technology', style: 'bold',
    colorMood: 'cool', headerStyle: 'sticky', promptSize: 'detailed',
    extraPages: ['Pricing', 'Blog'],
  },
  {
    label: 'Italian Restaurant',
    text: 'A warm, inviting website for a family-run Italian restaurant in the heart of the city. Full-width hero with rich food photography, menu sections organized by course with mouth-watering descriptions, chef\'s personal story, opening hours, location map, and a reservation CTA.',
    siteType: 'restaurant', industry: 'food', style: 'elegant',
    colorMood: 'warm', headerStyle: 'classic', promptSize: 'detailed',
    extraPages: ['Gallery', 'Events'],
  },
  {
    label: 'Creative Agency',
    text: 'A bold, award-winning digital design agency website. Full-screen hero with kinetic typography, case study grid showcasing brand identity and web projects, clear services breakdown, team bios with photography, client logo wall, and a "start a project" contact form.',
    siteType: 'agency', industry: 'creative', style: 'bold',
    colorMood: 'vibrant', headerStyle: 'sticky', promptSize: 'detailed',
    extraPages: ['Portfolio', 'Blog', 'Careers'],
  },
  {
    label: 'Fitness Studio',
    text: 'An energetic, motivational website for a boutique fitness and wellness studio. Hero with a strong workout image and a class-booking CTA. Class schedule grid, trainer profiles with specialties, membership pricing tiers, client transformation testimonials, and a "first class free" offer section.',
    siteType: 'business', industry: 'sports', style: 'bold',
    colorMood: 'vibrant', headerStyle: 'sticky', promptSize: 'detailed',
    extraPages: ['Pricing', 'Team', 'Blog'],
  },
  {
    label: 'Real Estate Agency',
    text: 'A premium real estate agency website with a sophisticated, trustworthy feel. Hero with a search bar over a luxury property image. Featured listings grid with key details, neighbourhood guides, agent team profiles, market statistics section, and a "book a valuation" CTA.',
    siteType: 'business', industry: 'real-estate', style: 'corporate',
    colorMood: 'light', headerStyle: 'classic', promptSize: 'detailed',
    extraPages: ['Team', 'Blog', 'Testimonials'],
  },
  {
    label: 'Personal Blog',
    text: 'A clean, minimal personal blog and portfolio for a writer and travel photographer. Editorial hero layout with a striking photo, latest posts grid in magazine style, about section with personal story, category navigation, newsletter sign-up, and featured essay series.',
    siteType: 'blog', industry: 'travel', style: 'editorial',
    colorMood: 'light', headerStyle: 'centered', promptSize: 'standard',
    extraPages: ['Blog', 'Gallery'],
  },
  {
    label: 'Nonprofit / Charity',
    text: 'An emotionally resonant charity website for a children\'s education nonprofit. Hero with an impactful photo and mission statement, impact statistics bar (children helped, countries reached, years active), donation CTA with giving tiers, volunteer opportunities, latest news, and partner logos.',
    siteType: 'nonprofit', industry: 'education', style: 'warm',
    colorMood: 'warm', headerStyle: 'classic', promptSize: 'detailed',
    extraPages: ['Blog', 'Events'],
  },
];

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
  const [promptSize, setPromptSize] = useState<'minimal' | 'standard' | 'detailed'>('standard');
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

  // Library state
  const [libraryEntries, setLibraryEntries] = useState<ThemeLibraryEntry[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);

  // Load library from localStorage on mount
  useEffect(() => {
    setLibraryEntries(loadLibrary());
  }, []);

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
          pages: [
            ...MANDATORY_PAGES,
            ...pages.split(',').map(p => p.trim()).filter(Boolean),
          ].join(', '),
          promptSize,
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

      // Auto-save to library
      const entryId = crypto.randomUUID();
      setCurrentEntryId(entryId);
      const libraryEntry: ThemeLibraryEntry = {
        id: entryId,
        name: data.themeName,
        slug: data.slug,
        description,
        siteType: siteType || '',
        style: style || '',
        colorMood: colorMood || '',
        industry: industry || '',
        createdAt: new Date().toISOString(),
        zipBase64: data.zip,
        fileCount: data.files.length,
        toolCallCount: (data.toolCalls || []).length,
      };
      saveToLibrary(libraryEntry);
      setLibraryEntries(loadLibrary());

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

      // Update library entry with iterated version
      if (currentEntryId) {
        const iteratedEntry: ThemeLibraryEntry = {
          id: currentEntryId,
          name: data.themeName,
          slug: data.slug,
          description,
          siteType: siteType || '',
          style: style || '',
          colorMood: colorMood || '',
          industry: industry || '',
          createdAt: new Date().toISOString(),
          zipBase64: data.zip,
          fileCount: data.files.length,
          toolCallCount: toolCalls.length + (data.toolCalls || []).length,
        };
        saveToLibrary(iteratedEntry);
        setLibraryEntries(loadLibrary());
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
    <>
    <header className="border-b" style={{ background: 'linear-gradient(135deg, oklch(0.18 0.04 260) 0%, oklch(0.28 0.08 255) 50%, oklch(0.22 0.06 270) 100%)' }}>
      <div className="container mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base shadow-lg" style={{ background: 'linear-gradient(135deg, oklch(0.52 0.14 250), oklch(0.42 0.18 280))', color: 'white' }}>W</div>
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none text-white">WP Block Theme Generator</h1>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.75 0.05 250)' }}>AI-powered · Native core blocks only · Zero Custom HTML</p>
          </div>
        </div>
        <nav className="flex items-center gap-5 text-sm">
          <a href="/spec" style={{ color: 'oklch(0.75 0.05 250)' }} className="hover:text-white transition-colors">Spec</a>
          <a href="/changelog" style={{ color: 'oklch(0.75 0.05 250)' }} className="hover:text-white transition-colors">Changelog</a>
          <a href="https://github.com/jpwilson/wp-ai-block-theme-generator" target="_blank" rel="noopener" style={{ color: 'oklch(0.75 0.05 250)' }} className="hover:text-white transition-colors">GitHub</a>
        </nav>
      </div>
    </header>
    <main className="flex-1 container mx-auto max-w-7xl px-4 py-6">

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  placeholder="Describe the website you want..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {DEMO_DESCRIPTIONS.map((demo, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setDescription(demo.text);
                        setSiteType(demo.siteType || '');
                        setIndustry(demo.industry || '');
                        setStyle(demo.style || '');
                        setColorMood(demo.colorMood || '');
                        setHeaderStyle(demo.headerStyle || '');
                        setPromptSize((demo.promptSize as 'minimal' | 'standard' | 'detailed') || 'detailed');
                        // Set extra pages (mandatory pages always included automatically)
                        setPages((demo.extraPages || []).join(', '));
                      }}
                      className="text-xs px-2.5 py-1 rounded-full border hover:bg-muted transition-colors text-muted-foreground"
                    >
                      {demo.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <Label>Prompt Size</Label>
                <Select value={promptSize} onValueChange={(v) => setPromptSize((v ?? 'standard') as 'minimal' | 'standard' | 'detailed')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal (fastest, ~30s)</SelectItem>
                    <SelectItem value="standard">Standard (~60s)</SelectItem>
                    <SelectItem value="detailed">Detailed (slowest, ~90s+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <Label>Additional Pages</Label>
                  <span className="text-xs text-muted-foreground">
                    Home · About · Contact always included — add up to 6 more
                  </span>
                </div>
                {/* Always-included pages */}
                <div className="flex flex-wrap gap-2 mt-2 mb-1">
                  {MANDATORY_PAGES.map((page) => (
                    <span
                      key={page}
                      className="text-xs px-3 py-1.5 rounded-full border border-primary/40 bg-primary/8 text-primary font-medium cursor-default select-none"
                    >
                      {page} ✓
                    </span>
                  ))}
                </div>
                {/* Optional extras */}
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {OPTIONAL_PAGES.map((page) => {
                    const extras = pages.split(',').map(p => p.trim()).filter(Boolean);
                    const selected = extras.includes(page);
                    const atLimit = extras.length >= 6 && !selected;
                    return (
                      <button
                        key={page}
                        onClick={() => {
                          if (selected) {
                            setPages(extras.filter(p => p !== page).join(', '));
                          } else if (!atLimit) {
                            setPages([...extras, page].join(', '));
                          }
                        }}
                        disabled={atLimit}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          selected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : atLimit
                              ? 'opacity-40 cursor-not-allowed'
                              : 'hover:bg-muted'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || !description.trim()}
                className="w-full font-semibold tracking-wide shadow-sm"
                size="lg"
                style={generating || !description.trim() ? {} : { background: 'linear-gradient(135deg, oklch(0.52 0.14 250), oklch(0.42 0.18 280))' }}
              >
                {generating ? 'Generating & Refining...' : 'Generate Theme'}
              </Button>
              {!generating && description.trim() && (
                <p className="text-center text-xs text-muted-foreground">
                  Initial generation + 3 AI refinement passes
                </p>
              )}

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
                    </TabsList>

                    <TabsContent value="files" className="m-0">
                      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] md:divide-x min-h-[400px]">
                        {/* File tree */}
                        <ScrollArea className="h-[200px] md:h-[500px] border-b md:border-b-0">
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
                        <ScrollArea className="h-[300px] md:h-[500px]">
                          <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
                            {selectedFileContent}
                          </pre>
                        </ScrollArea>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview" className="m-0">
                      <PlaygroundPreview
                        zipBase64={zipBase64}
                        themeSlug={themeSlug}
                        onOpenNewTab={() => {
                          if (zipBase64 && themeSlug) {
                            storePreviewPayload({ zipBase64, slug: themeSlug });
                            window.open('/preview', '_blank', 'noopener');
                          }
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="__removed_stats__" className="m-0 p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">AI Tool Call Log</h3>
                        </div>
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
                                  <div className="flex items-center gap-3 text-muted-foreground">
                                    <span>${estimateCost(call.model, call.tokensIn, call.tokensOut).toFixed(4)}</span>
                                    <span>{(call.latencyMs / 1000).toFixed(1)}s</span>
                                  </div>
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

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
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
                              <div>
                                <p className="text-2xl font-bold">
                                  ${toolCalls.reduce((s, c) => s + estimateCost(c.model, c.tokensIn, c.tokensOut), 0).toFixed(2)}
                                </p>
                                <p className="text-muted-foreground">Est. Cost</p>
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
            <Card className="border-dashed overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center relative">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                <div className="relative z-10 space-y-6">
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, oklch(0.52 0.14 250), oklch(0.42 0.18 280))', color: 'white', fontSize: '1.75rem', fontWeight: 700 }}>W</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Ready to generate</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                      Describe your site on the left, then click <strong>Generate Theme</strong>. The AI produces a complete WordPress block theme — templates, patterns, and theme.json — through a 3-pass refinement pipeline.
                    </p>
                  </div>
                  <div className="flex items-center gap-6 justify-center text-xs text-muted-foreground">
                    <div className="flex flex-col items-center gap-1">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">1</span>
                      <span>Generate</span>
                    </div>
                    <div className="h-px w-8 bg-border" />
                    <div className="flex flex-col items-center gap-1">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">2</span>
                      <span>Refine ×3</span>
                    </div>
                    <div className="h-px w-8 bg-border" />
                    <div className="flex flex-col items-center gap-1">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">3</span>
                      <span>Download</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {generating && (
            <Card className="overflow-hidden">
              <div className="h-1 w-full bg-muted">
                <GenerationProgressBar />
              </div>
              <CardContent className="flex flex-col items-center justify-center py-14">
                <GenerationProgress />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {/* AI Stats + Prompt — always visible, not gated on theme generation */}
      <Card className="mt-6">
        <CardContent className="p-0">
          <Tabs defaultValue="prompt" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b">
              <TabsTrigger value="prompt">System Prompt</TabsTrigger>
              <TabsTrigger value="stats">AI Stats</TabsTrigger>
            </TabsList>
            <TabsContent value="prompt" className="m-0 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">System Prompt</h3>
                    <p className="text-xs text-muted-foreground">What gets sent to the AI — updates live as you change Prompt Size</p>
                  </div>
                  <Badge variant="secondary">{promptSize}</Badge>
                </div>
                <ScrollArea className="h-[300px]">
                  <pre className="text-xs font-mono whitespace-pre-wrap bg-muted p-3 rounded-md leading-relaxed">
                    {getSystemPromptPreview(promptSize)}
                  </pre>
                </ScrollArea>
              </div>
            </TabsContent>
            <TabsContent value="stats" className="m-0 p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">AI Tool Call Log</h3>
                    <p className="text-xs text-muted-foreground">1 generation + 3 refinement passes per theme</p>
                  </div>
                  {toolCalls.length > 0 && (
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[10px]">{toolCalls.length} calls</Badge>
                      <Badge variant="outline" className="text-[10px]">${toolCalls.reduce((s, c) => s + estimateCost(c.model, c.tokensIn, c.tokensOut), 0).toFixed(3)}</Badge>
                    </div>
                  )}
                </div>
                {toolCalls.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Generate a theme to see AI call details here.</p>
                ) : (
                  <div className="space-y-2">
                    {toolCalls.map((call, i) => (
                      <div key={i} className="border rounded-md p-3 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={call.success ? 'default' : 'destructive'} className="text-[10px]">
                              {call.success ? 'OK' : 'Failed'}
                            </Badge>
                            <span className="font-mono text-xs">{call.provider}</span>
                            <span className="text-muted-foreground text-xs">{call.model}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>${estimateCost(call.model, call.tokensIn, call.tokensOut).toFixed(4)}</span>
                            <span>{(call.latencyMs / 1000).toFixed(1)}s</span>
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>In: {call.tokensIn.toLocaleString()}</span>
                          <span>Out: {call.tokensOut.toLocaleString()}</span>
                          {call.retryCount > 0 && <span>Retry #{call.retryCount}</span>}
                        </div>
                        {call.error && <p className="text-xs text-destructive mt-1">{call.error}</p>}
                      </div>
                    ))}
                    <Separator />
                    <div className="grid grid-cols-4 gap-4 text-center text-sm pt-1">
                      <div><p className="text-xl font-bold">{toolCalls.length}</p><p className="text-muted-foreground text-xs">Total Calls</p></div>
                      <div><p className="text-xl font-bold">{toolCalls.reduce((s, c) => s + c.tokensIn + c.tokensOut, 0).toLocaleString()}</p><p className="text-muted-foreground text-xs">Total Tokens</p></div>
                      <div><p className="text-xl font-bold">{toolCalls.length > 0 ? (toolCalls.reduce((s, c) => s + c.latencyMs, 0) / toolCalls.length / 1000).toFixed(1) : 0}s</p><p className="text-muted-foreground text-xs">Avg Latency</p></div>
                      <div><p className="text-xl font-bold">${toolCalls.reduce((s, c) => s + estimateCost(c.model, c.tokensIn, c.tokensOut), 0).toFixed(3)}</p><p className="text-muted-foreground text-xs">Est. Cost</p></div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Theme Library */}
      <ThemeLibrary
        entries={libraryEntries}
        onDelete={(id) => setLibraryEntries(deleteFromLibrary(id))}
        onPreview={(entry) => {
          storePreviewPayload({ zipBase64: entry.zipBase64, slug: entry.slug });
          window.open('/preview', '_blank', 'noopener');
        }}
      />
    </main>
    </>
  );
}

const GENERATION_STEPS = [
  { at: 0,   label: 'Sending prompt to Claude Opus...', detail: 'Building detailed system prompt with section anatomy and design rules', phase: 'init' },
  { at: 5,   label: 'AI is designing your theme...', detail: 'Choosing color palette, typography, layout — this model thinks carefully', phase: 'init' },
  { at: 15,  label: 'Generating theme.json settings...', detail: 'Design tokens: colors, fonts, spacing scale, element styles', phase: 'init' },
  { at: 25,  label: 'Building all 6 templates...', detail: 'index, single, page, archive, 404, search — each with full block markup', phase: 'init' },
  { at: 45,  label: 'Creating header & footer parts...', detail: 'Navigation with real links, logo, footer columns, social, copyright', phase: 'init' },
  { at: 65,  label: 'Generating patterns...', detail: 'Hero, features grid, testimonials-CTA — reusable block patterns', phase: 'init' },
  { at: 85,  label: 'Validating blocks...', detail: 'Schema → allowlist → WP parser round-trip — zero custom HTML allowed', phase: 'init' },
  { at: 100, label: 'Refinement pass 1 of 3 — Content', detail: 'Opus filling every empty block: cover text, section headings, real copy', phase: 'pass1' },
  { at: 160, label: 'Refinement pass 2 of 3 — Visual Design', detail: 'Opus improving colors, spacing, section rhythm, button styles', phase: 'pass2' },
  { at: 220, label: 'Refinement pass 3 of 3 — Polish', detail: 'Opus sharpening copy, CTAs, header/footer, image URLs', phase: 'pass3' },
  { at: 275, label: 'Assembling theme files...', detail: 'Serializing block trees to WordPress markup, building ZIP', phase: 'done' },
  { at: 285, label: 'Almost ready...', detail: '4 Opus calls complete — packaging your theme', phase: 'done' },
];

const PHASE_LABELS: Record<string, string> = {
  init:  'Generating',
  pass1: 'Pass 1/3',
  pass2: 'Pass 2/3',
  pass3: 'Pass 3/3',
  done:  'Finalizing',
};

function GenerationProgressBar() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const pct = Math.min((elapsed / 290) * 100, 95);
  return (
    <div
      className="h-full bg-primary transition-all duration-1000 rounded-full"
      style={{ width: `${pct}%` }}
    />
  );
}

function GenerationProgress() {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const currentStep = [...GENERATION_STEPS].reverse().find(s => elapsed >= s.at) || GENERATION_STEPS[0];
  const phaseLabel = PHASE_LABELS[currentStep.phase] || 'Working';

  const factIndex = Math.floor(elapsed / 12) % AUTOMATTIC_FACTS.length;
  const fact = AUTOMATTIC_FACTS[factIndex];

  return (
    <div className="text-center space-y-4 max-w-md mx-auto w-full">
      <div className="flex items-center justify-center gap-2">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
        <Badge variant="secondary" className="font-mono text-xs">{phaseLabel}</Badge>
      </div>

      <div>
        <p className="text-sm font-semibold">{currentStep.label}</p>
        <p className="text-xs text-muted-foreground mt-1">{currentStep.detail}</p>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        {(['pass1', 'pass2', 'pass3'] as const).map((p, i) => {
          const done = elapsed >= [65, 90, 115][i];
          const active = currentStep.phase === p;
          return (
            <div key={p} className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${done && !active ? 'bg-primary text-primary-foreground' : active ? 'bg-primary/20 text-primary border border-primary' : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </span>
              <span className={active ? 'text-foreground font-medium' : done && !active ? 'text-muted-foreground line-through' : ''}>
                {['Content', 'Design', 'Polish'][i]}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground font-mono">{elapsed}s elapsed</p>

      {elapsed > 8 && (
        <div className="mt-2 pt-4 border-t text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Did you know?</p>
          <p className="text-sm font-medium leading-snug">{fact.title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground mt-1">{fact.text}</p>
        </div>
      )}
    </div>
  );
}

function getSystemPromptPreview(size: string): string {
  const prompts: Record<string, string> = {
    minimal: `[MINIMAL] WordPress Block Theme expert. Generate theme JSON.\n\nRULES: No core/html, no core/freeform. JSON only.\nOnly 2 templates (index, page), 1 pattern. Short content.`,
    standard: `[STANDARD] WordPress Block Theme expert. Generate theme JSON.\n\nRULES: No core/html, no core/freeform. JSON only.\n4 templates (index, single, page, 404), 2 patterns.\nDesign: 6+ colors, 2 fonts, clamp() sizes, element styles.\nCover: 80vh, Unsplash URLs. Alternate section colors.`,
    detailed: `[DETAILED] WordPress Block Theme expert. Generate premium theme.\n\nRULES: No core/html, no core/freeform. JSON only.\n6 templates + 3 patterns. Rich theme.json with spacingSizes.\nDesign: Cover 80vh, alternate colors, styled buttons.\nMake it look like a premium $79 theme.`,
  };
  return prompts[size] || prompts.standard;
}

const AUTOMATTIC_FACTS = [
  { title: 'WordPress powers 43% of the web', text: 'From personal blogs to enterprise sites like Time.com, TechCrunch, and the White House — all running on WordPress.' },
  { title: 'Automattic is fully distributed', text: '2,000+ employees across 97 countries, no central office. One of the largest fully remote companies in the world since 2005.' },
  { title: 'WooCommerce runs 4M+ online stores', text: 'Acquired by Automattic in 2015, WooCommerce is the most popular eCommerce platform, powering 25% of the top 1M stores.' },
  { title: 'Tumblr joined Automattic in 2019', text: 'Acquired from Verizon, Tumblr hosts 500M+ blogs and serves 11B+ monthly page views under Automattic.' },
  { title: 'WordPress.com hosts 70M+ sites', text: 'The hosted platform serves everything from free blogs to enterprise WordPress installations for Fortune 500 companies.' },
  { title: 'Jetpack protects 31M+ WordPress sites', text: 'Security, backups, performance, and growth tools — Jetpack is installed on 31 million sites worldwide.' },
  { title: 'Full Site Editing (FSE) changed everything', text: 'Launched with WordPress 5.9 in 2022, FSE replaced PHP templates with block-based HTML — the foundation this tool builds on.' },
  { title: 'The Five for the Future pledge', text: 'Automattic contributes 5% of resources to WordPress open source development. Matt Mullenweg co-founded WordPress in 2003.' },
  { title: 'Pocket Casts has 1M+ subscribers', text: 'The podcast app was acquired by Automattic in 2021 and serves listeners with 10M+ downloads.' },
  { title: 'Day One is the #1 journaling app', text: 'Acquired in 2021, Day One has 15M+ downloads and is Apple\'s App of the Year winner.' },
  { title: 'Gutenberg is named after a printing press', text: 'The WordPress block editor project is named after Johannes Gutenberg, inventor of the movable-type printing press in 1440.' },
  { title: 'Akismet has blocked 500B+ spam comments', text: 'Built by Automattic, Akismet is the most popular anti-spam plugin, protecting 31M+ sites since 2005.' },
];
