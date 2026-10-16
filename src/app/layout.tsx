import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_APP_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL) } : {}),
  title: { default: "KumkongApartment", template: "%s | KumkongApartment" },
  description: "ระบบบริหารจัดการหอพัก การเช่า การจดมิเตอร์ การออกบิล การรับชำระ และการเงินแบบครบวงจร",
  applicationName: "KumkongApartment",
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "KumkongApartment",
    title: "KumkongApartment",
    description: "ระบบบริหารจัดการหอพัก การเช่า การจดมิเตอร์ การออกบิล การรับชำระ และการเงินแบบครบวงจร",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
