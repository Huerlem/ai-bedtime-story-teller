import localFont from 'next/font/local';
import { AuthProvider } from '@/contexts/AuthContext';
import { FamilyProvider } from '@/contexts/FamilyContext';
import '@/styles/globals.css';

// Design System V2 (Figma 2:53, 50:4): Nunito for all interface text. The DreamTales
// logotype is artwork and is never typeset with this or any other font.
// Bundled from the official google/fonts repository (ofl/nunito, SIL OFL 1.1 — see
// ./fonts/Nunito-OFL.txt) so builds never depend on fetching from Google Fonts.
const nunito = localFont({
  src: './fonts/Nunito-VariableFont_wght.ttf',
  weight: '200 1000',
  style: 'normal',
  display: 'swap',
  variable: '--font-nunito',
  fallback: ['ui-rounded', 'system-ui', 'sans-serif'],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" className={nunito.variable}>
      <body>
        <AuthProvider>
          <FamilyProvider>
            {children}
          </FamilyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

// Icons come from the approved DreamTales icon pack via App Router file conventions
// (src/app/favicon.ico, icon.png, apple-icon.png) and public/site.webmanifest.
export const metadata = {
  applicationName: 'Dream Tales',
  title: { default: 'Dream Tales', template: '%s · Dream Tales' },
  description: 'Stories for brighter tomorrows — personalised bedtime stories, approved by parents.',
  manifest: '/site.webmanifest',
  appleWebApp: { capable: true, title: 'Dream Tales', statusBarStyle: 'black-translucent' },
  formatDetection: { email: false, address: false, telephone: false },
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: '#16164A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};
