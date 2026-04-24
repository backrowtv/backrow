/**
 * Retry an async operation with linear backoff (200ms, 400ms).
 *
 * Used to wrap external API calls that occasionally fail on transient
 * network issues (timeouts, connection resets). Default 3 attempts total.
 * Pass `shouldRetry` to skip retries on non-transient errors (e.g. 4xx
 * validation failures where retrying just wastes latency).
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    backoffMs?: number;
    shouldRetry?: (err: unknown) => boolean;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, backoffMs = 200, shouldRetry = () => true } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts - 1 || !shouldRetry(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
    }
  }
  throw lastError;
}
