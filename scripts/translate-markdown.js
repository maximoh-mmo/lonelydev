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
  
  if (data.title) {
    const title = await translate(data.title, { to: lang });
    translatedData.title = title;
  }
  if (data.summary) {
    const summary = await translate(data.summary, { to: lang });
    translatedData.summary = summary;
  }
  if (data.seoTitle) {
    const seoTitle = await translate(data.seoTitle, { to: lang });
    translatedData.seoTitle = seoTitle;
  }
  
  translatedData.isAutoTranslated = true;

  // --- 2. Prepare Body (Handling Protected Patterns) ---
  console.log('Processing body and protecting patterns...');
  
  // Protect icon shortcodes {:icon:Name}
  const iconShortcodes = [];
  let bodyWithPlaceholders = body.replace(/\{:icon:([A-Za-z]+)\}/g, (match, iconName) => {
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

  // Icons don't need restoration - the shortcode stays as-is for MarkdownRenderer to handle

  // --- 5. Save Output ---
  const outputFilePath = absolutePath.replace('.en.md', `.${lang}.md`);
  if (fs.existsSync(outputFilePath) && !force) {
    console.log(`Skipping: ${outputFilePath} already exists (use --force to overwrite)`);
    return { success: false, message: 'File already exists, skipping' };
  }

  const outputContent = matter.stringify(translatedBody, translatedData);
  fs.writeFileSync(outputFilePath, outputContent);
  
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