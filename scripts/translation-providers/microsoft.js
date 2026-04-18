const API_KEY = process.env.MICROSOFT_TRANSLATOR_KEY;
const ENDPOINT = 'https://api.cognitive.microsofttranslator.com';
const REGION = 'global';

export async function translate(text, { to = 'de' } = {}) {
  if (!API_KEY) {
    throw new Error('MICROSOFT_TRANSLATOR_KEY not set');
  }

  const targetLang = to;

  const response = await fetch(
    `${ENDPOINT}/translate?api-version=3.0&to=${targetLang}`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': API_KEY,
        'Ocp-Apim-Subscription-Region': REGION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ Text: text }]),
    }
  );

  if (!response.ok) {
    const status = response.status;
    if (status === 429) {
      const error = new Error('Rate limited');
      error.isRateLimited = true;
      throw error;
    }
    if (status === 401) {
      throw new Error('Microsoft API key invalid');
    }
    throw new Error(`Microsoft API error: ${status}`);
  }

  const data = await response.json();
  if (data && data[0] && data[0].translations && data[0].translations[0]) {
    return data[0].translations[0].text;
  }
  throw new Error('Invalid response from Microsoft API');
}

export function isAvailable() {
  return !!API_KEY;
}

export const providerName = 'microsoft';