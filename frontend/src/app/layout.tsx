import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'Last-Mile Delivery Tracker | Enterprise Logistics SaaS',
  description: 'Production-grade last-mile delivery tracking, automated assignment, and intelligent volumetric pricing engine.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen flex flex-col antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} LastMile Logistics SaaS Platform. Engineered for Production.</p>
        </footer>
      </body>
    </html>
  );
}
