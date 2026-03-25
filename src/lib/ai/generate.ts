import { ProviderConfig, callProvider } from './providers';
import { getSystemPrompt } from './prompts/system';
import { buildThemePrompt, buildIterationPrompt, ThemeInput } from './prompts/theme';
import { validateAIResponse, ValidationResult } from '@/lib/validator';
import { logToolCall, ToolCall } from './tool-tracker';

export interface GenerateThemeResult {
  validation: ValidationResult;
  toolCalls: ToolCall[];
  rawResponse?: string;
}

const MAX_RETRIES = 2;

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
        // Handle case where AI wraps JSON in markdown code fences
        const jsonStr = extractJson(result.content);
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('[AI] Failed to parse JSON:', (parseError as Error).message);
        console.error('[AI] Raw response (first 500 chars):', result.content.slice(0, 500));
        const call = logToolCall({
          provider: config.provider,
          model: result.model,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          latencyMs,
          success: false,
          error: 'Invalid JSON in response',
          retryCount: attempt,
        });
        toolCalls.push(call);

        lastValidation = {
          valid: false,
          errors: [{
            layer: 'schema',
            message: 'AI response is not valid JSON',
          }],
        };
        continue;
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

      if (lastValidation.valid) {
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
