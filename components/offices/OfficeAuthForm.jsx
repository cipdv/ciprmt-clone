"use client";

import { login, registerNewPatient } from "@/app/_actions";
import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";

const initialSignInState = {
  email: "",
  password: "",
  message: "",
};

const initialSignUpState = {
  errors: {},
  message: "",
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

const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [signInState, signInFormAction] = useFormState(
    login,
    initialSignInState
  );
  const [signUpState, signUpFormAction] = useFormState(
    registerNewPatient,
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
    <div className="bg-authForms p-4 rounded-md mt-6 w-full lg:w-2/5 mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <div className="border-b border-black my-6">
        <form action={signInFormAction} className="space-y-4 mb-10">
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
          />
          <div className="flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              required
              className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="ml-2 transform transition-transform duration-300 hover:scale-110"
            >
              <img
                src={
                  showPassword
                    ? "/images/icons8-hide-16.png"
                    : "/images/icons8-eye-16.png"
                }
                alt={showPassword ? "Hide password" : "Show password"}
              />
            </button>
          </div>
          {signInState.message && (
            <p className="text-red-500 text-lg font-bold">
              {signInState.message}
            </p>
          )}
          <SignInButton />
          <p className="mt-4 text-gray-600">
            <a href="/password-reset" className="hover:text-gray-800">
              Forgot your password? Click here.
            </a>
          </p>
        </form>
      </div>
      <div>
        <h1 className="text-2xl font-bold mb-4">First Time Here? Sign-up:</h1>

        <form action={signUpFormAction} className="space-y-4 mt-10">
          <div className="flex flex-col gap-3">
            <h2 className="font-bold">Personal information</h2>
            <input
              type="text"
              name="firstName"
              placeholder="Legal first name"
              required
              className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
            />
            <input
              type="text"
              name="preferredName"
              placeholder="Preferred name"
              className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
            />
            <input
              type="text"
              name="lastName"
              placeholder="Full last name"
              required
              className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
            />
            <select
              name="pronouns"
              defaultValue=""
              className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
            >
              <option value="" disabled>
                Select pronouns
              </option>
              <option value="they/them">They/them</option>
              <option value="she/her">She/her</option>
              <option value="he/him">He/him</option>
              <option value="other">Other</option>
            </select>
            <input
              type="tel"
              name="phoneNumber"
              placeholder="Phone number (123-456-7890)"
              required
              className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
            />

            <h2 className="font-bold mt-4">Login information</h2>
            <input
              type="email"
              name="email"
              placeholder="Email (will be used as login)"
              required
              className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
            />
            <div className="flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password (8 characters minimum)"
                required
                className="w-2/3 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="ml-2 transform transition-transform duration-300 hover:scale-110"
              >
                <img
                  src={
                    showPassword
                      ? "/images/icons8-hide-16.png"
                      : "/images/icons8-eye-16.png"
                  }
                  alt={showPassword ? "Hide password" : "Show password"}
                />
              </button>
            </div>
            <div className="flex items-center">
              <input
                type={showConfirmPassword ? "text" : "password"}
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
                <img
                  src={
                    showConfirmPassword
                      ? "/images/icons8-hide-16.png"
                      : "/images/icons8-eye-16.png"
                  }
                  alt={showConfirmPassword ? "Hide password" : "Show password"}
                />
              </button>
            </div>
          </div>
          {signUpState.message && (
            <p className="text-red-500 text-lg font-bold">
              {signUpState.message}
            </p>
          )}
          <SignUpButton />
        </form>
      </div>
    </div>
  );
};

export default AuthForm;
