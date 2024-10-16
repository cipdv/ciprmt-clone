"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordWithToken } from "@/app/_actions";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    try {
      const result = await resetPasswordWithToken(token, password);
      setMessage(result.message);
    } catch (error) {
      setMessage("An error occurred. Please try again.");
    }
  };

  const togglePasswordVisibility = (field) => {
    if (field === "password") {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  return (
    <div className="min-h-screen flex flex-col py-12 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="bg-authForms p-4 rounded-md mt-6 w-full lg:w-2/5 mx-auto space-y-4"
      >
        <h1 className="text-2xl font-bold mb-4">Reset Your Password</h1>
        <div className="flex items-center">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility("password")}
            className="ml-2 transform transition-transform duration-300 hover:scale-110"
          >
            {showPassword ? (
              <img src="/images/icons8-hide-16.png" alt="Hide password" />
            ) : (
              <img src="/images/icons8-eye-16.png" alt="Show password" />
            )}
          </button>
        </div>
        <div className="flex items-center">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
          />
          <button
            type="button"
            onClick={() => togglePasswordVisibility("confirm")}
            className="ml-2 transform transition-transform duration-300 hover:scale-110"
          >
            {showConfirmPassword ? (
              <img src="/images/icons8-hide-16.png" alt="Hide password" />
            ) : (
              <img src="/images/icons8-eye-16.png" alt="Show password" />
            )}
          </button>
        </div>
        <div>
          <button
            type="submit"
            className="w-2/3 p-2 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
          >
            Reset Password
          </button>
        </div>
        {message && <p className="text-red-500 text-lg font-bold">{message}</p>}
      </form>
    </div>
  );
}
