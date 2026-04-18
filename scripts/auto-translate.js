import './env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translateFile } from './translate-markdown.js';
import { getProviderStatus } from './translation-providers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_DIR = path.join(__dirname, '../src/content/blog');
const DEFAULT_LANG = 'de';

// Rate limiting settings
const REQUEST_DELAY_MS = 2000; // 2 seconds between requests (free tier ~60/min)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10000; // 10 second delay on rate limit

// Check for flags
const skipTranslate = process.argv.includes('--skip-translate');
const targetLang = process.argv.includes('--lang') 
  ? process.argv[process.argv.indexOf('--lang') + 1] 
  : DEFAULT_LANG;

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function translateWithRetry(sourcePath, baseName, lang) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await translateFile(sourcePath, { lang: lang, force: false });
      return result;
    } catch (err) {
      const isRateLimit = err.message?.includes('429') || err.message?.includes('rate');
      lastError = err;
      
      if (isRateLimit && attempt < MAX_RETRIES) {
        console.log(`   ⏳ Rate limited! Waiting ${RETRY_DELAY_MS/1000}s before retry ${attempt}/${MAX_RETRIES}...`);
        await delay(RETRY_DELAY_MS);
      } else {
        throw err;
      }
    }
  }
  
  throw lastError;
}

async function autoTranslate() {
  console.log('\n🌍 Auto-translate: Scanning for missing translations...\n');
  console.log(`⏱️  Rate limiting: ${REQUEST_DELAY_MS}ms between requests\n`);
  
  const status = getProviderStatus();
  console.log('📋 Provider status:');
  status.forEach(s => {
    console.log(`   ${s.available ? '✅' : '❌'} ${s.name}: ${s.status}`);
  });
  console.log('');
  
  if (!fs.existsSync(BLOG_DIR)) {
    console.log('⚠️  Blog directory not found:', BLOG_DIR);
    return;
  }
  
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.en.md'));
  console.log(`Found ${files.length} English blog posts\n`);
  
  let translated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const file of files) {
    const baseName = file.replace('.en.md', '');
    const targetFile = path.join(BLOG_DIR, `${baseName}.${targetLang}.md`);
    
    if (fs.existsSync(targetFile)) {
      console.log(`⏭️  Skipping: ${baseName} (${targetLang} already exists)`);
      skipped++;
      continue;
    }
    
    if (skipTranslate) {
      console.log(`⏭️  Skipping: ${baseName} (--skip-translate enabled)`);
      skipped++;
      continue;
    }
    
    const sourcePath = path.join(BLOG_DIR, file);
    console.log(`🔄 Translating: ${baseName} → ${targetLang}`);
    
    try {
      const result = await translateWithRetry(sourcePath, baseName, targetLang);
      if (result.success) {
        translated++;
        console.log(`   ✅ Saved: ${result.message}\n`);
      } else {
        skipped++;
        console.log(`   ⏭️  ${result.message}\n`);
      }
    } catch (err) {
      errors++;
      console.log(`   ❌ Error: ${err.message}\n`);
    }
    
    // Rate limiting delay between files
    if (translated + errors > 0 || skipped === 0) {
      console.log(`   ⏳ Waiting ${REQUEST_DELAY_MS}ms...`);
      await delay(REQUEST_DELAY_MS);
    }
  }
  
  console.log('\n📊 Translation Summary:');
  console.log(`   Translated: ${translated}`);
  console.log(`   Skipped:    ${skipped}`);
  console.log(`   Errors:     ${errors}`);
  console.log(`   Total:      ${files.length}\n`);
  
  if (errors > 0) {
    console.log('⚠️  Some translations failed. They will be retried on next build.');
  }
  
  console.log('✅ Auto-translation complete!\n');
}

autoTranslate().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});