import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lottocien | Rifa Semanal de Lotería",
  description: "Participa en la rifa semanal basada en el resultado de la lotería de 4 cifras. ¡Tres oportunidades de ganar con el mismo número!",
  icons: {
    icon: "https://cdn.lottocien.com/Icono%20Isotipo%20Redondo.png",
    apple: "https://cdn.lottocien.com/Icono%20Isotipo%20Redondo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body 
        className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans"
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        {/* Wompi Checkout Widget Script */}
        <Script
          src="https://checkout.wompi.co/widget.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
