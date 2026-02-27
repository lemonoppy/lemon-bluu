import React, { ReactNode } from 'react';

import Head from 'next/head';

import { Footer } from './footer';
import { MainNav } from './main-nav';

interface PageLayoutProps {
  children: ReactNode;
  /** Optional title for the page */
  title?: string;
  /** Optional description for the page */
  description?: string;
  /** Optional classname to apply to the main container */
  className?: string;
  /** Whether to show the navigation */
  hideNav?: boolean;
  /** Whether to show the footer */
  hideFooter?: boolean;
  /** Optional max width for the content area */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
}

/**
 * Main page layout component with responsive behavior
 */
export function PageLayout({
  children,
  title,
  description,
  className = '',
  hideNav = false,
  hideFooter = false,
  maxWidth = '7xl',
}: PageLayoutProps) {
  // Map maxWidth to actual Tailwind class
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  }[maxWidth];

  return (
    <div className="flex min-h-screen flex-col">
      <Head>
        <title>{title || 'lemon-bluu'}</title>
      </Head>

      {/* Navigation */}
      {!hideNav && <MainNav />}

      {/* Main content area */}
      <main className="flex-1 w-full">
        <div className={`px-4 mx-auto ${maxWidthClass} ${className}`}>
          {title && (
            <div className="py-6">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">
                {title}
              </h1>
              {description && (
                <p className="text-lg text-muted-foreground">{description}</p>
              )}
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Footer */}
      {!hideFooter && <Footer />}
    </div>
  );
}
