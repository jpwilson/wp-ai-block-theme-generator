import { describe, it, expect, beforeEach } from 'vitest';
import { logToolCall, getToolCalls, clearToolCalls, getToolCallStats } from '@/lib/ai/tool-tracker';

describe('tool-tracker', () => {
  beforeEach(() => {
    clearToolCalls();
  });

  it('logs a tool call', () => {
    logToolCall({
      provider: 'openrouter',
      model: 'anthropic/claude-sonnet-4',
      tokensIn: 1000,
      tokensOut: 2000,
      latencyMs: 5000,
      success: true,
      retryCount: 0,
    });

    const calls = getToolCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].provider).toBe('openrouter');
    expect(calls[0].model).toBe('anthropic/claude-sonnet-4');
    expect(calls[0].tokensIn).toBe(1000);
    expect(calls[0].success).toBe(true);
    expect(calls[0].id).toBeDefined();
    expect(calls[0].timestamp).toBeGreaterThan(0);
  });

  it('tracks multiple calls', () => {
    logToolCall({ provider: 'openai', model: 'gpt-4o', tokensIn: 500, tokensOut: 1000, latencyMs: 3000, success: true, retryCount: 0 });
    logToolCall({ provider: 'openai', model: 'gpt-4o', tokensIn: 600, tokensOut: 1200, latencyMs: 4000, success: false, error: 'timeout', retryCount: 1 });

    const calls = getToolCalls();
    expect(calls).toHaveLength(2);
  });

  it('computes stats correctly', () => {
    logToolCall({ provider: 'openai', model: 'gpt-4o', tokensIn: 500, tokensOut: 1000, latencyMs: 3000, success: true, retryCount: 0 });
    logToolCall({ provider: 'openai', model: 'gpt-4o', tokensIn: 600, tokensOut: 1200, latencyMs: 5000, success: false, error: 'err', retryCount: 1 });

    const stats = getToolCallStats();
    expect(stats.total).toBe(2);
    expect(stats.successful).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.avgLatency).toBe(4000);
    expect(stats.totalTokensIn).toBe(1100);
    expect(stats.totalTokensOut).toBe(2200);
    expect(stats.totalRetries).toBe(1);
  });

  it('clears calls', () => {
    logToolCall({ provider: 'openai', model: 'gpt-4o', tokensIn: 0, tokensOut: 0, latencyMs: 0, success: true, retryCount: 0 });
    clearToolCalls();
    expect(getToolCalls()).toHaveLength(0);
  });

  it('returns empty stats for no calls', () => {
    const stats = getToolCallStats();
    expect(stats.total).toBe(0);
    expect(stats.avgLatency).toBe(0);
  });
});
