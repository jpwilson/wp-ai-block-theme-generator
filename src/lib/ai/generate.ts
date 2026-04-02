import { ProviderConfig, callProvider } from './providers';
import { getSystemPrompt, PromptSize } from './prompts/system';
import { buildThemePrompt, buildIterationPrompt, ThemeInput } from './prompts/theme';
import { validateAIResponse, ValidationResult } from '@/lib/validator';
import { AIResponse } from '@/lib/schema';
import { logToolCall, ToolCall } from './tool-tracker';
import { createGenerationTrace, logGenerationToLangfuse, logRepairGenerationToLangfuse, flushLangfuse } from './langfuse';

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
  const systemPrompt = getSystemPrompt((input.promptSize as PromptSize) || 'standard');
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
        const repairStart = Date.now();
        const repairModel = getRepairModel(config.provider);
        const repairSystemPrompt = `You are a JSON repair tool. The user will give you broken or truncated JSON. Fix it and return ONLY the valid JSON. Do not explain anything. If the JSON is truncated, close all open brackets/braces/arrays to make it valid. Remove any non-JSON text before or after the JSON object.`;
        const repairUserPrompt = `Fix this broken JSON and return ONLY the repaired JSON object:\n\n${result.content.slice(0, 12000)}`;
        try {
          const repaired = await repairJson(config, result.content);
          const repairLatencyMs = Date.now() - repairStart;
          if (repaired) {
            const repairedStr = extractJson(repaired);
            parsed = JSON.parse(repairedStr);
            console.log('[AI] JSON repair succeeded');

            const repairCall = logToolCall({
              provider: config.provider,
              model: repairModel,
              tokensIn: 0,
              tokensOut: 0,
              latencyMs: repairLatencyMs,
              success: true,
              retryCount: attempt,
            });
            toolCalls.push(repairCall);

            logRepairGenerationToLangfuse(trace, {
              provider: config.provider,
              model: repairModel,
              systemPrompt: repairSystemPrompt,
              userPrompt: repairUserPrompt,
              response: repaired,
              tokensIn: 0,
              tokensOut: 0,
              latencyMs: repairLatencyMs,
              success: true,
            });
          }
        } catch (repairError) {
          const repairLatencyMs = Date.now() - repairStart;
          console.error('[AI] JSON repair also failed:', (repairError as Error).message);

          logRepairGenerationToLangfuse(trace, {
            provider: config.provider,
            model: repairModel,
            systemPrompt: repairSystemPrompt,
            userPrompt: repairUserPrompt,
            tokensIn: 0,
            tokensOut: 0,
            latencyMs: repairLatencyMs,
            success: false,
            error: (repairError as Error).message,
          });
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
        validationErrors: lastValidation.valid ? undefined : lastValidation.errors,
      });

      if (lastValidation.valid) {
        if (trace) {
          const data = lastValidation.data;
          const generatedFiles: string[] = [];
          if (data?.templates) {
            for (const t of data.templates) {
              generatedFiles.push(`templates/${t.name}.html`);
            }
          }
          if (data?.templateParts) {
            for (const p of data.templateParts) {
              generatedFiles.push(`parts/${p.name}.html`);
            }
          }
          if (data?.patterns) {
            for (const p of data.patterns) {
              generatedFiles.push(`patterns/${p.name}.php`);
            }
          }
          generatedFiles.push('theme.json');
          trace.update({
            output: {
              themeName: data?.themeName,
              success: true,
              generatedFiles,
            },
          });
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

// ─── 3-Pass Refinement ────────────────────────────────────────────────────────

interface RefinementPass {
  name: string;
  focus: string;
}

const REFINEMENT_PASSES: RefinementPass[] = [
  {
    name: 'content',
    focus: `Fix all missing or empty content — this is the most critical pass:
1. Find every core/cover block. If it has no innerBlocks, add: core/group (layout:constrained) containing core/heading (level:1, with real headline text, textColor:"white") + core/paragraph (real subheadline, textColor:"white") + core/buttons → core/button (real CTA text, backgroundColor:"primary").
2. Find every core/heading where content is "" or missing — fill it with a real, relevant headline.
3. Find every core/paragraph where content is "" or missing — fill it with 2-3 real sentences.
4. Find every section (core/group) that contains ONLY images/galleries with no text — add a heading + paragraph above the images.
5. Find every core/image with an empty url — replace with a real Unsplash URL appropriate to the theme industry (?w=800&q=80).
6. Find every core/button with text "" or "Button" — replace with a specific CTA like "Explore Our Menu", "View Our Work", "Get In Touch", etc.
7. NEVER add core/html or core/freeform. Return the COMPLETE improved JSON.`,
  },
  {
    name: 'design',
    focus: `Improve visual design — every section must look distinct and polished:
1. Every core/cover: ensure dimRatio is 50-60, minHeight is 80+ (vh), overlayColor is set to a dark palette slug, and all inner text has textColor:"white".
2. Every top-level core/group section: set backgroundColor to a palette slug and add style.spacing.padding top+bottom "var:preset|spacing|70". Alternate: light section → dark section → light section.
3. core/columns in features sections: each column should have style.spacing.padding "2rem", style.border.radius "12px", and style.color.background "#ffffff" if on a coloured parent.
4. All core/button blocks: backgroundColor from palette, textColor white, style.border.radius "6px", style.spacing.padding top/bottom "0.875rem" left/right "2rem".
5. Header group: layout type:flex, justifyContent:space-between, verticalAlignment:center, padding 1.25rem top/bottom.
6. Footer group: backgroundColor set to foreground palette slug, textColor to background.`,
  },
  {
    name: 'polish',
    focus: `Final cohesion and polish pass:
1. Replace ANY remaining Lorem ipsum or generic text with copy specific to this theme's industry and description.
2. Ensure the header template part has: core/site-logo + core/navigation with 4-5 core/navigation-link blocks with real labels and URLs.
3. Ensure the footer template part has 3 columns: (1) site-logo + tagline paragraph, (2) navigation links, (3) social links + copyright paragraph.
4. Verify all Unsplash URLs: heroes use ?w=1920&q=80, cards/thumbnails use ?w=800&q=80, backgrounds use ?w=1600&q=80.
5. Make headings specific and compelling — not generic ("Our Services" → "Handcrafted Italian Dishes Made Daily").
6. Ensure button CTAs are specific and action-oriented ("Read More" → "Explore Our Full Menu").
7. Return the complete polished JSON.`,
  },
];

const REFINEMENT_SYSTEM_PROMPT = `WordPress Block Theme JSON expert. You are refining an existing theme JSON.
ABSOLUTE RULES:
1. NEVER add core/html or core/freeform — they are forbidden.
2. Output ONLY the complete valid JSON object. Start with { end with }. No markdown, no explanation.
3. Keep ALL existing fields. Improve content within them — do not remove blocks or sections.
4. Every core/heading MUST have non-empty "content". Every core/paragraph MUST have non-empty "content".`;

/**
 * Run 3 sequential AI refinement passes over a validated AIResponse.
 * Each pass uses a fast model and focuses on a specific quality dimension.
 * If a pass produces invalid JSON or fails validation the previous version is kept.
 */
export async function refineThemeWithPasses(
  config: ProviderConfig,
  data: AIResponse,
): Promise<{ data: AIResponse; toolCalls: ToolCall[] }> {
  const toolCalls: ToolCall[] = [];
  let current = data;

  // Use the same model the user chose — refinement quality matters as much as initial generation
  const refineConfig: ProviderConfig = { ...config };

  for (const pass of REFINEMENT_PASSES) {
    const currentJson = JSON.stringify(current, null, 2);
    const userPrompt = `Here is the current WordPress block theme JSON:\n\n${currentJson}\n\nIMPROVEMENT FOCUS — ${pass.name.toUpperCase()} PASS:\n${pass.focus}\n\nReturn ONLY the complete improved JSON object with ALL fields intact.`;

    const start = Date.now();
    try {
      const result = await callProvider(refineConfig, REFINEMENT_SYSTEM_PROMPT, userPrompt);
      const latencyMs = Date.now() - start;

      let parsed: unknown;
      try {
        const jsonStr = extractJson(result.content);
        parsed = JSON.parse(jsonStr);
      } catch {
        console.log(`[Refine:${pass.name}] Invalid JSON returned — keeping previous version`);
        toolCalls.push(logToolCall({
          provider: refineConfig.provider,
          model: result.model,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          latencyMs,
          success: false,
          error: `Refinement pass "${pass.name}" returned invalid JSON`,
          retryCount: 0,
        }));
        continue;
      }

      const validation = validateAIResponse(parsed);
      toolCalls.push(logToolCall({
        provider: refineConfig.provider,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs,
        success: validation.valid,
        error: validation.valid ? undefined : `Refinement pass "${pass.name}" failed validation`,
        retryCount: 0,
      }));

      if (validation.valid && validation.data) {
        console.log(`[Refine:${pass.name}] ✓ succeeded (${latencyMs}ms)`);
        current = validation.data;
      } else {
        console.log(`[Refine:${pass.name}] ✗ failed validation — keeping previous version`);
      }
    } catch (e) {
      const latencyMs = Date.now() - start;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[Refine:${pass.name}] Error:`, msg);
      toolCalls.push(logToolCall({
        provider: refineConfig.provider,
        model: refineConfig.model || 'unknown',
        tokensIn: 0,
        tokensOut: 0,
        latencyMs,
        success: false,
        error: `Refinement pass "${pass.name}" error: ${msg}`,
        retryCount: 0,
      }));
    }
  }

  return { data: current, toolCalls };
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
