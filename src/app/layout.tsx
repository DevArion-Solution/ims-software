import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { DataProvider } from "@/components/providers/DataProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { CampusProvider } from "@/components/providers/CampusProvider";
import { PlatformProvider } from "@/components/providers/PlatformProvider";
import { TenantAccessProvider } from "@/components/providers/TenantAccessProvider";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "IMS — Institute Management System",
  description:
    "Professional institute management for schools, colleges, universities and academies.",
  manifest: "/manifest.json",
  themeColor: "#0f766e",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IMS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} h-full`}>
      <body className="min-h-full antialiased">
        <LocaleProvider>
          <AuthProvider>
            <PlatformProvider>
              <TenantAccessProvider>
                <DataProvider>
                  <CampusProvider>
                    {children}
                    <PwaRegister />
                  </CampusProvider>
                </DataProvider>
              </TenantAccessProvider>
            </PlatformProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
