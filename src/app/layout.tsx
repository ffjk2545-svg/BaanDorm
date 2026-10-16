import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "BaanDorm | บริหารหอพัก", description: "ระบบบริหารจัดการหอพักและธุรกิจให้เช่า" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
