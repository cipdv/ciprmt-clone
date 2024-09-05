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
    <button type="submit" aria-disabled={pending} className="btn mt-4">
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
      className="bg-authForms p-4 rounded-md mt-6 w-full lg:w-2/5 mx-auto"
    >
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <input
        type="email"
        placeholder="Email"
        name="email"
        required
        className="block mb-4"
      />

      <div className="flex items-center">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          name="password"
          required
          className="block mr-2 "
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="ml-2"
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
      <h2 className="mt-4">
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
