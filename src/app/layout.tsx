import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from '@/contexts/ProfileContext';
import { ErrorProvider } from '@/contexts/ErrorContext';
import { PageStyleProvider } from '@/contexts/PageStyleContext';
import ProfileSidebar from '@/components/ProfileSidebar';
import Navbar from "@/components/Navbar";
import DebugTools from "@/components/DebugTools";

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
  preload: true,
  display: 'swap',
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PEITA",
  description: "Next.js와 Supabase로 구축된 프로젝트",
  metadataBase: new URL('https://project-pieta.vercel.app'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} font-sans antialiased`}
      >
        <ErrorProvider>
        <AuthProvider>
          <ProfileProvider>
            <PageStyleProvider>
              <Navbar />
              <main>{children}</main>
              <ProfileSidebar />
              <DebugTools />
            </PageStyleProvider>
          </ProfileProvider>
        </AuthProvider>
        </ErrorProvider>
      </body>
    </html>
  );
}
