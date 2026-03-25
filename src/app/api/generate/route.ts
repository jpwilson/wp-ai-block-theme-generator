import { generateTheme } from '@/lib/ai/generate';
import { assembleTheme } from '@/lib/assembler';
import { packageThemeBuffer } from '@/lib/packager';
import { ProviderConfig } from '@/lib/ai/providers';

// Allow up to 120 seconds for AI generation (Opus can be slow)
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { provider, apiKey, model, baseUrl, description, colorPalette, typography, layoutStyle } = body;

    // Validate required fields
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return Response.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Resolve API key: user-provided takes priority, then env var
    const resolvedKey = apiKey || getEnvKey(provider);
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

    // Generate theme slug from name
    const slug = result.validation.data.themeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'ai-theme';

    // Assemble theme files
    const files = assembleTheme(result.validation.data, slug);

    // Package as ZIP
    const zipBuffer = await packageThemeBuffer(files);

    // Return both the ZIP and metadata
    return Response.json({
      success: true,
      slug,
      themeName: result.validation.data.themeName,
      files: files.map(f => ({ path: f.path, content: f.content })),
      zip: Buffer.from(zipBuffer).toString('base64'),
      toolCalls: result.toolCalls,
      themeData: result.validation.data,
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
