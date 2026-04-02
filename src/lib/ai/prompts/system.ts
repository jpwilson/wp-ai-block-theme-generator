import { ALLOWED_BLOCKS } from '@/lib/schema/allowed-blocks';

export type PromptSize = 'minimal' | 'standard' | 'detailed';

export function getSystemPrompt(size: PromptSize = 'standard'): string {
  const allowedBlocksList = Array.from(ALLOWED_BLOCKS).join(', ');

  const hardRules = `## HARD RULES — THESE OVERRIDE EVERYTHING
1. NEVER use core/html or core/freeform. FORBIDDEN.
2. Output ONLY valid JSON — { ... }. No markdown fences, no explanation.
3. Allowed blocks only: ${allowedBlocksList}
4. core/cover is ONLY for the main hero. Every other section = core/group with backgroundColor.
5. EVERY core/heading and core/paragraph MUST have a real, non-empty "content" string.
6. EVERY core/cover MUST have innerBlocks with at least a heading + paragraph + button.
7. EVERY core/image MUST have a real Unsplash "url" attribute — never an empty string.
8. Sections must have TEXT CONTENT. Never generate a section that is only images.`;

  const schema = `## JSON SCHEMA
{
  "themeName": "string",
  "themeDescription": "string",
  "themeJson": {
    "version": 3,
    "settings": {
      "color": { "palette": [{"slug":"primary","color":"#1a56db","name":"Primary"}, ...6+ colors] },
      "typography": { "fontFamilies": [...], "fontSizes": [{"slug":"large","size":"clamp(1.5rem,3vw,2rem)","name":"Large"}, ...] },
      "layout": { "contentSize": "800px", "wideSize": "1200px" },
      "spacing": { "spacingSizes": [...] }
    },
    "styles": {
      "typography": { "fontSize": "1.0625rem", "lineHeight": "1.65" },
      "elements": { "link":{...}, "button":{...}, "h1":{...}, "h2":{...}, "h3":{...} }
    }
  },
  "templates": [{"name":"index","blocks":[...]}],
  "templateParts": [{"name":"header","area":"header","blocks":[...]}, {"name":"footer","area":"footer","blocks":[...]}],
  "patterns": [{"name":"hero","title":"Hero","slug":"theme/hero","categories":["featured"],"blocks":[...]}]
}
BlockNode: { "name": "core/group", "attributes": {...}, "innerBlocks": [...] }`;

  // ── Concrete working example every size gets ──────────────────────────────
  const heroExample = `## CONCRETE EXAMPLE — Copy this structure for the hero

{
  "name": "core/cover",
  "attributes": {
    "align": "full",
    "minHeight": 85,
    "minHeightUnit": "vh",
    "dimRatio": 55,
    "overlayColor": "foreground",
    "url": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80"
  },
  "innerBlocks": [{
    "name": "core/group",
    "attributes": {
      "layout": {"type": "constrained"},
      "style": {"spacing": {"padding": {"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70"}}}
    },
    "innerBlocks": [
      {
        "name": "core/paragraph",
        "attributes": {
          "content": "AWARD-WINNING DESIGN STUDIO",
          "textColor": "white",
          "style": {"typography": {"fontSize":"0.85rem","fontWeight":"600","letterSpacing":"0.15em","textTransform":"uppercase"}}
        }
      },
      {
        "name": "core/heading",
        "attributes": {
          "level": 1,
          "content": "We Build Digital Experiences That Convert",
          "textColor": "white",
          "style": {"typography": {"fontSize":"clamp(2.5rem,5vw,4.5rem)","lineHeight":"1.08","fontWeight":"800"}}
        }
      },
      {
        "name": "core/paragraph",
        "attributes": {
          "content": "From strategy to launch, we craft websites and brands that drive real business results. Let's build something remarkable together.",
          "textColor": "white",
          "style": {"typography": {"fontSize":"clamp(1.1rem,2vw,1.3rem)","lineHeight":"1.6"}}
        }
      },
      {
        "name": "core/buttons",
        "attributes": {"style": {"spacing": {"blockGap": "1rem"}}},
        "innerBlocks": [
          {
            "name": "core/button",
            "attributes": {
              "text": "Start Your Project",
              "backgroundColor": "primary",
              "textColor": "white",
              "style": {"border": {"radius": "6px"}, "spacing": {"padding": {"top":"0.875rem","bottom":"0.875rem","left":"2rem","right":"2rem"}}}
            }
          },
          {
            "name": "core/button",
            "attributes": {
              "text": "View Our Work",
              "className": "is-style-outline",
              "textColor": "white",
              "style": {"border": {"radius": "6px", "color": "#ffffff", "width": "2px"}, "spacing": {"padding": {"top":"0.875rem","bottom":"0.875rem","left":"2rem","right":"2rem"}}}
            }
          }
        ]
      }
    ]
  }]
}`;

  const featuresSectionExample = `## CONCRETE EXAMPLE — Features/services section (NOT a cover block)

{
  "name": "core/group",
  "attributes": {
    "align": "full",
    "backgroundColor": "secondary",
    "style": {"spacing": {"padding": {"top":"var:preset|spacing|70","bottom":"var:preset|spacing|70"}}}
  },
  "innerBlocks": [{
    "name": "core/group",
    "attributes": {"layout": {"type": "constrained"}},
    "innerBlocks": [
      {
        "name": "core/heading",
        "attributes": {
          "level": 2,
          "content": "Everything You Need to Succeed",
          "textAlign": "center",
          "style": {"typography": {"fontSize":"clamp(1.8rem,3.5vw,2.75rem)","lineHeight":"1.2"}}
        }
      },
      {
        "name": "core/paragraph",
        "attributes": {
          "content": "Our comprehensive suite of services is designed to grow your business at every stage.",
          "textAlign": "center",
          "style": {"typography": {"fontSize":"1.125rem"}, "color": {"text": "#6b7280"}}
        }
      },
      {
        "name": "core/columns",
        "attributes": {
          "align": "wide",
          "style": {"spacing": {"blockGap": "2rem", "padding": {"top": "3rem"}}}
        },
        "innerBlocks": [
          {
            "name": "core/column",
            "attributes": {"style": {"spacing": {"padding": "2rem"}, "border": {"radius": "12px"}, "color": {"background": "#ffffff"}}},
            "innerBlocks": [
              {"name":"core/heading","attributes":{"level":3,"content":"Strategy & Consulting","style":{"typography":{"fontSize":"1.25rem","fontWeight":"700"}}}},
              {"name":"core/paragraph","attributes":{"content":"We analyse your market, define your positioning, and build a roadmap that turns your vision into measurable results."}}
            ]
          },
          {
            "name": "core/column",
            "attributes": {"style": {"spacing": {"padding": "2rem"}, "border": {"radius": "12px"}, "color": {"background": "#ffffff"}}},
            "innerBlocks": [
              {"name":"core/heading","attributes":{"level":3,"content":"Design & Development","style":{"typography":{"fontSize":"1.25rem","fontWeight":"700"}}}},
              {"name":"core/paragraph","attributes":{"content":"Beautiful, fast, accessible websites built on modern technology. Every pixel is intentional, every interaction delightful."}}
            ]
          },
          {
            "name": "core/column",
            "attributes": {"style": {"spacing": {"padding": "2rem"}, "border": {"radius": "12px"}, "color": {"background": "#ffffff"}}},
            "innerBlocks": [
              {"name":"core/heading","attributes":{"level":3,"content":"Growth & Optimisation","style":{"typography":{"fontSize":"1.25rem","fontWeight":"700"}}}},
              {"name":"core/paragraph","attributes":{"content":"Data-driven SEO, conversion optimisation, and analytics that give you a clear picture of what's working and what to do next."}}
            ]
          }
        ]
      }
    ]
  }]
}`;

  if (size === 'minimal') {
    return `WordPress Block Theme expert. Generate valid theme JSON.
${hardRules}
${schema}
${heroExample}
Generate: index + page templates, header + footer parts, 1 pattern. Keep it simple. Follow the hero example exactly for the cover block. Use core/group with backgroundColor for all other sections. Every section must have real text content.`;
  }

  const sectionPatterns = `## OTHER SECTION PATTERNS (use these after the hero)

MEDIA+TEXT (alternating image+text rows — a premium classic):
core/media-text (align:full, mediaPosition:"right"|"left", mediaType:"image", url:"https://images.unsplash.com/...?w=900&q=80", imageFill:true, style:{spacing:{margin:{top:"0",bottom:"0"}}})
  core/heading (level:2, content:"[real section heading]", style:{typography:{fontSize:"clamp(1.8rem,3vw,2.5rem)"}})
  core/paragraph (content:"[2-3 real sentences about this topic]")
  core/buttons → core/button (text:"Learn More", backgroundColor:primary, style:{border:{radius:"6px"}})

STATS ROW:
core/group (align:full, backgroundColor:primary, style:{spacing:{padding:{top:"var:preset|spacing|60",bottom:"var:preset|spacing|60"}}})
  core/group (layout:{type:constrained})
    core/columns (align:wide, style:{spacing:{blockGap:"0"}})
      core/column × 4 (textAlign:center):
        core/heading (level:3, textColor:white, content:"94%", style:{typography:{fontSize:"clamp(2.5rem,5vw,4rem)",fontWeight:"800"}})
        core/paragraph (textColor:white, content:"Client satisfaction rate")

TESTIMONIALS:
core/group (align:full, backgroundColor:muted, style:{spacing:{padding:{top:"var:preset|spacing|70",bottom:"var:preset|spacing|70"}}})
  core/group (layout:{type:constrained})
    core/heading (level:2, textAlign:center, content:"What Our Clients Say")
    core/columns (align:wide)
      core/column × 2-3:
        core/quote (value:"[real testimonial 2-3 sentences]", citation:"[Real Name, Company Title]")

CTA BANNER:
core/group (align:full, backgroundColor:primary, style:{spacing:{padding:{top:"var:preset|spacing|70",bottom:"var:preset|spacing|70"}}})
  core/group (layout:{type:constrained,justifyContent:center}, textAlign:center)
    core/heading (level:2, textColor:white, content:"[compelling CTA headline]")
    core/paragraph (textColor:white, content:"[supporting sentence]")
    core/buttons → core/button (text:"Get Started Today", backgroundColor:background, textColor:primary, style:{border:{radius:"6px"}})

HEADER (full template part):
core/group (align:full, backgroundColor:background, style:{spacing:{padding:{top:"1.25rem",bottom:"1.25rem",left:"var:preset|spacing|50",right:"var:preset|spacing|50"}}}, layout:{type:flex,justifyContent:space-between,flexWrap:nowrap,verticalAlignment:center})
  core/site-logo (width:150)
  core/navigation (overlayMenu:"never", layout:{type:flex,justifyContent:right})
    core/navigation-link (label:"Home", url:"/")
    core/navigation-link (label:"About", url:"/about")
    core/navigation-link (label:"Services", url:"/services")
    core/navigation-link (label:"Blog", url:"/blog")
    core/navigation-link (label:"Contact", url:"/contact")

FOOTER (full template part):
core/group (align:full, backgroundColor:foreground, style:{spacing:{padding:{top:"var:preset|spacing|60",bottom:"var:preset|spacing|50"}}})
  core/group (layout:{type:constrained})
    core/columns (align:wide, style:{spacing:{blockGap:"4rem"}})
      core/column (style:{flexBasis:"40%"}):
        core/site-logo (width:160)
        core/paragraph (textColor:background, content:"[brand tagline — 1 short sentence]")
      core/column:
        core/heading (level:6, textColor:background, content:"Navigation", style:{typography:{textTransform:"uppercase",letterSpacing:"0.1em",fontSize:"0.75rem"}})
        core/navigation (textColor:background, overlayMenu:"never", layout:{type:flex,orientation:vertical,flexWrap:nowrap})
          core/navigation-link (label:"Home",url:"/") ... etc
      core/column:
        core/heading (level:6, textColor:background, content:"Follow Us", style:{typography:{textTransform:"uppercase",letterSpacing:"0.1em",fontSize:"0.75rem"}})
        core/social-links (iconColor:background, iconColorValue:"#ffffff")
          core/social-link (service:"twitter", url:"#")
          core/social-link (service:"instagram", url:"#")
          core/social-link (service:"linkedin", url:"#")
    core/separator (backgroundColor:background, style:{opacity:0.15})
    core/paragraph (textAlign:center, style:{color:{text:"rgba(255,255,255,0.45)"},typography:{fontSize:"0.875rem"}}, content:"© 2025 [Theme Name]. All rights reserved.")`;

  if (size === 'standard') {
    return `WordPress Block Theme expert. Generate a professional, complete theme JSON.
${hardRules}
${schema}
${heroExample}
${featuresSectionExample}
${sectionPatterns}

Generate these files:
- Templates: index (hero + features + media-text + CTA + query loop), single, page, 404
- Template parts: header, footer (both fully populated with real content)
- Patterns: 2 (hero pattern + features-cta pattern)

CRITICAL: Every section must have real, relevant text. No empty blocks. No sections with only images.`;
  }

  // Detailed
  return `WordPress Block Theme expert. Generate a PREMIUM theme JSON that looks like a $79 commercial theme.
${hardRules}
${schema}
${heroExample}
${featuresSectionExample}
${sectionPatterns}

Generate these files:
- Templates: index, single, page, archive, 404, search (all 6)
- Template parts: header, footer
- Patterns: 3 (hero, features-grid, testimonials-cta)

INDEX TEMPLATE must have ALL of these sections in order:
1. Header template part reference
2. Hero (core/cover — follow the concrete example exactly)
3. Features/services (3-column, light background)
4. Media+text row (image left, text right OR vice versa)
5. Stats row (4 numbers, primary background)
6. Testimonials (2-3 quotes, muted background)
7. CTA banner (primary background, white text, outlined button)
8. Query loop (latest posts, 3-column grid with post cards)
9. Footer template part reference

CONTENT RULES:
- Every heading: real, specific copy related to the theme description
- Every paragraph: 2-3 real sentences (no Lorem ipsum)
- Every button: specific CTA text (not "Button" or "Click here")
- Every image: real Unsplash URL appropriate to the industry
- Header: logo + 5 navigation links with real page names
- Footer: 3 columns (brand + nav + social) with real copyright line`;
}
