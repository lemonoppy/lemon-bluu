import { ReactNode } from 'react';

import Head from 'next/head';

import { Footer } from '@/components/layout/footer';

import { RiftboundNav } from './RiftboundNav';

export function RiftboundPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Head>
        <title>{title}</title>
        {description && <meta name="description" content={description} />}
      </Head>
      <RiftboundNav />
      <main className="flex-1 w-full">
        <div
          style={{
            maxWidth: '80rem',
            margin: '0 auto',
            padding: '2rem clamp(1rem, 4vw, 2.5rem)',
          }}
        >
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">
              {title}
            </h1>
            {description && (
              <p className="text-lg text-muted-foreground">{description}</p>
            )}
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
