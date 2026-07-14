import { AuthProvider } from '../lib/auth';
import Navbar from '../components/Navbar';
import { ThemeProvider } from '../components/ThemeProvider';
import '../styles/globals.css';

export const metadata = {
  title: 'Campus Market',
  description: 'Copperbelt Province Marketplace for Students & Locals',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Campus Market',
  },
};

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased min-h-screen flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}