import Link from 'next/link';

export default function SpecPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">&larr; Back to generator</Link>
      </div>

      {/* AI Summary */}
      <section className="mb-12">
        <h1 className="text-3xl font-bold mb-6">Project Specification</h1>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3">AI Summary</h2>
          <p className="text-sm leading-relaxed mb-4">
            Build a <strong>standalone AI-powered web app</strong> that generates complete, valid, installable
            WordPress Block Themes from natural language descriptions. The generated theme must be
            <strong> visually impressive</strong>, use <strong>only native core blocks</strong> (zero Custom HTML blocks),
            and output a <strong>downloadable ZIP</strong> that installs cleanly in WordPress 6.4+.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-1">Must Have</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>&#x2022; User input interface for site description</li>
                <li>&#x2022; AI orchestration with clear prompt construction</li>
                <li>&#x2022; Structured JSON/block markup output</li>
                <li>&#x2022; <strong>Zero Custom HTML blocks</strong></li>
                <li>&#x2022; Deliverable theme ZIP package</li>
                <li>&#x2022; Robust validation of AI output</li>
                <li>&#x2022; Graceful error handling</li>
                <li>&#x2022; Unit tests + integration test</li>
                <li>&#x2022; README, ADR, &ldquo;What I&apos;d Do Next&rdquo;</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Bonus</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>&#x2022; Live theme preview (WordPress Playground)</li>
                <li>&#x2022; Iterative refinement via chat</li>
                <li>&#x2022; Pattern Library integration</li>
                <li>&#x2022; Swappable AI provider</li>
              </ul>
              <h3 className="font-semibold mb-1 mt-3">Key Constraint</h3>
              <p className="text-muted-foreground">
                The generated theme must be composed <em>entirely</em> of standard, core,
                and well-known pattern blocks. No Custom HTML block for any structural
                or visual element.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Full Spec */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Full Specification</h2>

        <div className="prose prose-sm max-w-none space-y-8">
          <div>
            <h3 className="text-xl font-semibold">Overview</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Build a standalone AI assistant that generates complete, structured WordPress Block Themes
              (using Full Site Editor / FSE capabilities) based on a user input. The challenge is to go
              beyond generic, boilerplate themes. The resulting theme must be well-structured, visually
              appealing, and composed entirely of standard, core, and well-known pattern blocks. Crucially,
              <strong> the generated theme must not use the Custom HTML block for any structural or visual element.</strong>
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              This project requires thoughtful engineering to translate abstract user intent into concrete,
              structured JSON/PHP files that define a modern, high-quality WordPress theme.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold">The Challenge</h3>
            <p className="text-sm text-muted-foreground mb-2">Create a web application where users can:</p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
              <li><strong>Input Theme Criteria:</strong> Provide a natural language description (e.g., &ldquo;A dark mode blog theme for photographers with a large, centered hero section and sticky navigation.&rdquo;) and define specific technical criteria (e.g., color palette, typography).</li>
              <li><strong>Generate Theme:</strong> Request the AI to generate the complete theme structure (e.g., theme.json, template files, patterns, etc.).</li>
              <li><strong>Preview/Download:</strong> Allow the user to download the theme as a valid, runnable zip file or view a visual mock-up of the generated theme structure.</li>
            </ol>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Core Requirements</h3>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-3">
              <li><strong>User Input Interface:</strong> Your choice on the best way to get the site description from the user. Think about the best way to understand what the user wants within good UX boundaries.</li>
              <li><strong>AI Orchestration:</strong> A clear component responsible for prompt construction, ensuring the model understands the constraints of WordPress Block Themes (e.g., structure, supported blocks).</li>
              <li><strong>Structured Output:</strong> The AI must output valid JSON and template files (or the content that forms them) that adhere to the WordPress Block Theme standards.</li>
              <li><strong>No Custom HTML Block:</strong> The generated theme content (templates, parts, patterns) must exclusively use the native WordPress block syntax (e.g., <code className="bg-muted px-1 rounded">&lt;!-- wp:paragraph --&gt;</code>, <code className="bg-muted px-1 rounded">&lt;!-- wp:post-featured-image --&gt;</code>) and cannot use the HTML block.</li>
              <li><strong>Deliverable Theme Package:</strong> The application must package the generated files into a structure that can be zipped and installed as a working WordPress Block Theme.</li>
            </ol>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Technical Constraints</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              <li><strong>Standalone application:</strong> No external services or credentials required from us to run it, outside of the chosen AI provider.</li>
              <li><strong>Language agnostic:</strong> The generated output is WordPress-specific (JSON/PHP/HTML), but the application&apos;s stack is your choice.</li>
              <li><strong>Your choice of AI provider:</strong> OpenAI, Anthropic, local models — your call. The integration must be clean enough that swapping providers is not a major rewrite.</li>
              <li><strong>Your choice of stack:</strong> Use the stack you are most effective with. The quality of the generated theme is more important than the choice of framework.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Quality Bar</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This is an MVP, but it should be a production-minded one. We are looking for code that reflects
              good engineering discipline, focusing on reliable data transformation and robust output generation.
            </p>
            <div className="mt-3">
              <h4 className="font-semibold text-sm">Error Handling</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-1">
                <li>Graceful handling of API failures and rate limits.</li>
                <li>Robust validation of the AI&apos;s output: if the model generates invalid JSON or malformed block HTML, the application must detect this and provide a meaningful error to the user, not a silent failure.</li>
                <li>Input validation where it matters (e.g., ensuring theme slug is valid).</li>
              </ul>
            </div>
            <div className="mt-3">
              <h4 className="font-semibold text-sm">Testing</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-1">
                <li>Unit tests covering the core logic (prompt construction, output validation, file packaging).</li>
                <li>At least one integration test covering the end-to-end flow of generating a theme from a simple description.</li>
                <li>Tests should pass cleanly — a simple <code className="bg-muted px-1 rounded">npm test</code> or similar should run the checks without setup friction.</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Expected Deliverables</h3>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-3">
              <li><strong>Working Application:</strong> A functional prototype demonstrating the core workflow: input criteria, generate theme, and download the resulting zip file.</li>
              <li><strong>README:</strong> How to run it locally, including any environment variables needed. A brief overview of the architecture, especially the output generation process. Known limitations or rough edges.</li>
              <li><strong>Architectural Decision Record (ADR):</strong> The key technical decisions made. Alternatives considered and why they were rejected. Trade-offs accepted consciously. Security considerations. Design exploration.</li>
              <li><strong>&ldquo;What I&apos;d Do Next&rdquo;:</strong> What you&apos;d prioritize if you had another week. What you&apos;d need to change to make this genuinely production-ready. How you&apos;d approach scaling this to support complex dynamic features.</li>
              <li><strong>Code:</strong> Clean, typed, tested, and linted. PRs and commits that give a reviewer confidence in how you work.</li>
            </ol>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Evaluation Criteria</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <h4 className="font-semibold text-sm mb-2">Must Have</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>A theme generation process that creates a valid, runnable WordPress Block Theme.</li>
                  <li><strong>Zero usage of the Custom HTML block</strong> for structure or content.</li>
                  <li>AI integration that provides structured output reliably.</li>
                  <li>Robust validation of the AI&apos;s output structure.</li>
                  <li>Tests that pass cleanly.</li>
                  <li>Clean, readable, well-structured code.</li>
                  <li>Strong commit history and PR discipline.</li>
                  <li>README, ADR, and &ldquo;What I&apos;d Do Next.&rdquo;</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Raises the Bar</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>A generated theme that is visually high-quality, non-generic, and demonstrates sophisticated block usage.</li>
                  <li>Thoughtful prompt engineering that produces consistently correct and detailed block markup.</li>
                  <li>An ADR that shows genuine product and architectural thinking.</li>
                  <li>A &ldquo;What I&apos;d Do Next&rdquo; that addresses the unique challenges of building a dynamic file generation tool.</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Bonus Ideas</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              <li><strong>Live Theme Preview:</strong> Provide a way for the user to see the resulting theme without needing a separate WordPress instance.</li>
              <li><strong>Iteration:</strong> Give the user a way to make subsequent changes to the theme.</li>
              <li><strong>Pattern Library Integration:</strong> Structure the output so that generated patterns are immediately available in the WordPress Pattern Library interface.</li>
              <li><strong>Your own ideas:</strong> Be creative!</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="mt-12 pt-4 border-t text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">&larr; Back to generator</Link>
      </div>
    </main>
  );
}
