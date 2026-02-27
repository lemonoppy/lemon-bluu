import '@/styles/globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';

import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1">
          <Component {...pageProps} />
        </main>
      </div>
    </ThemeProvider>
  );
}
