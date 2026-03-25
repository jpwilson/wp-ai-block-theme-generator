# Changelog

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
