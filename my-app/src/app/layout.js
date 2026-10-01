import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Inter } from 'next/font/google';
import ThemeRegistry from '@/theme/ThemeRegistry';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Mesa — Asset Management Platform',
  description: 'IT asset management: device inventory, loans and signed hand-over receipts',
  icons: { icon: '/favicon.png', apple: '/apple-touch-icon.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AppRouterCacheProvider>
          <ThemeRegistry>
            <ToastProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </ToastProvider>
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
