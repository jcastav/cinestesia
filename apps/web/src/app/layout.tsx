import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cinestesia",
  description: "Plataforma web audiovisual modular",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
