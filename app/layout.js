import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { getSession, logout } from "@/app/_actions";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CipRMT.com",
  description: "Massage therapy in Toronto, Ontario",
};

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="sticky top-0">
          <Navbar session={session} logout={logout} />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
