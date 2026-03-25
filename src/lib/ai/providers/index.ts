/**
 * Unified AI provider interface.
 * Supports: OpenRouter, Anthropic, OpenAI, Grok, Custom (OpenAI-compatible).
 *
 * All providers return a JSON string from a prompt.
 * The provider layer handles API differences; the rest of the pipeline is provider-agnostic.
 */

export type ProviderName = 'openrouter' | 'anthropic' | 'openai' | 'grok' | 'custom';

export interface ProviderConfig {
  provider: ProviderName;
  apiKey: string;
  model?: string;
  baseUrl?: string; // For 'custom' provider
}

export interface GenerationResult {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

/** Default models per provider */
export const DEFAULT_MODELS: Record<ProviderName, string> = {
  openrouter: 'anthropic/claude-sonnet-4.6',
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4.1',
  grok: 'grok-4',
  custom: 'gpt-4o',
};

/**
 * Call the AI provider with a system prompt and user prompt.
 * Returns the raw response content as a string.
 */
export async function callProvider(
  config: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<GenerationResult> {
  const model = config.model || DEFAULT_MODELS[config.provider];

  if (config.provider === 'anthropic') {
    return callAnthropic(config.apiKey, model, systemPrompt, userPrompt);
  }

  // OpenRouter, OpenAI, Grok, and Custom all use OpenAI-compatible API
  const baseUrl = getBaseUrl(config);
  return callOpenAICompatible(config.apiKey, model, baseUrl, systemPrompt, userPrompt, config.provider);
}

function getBaseUrl(config: ProviderConfig): string {
  switch (config.provider) {
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'grok':
      return 'https://api.x.ai/v1';
    case 'custom':
      return config.baseUrl || 'https://api.openai.com/v1';
    default:
      return 'https://api.openai.com/v1';
  }
}

async function callOpenAICompatible(
  apiKey: string,
  model: string,
  baseUrl: string,
  systemPrompt: string,
  userPrompt: string,
  provider: string,
): Promise<GenerationResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  // OpenRouter requires additional headers
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://wp-block-theme-generator.vercel.app';
    headers['X-Title'] = 'WP Block Theme Generator';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 120s timeout

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    signal: controller.signal,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 12000,
      // Only include response_format for models known to support it.
      // Many OpenRouter models don't support it and will error or ignore it.
      ...(supportsJsonMode(model) ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`${provider} API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice?.message?.content) {
    throw new Error(`${provider} returned empty response`);
  }

  return {
    content: choice.message.content,
    model: data.model || model,
    tokensIn: data.usage?.prompt_tokens || 0,
    tokensOut: data.usage?.completion_tokens || 0,
  };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<GenerationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 120s timeout

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal: controller.signal,
    body: JSON.stringify({
      model,
      max_tokens: 12000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error('Anthropic returned empty response');
  }

  return {
    content,
    model: data.model || model,
    tokensIn: data.usage?.input_tokens || 0,
    tokensOut: data.usage?.output_tokens || 0,
  };
}

/** Models known to support response_format: json_object */
function supportsJsonMode(model: string): boolean {
  const supported = [
    'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4-turbo', 'gpt-3.5-turbo',
    'o3', 'o3-mini',
    'openai/gpt-4o', 'openai/gpt-4.1', 'openai/gpt-4.1-mini',
    'openai/o3', 'openai/o3-mini',
  ];
  return supported.some(s => model.includes(s));
}
