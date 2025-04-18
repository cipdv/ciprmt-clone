"use client";

import { login, registerNewWorkplacePatient } from "@/app/_actions";
import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import Link from "next/link";

const initialSignInState = {
  email: "",
  password: "",
  message: "",
};

const initialSignUpState = {
  errors: {},
  message: "",
  firstName: "",
  preferredName: "",
  lastName: "",
  pronouns: "",
  phoneNumber: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function SignInButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-disabled={pending}
      button
      className=" mt-4 px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
    >
      {pending ? "Logging in ..." : "Login"}
    </button>
  );
}

function SignUpButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-disabled={pending}
      className=" mt-4 px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
    >
      {pending ? "Submitting..." : "Sign up"}
    </button>
  );
}

const AuthForm = ({ officename }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [signInState, signInFormAction] = useFormState(
    login,
    initialSignInState
  );
  const [state, signUpFormAction] = useFormState(
    registerNewWorkplacePatient,
    initialSignUpState
  );

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
      action={signUpFormAction}
      className="bg-authForms p-4 rounded-md mt-6 w-full lg:w-2/5 mx-auto space-y-4"
    >
      <h1 className="text-2xl font-bold">Register to Book a Massage</h1>
      <div className="flex flex-col gap-3 glassmorphism mt-4">
        <h1 className="font-bold">Personal information</h1>
        <input name="officename" value={officename} readOnly hidden />

        <label htmlFor="firstName">First Name</label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          placeholder="Legal first name"
          required
          className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
        />
        {state?.errors?.firstName && (
          <p className="text-red-500 text-sm">{state.errors.firstName[0]}</p>
        )}
        <label htmlFor="preferredName">Preferred Name</label>
        <input
          type="text"
          id="preferredName"
          name="preferredName"
          placeholder="Name you go by"
          className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
        />
        {state?.errors?.preferredName && (
          <p className="text-red-500 text-sm">
            {state.errors.preferredName[0]}
          </p>
        )}
        <label htmlFor="lastName">Last Name</label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          placeholder="Full last name"
          required
          className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
        />
        {state?.errors?.lastName && (
          <p className="text-red-500 text-sm">{state.errors.lastName[0]}</p>
        )}
        <label htmlFor="pronouns">Pronouns</label>
        <select
          id="pronouns"
          name="pronouns"
          defaultValue={""}
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
        {state?.errors?.pronouns && (
          <p className="text-red-500 text-sm">{state.errors.pronouns[0]}</p>
        )}
        <label htmlFor="phoneNumber">Phone Number</label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          placeholder="123-456-7890"
          required
          className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
        />
        {state?.errors?.phoneNumber && (
          <p className="text-red-500 text-sm">{state.errors.phoneNumber[0]}</p>
        )}
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
        {state?.errors?.email && (
          <p className="text-red-500 text-sm">{state.errors.email[0]}</p>
        )}
        <label htmlFor="password">Password</label>
        <div className="flex items-center">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            placeholder="8 characters minimum"
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
        {state?.errors?.password && (
          <p className="text-red-500 text-sm">{state.errors.password[0]}</p>
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
        {state?.errors?.confirmPassword && (
          <p className="text-red-500 text-sm">
            {state.errors.confirmPassword[0]}
          </p>
        )}
        <h2 className="mt-4 text-bold">
          <Link href="/auth/sign-in">
            Already have an account? Click here to sign in.
          </Link>
        </h2>
        {state?.message && (
          <p className="text-red-500 text-lg text-bold">{state.message}</p>
        )}
        <SignUpButton />
      </div>
    </form>
  );
};

export default AuthForm;
