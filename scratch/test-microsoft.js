import '../scripts/env.js';
import { translate } from '../scripts/translation-providers/microsoft.js';

async function test() {
  console.log('API_KEY exists:', !!process.env.MICROSOFT_TRANSLATOR_KEY);
  console.log('API_KEY length:', process.env.MICROSOFT_TRANSLATOR_KEY?.length);
  try {
    const res = await translate('Hello world', { to: 'de' });
    console.log('Result:', res);
  } catch (err) {
    console.error('Error during translation:', err);
  }
}

test();
