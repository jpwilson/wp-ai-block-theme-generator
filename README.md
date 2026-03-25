# AI-Powered WordPress Block Theme Generator

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

Open [http://localhost:3000](http://localhost:3000), select your AI provider, enter your API key, and start generating themes.

### Run Tests

```bash
npm test
```

---

## How It Works

1. **Describe your theme** — Enter a natural language description (e.g., "A dark mode photography portfolio with a full-width hero, grid gallery, and minimal navigation") plus optional technical criteria (colors, fonts, layout preferences).

2. **AI generates structured JSON** — Claude produces a structured block-tree representation of the theme: `theme.json` design tokens, template compositions, pattern selections, and content — all as validated JSON, not raw markup.

3. **Deterministic serialization** — The application converts the JSON block-trees into valid WordPress block markup (`<!-- wp:group -->`, `<!-- wp:cover -->`, etc.) using a deterministic serializer. This guarantees syntactically correct output.

4. **Three-layer validation** — Every response passes through: Zod schema validation → block allowlist checking (rejects `core/html` and `core/freeform`) → round-trip parsing with WordPress's official block parser.

5. **Preview** — See your theme running in a live WordPress Playground instance (WP in the browser via WASM) — no local WordPress install needed.

6. **Iterate** — Send follow-up instructions via the chat interface ("make the header sticky," "switch to a warmer palette") to refine the theme. Conversation history is preserved.

7. **Download** — The validated theme files are packaged into a ZIP file ready to install on any WordPress 6.4+ site.

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

Provider switching is a runtime UI choice — no code changes needed. Deployed version uses a pre-configured OpenRouter key; local users enter their own key for any provider.

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
