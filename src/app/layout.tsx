import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Order Ops",
  description: "Operational dashboard for multi-store Shopify order visibility.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // We hide the sidebar on the login page by checking the cookie absence
  // The login page redirect logic in page.tsx handles auth; here we just render the shell.
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
