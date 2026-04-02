import { generateTheme, refineThemeWithPasses } from '@/lib/ai/generate';
import { enhanceTheme } from '@/lib/enhancer';
import { assembleTheme } from '@/lib/assembler';
import { packageThemeBuffer } from '@/lib/packager';
import { ProviderConfig } from '@/lib/ai/providers';

// 58s budget: fits Vercel Hobby (60s limit).
// With Sonnet 4.6: ~25s initial + 1 refinement pass ~20s = ~45s total.
// For full Opus quality with 3 passes, upgrade to Vercel Pro (300s limit).
export const maxDuration = 58;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { provider, apiKey, model, baseUrl, description, siteType, industry, style, colorMood, headerStyle, pages, promptSize, colorPalette, typography, layoutStyle } = body;

    // Validate required fields
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return Response.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Resolve API key: user-provided takes priority, then env var
    const resolvedKey = apiKey || getEnvKey(provider);
    console.log(`[API] Provider: ${provider}, Model: ${model}, Has user key: ${!!apiKey}, Has env key: ${!!getEnvKey(provider)}, Resolved key: ${resolvedKey ? resolvedKey.slice(0, 10) + '...' : 'NONE'}`);
    if (!resolvedKey) {
      return Response.json(
        { error: `No API key provided for ${provider}. Please enter your API key.` },
        { status: 400 }
      );
    }

    const config: ProviderConfig = {
      provider: provider || 'openrouter',
      apiKey: resolvedKey,
      model,
      baseUrl,
    };

    // Generate the theme
    const result = await generateTheme(config, {
      description: description.trim(),
      siteType,
      industry,
      style,
      colorMood,
      headerStyle,
      pages,
      promptSize,
      colorPalette,
      typography,
      layoutStyle,
    });

    if (!result.validation.valid || !result.validation.data) {
      return Response.json(
        {
          error: 'Theme generation failed validation',
          errors: result.validation.errors,
          toolCalls: result.toolCalls,
        },
        { status: 422 }
      );
    }

    // On Vercel Hobby (60s limit) we run 1 content-fix pass with Sonnet.
    // Upgrade to Vercel Pro to unlock 3 passes with Opus.
    const isPro = process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PLAN === 'pro';
    const refinePasses = isPro ? 3 : 1;
    const { data: refined, toolCalls: refineCalls } = await refineThemeWithPasses(config, result.validation.data, refinePasses);
    const allToolCalls = [...result.toolCalls, ...refineCalls];

    // Enhance: apply deterministic design best practices
    const enhanced = enhanceTheme(refined);

    // Generate theme slug from name
    const slug = enhanced.themeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'ai-theme';

    // Assemble theme files
    const files = assembleTheme(enhanced, slug);

    // Package as ZIP
    const zipBuffer = await packageThemeBuffer(files);

    // Return both the ZIP and metadata
    return Response.json({
      success: true,
      slug,
      themeName: enhanced.themeName,
      files: files.map(f => ({ path: f.path, content: f.content })),
      zip: Buffer.from(zipBuffer).toString('base64'),
      toolCalls: allToolCalls,
      themeData: enhanced,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

function getEnvKey(provider: string): string | undefined {
  switch (provider) {
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'grok':
      return process.env.GROK_API_KEY;
    default:
      return process.env.OPENROUTER_API_KEY;
  }
}
