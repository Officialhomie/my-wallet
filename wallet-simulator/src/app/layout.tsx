import type { Metadata } from 'next';
import { Unbounded } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/shared/Navbar';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Breadcrumb, NavigationProgress } from '@/components/shared/Breadcrumb';
import { ToastProvider } from '@/components/shared/Toast';

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
        <ToastProvider>
          <ErrorBoundary>
            <Navbar />
            <main className="min-h-screen bg-background">
              {/* Navigation Progress */}
              <div className="border-b border-border bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                  <NavigationProgress />
                </div>
              </div>

              {/* Breadcrumb Navigation */}
              <div className="border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                  <Breadcrumb />
                </div>
              </div>

              {/* Page Content with Error Boundary */}
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </ErrorBoundary>
        </ToastProvider>
      </body>
    </html>
  );
}