import './env.js';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { translate } from './translation-providers/index.js';

const BLOCK_TRANSLATION_DELAY_MS = 3000;
const BLOCK_MAX_RETRIES = 3;
const BLOCK_RETRY_DELAY_MS = 8000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function normalizeYamlFormat(content) {
  const lines = content.split('\n');
  const result = [];
  let inFrontmatter = false;
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    if (line === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        result.push(line);
        i++;
        continue;
      } else {
        result.push(line);
        break;
      }
    }
    
    if (!inFrontmatter) {
      result.push(line);
      i++;
      continue;
    }
    
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      result.push(line);
      i++;
      continue;
    }
    
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    
    // Check for block array (multiline with dashes) - must check BEFORE pushing current line
    if (value === '' && i + 1 < lines.length && lines[i + 1].trim().startsWith('-')) {
      const arrayItems = [];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('-')) {
        const item = lines[i].trim().slice(2).trim().replace(/^["']|["']$/g, '');
        arrayItems.push(item);
        i++;
      }
      result.push(`${key}: [${arrayItems.map(item => `"${item}"`).join(', ')}]`);
      continue;
    }
    
    // Check for multiline YAML (>, >-, |+)
    if (value === '>' || value === '>-' || value === '|+') {
      const multilineValues = [];
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        if (nextLine.startsWith('  ') || nextLine.startsWith('\t') || nextLine === '') {
          multilineValues.push(nextLine.trim());
          i++;
        } else {
          break;
        }
      }
      const combinedValue = multilineValues.join(' ').replace(/^["']|["']$/g, '');
      result.push(`${key}: "${combinedValue}"`);
      continue;
    }
    
    // Handle inline arrays [item1, item2]
    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value.slice(1, -1).split(',').map(v => {
        const trimmed = v.trim().replace(/^["']|["']$/g, '');
        return `"${trimmed}"`;
      });
      result.push(`${key}: [${items.join(', ')}]`);
      i++;
      continue;
    }
    
    // Regular string value - ensure double quotes, preserve booleans
    if (value === 'true') {
      result.push(`${key}: true`);
    } else if (value === 'false') {
      result.push(`${key}: false`);
    } else if (value.startsWith('"') && value.endsWith('"')) {
      result.push(`${key}: ${value}`);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      result.push(`${key}: "${value.slice(1, -1)}"`);
    } else if (value === '') {
      result.push(`${key}: ""`);
    } else {
      result.push(`${key}: "${value}"`);
    }
    
    i++;
  }
  
  const remainingLines = lines.slice(i + 1);
  return result.join('\n') + '\n' + remainingLines.join('\n');
}

function normalizeYamlFrontmatter(content) {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let frontmatterLines = [];
  let bodyLines = [];
  let inMultiline = false;
  let multilineKey = null;
  let multilineValues = [];
  let firstDashDone = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line === '---') {
      if (!firstDashDone) {
        firstDashDone = true;
        inFrontmatter = true;
        frontmatterLines.push(line);
        continue;
      } else {
        if (inMultiline) {
          frontmatterLines.push(multilineKey + ': "' + multilineValues.join(' ') + '"');
          inMultiline = false;
        }
        frontmatterLines.push(line);
        bodyLines = lines.slice(i + 1);
        break;
      }
    }

    if (!inFrontmatter) continue;

    if (inMultiline) {
      if (line.match(/^  /) || line.match(/^\t/)) {
        multilineValues.push(line.trim());
        continue;
      } else {
        frontmatterLines.push(multilineKey + ': "' + multilineValues.join(' ') + '"');
        inMultiline = false;
      }
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      frontmatterLines.push(line);
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    if (value === '>-' || value === '>' || value === '|+') {
      inMultiline = true;
      multilineKey = key;
      multilineValues = [];
      continue;
    }

    if (value.startsWith("'") && value.endsWith("'")) {
      value = '"' + value.slice(1, -1) + '"';
    }

    frontmatterLines.push(`${key}: ${value}`);
  }

  return frontmatterLines.join('\n') + '\n---\n' + bodyLines.join('\n');
}

/**
 * Translate a markdown file from one language to another
 * @param {string} filePath - Path to the source .en.md file
 * @param {object} options - Translation options
 * @param {boolean} options.force - Force overwrite existing translation
 * @param {string} options.lang - Target language code (default: 'de')
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function translateFile(filePath, options = {}) {
  const { force = false, lang = 'de' } = options;
  
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    return { success: false, message: `File not found: ${absolutePath}` };
  }

  console.log(`Reading: ${filePath}...`);
  const fileContent = fs.readFileSync(absolutePath, 'utf8');
  const { data, content: body } = matter(fileContent);

  // --- 1. Prepare Frontmatter ---
  const translatedData = { ...data };
  console.log('Translating frontmatter...');

  // Protect emojis before translation (they should not be translated)
  // Includes variation selectors (U+FE0E, U+FE0F) and keycap digit (U+20E3)
  const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{FE0E}\u{FE0F}\u{20E3}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojiPlaceholders = [];
  let frontmatterText = JSON.stringify(data);
  
  frontmatterText = frontmatterText.replace(emojiPattern, (match) => {
    const placeholder = `__EMOJI_${emojiPlaceholders.length}__`;
    emojiPlaceholders.push(match);
    return placeholder;
  });
  
const protectedData = JSON.parse(frontmatterText);
   
  if (protectedData.title) {
    const title = await translate(protectedData.title, { to: lang });
    translatedData.title = title;
  }
  if (protectedData.summary) {
    const summary = await translate(protectedData.summary, { to: lang });
    translatedData.summary = summary;
  }
  if (protectedData.seoTitle) {
    const seoTitle = await translate(protectedData.seoTitle, { to: lang });
    translatedData.seoTitle = seoTitle;
  }
  if (protectedData.category) {
    const category = await translate(protectedData.category, { to: lang });
    translatedData.category = category;
  }

  // Restore emojis after translation (handle both literal and Unicode escape forms)
  emojiPlaceholders.forEach((emoji, index) => {
    const placeholder = `__EMOJI_${index}__`;
    const emojiEscape = emoji.replace(/[\u{1F000}-\u{1F9FF}]/gu, (m) => {
      return '\\U' + m.codePointAt(0).toString(16).toUpperCase().padStart(8, '0');
    });
    translatedData.title = translatedData.title?.replace(new RegExp(emojiEscape, 'g'), emoji).replace(placeholder, emoji);
    translatedData.summary = translatedData.summary?.replace(new RegExp(emojiEscape, 'g'), emoji).replace(placeholder, emoji);
    translatedData.seoTitle = translatedData.seoTitle?.replace(new RegExp(emojiEscape, 'g'), emoji).replace(placeholder, emoji);
  });
  
  translatedData.isAutoTranslated = true;

  // --- 2. Prepare Body (Handling Protected Patterns) ---
  console.log('Processing body and protecting patterns...');
  
  // Protect emojis in body (they should not be translated)
  const bodyEmojiPlaceholders = [];
  let bodyWithPlaceholders = body.replace(emojiPattern, (match) => {
    const placeholder = `__BODY_EMOJI_${bodyEmojiPlaceholders.length}__`;
    bodyEmojiPlaceholders.push(match);
    return placeholder;
  });

  // Protect icon shortcodes {:icon:Name}
  const iconShortcodes = [];
  bodyWithPlaceholders = bodyWithPlaceholders.replace(/\{:icon:([A-Za-z]+)\}/g, (match, iconName) => {
    const placeholder = `__ICON_${iconName}__`;
    iconShortcodes.push({ placeholder, iconName });
    return placeholder;
  });

  // Protect code blocks
  const codeBlocks = [];
  bodyWithPlaceholders = bodyWithPlaceholders.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(match);
    return placeholder;
  });

  // --- 3. Translate Body Block-by-Block ---
  console.log('Translating body content block-by-block...');
  const blocks = bodyWithPlaceholders.split('\n\n');
  const failedBlocks = [];
  
  const translatedBlocks = await Promise.all(
    blocks.map(async (block, index) => {
      if (!block.trim()) return block;
      if (block.includes('__ICON_') || block.includes('__CODE_BLOCK_')) return block;
      
      for (let attempt = 1; attempt <= BLOCK_MAX_RETRIES + 1; attempt++) {
        try {
          const result = await translate(block, { to: lang });
          if (attempt > 1) {
            console.log(`   ✓ Block ${index} succeeded on attempt ${attempt}`);
          }
          await delay(BLOCK_TRANSLATION_DELAY_MS);
          return result;
        } catch (err) {
          const isRateLimit = err.isRateLimited || err.message?.includes('429') || err.message?.includes('rate');
          const errorType = isRateLimit ? 'rate limited' : 'error';
          
          if (attempt <= BLOCK_MAX_RETRIES) {
            const retryDelay = isRateLimit ? BLOCK_RETRY_DELAY_MS * 2 : BLOCK_RETRY_DELAY_MS;
            console.log(`   ⚠ Block ${index} ${errorType}, retrying in ${retryDelay/1000}s (attempt ${attempt + 1}/${BLOCK_MAX_RETRIES + 1})...`);
            await delay(retryDelay);
          } else {
            const blockPreview = block.substring(0, 50).replace(/\n/g, ' ');
            console.warn(`   ❌ Block ${index} translation failed after ${BLOCK_MAX_RETRIES + 1} attempts: ${err.message} | Block: "${blockPreview}..."`);
            failedBlocks.push({ index, preview: blockPreview, error: err.message });
            return block;
          }
        }
      }
    })
  );
  
  if (failedBlocks.length > 0) {
    console.log(`\n   📊 ${failedBlocks.length} block(s) failed to translate (kept original):`);
    failedBlocks.forEach(fb => console.log(`      - Block ${fb.index}: ${fb.preview.substring(0, 40)}`));
  }
  
  let translatedBody = String(translatedBlocks.join('\n\n'));

  // --- 4. Re-inject Protected Content ---
  console.log('Restoring protected content...');
  codeBlocks.forEach((block, index) => {
    const placeholder = `__CODE_BLOCK_${index}__`;
    translatedBody = translatedBody.split(placeholder).join(block);
  });

  // Restore emojis in body (handle both literal and Unicode escape forms)
  bodyEmojiPlaceholders.forEach((emoji, index) => {
    const placeholder = `__BODY_EMOJI_${index}__`;
    const emojiEscape = emoji.replace(/[\u{1F000}-\u{1F9FF}]/gu, (m) => {
      return '\\U' + m.codePointAt(0).toString(16).toUpperCase().padStart(8, '0');
    });
    translatedBody = String(translatedBody).split(placeholder).join(emoji).split(emojiEscape).join(emoji);
  });

  // Icons don't need restoration - the shortcode stays as-is for MarkdownRenderer to handle

  // --- 5. Save Output ---
  const outputFilePath = absolutePath.replace('.en.md', `.${lang}.md`);
  if (fs.existsSync(outputFilePath) && !force) {
    console.log(`Skipping: ${outputFilePath} already exists (use --force to overwrite)`);
    return { success: false, message: 'File already exists, skipping' };
  }

  const outputContent = matter.stringify(translatedBody, translatedData);
  
  // Convert Unicode escapes back to actual emojis (gray-matter converts them to escapes)
  // Only apply fix if there are Unicode escapes to avoid reformatting YAML unnecessarily
  let fixedContent = outputContent;
  if (/\\U[0-9A-Fa-f]{8}/.test(outputContent)) {
    fixedContent = fixedContent.replace(/\\U([0-9A-Fa-f]{8})/g, (match, hex) => {
      return String.fromCodePoint(parseInt(hex, 16));
    });
  }
  
  // Normalize YAML to consistent format: double-quoted strings and inline arrays
  fixedContent = normalizeYamlFormat(fixedContent);
  
  fs.writeFileSync(outputFilePath, fixedContent);
  
  console.log(`Success! Translated post saved to: ${outputFilePath}`);
  return { success: true, message: outputFilePath, failedBlocks: failedBlocks };
}

// CLI handler
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/translate-markdown.js <path-to-.en.md> [OPTIONS]');
    console.error('  --force    Overwrite existing translation');
    console.error('  --lang    Target language (default: de)');
    process.exit(1);
  }

  const args = process.argv.slice(3);
  const options = {
    force: args.includes('--force'),
    lang: args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'de'
  };

  translateFile(filePath, options).catch((err) => {
    console.error('Translation failed:', err);
    process.exit(1);
  });
}