import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { getSession, logout } from "@/app/_actions";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CipRMT.com",
  description:
    "Gay & LGBTQ+ Registered Massage Therapist (RMT) in Toronto offering thai massage therapy focused on relaxation, relieving muscle tension, headache relief, and holistic wellbeing.",
};

function HealthHistoryUpdateAlert() {
  return (
    <div className="bg-red-200 border-y border-gray-900 w-full">
      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="text-gray-900" role="alert">
          <p className="font-bold">Health History Update Required</p>
          <p>
            Your health history needs to be reviewed/updated annually. Please
            review your information, make any changes if applicable, then press
            submit.
            <Link
              href="/dashboard/patient/health-history"
              className="underline ml-2"
            >
              Update now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function RootLayout({ children }) {
  const session = await getSession();

  let needsHealthHistoryUpdate = false;
  if (session && session.resultObj.userType === "patient") {
    const lastHealthHistoryUpdate = new Date(
      session.resultObj.lastHealthHistoryUpdate || 0
    );
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    needsHealthHistoryUpdate = lastHealthHistoryUpdate < oneYearAgo;
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="sticky top-0">
          <Navbar session={session} logout={logout} />
        </header>
        {session &&
          session.resultObj.userType === "patient" &&
          needsHealthHistoryUpdate && <HealthHistoryUpdateAlert />}
        <main>{children}</main>
      </body>
    </html>
  );
}
