import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My B2B AI SaaS",
  description: "A modern AI SaaS built with Next.js and Tailwind CSS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <main className="container mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
