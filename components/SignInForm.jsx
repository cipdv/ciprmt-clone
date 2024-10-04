"use client";

import { login } from "@/app/_actions";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useState } from "react";

const initialState = {
  email: "",
  password: "",
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-disabled={pending}
      button
      className=" mt-4 px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

const SignInForm = () => {
  const [state, formAction] = useFormState(login, initialState);

  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <form
      action={formAction}
      className="bg-authForms p-4 rounded-md mt-6 w-full lg:w-2/5 mx-auto space-y-4"
    >
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <input
        type="email"
        placeholder="Email"
        name="email"
        required
        // className="block mb-4"
        className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
      />

      <div className="flex items-center">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          name="password"
          required
          // className="block mr-2 "
          className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="ml-2 transform transition-transform duration-300 hover:scale-110"
        >
          {showPassword ? (
            <img src="/images/icons8-hide-16.png" alt="Hide password" />
          ) : (
            <img src="/images/icons8-eye-16.png" alt="Show password" />
          )}
        </button>
      </div>
      {state?.email && (
        <p className="text-red-500 text-lg text-bold">{state?.email}</p>
      )}
      {state?.password && (
        <p className="text-red-500 text-lg text-bold">{state?.password}</p>
      )}
      {state?.message && (
        <p className="text-red-500 text-lg text-bold">{state?.message}</p>
      )}
      <SubmitButton />
      <h2 className="pt-6 text-bold text-lg">
        <Link href="/auth/sign-up">
          Haven't signed up yet? Click here to sign up.
        </Link>
      </h2>
      <h2 className="mt-4 text-black">
        <Link href="/password-reset">Forgot your password? Click here.</Link>
      </h2>
    </form>
  );
};

export default SignInForm;
