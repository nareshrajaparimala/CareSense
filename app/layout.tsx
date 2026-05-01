import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { FloatingAIChat } from '@/components/FloatingAIChat';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CareSense — AI Health Companion',
  description: 'AI that watches between doctor visits.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <FloatingAIChat />
      </body>
    </html>
  );
}
