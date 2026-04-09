"use client";

import { useState, useEffect } from "react";
import { registerNewPatient } from "@/app/_actions";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

const initialState = {
  errors: {},
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-disabled={pending}
      className="w-full sm:w-auto px-6 py-2 bg-[#c2d5bf] text-[#1a2b1a] border border-[#93ad90] rounded-md hover:bg-[#e8efe4] hover:border-[#9caf97] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#b7c7b0] focus:ring-offset-2 disabled:opacity-60"
    >
      {pending ? "Submitting..." : "Sign up"}
    </button>
  );
}

const SignupForm = ({ showSignInLink = true }) => {
  const [state, formAction] = useActionState(registerNewPatient, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    preferredName: "",
    phoneNumber: "",
    pronouns: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success && state.redirectUrl) {
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const hasFieldError = (fieldName) => Boolean(state.errors?.[fieldName]?.length);
  const getInputClassName = (fieldName) =>
    `w-full p-2 border rounded-md focus:ring-[#b7c7b0] focus:border-[#80947a] hover:bg-[#e8efe4] transition-colors ${
      hasFieldError(fieldName)
        ? "border-red-500 bg-[#fff5f5]"
        : "border-[#b7c7b0] bg-[#f4f7f2]"
    }`;

  return (
    <form
      action={formAction}
      className="bg-[#f4f7f2] border border-[#b7c7b0] p-6 rounded-xl mt-4 w-full max-w-3xl mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold">Register to Book a Massage</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            placeholder="Legal first name"
            required
            value={formValues.firstName}
            onChange={handleChange}
            className={getInputClassName("firstName")}
          />
          {state.errors?.firstName && (
            <p className="text-red-500 text-sm">{state.errors.firstName[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            placeholder="Full last name"
            required
            value={formValues.lastName}
            onChange={handleChange}
            className={getInputClassName("lastName")}
          />
          {state.errors?.lastName && (
            <p className="text-red-500 text-sm">{state.errors.lastName[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="preferredName" className="text-sm font-medium text-gray-700">
            Preferred Name
          </label>
          <input
            type="text"
            id="preferredName"
            name="preferredName"
            placeholder="Name you go by"
            value={formValues.preferredName}
            onChange={handleChange}
            className={getInputClassName("preferredName")}
          />
          {state.errors?.preferredName && (
            <p className="text-red-500 text-sm">
              {state.errors.preferredName[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            placeholder="123-456-7890"
            required
            value={formValues.phoneNumber}
            onChange={handleChange}
            className={getInputClassName("phoneNumber")}
          />
          {state.errors?.phoneNumber && (
            <p className="text-red-500 text-sm">{state.errors.phoneNumber[0]}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="pronouns" className="text-sm font-medium text-gray-700">
            Pronouns
          </label>
          <select
            id="pronouns"
            name="pronouns"
            value={formValues.pronouns}
            onChange={handleChange}
            className={getInputClassName("pronouns")}
          >
            <option value="" disabled="disabled">
              Select
            </option>
            <option value="they/them">They/them</option>
            <option value="she/her">She/her</option>
            <option value="he/him">He/him</option>
            <option value="other">Other</option>
          </select>
          {state.errors?.pronouns && (
            <p className="text-red-500 text-sm">{state.errors.pronouns[0]}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <h2 className="font-semibold pt-2">Login information</h2>
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Will be used as login"
            required
            value={formValues.email}
            onChange={handleChange}
            className={getInputClassName("email")}
          />
          {state.errors?.email && (
            <p className="text-red-500 text-sm">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="flex items-center gap-2">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              placeholder="8 characters minimum"
              required
              value={formValues.password}
              onChange={handleChange}
              className={getInputClassName("password")}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="shrink-0 p-2 rounded-md border border-[#b7c7b0] bg-[#f4f7f2] hover:bg-[#e8efe4] transition-colors"
            >
              {showPassword ? (
                <img src="/images/icons8-hide-16.png" alt="Hide password" />
              ) : (
                <img src="/images/icons8-eye-16.png" alt="Show password" />
              )}
            </button>
          </div>
          {state.errors?.password && (
            <p className="text-red-500 text-sm">{state.errors.password[0]}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <div className="flex items-center gap-2">
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm password"
              required
              value={formValues.confirmPassword}
              onChange={handleChange}
              className={getInputClassName("confirmPassword")}
            />
            <button
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              className="shrink-0 p-2 rounded-md border border-[#b7c7b0] bg-[#f4f7f2] hover:bg-[#e8efe4] transition-colors"
            >
              {showConfirmPassword ? (
                <img src="/images/icons8-hide-16.png" alt="Hide password" />
              ) : (
                <img src="/images/icons8-eye-16.png" alt="Show password" />
              )}
            </button>
          </div>
          {state.errors?.confirmPassword && (
            <p className="text-red-500 text-sm">
              {state.errors.confirmPassword[0]}
            </p>
          )}
        </div>

        <label className="hidden" htmlFor="company">
          Company
        </label>
        <input
          type="text"
          id="company"
          name="company"
          tabIndex="-1"
          autoComplete="off"
          className="hidden"
        />

        {showSignInLink && (
          <h2 className="text-bold md:col-span-2">
            <Link href="/auth/sign-in">
              Already have an account? Click here to sign in.
            </Link>
          </h2>
        )}
        {state.message && (
          <p
            className={`text-lg text-bold md:col-span-2 ${
              state.success ? "text-green-600" : "text-red-500"
            }`}
          >
            {state.message}
          </p>
        )}
        <div className="md:col-span-2">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
};

export default SignupForm;
