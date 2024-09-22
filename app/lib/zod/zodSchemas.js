import * as z from "zod";

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

export const healthHistorySchema = z.object({
  occupation: z.string().min(1, { message: "Occupation is required" }),
  pronouns: z.enum(["they/them", "she/her", "he/him", "other"], {
    errorMap: () => ({ message: "Please select your pronouns" }),
  }),
  dateOfBirth: z.string().min(1, { message: "Date of birth is required" }),
  phoneNumber: z
    .string()
    .min(10, { message: "Please enter a valid phone number" }),
  address: z.object({
    streetNumber: z.string().min(1, { message: "Street number is required" }),
    streetName: z.string().min(1, { message: "Street name is required" }),
    city: z.string().min(1, { message: "City is required" }),
    province: z.string().min(1, { message: "Province is required" }),
  }),
  doctor: z.object({
    noDoctor: z.boolean(),
    doctorName: z.string().optional(),
    doctorAddress: z
      .object({
        doctorStreetNumber: z.string().optional(),
        doctorStreetName: z.string().optional(),
        doctorCity: z.string().optional(),
        doctorProvince: z.string().optional(),
      })
      .optional(),
  }),
  generalHealth: z
    .string()
    .min(1, { message: "Please describe your general health" }),
  historyOfMassage: z
    .string()
    .min(1, { message: "Please provide your history with massage therapy" }),
  otherHCP: z.string().optional(),
  injuries: z.string().optional(),
  surgeries: z.string().optional(),
  medicalConditions: z.object({
    epilepsy: z.boolean(),
    diabetes: z.boolean(),
    cancer: z.boolean(),
    arthritis: z.boolean(),
    arthritisFamilyHistory: z.boolean(),
    chronicHeadaches: z.boolean(),
    migraineHeadaches: z.boolean(),
    visionLoss: z.boolean(),
    hearingLoss: z.boolean(),
    osteoporosis: z.boolean(),
    haemophilia: z.boolean(),
  }),
  cardiovascularConditions: z.object({
    highBloodPressure: z.boolean(),
    lowBloodPressure: z.boolean(),
    heartAttack: z.boolean(),
    stroke: z.boolean(),
    vericoseVeins: z.boolean(),
    pacemaker: z.boolean(),
    heartDisease: z.boolean(),
  }),
  respiratoryConditions: z.object({
    chronicCough: z.boolean(),
    bronchitis: z.boolean(),
    asthma: z.boolean(),
    emphysema: z.boolean(),
  }),
  internalEquipment: z.string().optional(),
  skinConditions: z.string().optional(),
  infectiousConditions: z.string().optional(),
  lossOfFeeling: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  pregnant: z.enum(["yes", "no", "na"], {
    errorMap: () => ({
      message: "Please select an option for pregnancy status",
    }),
  }),
  otherMedicalConditions: z.string().optional(),
  sourceOfReferral: z.string().optional(),
  privacyPolicy: z.boolean().refine((val) => val === true, {
    message: "You must agree to the privacy policy",
  }),
});
