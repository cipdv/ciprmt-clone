import Link from "next/link";
import { getSession, logout } from "@/app/_actions";
import { redirect } from "next/navigation";
import Image from "next/image";

const Navbar = async () => {
  const session = await getSession();
  return (
    <nav className="flex items-center justify-between py-12 lg:px-24 navbar bg-navbar text-white">
      {" "}
      {/* Increased vertical padding and added responsive horizontal padding */}
      <Link href="/">
        {/* <h2 className="text-xl font-serif text-white">Cip de Vries, RMT</h2> */}

        <h1 className="text-3xl font-serif  text-white">CipRMT.com</h1>
      </Link>
      <ul className="flex items-center space-x-4">
        {!session ? (
          <>
            <li>
              <Link href="/about">FAQ</Link>
            </li>

            <li>
              <a href="https://www.instagram.com/cipdv/?hl=en" target="_blank">
                <img src="/images/icons8-instagram.svg" alt="About" />
              </a>
            </li>
            <li>
              <Link href="/auth/sign-in">
                <button className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2">
                  Sign in
                </button>
              </Link>
            </li>
          </>
        ) : session.resultObj.userType === "rmt" ? (
          <>
            <li>
              <Link href="/dashboard/rmt/finances">Finances</Link>
            </li>
            <li className="dropdown">
              <Link href="/dashboard/rmt/logs">Logs</Link>
              <div className="dropdown-content">
                <Link href="/dashboard/rmt/logs/maintenance">Maintenance</Link>
                <Link href="/dashboard/rmt/logs/journal">Journal</Link>
                <Link href="/dashboard/rmt/logs/daily-logs">Daily Log</Link>
              </div>
            </li>
            <li>
              <Link href="/dashboard/rmt/calendar">Calendar</Link>
            </li>
            <li>
              <Link href="/dashboard/rmt/account">Account</Link>
            </li>
            <li>
              <form
                action={async () => {
                  "use server";
                  await logout();
                  redirect("/");
                }}
              >
                <button type="submit" className="btn whitespace-nowrap">
                  Sign out
                </button>
              </form>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link href="/dashboard/patient/about">About</Link>
            </li>
            <li>
              <Link href="/dashboard/patient/services">Services</Link>
            </li>
            <li>
              <Link href="/dashboard/patient/contact">Contact</Link>
            </li>
            <li>
              <Link href="/dashboard/patient/receipts">Receipts</Link>
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
                  className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
                >
                  Sign out
                </button>
              </form>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
