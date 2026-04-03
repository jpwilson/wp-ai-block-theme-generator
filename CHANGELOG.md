# Changelog

## [0.4.0] - 2026-04-02

### Added
- **Theme Library** — every generated theme auto-saves to localStorage (name, date, description, metadata). Browseable card grid below the generator. Up to 30 themes stored.
- **New-tab preview** — "Open in New Tab" opens a full-viewport WordPress Playground preview without leaving the generator. WP Playground's Wide/Medium/Narrow responsive toolbar fully visible.
- **3-pass AI refinement pipeline** — after initial generation, 3 sequential AI improvement passes run automatically: Content (fill empty blocks, fix hero), Design (colors, spacing, section rhythm), Polish (copy, CTAs, image URLs). All 4 calls use the same model as selected by the user.
- **Railway deployment** — moved from Vercel (10s serverless limit) to Railway (persistent Node.js, no timeout). Live at https://wp-block-theme-generator-production.up.railway.app
- **Real pipeline progress terminal** — terminal block shows actual 4-pass pipeline progress (INITIAL_GENERATION → REFINE:CONTENT → REFINE:DESIGN → REFINE:POLISH) with time-based step activation.
- **8 preset themes** — expanded from 4 to 8 (Photography Portfolio, SaaS Product, Italian Restaurant, Creative Agency, Fitness Studio, Real Estate Agency, Personal Blog, Nonprofit). Each preset fills all form fields including promptSize, headerStyle, and extraPages.
- **GitHub SVG icon** — proper icon replacing broken null reference.

### Changed
- **UI redesign** — Material Design 3 light palette, Inter font, fixed left sidebar navigation, fixed right output panel, section cards with icon headers, uppercase tracking-widest labels.
- **Key Pages** — Home/About/Contact always included. User selects up to 6 additional from 15 options (was: select up to 4 from 14).
- **Block allowlist** — rebuilt from WordPress/gutenberg source (WP 6.7+). Expanded from ~65 hand-guessed blocks to ~115 blocks sourced from the official registry. Eliminates allowlist failures on valid WP blocks.
- **Serializer rewrite** — fixed critical bug: serializer was reading `block.innerContent` but AI correctly places text in `attributes.content` per WP spec. Every heading, paragraph, button, nav-link now renders actual content. Added 10 previously-missing block serializers.
- **Dev server** — runs on port 3333.
- **Default model** — Claude Opus 4.6 via OpenRouter (locally); Claude Sonnet 4.6 shown as option for faster generation.
- **Error messages** — user-friendly, no raw JSON/validation errors exposed.
- **System Prompt / AI Stats** — removed from product UI (developer-internal details not appropriate for end users).

### Fixed
- `core/navigation` was self-closing (wrong) — now correctly a container block holding nav-link children.
- `core/paragraph` text alignment used `align` attribute (block alignment) instead of `textAlign` (text alignment).
- Geist font not loading — globals.css had circular CSS variable `--font-sans: var(--font-sans)`.
- 504 Gateway Timeout on Vercel — migrated to Railway which has no function timeout limit.
- GitHub Actions CI failures — removed dead code, fixed `setState` called synchronously inside `useEffect`.

## [0.1.0] - 2026-03-24

### Added
- Initial release of WP Block Theme Generator
- AI-powered theme generation from natural language descriptions
- Support for 5 AI providers: OpenRouter, Anthropic, OpenAI, Grok, and custom OpenAI-compatible endpoints
- Structured JSON block-tree intermediate representation
- Deterministic block markup serializer supporting ~35 core blocks
- Three-layer validation pipeline (Zod schema, block allowlist, WP parser round-trip)
- Hard rejection of `core/html` and `core/freeform` blocks
- Theme assembler generating complete WordPress Block Theme file structure
- ZIP packaging with JSZip
- Multi-turn iterative editing via chat interface
- AI tool call tracking (provider, model, tokens, latency, success/failure)
- File tree and code preview for generated themes
- User-provided API key support (never stored server-side)
- Server-configured key support for deployed version
- localStorage key persistence option
- 75 unit and integration tests
- GitHub Actions CI (lint + typecheck + test)
- Full Architecture Decision Record (ADR)
- Requirements traceability table mapping all spec requirements to implementation
