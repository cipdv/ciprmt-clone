import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { getSession } from "@/app/_actions";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CipRMT.com",
  description: "Massage therapy in Toronto, Ontario",
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="sticky top-0">
          <Navbar />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
