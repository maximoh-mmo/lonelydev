import { Link } from 'react-router-dom';
import { posts } from '../../data/posts';

export default function DevBlogIndex() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-extrabold mb-10 text-center">
        Developer Blog
      </h1>

      <div className="space-y-8">
        {posts
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map((post) => (
            <Link
              key={post.id}
              to={`/dev-blog/${post.id}`}
              className="block p-6 rounded-2xl border border-gray-200 hover:shadow-lg transform hover:-translate-y-1 transition duration-300 bg-white"
            >
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {post.title}
              </h2>
              <p className="text-gray-500 text-sm mb-3">
                {new Date(post.date).toLocaleDateString()}
              </p>
              <p className="text-gray-700 mb-3">{post.summary}</p>
              <span className="inline-block text-sm text-blue-600 font-semibold">
                {post.category}
              </span>
            </Link>
          ))}
      </div>
    </main>
  );
}