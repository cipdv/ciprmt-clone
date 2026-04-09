"use client";

import { login } from "@/app/_actions";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";

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
      className="mt-4 px-6 py-2 bg-[#c2d5bf] text-[#1a2b1a] border border-[#93ad90] rounded-md hover:bg-[#e8efe4] hover:border-[#9caf97] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#b7c7b0] focus:ring-offset-2"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

const SignInForm = ({ showSignUpLink = true }) => {
  const [state, formAction] = useActionState(login, initialState);

  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <form
      action={formAction}
      className="bg-[#f4f7f2] border border-[#b7c7b0] p-6 rounded-xl mt-4 w-full max-w-md space-y-4"
    >
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <input
        type="email"
        placeholder="Email"
        name="email"
        required
        className="w-full p-2 border border-[#b7c7b0] bg-[#f4f7f2] rounded-md focus:ring-[#b7c7b0] focus:border-[#80947a] hover:bg-[#e8efe4] transition-colors"
      />

      <div className="flex items-center">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          name="password"
          required
          className="w-full p-2 border border-[#b7c7b0] bg-[#f4f7f2] rounded-md focus:ring-[#b7c7b0] focus:border-[#80947a] hover:bg-[#e8efe4] transition-colors"
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="ml-2 p-2 rounded-md border border-[#b7c7b0] bg-[#f4f7f2] hover:bg-[#e8efe4] transition-colors"
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
      {showSignUpLink && (
        <h2 className="pt-4 text-bold text-base">
          <Link href="/auth/sign-up">
            <strong>Haven't signed up yet?</strong> Click here to sign up.
          </Link>
        </h2>
      )}
      <h2 className="mt-2 text-black">
        <Link href="/password-reset">Forgot your password? Click here.</Link>
      </h2>
    </form>
  );
};

export default SignInForm;
