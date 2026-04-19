# AI-Powered WordPress Block Theme Generator

> **Live demo → [wp-theme.46-225-235-124.sslip.io](https://wp-theme.46-225-235-124.sslip.io)**
>
> _Hosted on [Hetzner Cloud](https://www.hetzner.com/cloud) (ARM CAX21, Nuremberg) via [Coolify](https://coolify.io) — migrated off Railway to cut demo hosting costs._

A standalone web application that generates complete, valid, installable WordPress Block Themes from natural language descriptions. Built with Next.js, Claude AI, and a deterministic block markup serialization pipeline.

**The generated themes use only native WordPress core blocks — zero Custom HTML blocks.**

---

## Quick Start

### Prerequisites
- Node.js 18+
- An API key from any supported provider: [OpenRouter](https://openrouter.ai/), [Anthropic](https://console.anthropic.com/), [OpenAI](https://platform.openai.com/), [Grok/xAI](https://console.x.ai/), or any OpenAI-compatible endpoint

### Setup

```bash
git clone <repo-url>
cd wp-block-theme-generator
npm install
npm run dev
```

Open [http://localhost:3333](http://localhost:3333), select your AI provider, enter your API key, and start generating themes.

> **This is primarily a local-first tool.** AI generation runs 4 Claude Opus calls in sequence (~2–5 minutes total). There is no timeout locally. The hosted deployment at the URL below pre-configures an OpenRouter key so others can try it without an API key.

### Deployed Demo

**[https://wp-theme.46-225-235-124.sslip.io](https://wp-theme.46-225-235-124.sslip.io)**

Hosted on Hetzner Cloud (ARM CAX21, Nuremberg) via Coolify — persistent Node.js server, no serverless timeout limits. The server-configured OpenRouter key is pre-loaded so "Use server-configured key" works out of the box. Previously deployed on Railway.

### Run Tests

```bash
npm test
```

---

## How It Works

> **[See the full visual pipeline walkthrough](docs/how-it-works.md)** — explains the JSON intermediate approach, why LLMs can't write block markup directly, and how the no-Custom-HTML constraint is enforced at three levels.

The key insight: **the AI never writes block markup**. It writes JSON. Our code does the rest.

```
User description
     ↓
AI returns JSON block-tree    ← AI is good at this (~98.5% valid)
     ↓
Zod schema validation         ← catch malformed JSON
     ↓
Block allowlist check          ← reject core/html, core/freeform, unknown blocks
     ↓
Deterministic serializer      ← tested code converts JSON → <!-- wp:* --> markup
     ↓
WordPress parser round-trip   ← confirm markup is valid using WP's own parser
     ↓
Theme assembler               ← style.css, theme.json, templates, parts, patterns
     ↓
ZIP + Playground preview      ← download or preview in-browser
```

1. **Describe your theme** — natural language + optional color/typography/layout preferences.
2. **AI generates structured JSON** — block-tree representation, not raw markup.
3. **Deterministic serialization** — our code converts JSON to valid `<!-- wp:* -->` markup.
4. **Three-layer validation** — Zod → allowlist → WP parser round-trip.
5. **Preview** — live WordPress Playground (WP in browser via WASM).
6. **Iterate** — follow-up instructions via chat interface.
7. **Download** — installable ZIP for any WordPress 6.4+ site.

---

## Architecture

The key architectural decision is **not letting the AI write block markup directly**. Instead:

```
User Description → Claude (structured JSON) → Zod Validation → Block Serializer → WP Parser Check → ZIP
```

This eliminates the most common failure mode (malformed block comments, hallucinated block names, accidental Custom HTML usage) by making markup generation deterministic and testable.

See **[Architecture Decision Record](docs/architecture.md)** for full details including:
- Requirements traceability table (every spec requirement mapped to implementation)
- All technical decisions and alternatives considered
- Supported core blocks list
- Validation pipeline design
- Database schema
- Security considerations
- Error handling strategy
- Testing strategy

See **[What I'd Do Next](docs/what-id-do-next.md)** for future improvements including expanded block coverage, accessibility audits, WooCommerce integration, and scaling strategies.

---

## Features

| Feature | Description |
|---------|-------------|
| **Theme Generation** | Natural language → complete WordPress Block Theme |
| **No Custom HTML** | Hard validation rule — `core/html` and `core/freeform` are rejected |
| **Live Preview** | WordPress Playground in-browser preview of generated theme |
| **Iterative Editing** | Multi-turn chat to refine theme after initial generation |
| **5 AI Providers** | OpenRouter, Anthropic, OpenAI, Grok, or any OpenAI-compatible endpoint |
| **Tool Call Tracking** | Every AI call logged: provider, model, tokens, latency, success/failure |
| **Changelog** | Version history at `/changelog` on deployed site |
| **Pattern Library** | Generated patterns auto-register in WP's Pattern Library with proper PHP headers |
| **Downloadable ZIP** | Valid, installable theme package |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) |
| AI Providers | OpenRouter, Anthropic, OpenAI, Grok, Custom (all via unified interface) |
| Validation | Zod + @wordpress/block-serialization-default-parser |
| ZIP Packaging | JSZip |
| UI | React + shadcn/ui + Tailwind CSS |
| CI | GitHub Actions (lint + typecheck + test) |
| Preview | WordPress Playground (WASM) |
| Hosting | Railway (persistent Node.js — no serverless timeout) |

Provider switching is a runtime UI choice — no code changes needed. The Railway deployment uses a pre-configured OpenRouter key; local users enter their own key for any provider.

### Why Railway, not Vercel

The generation pipeline makes 4 sequential Claude Opus API calls (1 initial + 3 refinement passes). Total wall-clock time is 2–5 minutes. Vercel's serverless functions have a 10-second limit on the Hobby plan and 300 seconds on Pro — neither is reliable for long-running AI workloads. Railway runs a persistent Node.js process with no function timeout, making it the right platform for this use case.

---

## Project Structure

```
.github/workflows/ci.yml   # Lint + typecheck + test on push/PR
src/
  app/                      # Next.js pages and API routes
    changelog/              # Version history page
    api/                    # Generation + iteration endpoints
  lib/
    ai/                     # 5 providers + prompt engineering + tool tracker
    schema/                 # Zod schemas + block allowlist
    serializer/             # JSON block-tree → WP block markup
    validator/              # Three-layer validation pipeline
    assembler/              # Theme file structure generation
    packager/               # ZIP packaging
  patterns/                 # Curated block pattern templates
  components/               # React UI (form, chat, preview, stats)
tests/
  unit/                     # Serializer, validator, schema, packager, tracker tests
  integration/              # End-to-end generation test
docs/
  architecture.md           # Full ADR with requirements traceability
  what-id-do-next.md        # Future improvements
CHANGELOG.md                # Version history
```

---

## Known Limitations

- **Pattern variety:** v1 ships ~6-8 curated patterns. Generated themes may feel similar if many themes are generated for the same niche.
- **Block coverage:** The serializer supports ~35 core blocks (covering all common theme needs). Exotic blocks like `core/footnotes` or `core/table-of-contents` are not yet supported.
- **Image placeholders:** Generated themes use placeholder image URLs. Real images need to be added after installation.
- **Playground load time:** WordPress Playground takes a few seconds to initialize in the browser.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | For deployed version | Pre-configured API key for the deployed Vercel instance |

**Local development:** No environment variables required. Users enter their provider + API key directly in the UI.

**Deployed version:** Set `OPENROUTER_API_KEY` (or any provider key) as a Vercel env var. The UI will offer both the pre-configured key and a "use your own key" option.

---

## License

MIT
