import { Menu, SquareArrowOutUpRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ThemeToggleButton } from './theme-toggle';

type NavLink = {
  href: string;
  label: string;
  isExternal?: boolean;
};

const links: Array<NavLink> = [
  {
    href: '/#projects',
    label: 'Projects',
  },
  {
    href: '/set/cube',
    label: 'Build a Set',
  },
  {
    href: '/pixel',
    label: 'Pixelator',
  },
  {
    href: '/dropdown-builder',
    label: 'Dropdown Builder',
  },
  {
    href: 'https://github.com/lemonoppy',
    label: 'GitHub',
    isExternal: true,
  },
];

export function MainNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center w-full justify-between md:justify-start mr-1 md:mr-0">
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
                  {links.map((link) => (
                    <DropdownMenuItem
                      key={`${link.label}-${link.href}`}
                      asChild
                      className="text-sm font-medium"
                    >
                      <Link
                        href={link.href}
                        target={link.isExternal ? '_blank' : ''}
                        rel={link.isExternal ? 'noopener noreferrer' : ''}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {link.label}
                        {link.isExternal && (
                          <SquareArrowOutUpRight className="inline h-3 w-3 ml-1" />
                        )}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
            <nav className="hidden md:flex mx-10 items-center space-x-6">
              {links.map((link) => (
                <Link
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  target={link.isExternal ? '_blank' : ''}
                  rel={link.isExternal ? 'noopener noreferrer' : ''}
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--muted-foreground)',
                    textDecoration: 'none',
                    transition: 'color 0.15s ease',
                  }}
                  className="hover:text-foreground"
                >
                  {link.label}
                  {link.isExternal && (
                    <SquareArrowOutUpRight className="inline ml-1 mb-0.5 h-3 w-3" />
                  )}
                </Link>
              ))}
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
