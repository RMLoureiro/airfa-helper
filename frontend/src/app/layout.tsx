import type { Metadata } from 'next';
import { Archivo, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Toast from '@/components/Toast';

// Display / headings / numerals — Archivo (geometric grotesque, "Pauta Azul")
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

// Body — Inter
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Airfa',
  description: 'Sistema de gestão da Banda Filarmónica',
  icons: { icon: '/airfa_logo.png' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT" className={`${archivo.variable} ${inter.variable} ${jetbrains.variable}`}>
      <head>
        {/* Apply saved theme before paint to avoid a flash. Default is dark; only opt into light when explicitly saved. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('airfa_theme')==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Toast />
      </body>
    </html>
  );
}
