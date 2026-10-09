import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

// Parse YAML in Node, never with the browser's partial YAML parsers.
export function readBlogMetadata(directory) {
  const metadata = {};
  for (const file of fs.readdirSync(directory).filter(file => /\.(en|de)\.md$/.test(file))) {
    const [, id, language] = file.match(/^(.*)\.(en|de)\.md$/);
    const { data } = matter(fs.readFileSync(path.join(directory, file), 'utf8'));
    for (const field of ['title', 'summary', 'category', 'project']) {
      if (typeof data[field] !== 'string' || !data[field].trim()) {
        throw new Error(`${file}: missing or invalid ${field}`);
      }
    }
    if (data.id !== id || !/^\d{4}-\d{2}-\d{2}$/.test(String(data.date)) ||
        !Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string')) {
      throw new Error(`${file}: invalid id, date, or tags`);
    }
    metadata[id] ??= {};
    metadata[id][language] = { ...data, isAutoTranslated: data.isAutoTranslated === true };
  }
  for (const [id, languages] of Object.entries(metadata)) {
    if (!languages.en) throw new Error(`${id}: missing authoritative English source`);
  }
  return metadata;
}

export function blogMetadataPlugin(directory) {
  const moduleId = 'virtual:blog-metadata';
  const resolvedId = '\0' + moduleId;
  return {
    name: 'blog-metadata',
    resolveId(id) { if (id === moduleId) return resolvedId; },
    load(id) {
      if (id !== resolvedId) return;
      for (const file of fs.readdirSync(directory)) this.addWatchFile(path.join(directory, file));
      return `export default ${JSON.stringify(readBlogMetadata(directory))};`;
    },
    handleHotUpdate(context) {
      if (!context.file.replaceAll('\\', '/').startsWith(directory.replaceAll('\\', '/') + '/')) return;
      const module = context.server.moduleGraph.getModuleById(resolvedId);
      if (module) context.server.moduleGraph.invalidateModule(module);
      context.server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
