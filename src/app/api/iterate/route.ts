import { iterateTheme } from '@/lib/ai/generate';
import { enhanceTheme } from '@/lib/enhancer';
import { assembleTheme } from '@/lib/assembler';
import { packageThemeBuffer } from '@/lib/packager';
import { ProviderConfig } from '@/lib/ai/providers';

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { provider, apiKey, model, baseUrl, currentThemeJson, instruction } = body;

    if (!instruction || typeof instruction !== 'string' || instruction.trim().length === 0) {
      return Response.json(
        { error: 'Instruction is required' },
        { status: 400 }
      );
    }

    if (!currentThemeJson) {
      return Response.json(
        { error: 'Current theme data is required for iteration' },
        { status: 400 }
      );
    }

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

    const result = await iterateTheme(
      config,
      typeof currentThemeJson === 'string' ? currentThemeJson : JSON.stringify(currentThemeJson),
      instruction.trim(),
    );

    if (!result.validation.valid || !result.validation.data) {
      return Response.json(
        {
          error: 'Theme iteration failed validation',
          errors: result.validation.errors,
          toolCalls: result.toolCalls,
        },
        { status: 422 }
      );
    }

    const enhanced = enhanceTheme(result.validation.data);

    const slug = enhanced.themeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'ai-theme';

    const files = assembleTheme(enhanced, slug);
    const zipBuffer = await packageThemeBuffer(files);

    return Response.json({
      success: true,
      slug,
      themeName: enhanced.themeName,
      files: files.map(f => ({ path: f.path, content: f.content })),
      zip: Buffer.from(zipBuffer).toString('base64'),
      toolCalls: result.toolCalls,
      themeData: result.validation.data,
    });
  } catch (error) {
    console.error('Iteration error:', error);
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
