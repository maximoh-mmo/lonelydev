import './env.js';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { translate } from './translation-providers/index.js';

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
  const translatedBlocks = await Promise.all(
    blocks.map(async (block) => {
      if (!block.trim()) return block;
      if (block.includes('__ICON_') || block.includes('__CODE_BLOCK_')) return block;
      try {
        const result = await translate(block, { to: lang });
        return result;
      } catch {
        console.warn('Block translation failed, keeping original:', block.substring(0, 30));
        return block;
      }
    })
  );
  let translatedBody = translatedBlocks.join('\n\n');

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
    translatedBody = translatedBody.split(placeholder).split(emojiEscape).join(emoji).split(placeholder).join(emoji);
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
    fixedContent = outputContent.replace(/\\U([0-9A-Fa-f]{8})/g, (match, hex) => {
      return String.fromCodePoint(parseInt(hex, 16));
    });
  }
  
  fs.writeFileSync(outputFilePath, fixedContent);
  
  console.log(`Success! Translated post saved to: ${outputFilePath}`);
  return { success: true, message: outputFilePath };
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