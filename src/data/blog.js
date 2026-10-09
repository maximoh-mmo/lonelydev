import metadata from 'virtual:blog-metadata';

export function localizedPost(post, language) {
  const translations = metadata[post.id];
  if (!translations) throw new Error(`Missing blog metadata: ${post.id}`);
  const source = translations.en;
  const selected = language === 'de' && translations.de ? translations.de : source;
  return {
    ...source,
    ...selected,
    ...post,
    // Filter identities and scheduling come from the source registry, never translation output.
    category: source.category,
    project: source.project.toLowerCase() === 'photoboss' ? 'PhotoBoss' : source.project,
    isAutoTranslated: selected.isAutoTranslated === true,
    isFallback: language === 'de' && !translations.de,
    contentLanguage: language === 'de' && translations.de ? 'de' : 'en',
  };
}
