/**
 * AI tool call tracker.
 * Logs every AI API call: provider, model, tokens, latency, success/failure.
 */

export interface ToolCall {
  id: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  retryCount: number;
  timestamp: number;
}

let calls: ToolCall[] = [];

export function logToolCall(call: Omit<ToolCall, 'id' | 'timestamp'>): ToolCall {
  const entry: ToolCall = {
    ...call,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  calls.push(entry);
  // Keep last 100 calls in memory
  if (calls.length > 100) {
    calls = calls.slice(-100);
  }
  return entry;
}

export function getToolCalls(): ToolCall[] {
  return [...calls];
}

export function clearToolCalls(): void {
  calls = [];
}

export function getToolCallStats() {
  const total = calls.length;
  const successful = calls.filter(c => c.success).length;
  const failed = total - successful;
  const avgLatency = total > 0
    ? Math.round(calls.reduce((sum, c) => sum + c.latencyMs, 0) / total)
    : 0;
  const totalTokensIn = calls.reduce((sum, c) => sum + c.tokensIn, 0);
  const totalTokensOut = calls.reduce((sum, c) => sum + c.tokensOut, 0);
  const totalRetries = calls.reduce((sum, c) => sum + c.retryCount, 0);

  return {
    total,
    successful,
    failed,
    avgLatency,
    totalTokensIn,
    totalTokensOut,
    totalRetries,
  };
}
