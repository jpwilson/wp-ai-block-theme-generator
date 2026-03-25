# What I'd Do Next

## If I Had Another Week

### 1. Live WordPress Playground Preview
Embed [WordPress Playground](https://developer.wordpress.org/playground/) (WP running in the browser via WASM) to let users see their generated theme in a real WordPress environment — no local install needed. The generated ZIP would be injected into the Playground instance, and users could browse the theme in the Site Editor and on the front-end before downloading.

### 2. Iterative Refinement
After the first generation, let users provide follow-up instructions ("make the header sticky," "use a darker color palette," "add a testimonials section"). The app would re-call the AI with the existing theme JSON + the refinement request, producing an updated theme. This turns the tool from a one-shot generator into a conversational theme builder.

### 3. Expand the Pattern Library
Add 10-15 more curated patterns: pricing tables, team member grids, FAQ accordions (using `core/details`), portfolio galleries, contact sections, newsletter signup areas. More patterns means more diverse themes without increasing AI hallucination risk.

### 4. Style Variations
Generate 2-3 style variations (light/dark/accent) per theme as JSON files in the `/styles` directory. Users would get a theme that ships with multiple looks out of the box, switchable in the Site Editor.

## What I'd Need to Change for Production

### 1. Formal Block Validation Pipeline
Replace the current Zod + parser validation with a comprehensive block validator that checks:
- Every attribute value is valid for its block type (not just structurally correct JSON)
- Nesting rules are enforced (e.g., `core/column` can only be inside `core/columns`)
- Required attributes are present for each block type
- Image/media URLs are placeholder-safe (no broken external links)

This could use `@wordpress/blocks` with a full block registry for ground-truth validation.

### 2. Block Serializer Coverage
Expand the serializer to cover all ~90 core blocks, not just the ~35 in v1. This enables the AI to use more sophisticated blocks (e.g., `core/table-of-contents`, `core/footnotes`, `core/comment-template`) for richer themes.

### 3. Rate Limiting and Caching
If deployed publicly: rate-limit API calls per IP, cache generated themes for identical inputs (hash the prompt), and add a generation queue for high traffic.

### 4. Accessibility Audit
Validate that generated themes meet WCAG 2.1 AA. This means checking color contrast ratios in theme.json palettes, ensuring heading hierarchy is correct, verifying that navigation uses proper ARIA attributes, and testing with screen readers.

### 5. Performance Baseline
Add Lighthouse scoring as a post-generation step. Generated themes should score 90+ on performance, accessibility, best practices, and SEO out of the box.

## How I'd Scale for Complex Dynamic Features

### Query Loop Customization
Allow users to specify custom post types, taxonomies, and query parameters. The AI would generate `core/query` blocks with specific `query` attributes (`postType`, `taxQuery`, `order`, etc.) for portfolio, product, or event listings.

### WooCommerce Integration
Extend the block allowlist to include WooCommerce blocks (`woocommerce/product-collection`, `woocommerce/cart`, etc.) and generate ecommerce-ready themes. This requires understanding WooCommerce's block registration and template hierarchy.

### Multi-Page Theme Generation
Instead of a single front-page focus, generate complete themes with unique layouts for every template in the hierarchy: distinct archive pages, custom 404 pages, search results pages, and author pages — each with thoughtful, non-generic designs.

### Plugin-Aware Generation
Let users specify which plugins they plan to use (WooCommerce, Jetpack, Yoast, etc.). The AI would account for plugin-provided blocks and template areas, generating themes that integrate cleanly with the user's plugin stack.
