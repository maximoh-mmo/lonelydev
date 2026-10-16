import { useState } from 'react';
import { Play } from 'lucide-react';

export default function VideoEmbed({ videoId, title }) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
  const posterUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  if (playing) {
    return <iframe src={embedUrl} title={`${title} video`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
  }

  return (
    <button className="video-poster" type="button" onClick={() => setPlaying(true)} aria-label={`Play ${title} video`}>
      <img src={posterUrl} alt="" loading="lazy" />
      <span className="video-poster__shade" aria-hidden="true" />
      <span className="video-poster__play"><Play aria-hidden="true" fill="currentColor" />Play project video</span>
    </button>
  );
}
