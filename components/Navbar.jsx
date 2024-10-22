"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const Navbar = ({ session, logout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <nav className="bg-navbar text-white py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 lg:px-24">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-3xl font-serif" onClick={closeMenu}>
            CipRMT.com
          </Link>
          {session && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Toggle menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className={`h-6 w-6 transition-transform duration-300 ease-in-out ${
                  isOpen ? "rotate-90" : ""
                }`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          <ul
            className={`${
              session ? "hidden lg:flex" : "flex"
            } items-center space-x-2 sm:space-x-4`}
          >
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
                    <button className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2">
                      Sign in
                    </button>
                  </Link>
                </li>
              </>
            ) : (
              <NavItems
                session={session}
                logout={logout}
                closeMenu={closeMenu}
              />
            )}
          </ul>
        </div>
        {session && (
          <div
            className={`lg:hidden mt-4 overflow-hidden transition-all duration-300 ease-in-out ${
              isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <NavItems
              session={session}
              logout={logout}
              closeMenu={closeMenu}
              mobile
            />
          </div>
        )}
      </div>
    </nav>
  );
};

const NavItems = ({ session, logout, closeMenu, mobile = false }) => {
  const itemClass = mobile ? "block py-2 text-right" : "";

  return session.resultObj.userType === "rmt" ? (
    <>
      <li className={itemClass}>
        <Link
          href="/dashboard/rmt/finances"
          className="hover:text-gray-300 transition duration-300"
          onClick={closeMenu}
        >
          Finances
        </Link>
      </li>
      <li className={`${itemClass} relative group`}>
        <Link
          href="/dashboard/rmt/logs"
          className="hover:text-gray-300 transition duration-300"
          onClick={closeMenu}
        >
          Logs
        </Link>
        <div
          className={`${
            mobile
              ? "mt-2 ml-4"
              : "absolute left-0 mt-2 w-48 bg-navbar rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out"
          }`}
        >
          <Link
            href="/dashboard/rmt/logs/maintenance"
            className={`${
              mobile
                ? "block py-1"
                : "block px-4 py-2 text-sm hover:bg-gray-700"
            }`}
            onClick={closeMenu}
          >
            Maintenance
          </Link>
          <Link
            href="/dashboard/rmt/logs/journal"
            className={`${
              mobile
                ? "block py-1"
                : "block px-4 py-2 text-sm hover:bg-gray-700"
            }`}
            onClick={closeMenu}
          >
            Journal
          </Link>
          <Link
            href="/dashboard/rmt/logs/daily-logs"
            className={`${
              mobile
                ? "block py-1"
                : "block px-4 py-2 text-sm hover:bg-gray-700"
            }`}
            onClick={closeMenu}
          >
            Daily Log
          </Link>
        </div>
      </li>
      <li className={itemClass}>
        <Link
          href="/dashboard/rmt/calendar"
          className="hover:text-gray-300 transition duration-300"
          onClick={closeMenu}
        >
          Calendar
        </Link>
      </li>
      <li className={itemClass}>
        <Link
          href="/dashboard/rmt/account"
          className="hover:text-gray-300 transition duration-300"
          onClick={closeMenu}
        >
          Account
        </Link>
      </li>
      <li className={itemClass}>
        <form action={logout}>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
            onClick={closeMenu}
          >
            Sign out
          </button>
        </form>
      </li>
    </>
  ) : (
    <>
      <li className={itemClass}>
        <Link
          href="/dashboard/patient/book-a-massage"
          className="hover:text-gray-300 transition duration-300"
          onClick={closeMenu}
        >
          Book a Massage
        </Link>
      </li>
      <li className={itemClass}>
        <Link
          href="/dashboard/patient/health-history"
          className="hover:text-gray-300 transition duration-300"
          onClick={closeMenu}
        >
          Health History
        </Link>
      </li>
      <li className={itemClass}>
        <Link
          href="/dashboard/patient/contact"
          className="hover:text-gray-300 transition duration-300"
          onClick={closeMenu}
        >
          Contact Cip
        </Link>
      </li>
      <li className={itemClass}>
        <Link
          href="/dashboard/patient/receipts"
          className="hover:text-gray-300 transition duration-300"
          onClick={closeMenu}
        >
          Receipts
        </Link>
      </li>
      <li className={itemClass}>
        <form action={logout}>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
            onClick={closeMenu}
          >
            Sign out
          </button>
        </form>
      </li>
    </>
  );
};

export default Navbar;
