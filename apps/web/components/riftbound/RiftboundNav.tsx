import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { ThemeToggleButton } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV_LINKS = [
  { href: '/riftbound', label: 'Leaderboard' },
  { href: '/riftbound/store-clash', label: 'Store Clash' },
  { href: '/riftbound/stores', label: 'Stores' },
  { href: '/riftbound/events', label: 'Events' },
  { href: '/riftbound/matches', label: 'Matches' },
];

const isActiveLink = (pathname: string, href: string): boolean =>
  href === '/riftbound'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

export function RiftboundNav() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center md:items-baseline w-full justify-between md:justify-start mr-1 md:mr-0">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/"
                className="flex-shrink-0"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: 'var(--foreground)',
                  }}
                >
                  lemonoppy
                </span>
              </Link>
              <span
                style={{
                  color: 'var(--muted-foreground)',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                /
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: 'var(--foreground)',
                }}
              >
                Riftbound
              </span>
            </div>

            <nav className="block md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-9 h-9 flex items-center justify-center bg-background hover:bg-foreground/5"
                  >
                    <Menu className="h-[1.1rem] w-[1.1rem]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {NAV_LINKS.map((link) => {
                    const active = isActiveLink(router.pathname, link.href);
                    return (
                      <DropdownMenuItem
                        key={link.href}
                        asChild
                        className="text-sm font-medium"
                      >
                        <Link
                          href={link.href}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: active ? 'var(--foreground)' : undefined,
                          }}
                        >
                          {link.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            <nav className="hidden md:flex mx-6 items-center space-x-5">
              {NAV_LINKS.map((link) => {
                const active = isActiveLink(router.pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-mono)',
                      color: active
                        ? 'var(--foreground)'
                        : 'var(--muted-foreground)',
                      textDecoration: 'none',
                      transition: 'color 0.15s ease',
                      paddingBottom: '2px',
                      borderBottom: active
                        ? '1px solid var(--accent-color)'
                        : '1px solid transparent',
                    }}
                    className={active ? '' : 'hover:text-foreground'}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center">
            <ThemeToggleButton />
          </div>
        </div>
      </div>
    </header>
  );
}
