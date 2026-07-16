import type { Metadata } from "next";
import { Anton, Archivo, Chivo_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

const chivoMono = Chivo_Mono({
  subsets: ["latin"],
  variable: "--font-chivo",
});

export const metadata: Metadata = {
  title: "Palpite On-Chain",
  description:
    "Fantasy de palpites esportivos provably-fair na Solana. Preveja o jogo, não escale time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        className={`${anton.variable} ${archivo.variable} ${chivoMono.variable} font-body antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
