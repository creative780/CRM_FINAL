import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { UserProvider } from "@/contexts/user-context"; // ✅ adjust the path if needed

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CreativePrints CRM Dashboard",
  description: "Dashboard for managing orders, revenue, clients, and more",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className + " bg-gray-100 text-gray-900"}>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
