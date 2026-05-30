import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AB+ | Modern Pathology Lab Management System",
  description:
    "Manage your pathology lab smarter with AB+. Patient management, technician workflow, billing, and smart report generation — all in one modern cloud platform.",
  keywords: [
    "pathology lab management",
    "lab software",
    "diagnostic center",
    "LIMS",
    "pathology reports",
    "lab management system",
    "healthcare SaaS",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
