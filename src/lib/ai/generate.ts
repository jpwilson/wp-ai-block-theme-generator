import { ProviderConfig, callProvider } from './providers';
import { getSystemPrompt } from './prompts/system';
import { buildThemePrompt, buildIterationPrompt, ThemeInput } from './prompts/theme';
import { validateAIResponse, ValidationResult } from '@/lib/validator';
import { logToolCall, ToolCall } from './tool-tracker';
import { createGenerationTrace, logGenerationToLangfuse, flushLangfuse } from './langfuse';

export interface GenerateThemeResult {
  validation: ValidationResult;
  toolCalls: ToolCall[];
  rawResponse?: string;
}

const MAX_RETRIES = 0;

/**
 * Generate a WordPress Block Theme from user input.
 * Calls the AI provider, validates the response, retries on failure.
 */
export async function generateTheme(
  config: ProviderConfig,
  input: ThemeInput,
): Promise<GenerateThemeResult> {
  const systemPrompt = getSystemPrompt();
  const userPrompt = buildThemePrompt(input);
  const toolCalls: ToolCall[] = [];

  // Langfuse tracing
  const trace = createGenerationTrace({
    description: input.description,
    siteType: input.siteType,
    industry: input.industry,
    style: input.style,
    colorMood: input.colorMood,
    provider: config.provider,
    model: config.model || 'default',
  });

  let lastValidation: ValidationResult | null = null;
  let rawResponse: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const start = Date.now();
    let retryUserPrompt = userPrompt;

    // On retries, add error context to the prompt
    if (attempt > 0 && lastValidation?.errors.length) {
      const errorSummary = lastValidation.errors
        .map(e => `- [${e.layer}] ${e.message}`)
        .join('\n');
      retryUserPrompt = `${userPrompt}\n\nIMPORTANT: Your previous attempt had these errors:\n${errorSummary}\n\nPlease fix these issues. Remember: NEVER use core/html or core/freeform blocks. Use ONLY allowed core blocks. Output ONLY valid JSON.`;
    }

    try {
      const result = await callProvider(config, systemPrompt, retryUserPrompt);
      const latencyMs = Date.now() - start;

      rawResponse = result.content;
      console.log(`[AI] Got response from ${config.provider}/${result.model} (${result.tokensOut} tokens out, ${latencyMs}ms)`);

      // Try to parse the JSON from the response
      let parsed: unknown;
      try {
        const jsonStr = extractJson(result.content);
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('[AI] Failed to parse JSON:', (parseError as Error).message);
        console.error('[AI] Raw response (first 500 chars):', result.content.slice(0, 500));

        // Attempt JSON repair with a fast, cheap model
        console.log('[AI] Attempting JSON repair with fast model...');
        try {
          const repaired = await repairJson(config, result.content);
          if (repaired) {
            const repairedStr = extractJson(repaired);
            parsed = JSON.parse(repairedStr);
            console.log('[AI] JSON repair succeeded');

            const repairCall = logToolCall({
              provider: config.provider,
              model: 'repair-model',
              tokensIn: 0,
              tokensOut: 0,
              latencyMs: Date.now() - start - latencyMs,
              success: true,
              retryCount: attempt,
            });
            toolCalls.push(repairCall);
          }
        } catch (repairError) {
          console.error('[AI] JSON repair also failed:', (repairError as Error).message);
        }

        if (!parsed) {
          const call = logToolCall({
            provider: config.provider,
            model: result.model,
            tokensIn: result.tokensIn,
            tokensOut: result.tokensOut,
            latencyMs,
            success: false,
            error: 'Invalid JSON in response (repair also failed)',
            retryCount: attempt,
          });
          toolCalls.push(call);

          lastValidation = {
            valid: false,
            errors: [{
              layer: 'schema',
              message: 'AI response is not valid JSON. The model returned malformed output that could not be repaired.',
            }],
          };
          continue;
        }
      }

      // Validate the parsed response
      lastValidation = validateAIResponse(parsed);

      if (!lastValidation.valid) {
        console.error('[AI] Validation failed:', JSON.stringify(lastValidation.errors, null, 2));
      }

      const call = logToolCall({
        provider: config.provider,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs,
        success: lastValidation.valid,
        error: lastValidation.valid ? undefined : lastValidation.errors.map(e => e.message).join('; '),
        retryCount: attempt,
      });
      toolCalls.push(call);

      // Log to Langfuse
      logGenerationToLangfuse(trace, {
        name: `generation-attempt-${attempt}`,
        provider: config.provider,
        model: result.model,
        systemPrompt,
        userPrompt: retryUserPrompt,
        response: rawResponse,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs,
        success: lastValidation.valid,
        error: lastValidation.valid ? undefined : lastValidation.errors.map(e => e.message).join('; '),
      });

      if (lastValidation.valid) {
        if (trace) {
          trace.update({ output: { themeName: lastValidation.data?.themeName, success: true } });
        }
        await flushLangfuse();
        return { validation: lastValidation, toolCalls, rawResponse };
      }
    } catch (error) {
      const latencyMs = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : String(error);

      const call = logToolCall({
        provider: config.provider,
        model: config.model || 'unknown',
        tokensIn: 0,
        tokensOut: 0,
        latencyMs,
        success: false,
        error: errorMessage,
        retryCount: attempt,
      });
      toolCalls.push(call);

      lastValidation = {
        valid: false,
        errors: [{
          layer: 'schema',
          message: `AI provider error: ${errorMessage}`,
        }],
      };
    }
  }

  if (trace) {
    trace.update({ output: { success: false, errors: lastValidation?.errors } });
  }
  await flushLangfuse();

  return {
    validation: lastValidation || { valid: false, errors: [{ layer: 'schema', message: 'Unknown error' }] },
    toolCalls,
    rawResponse,
  };
}

/**
 * Iterate on an existing theme with a follow-up instruction.
 */
export async function iterateTheme(
  config: ProviderConfig,
  currentThemeJson: string,
  instruction: string,
): Promise<GenerateThemeResult> {
  const systemPrompt = getSystemPrompt();
  const userPrompt = buildIterationPrompt(currentThemeJson, instruction);
  const toolCalls: ToolCall[] = [];

  const start = Date.now();

  try {
    const result = await callProvider(config, systemPrompt, userPrompt);
    const latencyMs = Date.now() - start;

    let parsed: unknown;
    try {
      const jsonStr = extractJson(result.content);
      parsed = JSON.parse(jsonStr);
    } catch {
      const call = logToolCall({
        provider: config.provider,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs,
        success: false,
        error: 'Invalid JSON in response',
        retryCount: 0,
      });
      toolCalls.push(call);
      return {
        validation: { valid: false, errors: [{ layer: 'schema', message: 'AI response is not valid JSON' }] },
        toolCalls,
        rawResponse: result.content,
      };
    }

    const validation = validateAIResponse(parsed);
    const call = logToolCall({
      provider: config.provider,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      latencyMs,
      success: validation.valid,
      error: validation.valid ? undefined : validation.errors.map(e => e.message).join('; '),
      retryCount: 0,
    });
    toolCalls.push(call);

    return { validation, toolCalls, rawResponse: result.content };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const call = logToolCall({
      provider: config.provider,
      model: config.model || 'unknown',
      tokensIn: 0,
      tokensOut: 0,
      latencyMs,
      success: false,
      error: errorMessage,
      retryCount: 0,
    });
    toolCalls.push(call);
    return {
      validation: { valid: false, errors: [{ layer: 'schema', message: `AI provider error: ${errorMessage}` }] },
      toolCalls,
    };
  }
}

/** Extract JSON from a response that might be wrapped in markdown code fences */
function extractJson(content: string): string {
  const trimmed = content.trim();
  // If it starts with {, it's already JSON
  if (trimmed.startsWith('{')) return trimmed;
  // Try to extract from code fences
  const match = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (match) return match[1].trim();
  // Last resort: find the first { and last }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1) return trimmed.slice(start, end + 1);
  return trimmed;
}

/**
 * Attempt to repair broken JSON using a fast, cheap model.
 * Sends the broken JSON to a small model that only needs to fix syntax.
 */
async function repairJson(
  config: ProviderConfig,
  brokenContent: string,
): Promise<string | null> {
  // Use a fast model for repair — pick the cheapest available
  const repairModel = getRepairModel(config.provider);

  try {
    const result = await callProvider(
      { ...config, model: repairModel },
      `You are a JSON repair tool. The user will give you broken or truncated JSON. Fix it and return ONLY the valid JSON. Do not explain anything. If the JSON is truncated, close all open brackets/braces/arrays to make it valid. Remove any non-JSON text before or after the JSON object.`,
      `Fix this broken JSON and return ONLY the repaired JSON object:\n\n${brokenContent.slice(0, 12000)}`,
    );
    return result.content;
  } catch (e) {
    console.error('[AI] Repair model failed:', e);
    return null;
  }
}

function getRepairModel(provider: string): string {
  switch (provider) {
    case 'openrouter':
      return 'openai/gpt-4.1-mini'; // Fast, cheap, good at JSON
    case 'anthropic':
      return 'claude-haiku-4-5-20251001';
    case 'openai':
      return 'gpt-4.1-mini';
    case 'grok':
      return 'grok-3-mini';
    default:
      return 'openai/gpt-4.1-mini';
  }
}
