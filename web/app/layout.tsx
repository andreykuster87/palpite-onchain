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
  title: "4Line On-Chain",
  description:
    "Bolão da Copa provably-fair na Solana, liquidado pelo oráculo TxLINE. Preveja o jogo, não escale time.",
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
