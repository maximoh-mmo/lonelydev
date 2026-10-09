export function visiblePosts(posts, referenceDate, development = false) {
  return posts.filter(post => development || (post.status !== 'draft' && post.date <= referenceDate));
}
