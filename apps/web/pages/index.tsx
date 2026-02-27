import Link from 'next/link';

import { Footer } from '@/components/layout/footer';
import { MainNav } from '@/components/layout/main-nav';
import { SpotifyNowPlaying } from '@/components/layout/SpotifyNowPlaying';

// Array order determines display position.
const projects = [
  {
    title: 'ISFL Portal',
    description:
      'Statistics and league hub for the ISFL — player/team management, stats analysis, api integrations, and league data for the sim football community.',
    href: 'https://portal.sim-football.com',
    tags: ['isfl', 'statistics', 'community'],
    available: true,
    isExternal: true,
  },
  {
    title: 'Dotts Trading Cards',
    description:
      'Digital trading card platform for simulation sports leagues — browse, collect, trade, and showcase player cards from the ISFL.',
    href: 'https://www.dottstradingcards.com',
    tags: ['trading cards', 'isfl', 'react'],
    available: true,
    isExternal: true,
  },
  {
    title: 'lemon-bluu',
    description:
      'General-purpose Discord bot for ISFL communities — stat tracking, real-time updates, and community management tools.',
    href: 'https://discord.com/oauth2/authorize?client_id=1226241466871840818&permissions=414464723008&integration_type=0&scope=bot+applications.commands',
    tags: ['discord', 'bot', 'community'],
    available: true,
    isExternal: true,
  },
  {
    title: 'Build a Set',
    description:
      'Build and manage your very own Magic: The Gathering set. Track your card inventory, calculate copy requirements for drafts, analyse distributions, and browse official sets for reference and templating.',
    href: '/set/cube',
    tags: ['mtg', 'scryfall', 'cube'],
    available: true,
  },
  {
    title: 'Image Pixelation',
    description:
      'Transform photos into geometric tessellations — triangles, hexagons, squares — with custom color palettes and perceptual dominant-color detection.',
    href: '/pixel',
    tags: ['canvas api', 'color science', 'geometry'],
    available: true,
  },
  {
    title: 'Dropdown Builder',
    description:
      'A visual editor for styled BBCode dropdown menus. Full control over colors, borders, font sizes, and option content — with live preview and clipboard export.',
    href: '/dropdown-builder',
    tags: ['bbcode', 'visual editor', 'tooling'],
    available: true,
  },
];

interface ProjectCardProps {
  number: string;
  title: string;
  description: string;
  href: string;
  tags: string[];
  available: boolean;
  isExternal?: boolean;
}

function ProjectCard({
  number,
  title,
  description,
  href,
  tags,
  available,
  isExternal,
}: ProjectCardProps) {
  const inner = (
    <div
      className="portfolio-project-card"
      style={{
        padding: 'clamp(1.5rem, 3vw, 2.25rem)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '260px',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Top row: number + badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.25rem',
        }}
      >
        <span
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: 'var(--muted-foreground)',
            fontFamily: 'inherit',
          }}
        >
          {number}
        </span>
        {!available && (
          <span
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--muted-foreground)',
              border: '1px solid var(--border)',
              padding: '0.15rem 0.5rem',
            }}
          >
            soon
          </span>
        )}
      </div>

      {/* Title + description */}
      <div style={{ flex: 1 }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.25rem, 2.2vw, 1.65rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            color: 'var(--foreground)',
            margin: '0 0 0.65rem',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 'clamp(0.75rem, 0.9vw, 0.82rem)',
            lineHeight: 1.75,
            color: 'var(--muted-foreground)',
            maxWidth: '42ch',
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>

      {/* Footer: tags + arrow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginTop: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '0.58rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--muted-foreground)',
                border: '1px solid var(--border)',
                padding: '0.2rem 0.45rem',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        {available && (
          <span
            className="portfolio-card-arrow"
            style={{
              fontSize: '1.1rem',
              color: 'var(--accent-color)',
              lineHeight: 1,
            }}
          >
            →
          </span>
        )}
      </div>
    </div>
  );

  if (!available) {
    return <div style={{ display: 'block', height: '100%' }}>{inner}</div>;
  }

  return (
    <Link
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      style={{
        display: 'block',
        height: '100%',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      {inner}
    </Link>
  );
}

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <MainNav />

      {/* ── Hero ──────────────────────────────────────────── */}
      <section
        style={{
          flex: '0 0 auto',
          minHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '6rem clamp(1.5rem, 7vw, 7rem) 4rem',
          borderBottom: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Colour blobs ──────────────────────────────── */}
        <svg
          aria-hidden="true"
          className="opacity-50 dark:opacity-100"
          style={{
            position: 'absolute',
            top: '-15%',
            left: '-10%',
            width: '75vw',
            height: '65vw',
            maxWidth: '900px',
            maxHeight: '780px',
            overflow: 'visible',
            pointerEvents: 'none',
          }}
          viewBox="0 0 500 430"
        >
          <defs>
            <radialGradient id="hero-grad-1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="oklch(0.62 0.14 222)" stopOpacity="0.12" />
              <stop offset="60%" stopColor="oklch(0.62 0.14 222)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="oklch(0.62 0.14 222)" stopOpacity="0" />
            </radialGradient>
            <filter id="hero-squiggle-1" x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence type="turbulence" baseFrequency="0.018 0.026" numOctaves="3" seed="4" result="turb" />
              <feDisplacementMap in2="turb" in="SourceGraphic" scale="65" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feGaussianBlur in="displaced" stdDeviation="28" />
            </filter>
          </defs>
          <ellipse cx="250" cy="215" rx="240" ry="185" fill="url(#hero-grad-1)" filter="url(#hero-squiggle-1)" />
        </svg>

        <svg
          aria-hidden="true"
          className="opacity-50 dark:opacity-100"
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: '70vw',
            height: '60vw',
            maxWidth: '850px',
            maxHeight: '730px',
            overflow: 'visible',
            pointerEvents: 'none',
          }}
          viewBox="0 0 500 430"
        >
          <defs>
            <radialGradient id="hero-grad-2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="oklch(0.85 0.19 90)" stopOpacity="0.11" />
              <stop offset="60%" stopColor="oklch(0.85 0.19 90)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="oklch(0.85 0.19 90)" stopOpacity="0" />
            </radialGradient>
            <filter id="hero-squiggle-2" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="38" />
            </filter>
          </defs>
          <ellipse cx="250" cy="215" rx="230" ry="195" fill="url(#hero-grad-2)" filter="url(#hero-squiggle-2)" />
        </svg>

        {/* Grain overlay */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-50%',
            width: '200%',
            height: '200%',
            opacity: 0.05,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '300px 300px',
            pointerEvents: 'none',
          }}
        />

        {/* ── Dot grid (upper-right quadrant) ──────────── */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '8%',
            right: '8%',
            width: '220px',
            height: '180px',
            backgroundImage: 'radial-gradient(circle, var(--foreground) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            opacity: 0.07,
            pointerEvents: 'none',
            maskImage: 'radial-gradient(ellipse 80% 80% at 80% 20%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 80% 20%, black 30%, transparent 100%)',
          }}
        />

        {/* ── Telemetry data panel (top-right) ─────────── */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '2.75rem',
            right: 'clamp(1.5rem, 7vw, 7rem)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            pointerEvents: 'none',
            borderLeft: '1px solid var(--accent-color)',
            paddingLeft: '0.75rem',
            opacity: 0.5,
          }}
        >
          {([
            ['LOC', 'OTTAWA, CA'],
            ['LAT', '45.4215° N'],
            ['LNG', '75.6972° W'],
            ['YR', String(new Date().getFullYear())],
          ] as [string, string][]).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
              <span
                style={{
                  fontSize: '0.52rem',
                  letterSpacing: '0.2em',
                  color: 'var(--accent-color)',
                  fontFamily: 'var(--font-mono)',
                  width: '2rem',
                  flexShrink: 0,
                }}
              >
                {key}
              </span>
              <span
                style={{
                  fontSize: '0.52rem',
                  letterSpacing: '0.15em',
                  color: 'var(--muted-foreground)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {val}
              </span>
            </div>
          ))}
        </div>

        {/* Label row */}
        <div
          className="portfolio-fade-up"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '2rem',
            animationDelay: '0ms',
          }}
        >
          <span
            style={{
              fontSize: '1rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'var(--muted-foreground)',
            }}
          >
            lemonoppy
          </span>
          <span
            style={{
              display: 'inline-block',
              width: '1.75rem',
              height: '1px',
              background: 'var(--accent-color)',
            }}
          />
          <span
            style={{
              fontSize: '1rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'var(--accent-color)',
            }}
          >
            {new Date().getFullYear()}
          </span>
        </div>

        {/* Name + underline */}
        <div className="portfolio-fade-up" style={{ animationDelay: '80ms' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3.5rem, 11vw, 10.5rem)',
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: '-0.025em',
              color: 'var(--foreground)',
              margin: '0 0 0.4rem',
            }}
          >
            Nelson Kim
          </h1>
          <div
            className="portfolio-draw-line"
            style={{
              height: '3px',
              background: 'var(--accent-color)',
              maxWidth: 'min(680px, 90vw)',
            }}
          />
        </div>

        {/* Tagline */}
        <p
          className="portfolio-fade-up"
          style={{
            fontSize: 'clamp(0.68rem, 1.1vw, 0.82rem)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted-foreground)',
            marginTop: '1.75rem',
            marginBottom: 0,
            animationDelay: '180ms',
          }}
        >
          senior front-end engineer · ottawa, on
        </p>

        {/* Bio */}
        <p
          className="portfolio-fade-up"
          style={{
            fontSize: 'clamp(0.82rem, 1vw, 0.92rem)',
            color: 'var(--muted-foreground)',
            marginTop: '1.25rem',
            marginBottom: 0,
            maxWidth: '44ch',
            lineHeight: 1.85,
            animationDelay: '260ms',
          }}
        >
          Senior Front-End Engineer at Trend Micro. I build enterprise React
          applications by day and creative tools for gaming communities by
          night.
        </p>

        <SpotifyNowPlaying />

        {/* Scroll hint */}
        <div
          className="portfolio-fade-up"
          style={{
            position: 'absolute',
            bottom: '2.5rem',
            right: 'clamp(1.5rem, 7vw, 7rem)',
            fontSize: '0.9rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--muted-foreground)',
            animationDelay: '500ms',
          }}
        >
          scroll ↓
        </div>
      </section>

      {/* ── Projects ──────────────────────────────────────── */}
      <section
        id="projects"
        style={{
          padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 7vw, 7rem)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Section header — sits flush on top of the grid border */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            marginBottom: 0,
            borderBottom: '1px solid var(--border)',
            paddingBottom: '0.6rem',
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'var(--muted-foreground)',
              whiteSpace: 'nowrap',
            }}
          >
            Selected Work
          </span>
        </div>

        {/* Asymmetric project grid */}
        <div className="portfolio-projects-grid" style={{ borderTop: 'none' }}>
          {projects.map((project, i) => (
            <ProjectCard
              key={project.title}
              {...project}
              number={String(i + 1).padStart(2, '0')}
            />
          ))}
        </div>
      </section>

      {/* ── About ─────────────────────────────────────────── */}
      <section
        id="about"
        className="portfolio-about-section"
        style={{
          padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 7vw, 7rem)',
          borderBottom: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: '1fr 2.5fr',
          gap: '3rem',
          alignItems: 'start',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'var(--muted-foreground)',
            }}
          >
            About
          </span>
        </div>
        <div>
          <p
            style={{
              fontSize: 'clamp(0.88rem, 1.2vw, 1rem)',
              lineHeight: 1.85,
              color: 'var(--foreground)',
              maxWidth: '56ch',
              margin: '0 0 1rem',
            }}
          >
            I&apos;m{' '}
            <span
              style={{
                color: 'var(--accent-color)',
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontWeight: 700,
              }}
            >
              Nelson Kim
            </span>{' '}
            <span
              style={{
                color: 'var(--lemon)',
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontWeight: 700,
              }}
            >
              (lemonoppy)
            </span>{' '}
            — a Senior Front-End Engineer based in Ottawa. At Trend Micro I
            architect enterprise React applications, lead cross-team
            infrastructure work, and help engineers across the org ship better
            code.
          </p>
          <p
            style={{
              fontSize: 'clamp(0.8rem, 1vw, 0.9rem)',
              lineHeight: 1.85,
              color: 'var(--muted-foreground)',
              maxWidth: '56ch',
              margin: '0 0 2rem',
            }}
          >
            Outside of work I build tools for the communities I care about — sim
            football leagues, Magic: The Gathering, and generative art
            experiments. This site is where those projects live.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Link
              href="https://github.com/lemonoppy"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.72rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--foreground)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--accent-color)',
                paddingBottom: '2px',
              }}
            >
              GitHub ↗
            </Link>
            <Link
              href="https://linkedin.com/in/nelson-kim"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.72rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--foreground)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--accent-color)',
                paddingBottom: '2px',
              }}
            >
              LinkedIn ↗
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
