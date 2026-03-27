import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./styles/globals.css";
import { ThemeProvider } from "./components/theme-provider/ThemeProvider";
import { ToastProvider } from "./components/ui/Toast";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Premier Farm Mgmt",
  description: "Next-generation Farm Management system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
