import type { Metadata } from 'next';
import { Unbounded } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/shared/Navbar';

const unbounded = Unbounded({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wallet Farm Simulator',
  description: 'Simulate wallet behavior across multiple networks',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={unbounded.className}>
        <Navbar />
        <main className="min-h-screen bg-background">
          {children}
        </main>
      </body>
    </html>
  );
}