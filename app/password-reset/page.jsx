"use client";

import { useState } from "react";
import { resetPassword } from "@/app/_actions";
import Link from "next/link";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await resetPassword(email);
      setMessage(result.message);
    } catch (error) {
      setMessage("An error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col py-12 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="bg-authForms p-4 rounded-md mt-6 w-full lg:w-2/5 mx-auto space-y-4"
      >
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
        />
        <div>
          <button
            type="submit"
            className="w-2/3 p-2 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
          >
            Send Reset Link
          </button>
        </div>
        {message && <p className="text-red-500 text-lg font-bold">{message}</p>}
        <h2 className="pt-6 text-bold text-lg">
          <Link href="/auth/sign-in">
            Remember your password? Click here to sign in.
          </Link>
        </h2>
      </form>
    </div>
  );
}
