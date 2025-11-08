import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI-Assistant - Analyse de données intelligente',
  description: 'Assistant IA pour l\'analyse et l\'interrogation de vos fichiers CSV',
  keywords: ['IA', 'analyse de données', 'CSV', 'intelligence artificielle', 'assistant'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}