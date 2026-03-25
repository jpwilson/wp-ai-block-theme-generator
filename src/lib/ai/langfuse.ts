import { Langfuse } from 'langfuse';

let langfuseInstance: Langfuse | null = null;

/**
 * Get or create the Langfuse client.
 * Returns null if Langfuse env vars are not configured.
 */
export function getLangfuse(): Langfuse | null {
  if (langfuseInstance) return langfuseInstance;

  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL;

  if (!secretKey || !publicKey) {
    return null;
  }

  langfuseInstance = new Langfuse({
    secretKey,
    publicKey,
    baseUrl: baseUrl || 'https://us.cloud.langfuse.com',
  });

  return langfuseInstance;
}

/**
 * Create a Langfuse trace for a theme generation request.
 */
export function createGenerationTrace(input: {
  description: string;
  siteType?: string;
  industry?: string;
  style?: string;
  colorMood?: string;
  provider: string;
  model: string;
}) {
  const langfuse = getLangfuse();
  if (!langfuse) return null;

  const trace = langfuse.trace({
    name: 'theme-generation',
    metadata: {
      siteType: input.siteType,
      industry: input.industry,
      style: input.style,
      colorMood: input.colorMood,
      provider: input.provider,
      model: input.model,
    },
    input: { description: input.description },
  });

  return trace;
}

/**
 * Log an AI generation call to Langfuse.
 * Logs the full system prompt, user prompt, and response without truncation.
 */
export function logGenerationToLangfuse(
  trace: ReturnType<typeof createGenerationTrace>,
  params: {
    name: string;
    provider: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    response?: string;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    success: boolean;
    error?: string;
    validationErrors?: Array<{ layer: string; message: string; path?: string }>;
  },
) {
  if (!trace) return;

  trace.generation({
    name: params.name,
    model: params.model,
    modelParameters: { provider: params.provider },
    input: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
    output: params.response ?? undefined,
    usage: {
      input: params.tokensIn,
      output: params.tokensOut,
    },
    metadata: {
      latencyMs: params.latencyMs,
      success: params.success,
      error: params.error,
      ...(params.validationErrors && params.validationErrors.length > 0
        ? { validationErrors: params.validationErrors }
        : {}),
    },
    level: params.success ? 'DEFAULT' : 'ERROR',
    statusMessage: params.success ? 'OK' : params.error,
  });

  // Add a validation score to the trace
  trace.score({
    name: 'validation-passed',
    value: params.success ? 1.0 : 0.0,
    comment: params.success
      ? 'Validation passed'
      : params.error || 'Validation failed',
  });
}

/**
 * Log a JSON repair generation attempt to Langfuse.
 */
export function logRepairGenerationToLangfuse(
  trace: ReturnType<typeof createGenerationTrace>,
  params: {
    provider: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    response?: string;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    success: boolean;
    error?: string;
  },
) {
  if (!trace) return;

  trace.generation({
    name: 'json-repair',
    model: params.model,
    modelParameters: { provider: params.provider },
    input: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
    output: params.response ?? undefined,
    usage: {
      input: params.tokensIn,
      output: params.tokensOut,
    },
    metadata: {
      latencyMs: params.latencyMs,
      success: params.success,
      error: params.error,
    },
    level: params.success ? 'DEFAULT' : 'ERROR',
    statusMessage: params.success ? 'JSON repair succeeded' : params.error || 'JSON repair failed',
  });
}

/**
 * Flush Langfuse events (call at end of request).
 */
export async function flushLangfuse() {
  const langfuse = getLangfuse();
  if (langfuse) {
    await langfuse.flushAsync();
  }
}
