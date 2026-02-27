import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 align-middle flex">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link
          href="https://github.com/lemonoppy"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          lemonoppy &copy; {new Date().getFullYear()}
        </Link>
        <Link
          href="mailto:nelson.kim.1994@gmail.com"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          nelson.kim.1994@gmail.com
        </Link>
      </div>
    </footer>
  );
}
