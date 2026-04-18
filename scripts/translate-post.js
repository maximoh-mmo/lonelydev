import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import translate from 'translate-google-api';

async function translateMarkdown() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/translate-post.js <path-to-post.en.md>');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`Reading: ${filePath}...`);
  const fileContent = fs.readFileSync(absolutePath, 'utf8');
  const { data, content: body } = matter(fileContent);

  // --- 1. Prepare Frontmatter ---
  const translatedData = { ...data };
  console.log('Translating frontmatter...');

  if (data.title) {
    const [title] = await translate(data.title, { to: 'de' });
    translatedData.title = title;
  }
  if (data.summary) {
    const [summary] = await translate(data.summary, { to: 'de' });
    translatedData.summary = summary;
  }
  if (data.seoTitle) {
    const [seoTitle] = await translate(data.seoTitle, { to: 'de' });
    translatedData.seoTitle = seoTitle;
  }

  translatedData.isAutoTranslated = true;

  // --- 2. Prepare Body (Handling Code Blocks) ---
  console.log('Processing body and protecting code blocks...');
  const codeBlocks = [];
  const bodyWithPlaceholders = body.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(match);
    return placeholder;
  });

  // --- 3. Translate Body Block-by-Block ---
  console.log('Translating body content block-by-block...');
  const blocks = bodyWithPlaceholders.split('\n\n');
  const translatedBlocks = await Promise.all(
    blocks.map(async (block) => {
      if (!block.trim() || block.includes('__CODE_BLOCK_')) return block;
      try {
        const result = await translate(block, { to: 'de' });
        return Array.isArray(result) ? result[0] : result;
      } catch (e) {
        console.warn('Block translation failed, keeping original:', block.substring(0, 30));
        return block;
      }
    })
  );
  let translatedBody = translatedBlocks.join('\n\n');

  // --- 4. Re-inject Code Blocks ---
  console.log('Restoring code blocks...');
  codeBlocks.forEach((block, index) => {
    const placeholder = `__CODE_BLOCK_${index}__`;
    translatedBody = translatedBody.split(placeholder).join(block);
  });

  // --- 5. Save Output ---
  const outputFilePath = absolutePath.replace('.en.md', '.de.md');
  if (fs.existsSync(outputFilePath) && !process.env.FORCE_OVERWRITE) {
    console.warn(`Warning: ${outputFilePath} already exists. Use FORCE_OVERWRITE=1 to overwrite.`);
    process.exit(0);
  }

  const outputContent = matter.stringify(translatedBody, translatedData);
  fs.writeFileSync(outputFilePath, outputContent);

  console.log(`Success! Translated post saved to: ${outputFilePath}`);
}

translateMarkdown().catch((err) => {
  console.error('Translation failed:', err);
  process.exit(1);
});
