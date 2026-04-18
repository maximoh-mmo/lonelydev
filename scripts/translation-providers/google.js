import googleTranslate from 'translate-google-api';

export async function translate(text, { to = 'de' } = {}) {
  try {
    const result = await googleTranslate(text, { to });
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    if (err.message?.includes('429') || err.message?.includes('rate')) {
      const error = new Error('Rate limited');
      error.isRateLimited = true;
      throw error;
    }
    throw err;
  }
}

export function isAvailable() {
  return true;
}

export const providerName = 'google';