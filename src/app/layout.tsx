import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers/providers";
import CustomCursor from "@/components/custom-cursor"; 

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Fresher Faceoff",
  description: "Peer-to-peer interviews for freshers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${inter.variable} font-sans antialiased flex flex-col h-full bg-background text-foreground`}>
        <Providers>
          <CustomCursor />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
