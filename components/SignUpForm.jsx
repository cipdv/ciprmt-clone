"use client";

import React, { useState } from "react";
import { registerNewPatient } from "@/app/_actions";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";

const initialState = {
  message: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  pronouns: "",
  password: "",
  confirmPassword: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" aria-disabled={pending} className="btn w-2/5 ">
      {pending ? "Submitting..." : "Sign up"}
    </button>
  );
}

const SignupForm = () => {
  const [state, formAction] = useFormState(registerNewPatient, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <form
      action={formAction}
      className="bg-authForms p-4 rounded-md mt-6 w-full lg:w-2/5 mx-auto space-y-4"
    >
      <h1 className="text-2xl font-bold">Register to Book a Massage</h1>
      <div className="flex flex-col gap-3 glassmorphism mt-4">
        <h1 className="font-bold">Personal information</h1>
        <label htmlFor="firstName">First Name</label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          placeholder="Legal first name"
          required
          className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
        />
        <label htmlFor="preferredName">Preferred Name</label>
        <input
          type="text"
          id="preferredName"
          name="preferredName"
          placeholder="Name you go by"
          className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
        />
        <label htmlFor="lastName">Last Name</label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          placeholder="Full last name"
          required
          className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
        />
        <label htmlFor="pronouns">Pronouns</label>
        <select
          id="pronouns"
          name="pronouns"
          defaultValue={""}
          required
          className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
        >
          <option value="" disabled="disabled">
            Select
          </option>
          <option value="they/them">They/them</option>
          <option value="she/her">She/her</option>
          <option value="he/him">He/him</option>
          <option value="other">Other</option>
        </select>
        <label htmlFor="phone">Phone</label>
        <input
          type="tel"
          id="phone"
          name="phone"
          placeholder="123-456-7890"
          required
          className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
        />
        <h1 className="font-bold mt-4">Login information</h1>
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Will be used as login"
          required
          className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
        />
        {state?.email && (
          <p className="text-red-500 text-lg text-bold">{state?.email}</p>
        )}
        <label htmlFor="password">Password</label>
        <div className="flex items-center">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            placeholder="6 characters minimum"
            required
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
        {state?.password && (
          <p className="text-red-500 text-lg text-bold">{state?.password}</p>
        )}
        <label htmlFor="confirmPassword">Confirm Password</label>
        <div className="flex items-center mb-4">
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Confirm password"
            required
            className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
          />
          <button
            type="button"
            onClick={toggleConfirmPasswordVisibility}
            className="ml-2 transform transition-transform duration-300 hover:scale-110"
          >
            {showConfirmPassword ? (
              <img src="/images/icons8-hide-16.png" alt="Hide password" />
            ) : (
              <img src="/images/icons8-eye-16.png" alt="Show password" />
            )}
          </button>
        </div>
        {state?.confirmPassword && (
          <p className="text-red-500 text-lg text-bold">
            {state?.confirmPassword}
          </p>
        )}
        <h2 className="mt-4 text-bold">
          <Link href="/auth/sign-in">
            Already have an account? Click here to sign in.
          </Link>
        </h2>
        <p className="text-red-500 text-lg text-bold">{state?.message}</p>
        <SubmitButton />
      </div>
    </form>
  );
};

export default SignupForm;
