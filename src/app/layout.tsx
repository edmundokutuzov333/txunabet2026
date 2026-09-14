import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import AuthGuard from '@/components/auth-guard';
import ArtisticBackground from '@/components/layout/artistic-background';
import QueryProvider from '@/components/query-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Oryon Enterprise',
  description: 'Oryon Enterprise, plataforma operacional corporativa da Txuna Bet.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-MZ" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased bg-transparent`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ArtisticBackground />
          <QueryProvider>
            <FirebaseClientProvider>
              <AuthGuard>
                {children}
              </AuthGuard>
              <Toaster />
            </FirebaseClientProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
