import { useEffect, useState } from 'react';

import Image from 'next/image';

interface NowPlayingData {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  albumImageUrl?: string;
  songUrl?: string;
}

function EqBars() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: '3px',
        height: '16px',
        flexShrink: 0,
      }}
    >
      {[
        { delay: '0ms', duration: '0.9s' },
        { delay: '0.2s', duration: '0.7s' },
        { delay: '0.1s', duration: '1.1s' },
      ].map((bar, i) => (
        <span
          key={i}
          style={{
            display: 'block',
            width: '3px',
            height: '16px',
            background: 'var(--accent-color)',
            transformOrigin: 'bottom',
            animation: `spotifyEq ${bar.duration} ease-in-out ${bar.delay} infinite`,
          }}
        />
      ))}
    </span>
  );
}

export function SpotifyNowPlaying() {
  const [data, setData] = useState<NowPlayingData | null>(null);

  useEffect(() => {
    async function fetchNowPlaying() {
      try {
        const res = await fetch('/api/spotify/now-playing');
        if (res.ok) setData(await res.json());
      } catch {
        // silently fail — widget just doesn't show
      }
    }

    fetchNowPlaying();
    const id = setInterval(fetchNowPlaying, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!data?.isPlaying || !data.title) return null;

  return (
    <div
      className="portfolio-fade-up"
      style={{ animationDelay: '340ms', marginTop: '2rem' }}
    >
      {/* Label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.6rem',
        }}
      >
        <span
          style={{
            fontSize: '0.63rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--muted-foreground)',
          }}
        >
          now playing
        </span>
        <span
          style={{
            display: 'inline-block',
            width: '1.25rem',
            height: '1px',
            background: 'var(--accent-color)',
          }}
        />
      </div>

      {/* Card */}
      <a
        href={data.songUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          textDecoration: 'none',
          padding: '0.85rem 1.25rem 0.85rem 0.85rem',
          border: '1px solid var(--border)',
          maxWidth: '44ch',
          width: '100%',
          transition: 'border-color 0.2s ease',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent-color)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)')
        }
      >
        {/* Album art */}
        {data.albumImageUrl && (
          <Image
            src={data.albumImageUrl}
            alt={data.title}
            width={52}
            height={52}
            style={{ display: 'block', flexShrink: 0 }}
            unoptimized
          />
        )}

        {/* Eq bars */}
        <EqBars />

        {/* Track info */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.88rem',
              color: 'var(--foreground)',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {data.title}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              marginTop: '0.2rem',
            }}
          >
            {data.artist}
          </div>
        </div>
      </a>
    </div>
  );
}
