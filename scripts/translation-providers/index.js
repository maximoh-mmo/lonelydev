import * as deepl from './deepl.js';
import * as microsoft from './microsoft.js';
import * as google from './google.js';

const PROVIDERS = [deepl, microsoft, google];

export async function translate(text, options = {}) {
  const errors = [];

  for (const provider of PROVIDERS) {
    if (!provider.isAvailable()) {
      errors.push({ provider: provider.providerName, error: 'Not available (no API key)' });
      continue;
    }

    try {
      const result = await provider.translate(text, options);
      return result;
    } catch (err) {
      const isRetryable = err.isRateLimited || err.message?.includes('429') || err.message?.includes('rate');
      errors.push({ provider: provider.providerName, error: err.message, retryable: isRetryable });

      if (isRetryable) {
        continue;
      }
      throw err;
    }
  }

  const error = new Error('All translation providers failed');
  error.providerErrors = errors;
  throw error;
}

export function getProviderStatus() {
  return PROVIDERS.map(p => ({
    name: p.providerName,
    available: p.isAvailable(),
    status: p.isAvailable() ? 'ready' : 'missing API key'
  }));
}