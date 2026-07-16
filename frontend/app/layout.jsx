import { AuthProvider } from '../lib/auth';
import ServiceWorkerRegister from './ServiceWorkerRegister'
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
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
      <head>
        {/* Detects older iOS Safari "Add to Home Screen" apps, which report
            standalone mode via navigator.standalone instead of the
            (display-mode: standalone) media query. Runs synchronously
            before paint so there is no flash of the footer. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.navigator.standalone === true) {
                document.documentElement.classList.add('is-ios-pwa');
              }
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased min-h-screen flex flex-col">
        <ServiceWorkerRegister />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 sm:pb-8">
              {children}
            </main>
            <BottomNav />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}