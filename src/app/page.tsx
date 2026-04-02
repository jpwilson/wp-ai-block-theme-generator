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
  Sparkles, Library, FileText, History,
  PenLine, SlidersHorizontal, LayoutGrid, CheckCircle,
  Rocket, MessageSquare,
} from 'lucide-react';
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
  openrouter: 'anthropic/claude-opus-4.6',  // Opus locally (no timeout); Vercel Hobby gets Sonnet via server default
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4.1',
  grok: 'grok-3',
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

  const [showKeyConfig, setShowKeyConfig] = useState(false);

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
        // Show a friendly message — raw validation errors are not for end users
        setError('Generation failed. Try again, or try a simpler Prompt Detail setting.');
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
      // Don't expose raw technical errors — show a friendly retry message
      setError('Something went wrong. Please try again.');
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
    <div className="flex min-h-screen bg-background">
      {/* ─── Left Sidebar (desktop) ─── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col bg-[#F2F3FF] border-r border-[#BFC7D1]/60 py-6 px-4 z-40">
        <div className="mb-8 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-black text-lg tracking-tighter">W</div>
            <div>
              <h2 className="text-[15px] font-bold text-[#131B2E] tracking-tight leading-none">WP Theme Gen</h2>
              <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-widest mt-0.5">AI-Powered</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-grow">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-white text-primary font-semibold rounded-lg shadow-sm">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="text-sm">Generate</span>
          </div>
          <button
            onClick={() => document.getElementById('library-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-3 px-3 py-2.5 text-[#131B2E]/70 hover:bg-[#DAE2FD]/60 hover:translate-x-0.5 transition-all rounded-lg text-left"
          >
            <Library className="w-4 h-4 shrink-0" />
            <span className="text-sm flex-1">Theme Library</span>
            {libraryEntries.length > 0 && (
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{libraryEntries.length}</span>
            )}
          </button>
          <a href="/spec" className="flex items-center gap-3 px-3 py-2.5 text-[#131B2E]/70 hover:bg-[#DAE2FD]/60 hover:translate-x-0.5 transition-all rounded-lg">
            <FileText className="w-4 h-4 shrink-0" /><span className="text-sm">Spec</span>
          </a>
          <a href="/changelog" className="flex items-center gap-3 px-3 py-2.5 text-[#131B2E]/70 hover:bg-[#DAE2FD]/60 hover:translate-x-0.5 transition-all rounded-lg">
            <History className="w-4 h-4 shrink-0" /><span className="text-sm">Changelog</span>
          </a>
          <a href="https://github.com/jpwilson/wp-ai-block-theme-generator" target="_blank" rel="noopener" className="flex items-center gap-3 px-3 py-2.5 text-[#131B2E]/70 hover:bg-[#DAE2FD]/60 hover:translate-x-0.5 transition-all rounded-lg">
            <span className="text-xs font-bold">GH</span><span className="text-sm">GitHub</span>
          </a>
        </nav>
        <div className="border-t border-[#131B2E]/10 pt-4 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#006295]/5 border border-[#006295]/15">
            <CheckCircle className="w-3 h-3 text-[#006a48] shrink-0" />
            <span className="text-[11px] font-medium text-[#404850]">Zero Custom HTML</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#006295]/5 border border-[#006295]/15">
            <CheckCircle className="w-3 h-3 text-[#006a48] shrink-0" />
            <span className="text-[11px] font-medium text-[#404850]">Native Core Blocks Only</span>
          </div>
        </div>
      </aside>

      {/* ─── Main scrollable area ─── */}
      <div className="flex-1 lg:ml-64 lg:mr-[360px] flex flex-col min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-50 h-16 flex items-center justify-between px-6 border-b border-[#BFC7D1]/60 bg-[#FAF8FF]/90 backdrop-blur-md">
          <div className="flex items-center gap-8">
            <span className="text-lg font-black text-[#131B2E] tracking-tighter lg:hidden">WP Theme Gen</span>
            <nav className="hidden md:flex items-center">
              <span className="px-4 text-sm font-semibold text-primary border-b-2 border-primary h-16 flex items-center">Generate</span>
              <a href="/spec" className="px-4 text-sm text-[#131B2E]/60 hover:text-primary transition-colors h-16 flex items-center">Spec</a>
              <a href="/changelog" className="px-4 text-sm text-[#131B2E]/60 hover:text-primary transition-colors h-16 flex items-center">Changelog</a>
            </nav>
          </div>
          <a href="https://github.com/jpwilson/wp-ai-block-theme-generator" target="_blank" rel="noopener"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#404850] hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
            &#123;null&#125;
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </header>

        {/* Form content */}
        <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-10 space-y-10 pb-28 lg:pb-10">
          {/* Page hero */}
          <div>
            <h1 className="text-[2.5rem] font-black text-[#131B2E] tracking-tighter leading-none mb-2">Theme Generator</h1>
            <p className="text-[#404850] max-w-xl leading-relaxed text-[15px]">
              AI-powered WordPress themes. <strong>Native Core Blocks only</strong>. <strong>Zero Custom HTML</strong>. Install and edit in the WordPress Site Editor.
            </p>
          </div>

          {/* Model compact strip */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#BFC7D1]/60 bg-[#F2F3FF]">
            <span className="text-[10px] font-bold text-[#404850]/70 uppercase tracking-widest shrink-0 w-12">Model</span>
            <Select value={provider} onValueChange={(v) => { setProvider(v as ProviderName); setModel(''); }}>
              <SelectTrigger className="h-7 text-xs border-0 bg-white hover:bg-[#EAEdFF] w-[120px] shrink-0 rounded-md shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="h-4 w-px bg-[#BFC7D1] shrink-0" />
            <Select value={model || DEFAULT_MODELS[provider]} onValueChange={(v) => setModel(v ?? '')}>
              <SelectTrigger className="h-7 text-xs border-0 bg-white hover:bg-[#EAEdFF] flex-1 min-w-0 rounded-md shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const models = PROVIDER_MODELS[provider];
                  const groups = [...new Set(models.map(m => m.group).filter(Boolean))];
                  if (groups.length > 0) {
                    return groups.map(group => (
                      <div key={group}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group}</div>
                        {models.filter(m => m.group === group).map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                        ))}
                      </div>
                    ));
                  }
                  return models.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>);
                })()}
              </SelectContent>
            </Select>
            <div className="h-4 w-px bg-[#BFC7D1] shrink-0" />
            <button
              onClick={() => setShowKeyConfig(p => !p)}
              className="shrink-0 h-7 px-2.5 rounded-md text-[11px] text-[#404850] hover:text-[#131B2E] hover:bg-white transition-colors flex items-center gap-1.5 font-semibold"
            >
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${useEnvKey || apiKey ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              {showKeyConfig ? 'Hide key' : 'API key'}
            </button>
          </div>

          {showKeyConfig && (
            <div className="px-5 py-4 rounded-xl border border-[#BFC7D1]/60 bg-[#F2F3FF] space-y-4">
              {provider === 'custom' && (
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#404850]/70 mb-1.5">Base URL</label>
                  <Input id="baseUrl" placeholder="https://api.example.com/v1" value={customBaseUrl} onChange={(e) => setCustomBaseUrl(e.target.value)} className="h-10 bg-white border-[#BFC7D1]/60 text-sm" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-[#131B2E]">
                <input type="checkbox" checked={useEnvKey} onChange={(e) => setUseEnvKey(e.target.checked)} className="rounded" />
                Use server-configured key
              </label>
              {!useEnvKey && (
                <div className="space-y-2">
                  <Input id="apiKey" type="password" placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="h-10 bg-white border-[#BFC7D1]/60 text-sm" />
                  <label className="flex items-center gap-2 text-xs text-[#404850] cursor-pointer">
                    <input type="checkbox" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} className="rounded" />
                    Remember in browser · never stored on server
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Section: Theme Description */}
          <section className="bg-[#F2F3FF] rounded-xl p-7 border border-[#BFC7D1]/30">
            <div className="flex items-center gap-3 mb-6">
              <PenLine className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-xl font-bold tracking-tight">Theme Description</h2>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-1">
                <span className="text-[10px] font-bold text-[#404850]/50 uppercase tracking-wider self-center mr-1">Presets:</span>
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
                      setPages((demo.extraPages || []).join(', '));
                    }}
                    className="px-3 py-1.5 bg-[#DAE2FD]/60 text-[#57657B] rounded-lg text-xs font-semibold hover:bg-[#DAE2FD] hover:shadow-sm transition-all"
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="A warm Italian restaurant in the heart of the city. Full-width hero with rich food photography, seasonal menu sections, chef&apos;s story, and reservation CTA..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="bg-white border-[#BFC7D1]/60 text-[15px] placeholder:text-[#404850]/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl resize-none leading-relaxed"
              />
            </div>
          </section>

          {/* Section: Site Details */}
          <section className="bg-[#F2F3FF] rounded-xl p-7 border border-[#BFC7D1]/30">
            <div className="flex items-center gap-3 mb-6">
              <SlidersHorizontal className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-xl font-bold tracking-tight">Site Details</h2>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {([
                { label: 'Site Type', val: siteType, set: setSiteType, ph: 'Select type...', opts: [['blog','Blog / Magazine'],['business','Business / Corporate'],['portfolio','Portfolio / Creative'],['ecommerce','eCommerce / Shop'],['restaurant','Restaurant / Food'],['agency','Agency / Studio'],['nonprofit','Nonprofit / Charity'],['personal','Personal / Resume'],['saas','SaaS / Tech Product'],['community','Community / Forum']] },
                { label: 'Industry', val: industry, set: setIndustry, ph: 'Select industry...', opts: [['technology','Technology'],['creative','Creative / Design'],['health','Health / Wellness'],['education','Education'],['finance','Finance / Legal'],['food','Food / Hospitality'],['fashion','Fashion / Beauty'],['real-estate','Real Estate'],['sports','Sports / Fitness'],['travel','Travel / Tourism'],['music','Music / Entertainment'],['photography','Photography'],['other','Other']] },
                { label: 'Design Style', val: style, set: setStyle, ph: 'Select style...', opts: [['minimal','Minimal / Clean'],['bold','Bold / Striking'],['elegant','Elegant / Luxury'],['playful','Playful / Fun'],['corporate','Corporate / Professional'],['brutalist','Brutalist / Raw'],['editorial','Editorial / Magazine'],['warm','Warm / Friendly']] },
                { label: 'Color Mood', val: colorMood, set: setColorMood, ph: 'Select mood...', opts: [['dark','Dark / Moody'],['light','Light / Airy'],['warm','Warm (earth tones)'],['cool','Cool (blues, greens)'],['vibrant','Vibrant / Colorful'],['monochrome','Monochrome'],['pastel','Pastel / Soft'],['neon','Neon / Electric']] },
                { label: 'Header Style', val: headerStyle, set: setHeaderStyle, ph: 'Select header...', opts: [['sticky','Sticky Navigation'],['transparent','Transparent over Hero'],['centered','Centered Logo'],['minimal','Minimal / Hamburger'],['classic','Classic Left Logo + Right Nav']] },
                { label: 'Prompt Detail', val: promptSize, set: setPromptSize as (v: string) => void, ph: '', opts: [['minimal','Minimal (fastest)'],['standard','Standard'],['detailed','Detailed (best quality)']] },
              ] as const).map(({ label, val, set, ph, opts }) => (
                <div key={label} className="space-y-2">
                  <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-[#404850]/70">{label}</label>
                  <Select value={val} onValueChange={(v) => set(v ?? '')}>
                    <SelectTrigger className="h-11 bg-white border-[#BFC7D1]/60 text-sm rounded-lg">
                      <SelectValue placeholder={ph} />
                    </SelectTrigger>
                    <SelectContent>
                      {opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Additional Pages */}
          <section className="bg-[#F2F3FF] rounded-xl p-7 border border-[#BFC7D1]/30">
            <div className="flex items-center gap-3 mb-2">
              <LayoutGrid className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-xl font-bold tracking-tight">Additional Pages</h2>
            </div>
            <p className="text-xs text-[#404850]/60 mb-5 ml-8">Home · About · Contact always included — select up to 6 more</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {MANDATORY_PAGES.map(page => (
                <span key={page} className="text-xs px-3 py-1.5 rounded-lg bg-primary/8 border border-primary/20 text-primary font-semibold cursor-default select-none">
                  {page} ✓
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {OPTIONAL_PAGES.map(page => {
                const extras = pages.split(',').map(p => p.trim()).filter(Boolean);
                const selected = extras.includes(page);
                const atLimit = extras.length >= 6 && !selected;
                return (
                  <button
                    key={page}
                    onClick={() => {
                      if (selected) setPages(extras.filter(p => p !== page).join(', '));
                      else if (!atLimit) setPages([...extras, page].join(', '));
                    }}
                    disabled={atLimit}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                      selected ? 'bg-primary text-white border-primary'
                      : atLimit ? 'opacity-35 cursor-not-allowed bg-white border-[#BFC7D1]/60 text-[#404850]'
                      : 'bg-white border-[#BFC7D1]/60 text-[#404850] hover:bg-primary hover:text-white hover:border-primary'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Refine chat (conditional) */}
          {themeData && (
            <section className="bg-[#F2F3FF] rounded-xl p-7 border border-[#BFC7D1]/30">
              <div className="flex items-center gap-3 mb-5">
                <MessageSquare className="w-5 h-5 text-primary shrink-0" />
                <h2 className="text-xl font-bold tracking-tight">Refine Theme</h2>
              </div>
              {chatMessages.length > 0 && (
                <ScrollArea className="h-40 mb-4 border border-[#BFC7D1]/40 rounded-xl bg-white p-3">
                  <div className="space-y-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-right' : ''}`}>
                        <Badge variant={msg.role === 'user' ? 'default' : 'secondary'} className="mb-1">{msg.role === 'user' ? 'You' : 'AI'}</Badge>
                        <p className={`${msg.role === 'user' ? 'bg-primary/10' : 'bg-[#F2F3FF]'} p-2 rounded-lg inline-block max-w-[80%] text-left`}>{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <div className="flex gap-2">
                <Input placeholder="Make the header sticky, change accent to emerald..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleIterate()} disabled={iterating} className="bg-white border-[#BFC7D1]/60 h-10" />
                <Button onClick={handleIterate} disabled={iterating || !chatInput.trim()} className="h-10 px-5 bg-primary hover:bg-primary/90">
                  {iterating ? '...' : 'Send'}
                </Button>
              </div>
            </section>
          )}

          {/* Theme Library */}
          <div id="library-section">
            <ThemeLibrary
              entries={libraryEntries}
              onDelete={(id) => setLibraryEntries(deleteFromLibrary(id))}
              onPreview={(entry) => {
                storePreviewPayload({ zipBase64: entry.zipBase64, slug: entry.slug });
                window.open('/preview', '_blank', 'noopener');
              }}
            />
          </div>
        </main>
      </div>

      {/* ─── Right Panel (desktop) ─── */}
      <aside className="hidden lg:flex fixed right-0 top-0 w-[360px] h-screen flex-col bg-[#F2F3FF] border-l border-[#BFC7D1]/60 z-40">
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Error — friendly, not raw technical output */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Generation failed</p>
              <p className="text-xs text-red-600 leading-relaxed">
                The AI returned an unexpected response. This sometimes happens with complex prompts — try again, or switch to a simpler Prompt Detail setting.
              </p>
            </div>
          )}

          {/* Output — theme preview + download */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#131B2E] text-base">{themeName}</p>
                  <p className="text-xs text-[#404850]/60">
                    {files.filter(f => f.path.startsWith('templates')).length} templates ·{' '}
                    {files.filter(f => f.path.startsWith('parts')).length} parts ·{' '}
                    {files.filter(f => f.path.startsWith('patterns')).length} patterns
                  </p>
                </div>
                <Button onClick={handleDownload} className="bg-primary text-white hover:bg-primary/90 text-sm font-semibold px-4">
                  Download
                </Button>
              </div>
              <div className="bg-white rounded-xl border border-[#BFC7D1]/40 overflow-hidden">
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b border-[#BFC7D1]/40 bg-transparent px-4 gap-4 h-10">
                    <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-[10px] font-bold uppercase tracking-wider px-0 h-10 bg-transparent">Preview</TabsTrigger>
                    <TabsTrigger value="files" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-[10px] font-bold uppercase tracking-wider px-0 h-10 bg-transparent">Files</TabsTrigger>
                  </TabsList>
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
                  <TabsContent value="files" className="m-0">
                    <div className="grid grid-cols-[150px_1fr] divide-x min-h-[380px] max-h-[500px]">
                      <ScrollArea className="h-[380px]">
                        <div className="p-2 space-y-0.5">
                          {files.map(file => (
                            <button key={file.path} onClick={() => setSelectedFile(file.path)}
                              className={`w-full text-left text-[10px] px-2 py-1.5 rounded font-mono truncate transition-colors ${selectedFile === file.path ? 'bg-primary text-white' : 'hover:bg-[#EAEdFF] text-[#404850]'}`}>
                              {file.path}
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                      <ScrollArea className="h-[380px]">
                        <pre className="p-3 text-[10px] font-mono whitespace-pre-wrap break-all text-[#131B2E] leading-relaxed">
                          {selectedFileContent}
                        </pre>
                      </ScrollArea>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!files.length && !generating && !error && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center mx-auto mb-5">
                <Rocket className="w-7 h-7 text-primary" />
              </div>
              <p className="text-base font-bold text-[#131B2E] mb-2">Ready to generate</p>
              <p className="text-sm text-[#404850]/60 leading-relaxed max-w-[220px]">
                Fill in your theme description on the left and click Generate Theme.
              </p>
              <div className="mt-6 space-y-2 text-left w-full max-w-[240px]">
                {['Native WordPress core blocks only', 'Full Site Editing compatible', 'Installs in one click'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-[#006a48] shrink-0" />
                    <span className="text-xs text-[#404850]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generating state */}
          {generating && (
            <div className="bg-white rounded-xl border border-[#BFC7D1]/40 p-6">
              <GenerationProgress />
            </div>
          )}
        </div>

        {/* Generate — sticky bottom */}
        <div className="p-6 border-t border-[#BFC7D1]/40 shrink-0">
          <button
            onClick={handleGenerate}
            disabled={generating || !description.trim()}
            className="w-full py-4 rounded-xl font-bold text-[15px] text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            style={generating || !description.trim() ? { background: '#BFC7D1' } : { background: 'linear-gradient(135deg, #006295, #007cba)' }}
          >
            <Rocket className="w-5 h-5" />
            {generating ? 'Generating & Refining...' : 'Generate Theme'}
          </button>
          {!generating && description.trim() && (
            <p className="text-center text-[9px] font-bold uppercase tracking-wider text-[#404850]/50 mt-3">
              1 generation · 3 refinement passes · Claude Opus 4.6
            </p>
          )}
        </div>
      </aside>

      {/* ─── Mobile: FAB generate ─── */}
      <div className="fixed bottom-20 right-4 lg:hidden z-50">
        <button
          onClick={handleGenerate}
          disabled={generating || !description.trim()}
          className="bg-primary text-white px-6 py-3.5 rounded-xl font-bold shadow-xl shadow-primary/30 flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
        >
          <Rocket className="w-4 h-4" />
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* ─── Mobile Bottom Nav ─── */}
      <nav className="fixed bottom-0 w-full z-50 bg-[#FAF8FF] border-t border-[#BFC7D1]/60 lg:hidden">
        <div className="flex justify-around items-center h-16 px-4">
          <a href="#" className="flex flex-col items-center gap-1 text-primary">
            <Sparkles className="w-5 h-5" /><span className="text-[9px] font-bold uppercase tracking-widest">Build</span>
          </a>
          <button onClick={() => document.getElementById('library-section')?.scrollIntoView({ behavior: 'smooth' })} className="flex flex-col items-center gap-1 text-[#404850]/60">
            <Library className="w-5 h-5" /><span className="text-[9px] font-bold uppercase tracking-widest">Library</span>
          </button>
          <a href="/spec" className="flex flex-col items-center gap-1 text-[#404850]/60">
            <FileText className="w-5 h-5" /><span className="text-[9px] font-bold uppercase tracking-widest">Spec</span>
          </a>
          <a href="/changelog" className="flex flex-col items-center gap-1 text-[#404850]/60">
            <History className="w-5 h-5" /><span className="text-[9px] font-bold uppercase tracking-widest">History</span>
          </a>
        </div>
      </nav>
    </div>
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

// ── Real pipeline progress terminal ──────────────────────────────────────────
//
// The actual generation process is 4 sequential AI calls:
//   Pass 1  Initial generation    ~0–90s
//   Pass 2  Refine: Content       ~90–160s
//   Pass 3  Refine: Design        ~160–220s
//   Pass 4  Refine: Polish        ~220–280s
//
// The terminal shows which pass is currently running based on elapsed time,
// then shows a completed output summary when done.

const PIPELINE_STEPS = [
  { label: 'INITIAL_GENERATION', detail: 'Building theme.json + 6 templates + patterns', startsAt: 0,   endsAt: 90  },
  { label: 'REFINE:CONTENT',     detail: 'Filling empty blocks, real copy, hero text',   startsAt: 90,  endsAt: 160 },
  { label: 'REFINE:DESIGN',      detail: 'Colors, spacing, section rhythm, buttons',      startsAt: 160, endsAt: 220 },
  { label: 'REFINE:POLISH',      detail: 'CTAs, image URLs, header/footer, consistency',  startsAt: 220, endsAt: 280 },
];

interface ThemeFile { path: string; content: string; }

function TerminalProgress({ generating, files }: { generating: boolean; files: ThemeFile[] }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!generating) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [generating]);

  const done = !generating && files.length > 0;

  return (
    <div className="rounded-xl bg-[#131B2E] p-5 font-mono text-[0.68rem] leading-relaxed shadow-xl">
      <div className="flex justify-between border-b border-white/10 pb-2 mb-4">
        <span className="text-white/40">ENGINE_MODE</span>
        <span className="text-emerald-400 font-bold">CORE_BLOCKS_ONLY</span>
      </div>

      {/* Idle state */}
      {!generating && !done && (
        <div className="space-y-1.5">
          <p className="text-white/40">{'// System ready. 4-pass pipeline:'}</p>
          {PIPELINE_STEPS.map((step, i) => (
            <p key={i}>
              <span className="text-white/25">{String(i + 1).padStart(2, '0')} </span>
              <span className="text-white/40">{step.label}</span>
            </p>
          ))}
          <p className="text-white/25 pt-2">{'// Click Generate to begin'}</p>
        </div>
      )}

      {/* Generating state — steps light up as time elapses */}
      {generating && (
        <div className="space-y-2">
          {PIPELINE_STEPS.map((step, i) => {
            const isActive  = elapsed >= step.startsAt && elapsed < step.endsAt;
            const isDone    = elapsed >= step.endsAt;
            const isPending = elapsed < step.startsAt;
            return (
              <div key={i}>
                <p>
                  <span className="text-white/25">{String(i + 1).padStart(2, '0')} </span>
                  <span className={
                    isDone    ? 'text-emerald-400' :
                    isActive  ? 'text-amber-400 animate-pulse' :
                                'text-white/25'
                  }>
                    {step.label}
                    {isDone   ? ' ✓' : ''}
                    {isActive ? '...' : ''}
                  </span>
                </p>
                {isActive && (
                  <p className="text-white/40 ml-4">{step.detail}</p>
                )}
              </div>
            );
          })}
          <p className="text-white/30 pt-1 font-mono">{elapsed}s elapsed</p>
        </div>
      )}

      {/* Complete state */}
      {done && (
        <div className="space-y-1.5">
          {PIPELINE_STEPS.map((step, i) => (
            <p key={i}>
              <span className="text-white/25">{String(i + 1).padStart(2, '0')} </span>
              <span className="text-emerald-400">{step.label} ✓</span>
            </p>
          ))}
          <div className="mt-4 pt-3 border-t border-white/10 space-y-1">
            <p className="text-white/30">{'// Output:'}</p>
            <p className="text-white/60">— theme.json v3 · settings · global styles</p>
            <p className="text-white/60">
              — {files.filter(f => f.path.startsWith('templates')).length} templates
              {' · '}{files.filter(f => f.path.startsWith('parts')).length} parts
              {' · '}{files.filter(f => f.path.startsWith('patterns')).length} patterns
            </p>
            <p className="text-emerald-400 font-bold">STATUS: COMPLETE — {files.length} FILES</p>
          </div>
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
