"use client";

import React, { useState } from "react";
import { registerNewPatient } from "@/app/_actions";
import { useFormState, useFormStatus } from "react-dom";

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
      className="bg-authForms p-4 rounded-md mt-6 w-full lg:w-2/5 mx-auto"
    >
      <h1 className="text-2xl font-bold">Register to Book a Massage</h1>
      <div className="flex flex-col gap-3 glassmorphism mt-4">
        <h1>Personal information</h1>
        <label htmlFor="firstName">First Name</label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          placeholder="Legal first name"
          required
        />
        <label htmlFor="preferredName">Preferred Name</label>
        <input
          type="text"
          id="preferredName"
          name="preferredName"
          placeholder="Name you go by"
        />
        <label htmlFor="lastName">Last Name</label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          placeholder="Full last name"
          required
        />
        <label htmlFor="pronouns">Pronouns</label>
        <select id="pronouns" name="pronouns" defaultValue={""} required>
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
        />
        <h1>Login information</h1>
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Will be used as login"
          required
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
            className="block mr-2 flex-grow"
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
            className="block mr-2 flex-grow"
          />
          <button
            type="button"
            onClick={toggleConfirmPasswordVisibility}
            className="ml-2"
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
        {/* <div>
          <input type="checkbox" name="newToBeach" id="newToBeach" />
          <label className="ml-2" htmlFor="newToBeach">
            I'm new to beach volleyball
          </label>
        </div> */}
        <p className="text-red-500 text-lg text-bold">{state?.message}</p>
        <SubmitButton />
      </div>
    </form>
  );
};

export default SignupForm;
