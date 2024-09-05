import { z } from "zod";

//////////////////////////////////////////////////////////
//////////////////////AUTH////////////////////////////////
//////////////////////////////////////////////////////////

export const loginSchema = z.object({
  email: z.string().email().min(1, "Email is required"),
  password: z.string().min(6, "Password is required"),
});

export const registerPatientSchema = z.object({
  email: z.string().email().min(1, "Email is required"),
  password: z.string().min(8, "Password is too short"),
  confirmPassword: z.string().min(6, "Password is too short"),
  firstName: z.string().min(2, "Full first name is required"),
  lastName: z.string().min(2, "Full last name is required"),
  preferredName: z.string(),
  phone: z.string().min(10, "Full phone number is required"),
  pronouns: z.string().min(1),
});

export const registerRMTSchema = z.object({
  email: z.string().email().min(1, "Email is required"),
  password: z.string().min(6, "Password is too short"),
  confirmPassword: z.string().min(6, "Password is too short"),
  firstName: z.string().min(2, "Full first name is required"),
  lastName: z.string().min(2, "Full last name is required"),
  phone: z.string().min(10, "Full phone number is required"),
  pronouns: z.string().min(1),
});
