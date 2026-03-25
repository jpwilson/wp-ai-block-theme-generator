# Architecture Decision Record — AI-Powered WordPress Block Theme Generator

## Overview

A standalone web application that takes a natural language description (plus optional technical criteria like color palette, typography, layout preferences) and generates a complete, valid, installable WordPress Block Theme (FSE). The generated theme uses **only native core blocks** — zero `core/html` (Custom HTML) or `core/freeform` (Classic) blocks for any structural or visual element.

Users can iterate on themes via multi-turn conversation, preview them in a live WordPress Playground instance, and download the final ZIP.

The app supports **5 AI providers** (OpenRouter, Anthropic, OpenAI, Grok, Other/custom) — users choose their provider and enter their own API key when running locally. The deployed Vercel version uses a pre-configured key.

---

## Requirements Traceability

Every requirement from the spec, mapped to how this project meets it.

| # | Spec Requirement | How We Meet It |
|---|---|---|
| 1 | **User Input Interface** — best way to get site description from user within good UX boundaries | Multi-step form: natural language textarea + structured optional fields (color palette picker, typography selector, layout style radio) built with shadcn/ui; plus a follow-up chat interface for iterative refinement. |
| 2 | **AI Orchestration** — clear component for prompt construction, ensuring model understands WP block theme constraints | Dedicated `lib/ai/` module with system prompt containing full WP block rules, allowed-blocks list, Zod schema definition, and curated pattern catalog; Claude API isolated behind swappable provider interface. |
| 3 | **Structured Output** — AI must output valid JSON and template files adhering to WP Block Theme standards | AI outputs structured JSON block-trees (not raw markup); deterministic serializer converts to valid `<!-- wp:* -->` markup; three-layer validation pipeline ensures correctness. |
| 4 | **No Custom HTML Block** — templates, parts, patterns must exclusively use native WordPress block syntax | Hard validation rule: `core/html` and `core/freeform` in AI output trigger rejection + auto-retry; block allowlist enforces only known core blocks; serializer physically cannot produce Custom HTML markup. |
| 5 | **Deliverable Theme Package** — ZIP that can be installed as a working WordPress Block Theme | JSZip assembles complete theme structure (style.css, theme.json, templates/, parts/, patterns/, functions.php) into downloadable ZIP; validated file structure matches WP theme hierarchy. |
| 6 | **Standalone application** — no external services or credentials required beyond AI provider | Self-contained Next.js app; clone, `npm install`, set one API key env var, run. No database or external services needed. |
| 7 | **Language agnostic output** — generated output is WordPress-specific (JSON/PHP/HTML) | Serializer outputs standard WP block markup HTML, theme.json JSON, style.css, and pattern PHP files — all native WordPress formats. |
| 8 | **AI provider swappable** — integration clean enough that swapping providers is not a major rewrite | 5 providers supported in the UI (OpenRouter, Anthropic, OpenAI, Grok, Other/custom). All share a common interface — OpenRouter/Grok/Other use OpenAI-compatible API, Anthropic uses native SDK. Provider selection is a runtime UI choice, not a code change. |
| 9 | **Visually impressive, not generic** — must go beyond boilerplate themes | Curated pattern library with sophisticated layouts (cover heroes, feature grids, testimonials, query loops); AI selects and customizes with creative design tokens; theme.json design system produces cohesive, polished themes. |
| 10 | **Graceful error handling** — API failures, rate limits, invalid AI output | Three-layer validation with auto-retry (max 2); meaningful error messages surfaced to user; rate limit detection with backoff; input validation on theme slug and all user strings. |
| 11 | **Robust output validation** — detect invalid JSON or malformed block HTML | Layer 1: JSON parse + Zod schema; Layer 2: block allowlist + forbidden block check; Layer 3: round-trip through `@wordpress/block-serialization-default-parser`. |
| 12 | **Input validation** — e.g., ensuring theme slug is valid | Theme slug restricted to lowercase alphanumeric + hyphens; description length limits; color values validated as hex; all user strings sanitized before inclusion in PHP/JSON/HTML files. |
| 13 | **Unit tests** — prompt construction, output validation, file packaging | Tests for serializer (per-block-type), validator (allowlist, forbidden blocks, malformed JSON), schema (Zod accept/reject), assembler (file paths, metadata), packager (ZIP contents). |
| 14 | **Integration test** — end-to-end flow from description to theme | Integration test with mocked AI response: description → validation → serialization → assembly → ZIP; verifies all files present, all templates parse, no forbidden blocks. |
| 15 | **Tests pass cleanly** — `npm test` with no setup friction | Vitest configured; `npm test` runs all unit + integration tests; no external services required for tests (AI responses mocked). |
| 16 | **Git hygiene** — incremental commits, clear subject lines, small focused PRs | Incremental commits per feature/phase; conventional commit messages; PR-per-feature when applicable. |
| 17 | **README** — how to run, architecture overview, known limitations | README.md with quick start, how-it-works, tech stack, project structure, known limitations, environment variables. Links to ADR and What I'd Do Next. |
| 18 | **ADR** — key decisions, alternatives, trade-offs, security, design exploration | This document. Covers all 10+ technical decisions with alternatives considered, trade-offs accepted, and rationale. |
| 19 | **What I'd Do Next** — priorities for another week, production readiness, scaling | Separate document covering expanded block coverage, formal block validation, accessibility audits, performance baselines, WooCommerce integration, plugin-aware generation. |
| 20 | **Clean, typed, tested, linted code** | TypeScript throughout; Zod for runtime types; ESLint + Prettier configured; all core logic unit tested. |
| **Bonus** | **Live Theme Preview** — see theme without separate WP instance | WordPress Playground embedded via iframe; generated theme injected into WASM-based WP runtime for real FSE preview. |
| **Bonus** | **Iteration** — make subsequent changes to the theme | Multi-turn chat interface; conversation history persisted in database; follow-up prompts sent with existing theme JSON as context for refinement. |
| **Bonus** | **Pattern Library Integration** — patterns available in WP Pattern Library | Generated patterns include proper PHP file headers (Title, Slug, Categories, Keywords, Description) so they auto-register in the Pattern Library when the theme is activated. |
| **Infra** | **GitHub Actions CI** — lint + type check + tests on every push/PR | `.github/workflows/ci.yml` runs ESLint, TypeScript type check, and Vitest on every push and pull request. PRs can't merge with failures. |
| **Infra** | **AI Tool Call Tracking** — observability into AI usage | Every AI call logged: provider, model, tokens in/out, latency, success/failure, retry count. Displayed in a debug panel on the deployed version. |
| **Infra** | **Changelog** — version history on deployed site | `CHANGELOG.md` maintained in repo; `/changelog` page on the deployed site renders it. |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Next.js App (App Router)                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────┐          │
│  │                    React UI (shadcn/ui)            │          │
│  │                                                    │          │
│  │  • Provider selector (OpenRouter/Anthropic/OpenAI/ │          │
│  │    Grok/Other) + API key input                     │          │
│  │  • Theme description form + technical criteria     │          │
│  │  • Multi-turn chat interface for iteration         │          │
│  │  • File tree + code preview                        │          │
│  │  • WordPress Playground live preview iframe        │          │
│  │  • Tool call stats / debug panel                   │          │
│  │  • Changelog page                                  │          │
│  └──────┬─────────────────────────────────────────────┘          │
│         │                                                        │
│         ▼                                                        │
│  ┌───────────────────────────────────────────────────┐           │
│  │              Server Action / API Route             │           │
│  │                                                   │           │
│  │  1. Resolve AI provider + credentials             │           │
│  │     (env var for deployed, user-provided for local)│           │
│  │  2. Build system prompt                           │           │
│  │     (WP block rules, allowed blocks,              │           │
│  │      theme.json schema, pattern catalog,          │           │
│  │      conversation history for iterations)         │           │
│  │  3. Call AI provider (unified interface)           │           │
│  │     → Structured JSON output:                     │           │
│  │       • theme.json settings/styles                │           │
│  │       • block-tree for each template              │           │
│  │       • pattern selections + content              │           │
│  │       • template part assignments                 │           │
│  │  4. Log tool call stats (provider, model,         │           │
│  │     tokens, latency, success/failure)             │           │
│  └──────┬────────────────────────────────────────────┘           │
│         │                                                        │
│         ▼                                                        │
│  ┌───────────────────────────────────────────┐                   │
│  │         Validation Layer (Zod)             │                   │
│  │                                           │                   │
│  │  • Parse AI response as JSON              │                   │
│  │  • Validate against Zod block-tree schema │                   │
│  │  • Reject unknown block names             │                   │
│  │  • Reject core/html and core/freeform     │                   │
│  │  • Validate theme.json against WP schema  │                   │
│  │  • Sanitize user-provided strings         │                   │
│  └──────┬────────────────────────────────────┘                   │
│         │                                                        │
│         ▼                                                        │
│  ┌───────────────────────────────────────────┐                   │
│  │       Block Markup Serializer             │                   │
│  │                                           │                   │
│  │  Deterministic transformation:            │                   │
│  │  JSON block-tree → valid <!-- wp:* -->    │                   │
│  │  markup for each template/part/pattern    │                   │
│  │                                           │                   │
│  │  Post-serialization validation:           │                   │
│  │  Parse with @wordpress/block-serialization│                   │
│  │  -default-parser to confirm round-trip    │                   │
│  └──────┬────────────────────────────────────┘                   │
│         │                                                        │
│         ▼                                                        │
│  ┌───────────────────────────────────────────┐                   │
│  │    Theme Assembler + ZIP + Preview        │                   │
│  │                                           │                   │
│  │  Assembles file structure:                │                   │
│  │  mytheme/                                 │                   │
│  │    style.css, theme.json, functions.php   │                   │
│  │    templates/ parts/ patterns/            │                   │
│  │                                           │                   │
│  │  JSZip → downloadable .zip               │                   │
│  │  Inject into WordPress Playground iframe  │                   │
│  └───────────────────────────────────────────┘                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

GitHub Actions CI: lint + typecheck + vitest on every push/PR
```

---

## Key Technical Decisions

### 1. Structured JSON intermediate, not direct block markup generation

**Decision:** The AI outputs a structured JSON block-tree (e.g., `{name: "core/group", attributes: {...}, innerBlocks: [...]}`). The application deterministically converts this to valid WordPress block markup.

**Why:** Direct LLM-to-markup generation produces valid complex block markup only ~50-70% of the time. The JSON intermediate approach achieves ~98.5% first-attempt validity (documented by practitioners). When the JSON is valid, the serialized markup is always valid — the entire class of "malformed block comment" errors is eliminated by design.

**Alternatives considered:**
- **Direct markup generation with retry/fix loops** — Fastest to prototype but least reliable. Automattic's own `wordpress-agent-skills` needed a dedicated block-fixer tool to patch AI output. Not appropriate for "production-minded" quality bar.
- **Pure template-based (AI only selects patterns)** — Most reliable but too constrained. Doesn't demonstrate sophisticated AI capability or produce unique designs.

**Trade-off accepted:** We must build and maintain a block serializer that covers every supported block type. This is upfront engineering effort, but it's deterministic, testable, and doesn't break unpredictably.

### 2. Multi-provider AI support (5 providers)

**Decision:** Support OpenRouter, Anthropic, OpenAI, Grok (xAI), and Other (custom OpenAI-compatible endpoint) as AI providers. User selects provider and enters API key in the UI. Deployed version uses a pre-configured key from environment variables.

**Why:** The spec requires the integration be "clean enough that swapping providers is not a major rewrite." We go further — swapping is a runtime UI choice, not a code change at all. This also makes the app genuinely useful: users bring their own key for whichever provider they prefer or have access to.

**How it works:**
- **OpenRouter, Grok, Other** — All OpenAI-compatible APIs. Same SDK, different `baseURL`. OpenRouter gives access to Claude, GPT-4, Llama, Gemini, etc. via one key.
- **Anthropic** — Native Anthropic SDK (different message format). Wrapped behind the same interface.
- **OpenAI** — Direct OpenAI SDK.
- A unified `generateTheme(provider, apiKey, prompt)` function abstracts the differences. The rest of the pipeline (validation, serialization, assembly) is provider-agnostic.

**For deployment:** The Vercel deployment uses an OpenRouter API key (set as env var) so visitors can generate themes without their own key. The deployed UI shows a "Use your own key" option for users who want to use a different provider/model.

**For local development:** User sets their preferred provider + key in the UI or via `.env`.

### 3. Next.js (App Router) as framework

**Decision:** Next.js with App Router, deployed on Vercel.

**Why:**
- Vercel AI SDK provides first-class streaming support for Claude
- `@wordpress/block-serialization-default-parser` is a JavaScript package — no cross-language bridge needed
- Server Actions handle AI API calls without exposing keys to the client
- React ecosystem for the input UI (shadcn/ui)
- The spec says "your choice of stack" — Next.js is what I'm most effective with

**Alternatives considered:**
- **Python/FastAPI** — Strong AI ecosystem, but WordPress block tooling is all JS/Node. Would need two runtimes or lose access to the official WP parser.
- **SvelteKit** — Good framework, smaller ecosystem for AI tooling and WP libraries.
- **Plain Express** — More manual setup, no benefit over Next.js for this use case.

### 4. Curated pattern library (small, not exhaustive)

**Decision:** Ship 5-8 pre-validated block patterns (hero/cover, feature grid, CTA, testimonials, blog query loop, about section). AI selects, customizes content, and adapts colors/spacing via the JSON intermediate.

**Why:** Patterns are the highest-visual-impact parts of a theme (hero sections, feature grids). LLMs produce better results when choosing from and customizing proven layouts than when inventing complex nested block structures from scratch. The patterns are hand-written with valid block markup, so they're guaranteed to pass validation. AI still has creative freedom on theme.json design tokens, content, which patterns to use, and how to compose them.

**Trade-off accepted:** Limited pattern variety in v1. Mitigated by making patterns customizable (colors, content, layout options come from AI) rather than static.

### 5. Three-layer validation pipeline

**Decision:** Every AI response passes through three validation stages before any files are assembled.

**Layer 1 — JSON parsing + Zod schema validation:**
- AI response must be valid JSON
- Must conform to the block-tree Zod schema (correct types, required fields)
- Fill sensible defaults for optional fields rather than failing

**Layer 2 — Block allowlist + forbidden block check:**
- Every block name in the tree must be in the allowed core blocks list
- `core/html` and `core/freeform` trigger a hard validation failure
- Unknown block names are rejected

**Layer 3 — Serialized markup validation:**
- After deterministic serialization, parse the output with `@wordpress/block-serialization-default-parser`
- Confirm the parse result matches the intended block structure
- Catch any serialization bugs in our own code

**Why:** The spec explicitly requires "robust validation of the AI's output" and "meaningful error to the user, not a silent failure." Three layers catch errors at the earliest possible point: bad JSON (layer 1), hallucinated/forbidden blocks (layer 2), malformed markup (layer 3).

### 6. theme.json as the primary design system lever

**Decision:** Put as many visual decisions as possible into `theme.json` (colors, typography, spacing, layout widths, element styles, block-level styles) rather than inline block attributes or custom CSS.

**Why:** This is how WordPress block themes are designed to work. `theme.json` settings propagate to the editor UI, giving users full control in FSE. Inline styles bypass the design system and create themes that are hard to customize. The AI is good at generating well-structured theme.json because it's a documented JSON schema.

### 7. Security: sanitize user-provided strings

**Decision:** All user input that flows into theme files (theme name, description, content text) is sanitized before inclusion. Theme slugs are restricted to lowercase alphanumeric + hyphens.

**Why:** User input ends up in PHP files (pattern headers), JSON (theme.json), and HTML (block content). Without sanitization, this is a code injection vector. The spec calls this out explicitly.

### 8. AI tool call tracking

**Decision:** Log every AI API call in-memory: provider, model, tokens in/out, latency (ms), success/failure, retry count. Display in a debug/stats panel on the deployed version.

**Why:** Observability into the AI layer is critical for debugging and optimization. When a generation fails, you need to know: was it the AI's fault (bad JSON), the validator's fault, or a timeout? Token counts help estimate cost. Latency tracking identifies slow models. This data is session-scoped (in-memory) — no database needed.

### 9. GitHub Actions CI

**Decision:** `.github/workflows/ci.yml` runs ESLint, TypeScript type check, and Vitest on every push and pull request.

**Why:** The spec requires "tests should pass cleanly" and "strong commit history and PR discipline." CI ensures nothing merges with lint errors, type errors, or failing tests. Standard practice for production-minded code.

### 10. WordPress Playground for live preview

**Decision:** Embed WordPress Playground (WP in the browser via WASM) in an iframe. After theme generation, inject the ZIP into the Playground instance so users see their theme running in a real WordPress environment.

**Why:** The spec mentions "view a visual mock-up of the generated theme structure." A static file tree is functional but not impressive. WordPress Playground lets users see their theme in the actual Site Editor and browse the front-end — the most authentic preview possible without installing WordPress. The spec also lists "Live Theme Preview" as a bonus idea.

**Alternatives considered:**
- **Static HTML preview** — Render the block markup as HTML. Would miss WordPress-specific rendering (dynamic blocks like navigation, query loops) and theme.json style application.
- **Screenshot service** — Use a headless browser to screenshot a WP install with the theme. Complex infrastructure, slow, fragile.

### 11. Multi-turn iterative editing

**Decision:** After initial generation, users can send follow-up instructions ("make the header sticky," "change to a blue palette," "add a testimonials section") via a chat interface. The AI receives the existing theme JSON + the refinement request and produces an updated theme.

**Why:** Listed as a bonus idea in the spec: "Give the user a way to make subsequent changes to the theme." Single-shot generation often doesn't match what the user envisioned on the first try. Iteration makes the tool dramatically more useful. Conversation history is persisted in Supabase so users can continue refining across sessions.

### 12. Pattern Directory integration

**Decision:** Generated patterns include proper PHP file headers (Title, Slug, Categories, Keywords, Description, Viewport Width) so they auto-register in WordPress's Pattern Library when the theme is activated. Optionally, reference high-quality patterns from the WordPress.org Pattern Directory via slugs in theme.json.

**Why:** Listed as a bonus idea in the spec: "Structure the output so that generated patterns are immediately available in the WordPress Pattern Library interface." This is essentially free — it just requires correct PHP file headers in the pattern files, which we generate anyway. Pattern Directory references (external) are optional and clearly documented as external dependencies.

---

## Supported Core Blocks (v1)

These are the blocks the serializer will support. This list covers the needs of a complete blog/business theme without the Custom HTML block.

### Layout
- `core/group` — Generic container (constrained, flex, grid layouts)
- `core/columns` + `core/column` — Multi-column layouts
- `core/cover` — Background image/color with overlay content
- `core/spacer` — Vertical spacing
- `core/separator` — Horizontal rule

### Text
- `core/paragraph` — Body text
- `core/heading` — H1-H6
- `core/list` + `core/list-item` — Ordered/unordered lists
- `core/quote` — Blockquotes
- `core/pullquote` — Styled pull quotes
- `core/verse` — Poetry/preformatted text
- `core/details` — Collapsible details/summary

### Media
- `core/image` — Single image
- `core/gallery` — Image gallery
- `core/video` — Video embed
- `core/media-text` — Side-by-side media and text

### Interactive
- `core/buttons` + `core/button` — Call-to-action buttons
- `core/navigation` — Site navigation (auto-generates from pages/menus)
- `core/search` — Search form
- `core/social-links` + `core/social-link` — Social media icons

### Theme/Site
- `core/site-title` — Dynamic site title
- `core/site-tagline` — Dynamic site tagline
- `core/site-logo` — Site logo
- `core/template-part` — Include header/footer/sidebar parts

### Post/Query
- `core/query` — Query loop container
- `core/post-template` — Loop template
- `core/post-title` — Post title (with link option)
- `core/post-content` — Post body
- `core/post-excerpt` — Post excerpt
- `core/post-date` — Post date
- `core/post-author` — Post author
- `core/post-featured-image` — Featured image
- `core/post-terms` — Categories/tags
- `core/query-pagination` — Pagination container
- `core/query-pagination-previous` — Previous page
- `core/query-pagination-next` — Next page
- `core/query-pagination-numbers` — Page numbers
- `core/query-no-results` — No results message

---

## File Structure (Application)

```
wp-block-theme-generator/
  .github/
    workflows/
      ci.yml                      # Lint + typecheck + vitest on push/PR
  src/
    app/                          # Next.js App Router
      page.tsx                    # Main UI — form + chat + preview
      changelog/
        page.tsx                  # Changelog page (reads CHANGELOG.md)
      api/
        generate/route.ts         # Theme generation endpoint
        iterate/route.ts          # Follow-up refinement endpoint
      layout.tsx                  # Root layout
    lib/
      ai/
        providers/
          openrouter.ts           # OpenRouter (OpenAI-compatible)
          anthropic.ts            # Anthropic native SDK
          openai.ts               # OpenAI direct
          grok.ts                 # xAI Grok (OpenAI-compatible)
          custom.ts               # Other/custom endpoint
          index.ts                # Unified provider interface
        prompts/
          system.ts               # System prompt with WP block rules
          theme.ts                # Theme generation prompt builder
          iterate.ts              # Iteration/refinement prompt builder
        tool-tracker.ts           # Log AI calls: provider, model, tokens, latency
      schema/
        block-tree.ts             # Zod schema for block-tree JSON
        theme-json.ts             # Zod schema for theme.json
        allowed-blocks.ts         # Core block allowlist
      serializer/
        index.ts                  # JSON block-tree → WP block markup
        blocks/                   # Per-block serialization logic
          group.ts
          paragraph.ts
          heading.ts
          columns.ts
          cover.ts
          query.ts
          ...
      validator/
        index.ts                  # Three-layer validation pipeline
        block-allowlist.ts        # Forbidden block checker
        markup-validator.ts       # WP parser validation
      assembler/
        index.ts                  # Assemble theme file structure
        style-css.ts              # Generate style.css with metadata
        functions-php.ts          # Generate functions.php
        patterns.ts               # Generate pattern PHP files
      packager/
        index.ts                  # JSZip packaging → downloadable ZIP
    patterns/                     # Curated pattern templates (JSON)
      hero.json
      features.json
      cta.json
      testimonials.json
      blog-query.json
      about.json
    components/                   # React UI components
      theme-form.tsx              # Input form (description + criteria)
      provider-selector.tsx       # AI provider dropdown + API key input
      chat-interface.tsx          # Multi-turn refinement chat
      generation-status.tsx       # Progress/status display
      file-preview.tsx            # Generated file tree + content viewer
      playground-preview.tsx      # WordPress Playground iframe
      tool-call-stats.tsx         # AI call stats / debug panel
      download-button.tsx         # ZIP download trigger
  tests/
    unit/
      serializer.test.ts         # Block-tree → markup tests
      validator.test.ts          # Validation pipeline tests
      schema.test.ts             # Zod schema tests
      assembler.test.ts          # File assembly tests
      packager.test.ts           # ZIP packaging tests
      tool-tracker.test.ts       # Tool call logging tests
    integration/
      generate-theme.test.ts     # End-to-end: description → valid ZIP
  docs/
    architecture.md              # This document
    what-id-do-next.md           # Future improvements
  CHANGELOG.md                   # Version history (rendered on /changelog)
  .env.example                   # All env vars documented
  package.json
  tsconfig.json
  next.config.js
  README.md
```

---

## Data Flow (Step by Step)

### Initial Generation
1. **User configures AI provider** — Select provider (OpenRouter/Anthropic/OpenAI/Grok/Other) + enter API key (or use pre-configured key on deployed version)
2. **User submits form** — Natural language description + optional fields (color palette, typography, layout style)
3. **Server action builds prompt** — System prompt (WP block rules, allowed blocks, schema definition) + user prompt (description, criteria)
4. **AI provider call** — Returns structured JSON: `{ themeJson: {...}, templates: {...}, parts: {...}, patterns: [...] }` where templates/parts contain block-tree arrays
5. **Log tool call** — Record provider, model, tokens, latency, success/failure
6. **Zod validation** — Parse and validate the full response. Reject or retry on failure with error context
7. **Block allowlist check** — Walk every block-tree node, reject `core/html`, `core/freeform`, and unknown blocks
8. **Serialize block-trees** — Deterministically convert each template/part block-tree to `<!-- wp:* -->` markup
9. **Parse serialized markup** — Round-trip through `@wordpress/block-serialization-default-parser` to confirm validity
10. **Assemble theme files** — Generate `style.css`, `theme.json`, template `.html` files, part `.html` files, pattern `.php` files, `functions.php`
11. **Package ZIP** — JSZip bundles everything under `theme-slug/`
12. **Inject into Playground** — Load WordPress Playground iframe with the generated theme for live preview
13. **Return to client** — ZIP blob for download + file tree for code preview + Playground preview + tool call stats

### Iterative Refinement
1. **User sends follow-up message** — "Make the header sticky" / "Use a warmer color palette"
2. **Load conversation history** — From React state (in-memory for current session)
3. **Build iteration prompt** — System prompt + existing theme JSON + conversation history + new instruction
4. **AI provider call** — Returns updated structured JSON (full theme, not a diff)
5. **Same validation/serialization/assembly pipeline** — Steps 5-13 from above

---

## Error Handling Strategy

| Error Type | Detection | User-Facing Response |
|---|---|---|
| AI returns invalid JSON | JSON.parse failure | "The AI produced an invalid response. Retrying..." (auto-retry once) |
| AI response fails Zod schema | Zod validation errors | "The AI response didn't match the expected structure. Retrying with stricter instructions..." |
| Forbidden block detected (`core/html`, `core/freeform`) | Allowlist walker | "The AI tried to use a Custom HTML block. Retrying with reinforced constraints..." (auto-retry with explicit re-prompt) |
| Unknown block name | Allowlist walker | Skip the block, log a warning, continue assembly |
| Serialized markup fails WP parser | Parser returns unexpected structure | "Generated markup failed validation. Please try again or simplify your description." |
| AI API rate limit / timeout | HTTP status codes | "AI service is temporarily unavailable. Please wait a moment and try again." |
| Invalid theme slug | Input validation | "Theme name must contain only letters, numbers, and hyphens." |
| Missing/invalid API key | Provider returns 401 | "Invalid API key for [provider]. Please check your key and try again." |

Auto-retry: maximum 2 retries with progressively more explicit prompts. After 2 failures, surface the error to the user with actionable guidance.

---

## Testing Strategy

### Unit Tests
- **Serializer:** For each supported block type, verify JSON input → expected block markup output. Test nesting, attributes, self-closing blocks.
- **Validator:** Test that valid block-trees pass, `core/html` is rejected, unknown blocks are rejected, malformed JSON fails gracefully.
- **Schema:** Test Zod schemas accept valid AI-like responses and reject malformed ones.
- **Assembler:** Test file structure generation — correct paths, correct content in style.css metadata, correct pattern PHP headers.
- **Packager:** Test ZIP contains expected files, ZIP is valid, theme slug is correctly applied.

### Integration Test
- **End-to-end generation:** Given a fixed description, call the generation pipeline (with a mocked AI response for determinism), validate the output ZIP can be extracted, contains all required files, all templates parse successfully, and no forbidden blocks are present.

---

## Security Considerations

- **API key exposure:** Claude API key is server-side only (environment variable, never sent to client). Server Actions / API routes handle all AI calls.
- **User input in PHP files:** Pattern files contain PHP comments with user-provided theme name/description. All strings are escaped and sanitized before inclusion.
- **User input in JSON:** Theme name and description flow into `theme.json`. Validated and sanitized (no raw injection into JSON structure).
- **User input in HTML:** Content text flows into block markup inner HTML. Sanitized to prevent script injection (though WordPress also sanitizes on install).
- **ZIP path traversal:** Theme slug is validated (alphanumeric + hyphens only) to prevent path traversal in ZIP file names.
- **Dependency security:** Minimal dependencies. `@wordpress/block-serialization-default-parser` is an official WordPress package. JSZip is mature and widely audited.
- **API key handling:** User-provided API keys are sent per-request from the client, never stored server-side or logged. On the deployed version, the pre-configured key is in a server-side env var, never exposed to the client.
- **Rate limiting:** API routes are rate-limited per IP to prevent abuse of the generation endpoint on the deployed version.
