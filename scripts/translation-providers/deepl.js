import deepl from 'deepl-node';

const API_KEY = process.env.DEEPL_API_KEY;

let translator = null;

function getTranslator() {
  if (!translator && API_KEY) {
    translator = new deepl.DeepLClient(API_KEY);
  }
  return translator;
}

export async function translate(text, { to = 'de' } = {}) {
  if (!API_KEY) {
    throw new Error('DEEPL_API_KEY not set');
  }

  const t = getTranslator();
  if (!t) {
    throw new Error('DeepL translator not initialized');
  }

  const targetLang = to.toUpperCase();

  try {
    const result = await t.translateText(text, null, targetLang);
    return result.text;
  } catch (err) {
    const isRateLimit = 
      err.message?.includes('429') || 
      err.message?.includes('rate') ||
      err.message?.includes('Too many requests') ||
      err.message?.includes('high load');
    if (isRateLimit) {
      const error = new Error('Rate limited');
      error.isRateLimited = true;
      throw error;
    }
    throw err;
  }
}

export function isAvailable() {
  return !!API_KEY;
}

export const providerName = 'deepl';