# How It Works: The JSON Intermediate Approach

## The Problem

LLMs are bad at writing WordPress block markup directly. Research showed:

- **~50-70% success rate** for complex block layouts generated as raw markup
- LLMs hallucinate block names (`<!-- wp:fancy-slider -->`)
- They forget closing comments (`<!-- /wp:group -->`)
- They mess up attribute JSON inside comments
- **They fall back to `<!-- wp:html -->`** (Custom HTML block) when they can't figure out the right native block

This project's core constraint is **zero Custom HTML blocks**. So we can't let the AI write markup.

## The Solution: JSON In, Markup Out

Instead of asking the AI to write block markup, we ask it to write **structured JSON**. Our code handles all the markup.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   User: "A dark photography portfolio with hero and grid gallery"   │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AI RETURNS JSON                              │
│                    (AI is good at this: ~98.5%)                     │
│                                                                     │
│   {                                                                 │
│     "name": "core/group",                                           │
│     "attributes": { "tagName": "main" },                            │
│     "innerBlocks": [                                                │
│       {                                                             │
│         "name": "core/heading",                                     │
│         "attributes": { "level": 1 },                               │
│         "innerContent": "Capturing Light in Darkness"               │
│       },                                                            │
│       {                                                             │
│         "name": "core/paragraph",                                   │
│         "innerContent": "A visual journey through shadows"          │
│       }                                                             │
│     ]                                                               │
│   }                                                                 │
│                                                                     │
│   The AI NEVER writes <!-- wp:anything -->                          │
│   It just describes what blocks to use and what goes in them.       │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 LAYER 1: ZOD SCHEMA VALIDATION                      │
│                                                                     │
│   ✓ Is it valid JSON?                                               │
│   ✓ Does it match our block-tree schema?                            │
│   ✓ Are required fields present (name, attributes, etc.)?           │
│                                                                     │
│   If invalid → retry with error context (up to 2 retries)          │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 LAYER 2: BLOCK ALLOWLIST CHECK                      │
│                                                                     │
│   Walk every block node in the tree and check:                      │
│                                                                     │
│   ✓ Is "core/group" in the allowlist?          → YES, allowed       │
│   ✓ Is "core/heading" in the allowlist?        → YES, allowed       │
│   ✓ Is "core/paragraph" in the allowlist?      → YES, allowed       │
│   ✗ Is "core/html" in the allowlist?           → NO, HARD REJECT   │
│   ✗ Is "core/freeform" in the allowlist?       → NO, HARD REJECT   │
│   ✗ Is "core/fancy-slider" in the allowlist?   → NO, UNKNOWN BLOCK │
│                                                                     │
│   ~35 core blocks are allowed. Everything else is rejected.         │
│   If rejected → retry with explicit "do not use X" prompt           │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│               DETERMINISTIC BLOCK SERIALIZER                        │
│              (tested code we control — never fails)                 │
│                                                                     │
│   JSON input:                     Markup output:                    │
│                                                                     │
│   {                               <!-- wp:group {"tagName":"main"} -->
│     "name": "core/group",         <main class="wp-block-group">     │
│     "attributes": {                                                 │
│       "tagName": "main"           <!-- wp:heading {"level":1} -->   │
│     },                            <h1 class="wp-block-heading">     │
│     "innerBlocks": [              Capturing Light in Darkness       │
│       {                           </h1>                             │
│         "name": "core/heading",   <!-- /wp:heading -->              │
│         "attributes": {                                             │
│           "level": 1              <!-- wp:paragraph -->             │
│         },                        <p>A visual journey through       │
│         "innerContent":           shadows</p>                       │
│           "Capturing Light        <!-- /wp:paragraph -->            │
│            in Darkness"                                             │
│       },                          </main>                           │
│       {                           <!-- /wp:group -->                │
│         "name":                                                     │
│           "core/paragraph",                                         │
│         "innerContent":                                             │
│           "A visual journey                                         │
│            through shadows"                                         │
│       }                                                             │
│     ]                                                               │
│   }                                                                 │
│                                                                     │
│   23 unit tests verify every block type serializes correctly.       │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              LAYER 3: WORDPRESS PARSER ROUND-TRIP                   │
│                                                                     │
│   Feed the serialized markup into @wordpress/block-serialization-   │
│   default-parser — the same parser WordPress itself uses.           │
│                                                                     │
│   ✓ Parser can parse it?            → markup is valid               │
│   ✓ No freeform content detected?   → no broken/orphaned HTML      │
│   ✓ Block names match expectations? → serializer is correct         │
│                                                                     │
│   This catches bugs in OUR serializer code, not just the AI.       │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    THEME ASSEMBLER                                   │
│                                                                     │
│   Produces the complete WordPress block theme file structure:       │
│                                                                     │
│   noir-gallery/                                                     │
│   ├── style.css              ← theme metadata                       │
│   ├── theme.json             ← design system (colors, fonts, etc.)  │
│   ├── functions.php          ← pattern category registration        │
│   ├── templates/                                                    │
│   │   ├── index.html         ← blog listing with query loop        │
│   │   ├── single.html        ← single post                         │
│   │   ├── page.html          ← static page                         │
│   │   ├── archive.html       ← category/tag archives               │
│   │   ├── 404.html           ← not found                           │
│   │   └── search.html        ← search results                      │
│   ├── parts/                                                        │
│   │   ├── header.html        ← site header with nav                │
│   │   └── footer.html        ← site footer with social links       │
│   └── patterns/                                                     │
│       ├── hero.php           ← hero section (auto-registers in WP) │
│       ├── features.php       ← feature grid                        │
│       └── cta.php            ← call to action                      │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ZIP + PREVIEW                                  │
│                                                                     │
│   JSZip packages everything into a downloadable .zip file           │
│   that installs directly in WordPress 6.4+.                         │
│                                                                     │
│   WordPress Playground loads in an iframe, installs the theme       │
│   via wp-cli, and shows a live preview — no local WP needed.        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Why This Architecture

| Approach | Success Rate | Risk |
|---|---|---|
| AI writes markup directly | ~50-70% | Hallucinated blocks, broken syntax, Custom HTML fallback |
| **AI writes JSON, our code serializes** | **~98.5%** | **JSON schema violations (caught by Zod, retried)** |
| Pre-built templates only | ~99% | Cookie-cutter, not creative |

We chose the middle path: high reliability with creative freedom. The AI decides *what* blocks to use and *what* content goes in them. Our code handles *how* they're written as markup.

## The No-Custom-HTML Guarantee

The constraint is enforced at **three levels**:

1. **System prompt**: Explicit rules saying "NEVER use core/html or core/freeform"
2. **Allowlist validation**: If the AI includes `core/html` anyway, it's rejected before serialization
3. **Serializer architecture**: The serializer only knows how to produce the ~35 allowed blocks. It physically cannot output `<!-- wp:html -->` because no such serializer function exists.

Even if the AI ignores the prompt (level 1), the allowlist catches it (level 2). Even if the allowlist had a bug, the serializer can't produce it (level 3). Defense in depth.
