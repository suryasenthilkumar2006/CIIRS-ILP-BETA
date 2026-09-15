import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import Navbar from "@/components/layout/Navbar";


export const metadata = {
  title: "CIIRS — Circular Industrial & Institutional Resource Recovery System",
  description: "B2B Circular Economy Waste Marketplace connecting generators with recycling startups.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-emerald-600 selection:text-white">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
