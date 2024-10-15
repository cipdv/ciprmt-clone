import Link from "next/link";
import { getSession, logout } from "@/app/_actions";
import { redirect } from "next/navigation";
import Image from "next/image";

const Navbar = async () => {
  const session = await getSession();

  return (
    <nav className="bg-navbar text-white py-4 sm:py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl sm:text-3xl font-serif">
            CipRMT.com
          </Link>
          <ul className="flex items-center space-x-2 sm:space-x-4">
            {!session ? (
              <>
                <li>
                  <Link
                    href="/faq"
                    className="hover:text-gray-300 transition duration-300"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/cipdv/?hl=en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition duration-300"
                  >
                    <Image
                      src="/images/icons8-instagram.svg"
                      alt="Instagram"
                      width={24}
                      height={24}
                    />
                  </a>
                </li>
                <li>
                  <Link href="/auth/sign-in">
                    <button className="px-4 py-2 bg-red-200 text-gray-800 rounded-md hover:bg-red-300 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 text-sm">
                      Sign in
                    </button>
                  </Link>
                </li>
              </>
            ) : session.resultObj.userType === "rmt" ? (
              <>
                <li>
                  <Link
                    href="/dashboard/rmt/finances"
                    className="hover:text-gray-300 transition duration-300"
                  >
                    Finances
                  </Link>
                </li>
                <li className="relative group">
                  <Link
                    href="/dashboard/rmt/logs"
                    className="hover:text-gray-300 transition duration-300"
                  >
                    Logs
                  </Link>
                  <div className="absolute left-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-300">
                    <Link
                      href="/dashboard/rmt/logs/maintenance"
                      className="block px-4 py-2 text-sm hover:bg-gray-600"
                    >
                      Maintenance
                    </Link>
                    <Link
                      href="/dashboard/rmt/logs/journal"
                      className="block px-4 py-2 text-sm hover:bg-gray-600"
                    >
                      Journal
                    </Link>
                    <Link
                      href="/dashboard/rmt/logs/daily-logs"
                      className="block px-4 py-2 text-sm hover:bg-gray-600"
                    >
                      Daily Log
                    </Link>
                  </div>
                </li>
                <li>
                  <Link
                    href="/dashboard/rmt/calendar"
                    className="hover:text-gray-300 transition duration-300"
                  >
                    Calendar
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/rmt/account"
                    className="hover:text-gray-300 transition duration-300"
                  >
                    Account
                  </Link>
                </li>
                <li>
                  <form
                    action={async () => {
                      "use server";
                      await logout();
                      redirect("/");
                    }}
                  >
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-200 text-gray-800 rounded-md hover:bg-red-300 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 text-sm"
                    >
                      Sign out
                    </button>
                  </form>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    href="/dashboard/patient/services"
                    className="hover:text-gray-300 transition duration-300"
                  >
                    Services
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/patient/contact"
                    className="hover:text-gray-300 transition duration-300"
                  >
                    Contact Cip
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/patient/receipts"
                    className="hover:text-gray-300 transition duration-300"
                  >
                    Receipts
                  </Link>
                </li>
                <li>
                  <form
                    action={async () => {
                      "use server";
                      await logout();
                      redirect("/");
                    }}
                  >
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-200 text-gray-800 rounded-md hover:bg-red-300 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 text-sm"
                    >
                      Sign out
                    </button>
                  </form>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
