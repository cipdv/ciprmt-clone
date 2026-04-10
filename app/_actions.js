"use server";

// External libraries
import { z } from "zod";
import { encryptData, decryptData } from "@/app/lib/security/security";
import { logAuditEvent } from "@/app/lib/auditLog/auditLog";
import { checkRateLimit } from "@/app/lib/security/rate-limit";
import { getClientIp } from "@/app/lib/auditLog/getClientIp";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { google } from "googleapis";
import { createHash, randomBytes } from "crypto";
import he from "he";
import Stripe from "stripe";

//helpers
import { formatDateForDisplay, formatTimeForDisplay } from "./lib/date-utils";
import {
  getConsentFormReminderEmail,
  getStandardReminderEmail,
} from "./lib/email-templates";

// Next.js specific imports
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

// Database connection
import { sql } from "@vercel/postgres";

// Nodemailer transporter
import { getEmailTransporter } from "./lib/transporter/nodemailer";

// Zod schemas
import {
  registerPatientSchema,
  loginSchema,
  healthHistorySchema,
} from "./lib/zod/zodSchemas";

// Set up JWT
const secretKey = process.env.JWT_SECRET_KEY;
const key = new TextEncoder().encode(secretKey);

// Set up Google Calendar API
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const GOOGLE_PRIVATE_KEY_RAW = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY_RAW
  ? process.env.NODE_ENV === "production"
    ? GOOGLE_PRIVATE_KEY_RAW.replace(/\\n/g, "\n")
    : GOOGLE_PRIVATE_KEY_RAW
  : "";
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PROJECT_NUMBER = process.env.GOOGLE_PROJECT_NUMBER;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const jwtClient = new google.auth.JWT(
  GOOGLE_CLIENT_EMAIL,
  null,
  GOOGLE_PRIVATE_KEY,
  SCOPES,
);

const calendar = google.calendar({
  version: "v3",
  auth: jwtClient,
});

function normalizePhoneToDigits(phoneNumber) {
  if (typeof phoneNumber !== "string") return "";
  return phoneNumber.replace(/\D/g, "");
}

function isLikelyEncryptedPayload(value) {
  if (typeof value !== "string") return false;
  const parts = value.split(":");
  if (parts.length !== 2) return false;
  const [ivHex, encryptedHex] = parts;
  return (
    /^[a-f0-9]+$/i.test(ivHex) &&
    /^[a-f0-9]+$/i.test(encryptedHex) &&
    ivHex.length === 32 &&
    encryptedHex.length >= 32 &&
    encryptedHex.length % 2 === 0
  );
}

function parseStoredTreatmentNotes(storedNotes) {
  if (!storedNotes) return null;

  if (isLikelyEncryptedPayload(storedNotes)) {
    try {
      const decrypted = decryptData(storedNotes);
      if (decrypted) return decrypted;
    } catch (error) {
      console.error("Error decrypting stored treatment notes:", error);
    }
  }

  // Backward compatibility for older rows saved as plain JSON/text.
  if (typeof storedNotes === "string") {
    const trimmed = storedNotes.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return null;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//AUTH/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function encrypt(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key);
}

export async function decrypt(input) {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload;
}

async function checkAuth() {
  const session = await getSession();
  if (!session || !session.resultObj?.id) {
    throw new Error("Unauthorized");
  }
  return session.resultObj.id;
}

export const getCurrentMember = async () => {
  const session = await getSession();
  if (session) {
    const { rows } = await sql`
      SELECT
        id,
        mongodb_id,
        first_name,
        last_name,
        email,
        phone_number,
        user_type,
        rmt_id,
        created_at,
      FROM users
      WHERE id = ${session.resultObj.id}
    `;

    return rows[0] || null;
  }
  return null;
};

const DEFAULT_RMT_ID = "508bfc5d-cc5a-4efe-a86d-c46336ccefd0";
const DEFAULT_RMT_LOCATION_ID = "ea5fbe60-7d3c-44ff-9307-b97ea3bc10f9";

export async function registerNewPatient(prevState, formData) {
  try {
    // Get form values directly without destructuring
    const data = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      preferredName: formData.get("preferredName"),
      phoneNumber: formData.get("phoneNumber"),
      pronouns: formData.get("pronouns"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    };

    const honeypot = formData.get("company");
    if (honeypot) {
      return {
        message: "Registration failed. Please try again.",
        errors: {
          form: ["Registration failed. Please try again."],
        },
      };
    }

    const clientIp = await getClientIp();
    await checkRateLimit(clientIp, "registerNewPatient", 5, 60);

    // Validate without destructuring
    const validation = registerPatientSchema.safeParse(data);

    if (!validation.success) {
      return {
        message:
          "Failed to register: make sure all required fields are completed and try again",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const validatedData = validation.data;
    const normalizedPhoneNumber = normalizePhoneToDigits(
      validatedData.phoneNumber || "",
    );

    // Check for existing user - FIX: access the rows property
    const { rows: existingUsers } = await sql`
      SELECT id FROM users WHERE email = ${validatedData.email}
    `;

    if (existingUsers.length > 0) {
      return {
        message: "Email already registered",
        errors: {
          email: ["This email is already registered"],
        },
      };
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const { rows: insertResult } = await sql`
      INSERT INTO users (
        first_name,
        last_name,
        preferred_name,
        pronouns,
        email,
        phone_number,
        password,
        user_type,
        rmt_id,
        can_book_at_ids
      ) VALUES (
        ${validatedData.firstName},
        ${validatedData.lastName},
        ${validatedData.preferredName || null},
        ${validatedData.pronouns || null},
        ${validatedData.email},
        ${normalizedPhoneNumber || null},
        ${hashedPassword},
        'patient',
        ${DEFAULT_RMT_ID}::uuid,
        '{}'::text[]
      )
      RETURNING *
    `;

    if (!insertResult || insertResult.length === 0) {
      throw new Error("Failed to create user");
    }

    const newUser = insertResult[0];

    await sql`
      INSERT INTO user_rmt_locations (user_id, rmt_location_id, is_primary)
      VALUES (${newUser.id}, ${DEFAULT_RMT_LOCATION_ID}::uuid, true)
    `;

    const expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    const resultObj = {
      id: newUser.id,
      mongodbId: newUser.mongodb_id,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      email: newUser.email,
      phoneNumber: newUser.phone_number,
      userType: newUser.user_type,
      rmtId: newUser.rmt_id,
      createdAt: newUser.created_at,
      lastHealthHistoryUpdate: null,
    };

    const session = await encrypt({ resultObj, expires });

    const cookieStore = await cookies();
    cookieStore.set("session", session, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // Send email notification
    try {
      const transporter = getEmailTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: "New Patient Registration",
        text: `A new patient has registered: ${validatedData.firstName} ${validatedData.lastName} (${validatedData.email})`,
        html: `
          <h1>New Patient Registration</h1>
          <p>A new patient has registered with the following details:</p>
          <ul>
            <li>Name: ${validatedData.firstName} ${validatedData.lastName}</li>
            <li>Preferred Name: ${
              validatedData.preferredName || "Not specified"
            }</li>
            <li>Pronouns: ${validatedData.pronouns || "Not specified"}</li>
            <li>Email: ${validatedData.email}</li>
            <li>Phone: ${normalizedPhoneNumber || "Not specified"}</li>
          </ul>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
    }

    revalidatePath("/");

    return {
      success: true,
      redirectUrl: "/dashboard",
    };
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "23505" && error.constraint === "users_email_key") {
      return {
        message: "Email already registered",
        errors: {
          email: ["This email is already registered"],
        },
      };
    }

    if (error.message?.includes("Rate limit exceeded")) {
      return {
        message: "Too many attempts. Please try again shortly.",
        errors: {
          form: ["Too many attempts. Please try again shortly."],
        },
      };
    }

    if (error.message?.includes("Turnstile")) {
      return {
        message: "Verification failed. Please try again.",
        errors: {
          form: ["Verification failed. Please try again."],
        },
      };
    }

    return {
      message: "An error occurred during registration. Please try again.",
      errors: {
        form: ["Registration failed. Please try again."],
      },
    };
  }
}

// Helper functions for managing RMT locations
export async function getUserRmtLocations(userId) {
  const { rows } = await sql`
    SELECT
      rl.*,
      url.is_primary
    FROM rmt_locations rl
    JOIN user_rmt_locations url ON rl.id = url.rmt_location_id
    WHERE url.user_id = ${userId}
    ORDER BY url.is_primary DESC, rl.formatted_form_data->>'address'->>'locationName'
  `;
  return rows;
}

export async function addUserRmtLocation(
  userId,
  locationId,
  isPrimary = false,
) {
  await sql`
    INSERT INTO user_rmt_locations (user_id, rmt_location_id, is_primary)
    VALUES (${userId}, ${locationId}, ${isPrimary})
    ON CONFLICT (user_id, rmt_location_id)
    DO UPDATE SET is_primary = ${isPrimary}
  `;
}

export async function removeUserRmtLocation(userId, locationId) {
  await sql`
    DELETE FROM user_rmt_locations
    WHERE user_id = ${userId}
    AND rmt_location_id = ${locationId}
    AND NOT is_primary
  `;
}

export async function login(prevState, formData) {
  const formDataObj = Object.fromEntries(formData.entries());
  formDataObj.rememberMe = formDataObj.rememberMe === "on";
  formDataObj.email = formDataObj.email.toLowerCase().trim();

  const { success, data, error } = loginSchema.safeParse(formDataObj);

  if (!success) {
    return { message: error.message };
  }

  const user = data;

  // Query user
  const { rows } = await sql`
    SELECT * FROM users WHERE email = ${user.email}
  `;

  if (rows.length === 0) {
    return { message: "Invalid credentials" };
  }

  const result = rows[0];

  const passwordsMatch = await bcrypt.compare(user.password, result.password);
  if (!passwordsMatch) {
    return { message: "Invalid credentials" };
  }

  // Transform the data to match the expected structure
  const resultObj = {
    id: result.id,
    mongodbId: result.mongodb_id,
    firstName: result.first_name,
    lastName: result.last_name,
    email: result.email,
    phoneNumber: result.phone_number,
    userType: result.user_type,
    rmtId: result.rmt_id,
    createdAt: result.created_at,
    lastHealthHistoryUpdate: result.last_health_history_update,
    dns_count: result.dns_count,
  };

  const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const session = await encrypt({ resultObj });

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  revalidatePath("/");

  const dashboardPath =
    resultObj.userType === "rmt" ? "/dashboard/rmt" : "/dashboard/patient";

  redirect(dashboardPath);
}

export async function loginForBookingModal({ email, password }) {
  try {
    const formDataObj = {
      email: (email || "").toLowerCase().trim(),
      password: password || "",
      rememberMe: false,
    };

    const { success, data } = loginSchema.safeParse(formDataObj);
    if (!success) {
      return { success: false, message: "Invalid credentials." };
    }

    const { rows } = await sql`
      SELECT * FROM users WHERE email = ${data.email}
    `;

    if (rows.length === 0) {
      return { success: false, message: "Invalid credentials." };
    }

    const result = rows[0];
    const passwordsMatch = await bcrypt.compare(data.password, result.password);
    if (!passwordsMatch) {
      return { success: false, message: "Invalid credentials." };
    }

    const resultObj = {
      id: result.id,
      mongodbId: result.mongodb_id,
      firstName: result.first_name,
      lastName: result.last_name,
      email: result.email,
      phoneNumber: result.phone_number,
      userType: result.user_type,
      rmtId: result.rmt_id,
      createdAt: result.created_at,
      lastHealthHistoryUpdate: result.last_health_history_update,
      dns_count: result.dns_count,
    };

    if (resultObj.userType !== "patient") {
      return {
        success: false,
        message: "Please sign in with a patient account to book online.",
      };
    }

    const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const session = await encrypt({ resultObj });

    const cookieStore = await cookies();
    cookieStore.set("session", session, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error in loginForBookingModal:", error);
    return {
      success: false,
      message: "Unable to sign in right now. Please try again.",
    };
  }
}

export async function registerPatientForBookingModal(payload) {
  try {
    const data = {
      firstName: payload?.firstName || "",
      lastName: payload?.lastName || "",
      preferredName: payload?.preferredName || "",
      phoneNumber: payload?.phoneNumber || "",
      pronouns: payload?.pronouns || "",
      email: payload?.email || "",
      password: payload?.password || "",
      confirmPassword: payload?.confirmPassword || "",
    };

    const validation = registerPatientSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        message: "Please fix the highlighted fields.",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const validatedData = validation.data;
    const normalizedPhoneNumber = normalizePhoneToDigits(
      validatedData.phoneNumber || "",
    );

    const { rows: existingUsers } = await sql`
      SELECT id FROM users WHERE email = ${validatedData.email}
    `;

    if (existingUsers.length > 0) {
      return {
        success: false,
        message: "Email already registered.",
        errors: { email: ["This email is already registered"] },
      };
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const { rows: insertResult } = await sql`
      INSERT INTO users (
        first_name,
        last_name,
        preferred_name,
        pronouns,
        email,
        phone_number,
        password,
        user_type,
        rmt_id,
        can_book_at_ids
      ) VALUES (
        ${validatedData.firstName},
        ${validatedData.lastName},
        ${validatedData.preferredName || null},
        ${validatedData.pronouns || null},
        ${validatedData.email},
        ${normalizedPhoneNumber || null},
        ${hashedPassword},
        'patient',
        ${DEFAULT_RMT_ID}::uuid,
        '{}'::text[]
      )
      RETURNING *
    `;

    if (!insertResult || insertResult.length === 0) {
      return {
        success: false,
        message: "Failed to create account. Please try again.",
      };
    }

    const newUser = insertResult[0];

    await sql`
      INSERT INTO user_rmt_locations (user_id, rmt_location_id, is_primary)
      VALUES (${newUser.id}, ${DEFAULT_RMT_LOCATION_ID}::uuid, true)
    `;

    const expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    const resultObj = {
      id: newUser.id,
      mongodbId: newUser.mongodb_id,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      email: newUser.email,
      phoneNumber: newUser.phone_number,
      userType: newUser.user_type,
      rmtId: newUser.rmt_id,
      createdAt: newUser.created_at,
      lastHealthHistoryUpdate: null,
    };

    const session = await encrypt({ resultObj, expires });
    const cookieStore = await cookies();
    cookieStore.set("session", session, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error in registerPatientForBookingModal:", error);
    return {
      success: false,
      message: "Unable to create account right now. Please try again.",
    };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set("session", "", { expires: new Date(0) });
  revalidatePath("/");
  redirect("/auth/sign-in");
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function updateSession(request) {
  const session = request.cookies.get("session")?.value;
  if (!session) return;

  const parsed = await decrypt(session);
  parsed.expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
  const res = NextResponse.next();

  res.cookies.set({
    name: "session",
    value: await encrypt(parsed),
    httpOnly: true,
    expires: parsed.expires,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return res;
}

export const getJwtSecretKey = async () => {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret) {
    throw new Error("JWT_SECRET_KEY is not defined");
  }
  return secret;
};

export const verifyAuth = async (token) => {
  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(getJwtSecretKey()),
    );
    return verified.payload;
  } catch (error) {
    throw new Error("Invalid token");
  }
};

export async function submitScheduleSetup(prevState, formData) {
  return;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//DASHBOARD FUNCTIONS//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function getAllUsers() {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can view users");
    }

    // Query all users from the PostgreSQL database
    const { rows: users } = await sql`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        dns_count,
        created_at,
        updated_at
      FROM users
      ORDER BY last_name, first_name
    `;

    return users;
  } catch (error) {
    console.error("Error fetching all users:", error);
    throw new Error("Failed to fetch users");
  }
}

export async function getReceipts(id) {
  try {
    // Get the current user session
    const session = await getSession();
    if (!session || !session.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    // Safely access session properties
    const userId = session.resultObj.id;
    const userType = session.resultObj.userType;
    const firstName = session.resultObj.firstName || "";
    const lastName = session.resultObj.lastName || "";
    const fullName = `${firstName} ${lastName}`;

    // Check if the user has permission to access these treatments
    const canAccess = userType === "rmt" || userId === id;

    if (!canAccess) {
      throw new Error(
        "Unauthorized: User does not have permission to access these treatments",
      );
    }

    // Determine reason for access based on user type and relationship
    let reasonForAccess = "Self-access to treatment history";
    if (userType === "rmt") {
      reasonForAccess = "Provider accessing patient treatment history";
    } else if (userId !== id) {
      reasonForAccess = "Administrative access to treatment history";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day

    // Query the database for completed treatments
    const { rows } = await sql`
      SELECT *
      FROM treatments
      WHERE client_id = ${id}
        AND status = 'completed'
        AND date <= ${today.toISOString().split("T")[0]}
      ORDER BY date DESC, appointment_begins_at DESC
    `;

    // Get patient name for the log (if different from current user)
    let patientName = fullName;
    if (userId !== id) {
      try {
        const { rows: userRows } = await sql`
          SELECT first_name, last_name FROM users WHERE id = ${id}
        `;
        if (userRows.length > 0) {
          patientName = `${userRows[0].first_name} ${userRows[0].last_name}`;
        }
      } catch (nameError) {
        console.error("Error fetching patient name:", nameError);
      }
    }

    // Log the audit event - wrapped in try/catch
    try {
      await logAuditEvent({
        typeOfInfo: "treatment receipts",
        actionPerformed: "viewed",
        accessedById: userId,
        whoseInfoId: id,
        reasonForAccess,
        additionalDetails: {
          accessedByUserType: userType,
          accessedByName: fullName,
          whoseInfoName: patientName,
          numberOfTreatments: rows.length,
          dateRange: `Up to ${today.toISOString().split("T")[0]}`,
          accessMethod: "web application",
        },
      });
    } catch (logError) {
      console.error("Error logging audit event:", logError);
    }

    // Process the results to match the expected format
    const treatments = rows.map((treatment) => ({
      ...treatment,
      // Add any additional transformations needed for consistency with the frontend
      type: "treatment",
      // If your frontend expects MongoDB-style _id, you can map it
      _id: treatment.mongodb_id || treatment.id,
    }));

    return treatments;
  } catch (error) {
    console.error("Error fetching completed treatments:", error);
    throw new Error("Failed to fetch completed treatments");
  }
}

export async function getReceiptById(id) {
  try {
    // Get the current user session for authorization
    const session = await getSession();
    if (!session || !session.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    // Safely access session properties
    const userId = session.resultObj.id;
    const userType = session.resultObj.userType;
    const firstName = session.resultObj.firstName || "";
    const lastName = session.resultObj.lastName || "";
    const fullName = `${firstName} ${lastName}`;

    // Query the treatments table for the record with the given ID
    // First try to find by UUID (primary key)
    let { rows } = await sql`
      SELECT * FROM treatments WHERE id = ${id}
    `;

    // If not found by UUID, try looking for it by mongodb_id (for backward compatibility)
    if (rows.length === 0) {
      const { rows: mongoRows } = await sql`
        SELECT * FROM treatments WHERE mongodb_id = ${id}
      `;
      rows = mongoRows;
    }

    if (rows.length === 0) {
      return null;
    }

    const receipt = rows[0];

    // Check if the user has permission to access this receipt
    const canAccess = userType === "rmt" || userId === receipt.client_id;

    if (!canAccess) {
      throw new Error(
        "Unauthorized: User does not have permission to access this receipt",
      );
    }

    // Determine reason for access based on user type and relationship
    let reasonForAccess = "Self-access to treatment receipt";
    if (userType === "rmt") {
      reasonForAccess = "Provider accessing patient treatment receipt";
    } else if (userId !== receipt.client_id) {
      reasonForAccess = "Administrative access to treatment receipt";
    }

    // Get patient name for the log (if different from current user)
    let patientName = fullName;
    if (userId !== receipt.client_id) {
      try {
        const { rows: userRows } = await sql`
          SELECT first_name, last_name FROM users WHERE id = ${receipt.client_id}
        `;
        if (userRows.length > 0) {
          patientName = `${userRows[0].first_name} ${userRows[0].last_name}`;
        }
      } catch (nameError) {
        console.error("Error fetching patient name:", nameError);
      }
    }

    // Log the audit event - wrapped in try/catch
    try {
      await logAuditEvent({
        typeOfInfo: "treatment receipt",
        actionPerformed: "viewed",
        accessedById: userId,
        whoseInfoId: receipt.client_id,
        reasonForAccess,
        additionalDetails: {
          accessedByUserType: userType,
          accessedByName: fullName,
          whoseInfoName: patientName,
          treatmentId: receipt.id,
          treatmentDate: receipt.date,
          treatmentType: receipt.treatment_type || "Not specified",
          accessMethod: "web application",
        },
      });
    } catch (logError) {
      console.error("Error logging audit event:", logError);
    }

    // Process the result to match the expected format
    const formattedReceipt = {
      ...receipt,
      type: "treatment",
      // Map fields for backward compatibility if needed
      _id: receipt.mongodb_id || receipt.id,
      userId: receipt.client_id,
      appointmentDate: receipt.date,
    };

    return formattedReceipt;
  } catch (error) {
    console.error("Error fetching receipt by ID:", error);
    throw new Error(`Failed to fetch receipt: ${error.message}`);
  }
}

//hasn't been updated to postgres yet
// export async function RMTSetup({
//   address,
//   contactInfo,
//   workplaceType,
//   massageServices,
//   workDays,
// }) {
//   const session = await getSession();
//   if (session.resultObj.userType !== "rmt") {
//     return {
//       message: "You must be logged in as a RMT to create a new set up.",
//     };
//   }

//   const { locationName, streetAddress, city, province, country, postalCode } =
//     address;
//   const { phone, email } = contactInfo;

//   const trimAndCapitalize = (str) =>
//     typeof str === "string" ? str.trim().toUpperCase() : "";
//   const capitalize = (str) =>
//     typeof str === "string"
//       ? str.trim().replace(/\b\w/g, (char) => char.toUpperCase())
//       : "";
//   const formatPhoneNumber = (phone) => {
//     const cleaned =
//       typeof phone === "string" ? phone.trim().replace(/\D/g, "") : "";
//     const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
//     if (match) {
//       return `${match[1]}-${match[2]}-${match[3]}`;
//     }
//     return phone;
//   };

//   const formattedPhone = formatPhoneNumber(phone);
//   const formattedEmail =
//     typeof email === "string" ? email.trim().toLowerCase() : "";

//   const formattedFormData = {
//     address: {
//       locationName: capitalize(locationName),
//       streetAddress:
//         typeof streetAddress === "string" ? streetAddress.trim() : "",
//       city: capitalize(city),
//       province: capitalize(province),
//       country: capitalize(country),
//       postalCode: trimAndCapitalize(postalCode),
//     },
//     contactInfo: {
//       phone: formattedPhone,
//       email: formattedEmail,
//     },
//     workDays,
//     workplaceType,
//     massageServices,
//   };

//   const { _id } = session.resultObj;
//   const db = await getDatabase();

//   const setup = {
//     userId: _id,
//     formattedFormData,
//   };

//   try {
//     const result = await db.collection("rmtLocations").insertOne(setup);
//     if (result.acknowledged) {
//       console.log("Document inserted with _id:", result.insertedId);

//       const appointments = [];
//       const today = new Date();
//       const daysOfWeek = [
//         "Sunday",
//         "Monday",
//         "Tuesday",
//         "Wednesday",
//         "Thursday",
//         "Friday",
//         "Saturday",
//       ];

//       for (const workDay of workDays) {
//         const dayIndex = daysOfWeek.indexOf(workDay.day);
//         for (let i = 0; i < 8; i++) {
//           const appointmentDate = new Date(today);
//           const daysUntilNextWorkday = (dayIndex - today.getDay() + 7) % 7;
//           appointmentDate.setDate(
//             today.getDate() + daysUntilNextWorkday + i * 7
//           );
//           for (const timeSlot of workDay.appointmentTimes) {
//             const expiryDate = new Date(appointmentDate);
//             expiryDate.setDate(expiryDate.getDate() + 7);

//             appointments.push({
//               RMTId: new ObjectId(session.resultObj._id),
//               RMTLocationId: result.insertedId,
//               appointmentDate: appointmentDate.toISOString().split("T")[0],
//               appointmentStartTime: timeSlot.start,
//               appointmentEndTime: timeSlot.end,
//               status: "available",
//               expiryDate: expiryDate,
//             });
//           }
//         }
//       }

//       const appointmentResult = await db
//         .collection("appointments")
//         .insertMany(appointments);
//       if (appointmentResult.acknowledged) {
//         console.log("Appointments inserted:", appointmentResult.insertedCount);

//         await db.collection("appointments").createIndex(
//           { expiryDate: 1 },
//           {
//             expireAfterSeconds: 0,
//             partialFilterExpression: { status: "available" },
//           }
//         );
//       } else {
//         console.error("Failed to insert appointments.");
//       }
//     } else {
//       console.error("Failed to insert the document.");
//     }
//   } catch (error) {
//     console.error("An error occurred while inserting the document:", error);
//   }

//   return;
// }

// export async function RMTIrregularSetup(formData) {
//   const session = await getSession();
//   if (session.resultObj.userType !== "rmt") {
//     return {
//       success: false,
//       message: "You must be logged in as a RMT to create a new set up.",
//     };
//   }

//   const { address, contactInfo, workDays, massageServices, locationDetails } =
//     formData;

//   const trimAndCapitalize = (str) =>
//     typeof str === "string" ? str.trim().toUpperCase() : "";
//   const capitalize = (str) =>
//     typeof str === "string"
//       ? str.trim().replace(/\b\w/g, (char) => char.toUpperCase())
//       : "";
//   const formatPhoneNumber = (phone) => {
//     const cleaned =
//       typeof phone === "string" ? phone.trim().replace(/\D/g, "") : "";
//     const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
//     if (match) {
//       return `${match[1]}-${match[2]}-${match[3]}`;
//     }
//     return phone;
//   };

//   const formattedFormData = {
//     address: {
//       locationName: capitalize(address.locationName),
//       streetAddress: address.streetAddress.trim(),
//       city: capitalize(address.city),
//       province: capitalize(address.province),
//       country: capitalize(address.country),
//       postalCode: trimAndCapitalize(address.postalCode),
//     },
//     locationDetails: {
//       description: locationDetails.description,
//       payment: locationDetails.payment,
//       whatToWear: locationDetails.whatToWear,
//     },
//     contactInfo: {
//       phone: formatPhoneNumber(contactInfo.phone),
//       email: contactInfo.email.trim().toLowerCase(),
//     },
//     workDays,
//     massageServices,
//   };

//   const { _id } = session.resultObj;
//   const db = await getDatabase();

//   const setup = {
//     userId: _id,
//     formattedFormData: {
//       address: formattedFormData.address,
//       contactInfo: formattedFormData.contactInfo,
//       locationDetails: formattedFormData.locationDetails,
//       workDays,
//       workplaceType: "irregular",
//       massageServices,
//     },
//     URL: formattedFormData.address.locationName
//       .replace(/\s+/g, "")
//       .toLowerCase(),
//   };

//   try {
//     const result = await db.collection("rmtLocations").insertOne(setup);
//     if (result.acknowledged) {
//       console.log("Document inserted with _id:", result.insertedId);

//       const appointments = [];
//       const today = new Date();

//       for (const workDay of setup.formattedFormData.workDays) {
//         const appointmentDate = new Date(workDay.date);
//         for (const timeSlot of workDay.appointmentTimes) {
//           const expiryDate = new Date(appointmentDate);
//           expiryDate.setDate(expiryDate.getDate() + 7);

//           appointments.push({
//             RMTId: new ObjectId(session.resultObj._id),
//             RMTLocationId: result.insertedId,
//             appointmentDate: appointmentDate.toISOString().split("T")[0],
//             appointmentStartTime: timeSlot.start,
//             appointmentEndTime: timeSlot.end,
//             status: "available",
//             expiryDate: expiryDate,
//           });
//         }
//       }

//       const appointmentResult = await db
//         .collection("appointments")
//         .insertMany(appointments);
//       if (appointmentResult.acknowledged) {
//         console.log("Appointments inserted:", appointmentResult.insertedCount);

//         await db.collection("appointments").createIndex(
//           { expiryDate: 1 },
//           {
//             expireAfterSeconds: 0,
//             partialFilterExpression: { status: "available" },
//           }
//         );

//         return {
//           success: true,
//           message: "Therapist setup and appointments created successfully.",
//         };
//       } else {
//         console.error("Failed to insert appointments.");
//         return {
//           success: false,
//           message: "Failed to create appointments.",
//         };
//       }
//     } else {
//       console.error("Failed to insert the document.");
//       return {
//         success: false,
//         message: "Failed to create therapist setup.",
//       };
//     }
//   } catch (error) {
//     console.error("An error occurred while inserting the document:", error);
//     return {
//       success: false,
//       message: "An error occurred during setup.",
//     };
//   }
// }

export async function getRMTSetup(rmtId) {
  try {
    const { rows } = await sql`
      SELECT 
        id,
        mongodb_id,
        user_id,
        location_name,
        street_address,
        city,
        province,
        country,
        postal_code,
        phone,
        email,
        workplace_type,
        description,
        what_to_wear,
        payment,
        url,
        created_at
      FROM rmt_locations
      WHERE user_id = ${rmtId}
    `;

    // Map the results to include _id for backward compatibility
    const locations = rows.map((location) => ({
      ...location,
      _id: location.mongodb_id || location.id, // Use mongodb_id if available, otherwise use id
      userId: location.user_id,
      // Keep the original fields too
    }));

    return locations;
  } catch (error) {
    console.error("Error fetching RMT locations:", error);
    throw new Error("Failed to fetch RMT locations");
  }
}

export async function getDataForBookAppointmentsForm() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const userId = session.resultObj.id;

  try {
    // Get the current user with their permissions
    const { rows: userRows } = await sql`
      SELECT 
        id, 
        first_name,
        last_name,
        email,
        phone_number,
        user_type,
        can_book_at_ids,
        rmt_id,
        dns_count
      FROM users 
      WHERE id = ${userId}
    `;

    if (userRows.length === 0) {
      throw new Error("User not found");
    }

    const user = {
      resultObj: {
        _id: userRows[0].id,
        firstName: userRows[0].first_name,
        lastName: userRows[0].last_name,
        email: userRows[0].email,
        phoneNumber: userRows[0].phone_number,
        userType: userRows[0].user_type,
        rmtId: userRows[0].rmt_id,
        dnsCount: userRows[0].dns_count,
      },
    };

    // Get the locations this user can book at
    // First check if can_book_at_ids array is populated
    let canBookAtIds = [];

    if (userRows[0].can_book_at_ids && userRows[0].can_book_at_ids.length > 0) {
      // Use the array directly if it's populated
      canBookAtIds = userRows[0].can_book_at_ids;
    } else {
      // Otherwise, fetch from the junction table
      const { rows: userLocations } = await sql`
        SELECT rmt_location_id
        FROM user_rmt_locations
        WHERE user_id = ${userId}
      `;

      canBookAtIds = userLocations.map((loc) => loc.rmt_location_id);
    }

    // Add canBookAtIds to the user object
    user.resultObj.canBookAtIds = canBookAtIds;

    // Get all RMT locations with their details
    const { rows: rmtLocations } = await sql`
      SELECT 
        id,
        user_id,
        location_name,
        street_address,
        city,
        province,
        postal_code,
        country,
        workplace_type,
        description,
        what_to_wear,
        payment
      FROM rmt_locations
      WHERE user_id = ${userRows[0].rmt_id}
    `;

    // Get massage services for each location from the massage_services table
    const rmtSetup = await Promise.all(
      rmtLocations.map(async (location) => {
        // Fetch massage services for this location
        const { rows: massageServices } = await sql`
        SELECT 
          service,
          duration,
          price,
          plus_hst as "plusHst"
        FROM massage_services
        WHERE rmt_location_id = ${location.id}
        ORDER BY duration
      `;

        return {
          _id: location.id,
          formattedFormData: {
            address: {
              streetAddress: location.street_address,
              city: location.city,
              province: location.province,
              postalCode: location.postal_code,
              country: location.country,
              locationName: location.location_name || location.street_address,
            },
            massageServices: massageServices,
            workplaceType: location.workplace_type,
            description: location.description,
            whatToWear: location.what_to_wear,
            payment: location.payment,
          },
        };
      }),
    );

    return { user, rmtSetup };
  } catch (error) {
    console.error("Error fetching data for booking page:", error);
    throw error;
  }
}

export async function getDataForReschedulePage(appointmentId, userId) {
  try {
    // Get the appointment and related user data
    const { rows: appointmentData } = await sql`
      SELECT 
        t.*,
        u_client.first_name AS client_first_name,
        u_client.last_name AS client_last_name,
        u_client.email AS client_email,
        u_rmt.id AS rmt_id,
        u_rmt.first_name AS rmt_first_name,
        u_rmt.last_name AS rmt_last_name,
        u_client.can_book_at_ids  -- Get can_book_at_ids directly from the users table
      FROM 
        treatments t
      JOIN 
        users u_client ON t.client_id = u_client.id
      JOIN 
        users u_rmt ON t.rmt_id = u_rmt.id
      WHERE 
        t.id = ${appointmentId}
    `;

    if (appointmentData.length === 0) {
      throw new Error(`Appointment not found with id: ${appointmentId}`);
    }

    const appointment = appointmentData[0];
    const rmtId = appointment.rmt_id;
    const clientId = appointment.client_id;

    // Initialize canBookAtIds
    let canBookAtIds = [];

    // Check if can_book_at_ids array is populated in the appointment data
    if (appointment.can_book_at_ids && appointment.can_book_at_ids.length > 0) {
      // Use the array directly if it's populated
      canBookAtIds = appointment.can_book_at_ids;
    } else {
      // Otherwise, fetch from the junction table

      const { rows: userLocations } = await sql`
        SELECT rmt_location_id
        FROM user_rmt_locations
        WHERE user_id = ${clientId}
      `;

      canBookAtIds = userLocations.map((loc) => loc.rmt_location_id);
    }

    // If canBookAtIds is still empty, get all locations for this RMT as a fallback
    if (canBookAtIds.length === 0) {
      const { rows: allRmtLocations } = await sql`
        SELECT id
        FROM rmt_locations
        WHERE user_id = ${rmtId}
      `;

      canBookAtIds = allRmtLocations.map((loc) => loc.id);
    }

    // Get all RMT locations that the user can book at
    let locationData;

    // Use different queries based on whether canBookAtIds has values
    if (canBookAtIds.length > 0) {
      // If we have specific locations, filter by them
      const { rows } = await sql`
        SELECT 
          rl.*
        FROM 
          rmt_locations rl
        WHERE 
          rl.user_id = ${rmtId}
          AND rl.id = ANY(${canBookAtIds})
      `;
      locationData = rows;
    } else {
      // If no specific locations, get all locations for this RMT
      const { rows } = await sql`
        SELECT 
          rl.*
        FROM 
          rmt_locations rl
        WHERE 
          rl.user_id = ${rmtId}
      `;
      locationData = rows;
    }

    // Get massage services for each location individually
    const massageServicesByLocation = {};

    // Process each location one by one to avoid using IN with arrays
    for (const location of locationData) {
      const { rows: services } = await sql`
        SELECT 
          service,
          duration,
          price,
          plus_hst
        FROM 
          massage_services
        WHERE 
          rmt_location_id = ${location.id}
        ORDER BY
          duration
      `;

      // Format the services
      massageServicesByLocation[location.id] = services.map((service) => ({
        service: service.service,
        duration: service.duration.toString(),
        price: service.price.toString(),
        plusHst: service.plus_hst,
      }));
    }

    // Transform the location data to match expected format
    const formattedLocations = locationData.map((location) => {
      // Get massage services for this location or use default if none found
      const locationServices = massageServicesByLocation[location.id] || [
        {
          service: "Massage Therapy",
          duration: "60",
          price: "100",
          plusHst: true,
        },
        {
          service: "Massage Therapy",
          duration: "90",
          price: "150",
          plusHst: true,
        },
      ];

      // Create the expected structure with formattedFormData
      return {
        _id: location.id,
        id: location.id,
        formattedFormData: {
          address: {
            streetAddress: location.street_address,
            locationName: location.location_name || location.street_address,
            city: location.city,
            province: location.province,
            country: location.country,
            postalCode: location.postal_code,
          },
          massageServices: locationServices,
          // Add other expected fields
          whatToWear: location.what_to_wear,
          description: location.description,
          payment: location.payment,
        },
      };
    });

    // Format the appointment to match expected structure
    const formattedAppointment = {
      ...appointment,
      _id: appointment.id,
      appointmentDate: appointment.date,
      appointmentBeginsAt: appointment.appointment_begins_at,
      RMTLocationId: appointment.rmt_location_id,
    };

    // Return all the data needed for the page
    return {
      currentUser: {
        id: userId,
        resultObj: {
          id: userId,
          rmtId: rmtId,
          canBookAtIds: canBookAtIds,
        },
      },
      appointment: formattedAppointment,
      rmtLocations: formattedLocations,
    };
  } catch (error) {
    console.error("Error fetching data for reschedule page:", error);
    throw new Error("Failed to fetch data for reschedule page");
  }
}
// export async function getDataForReschedulePage(appointmentId, userId) {
//   try {
//     // Get the appointment and related user data
//     const { rows: appointmentData } = await sql`
//       SELECT
//         t.*,
//         u_client.first_name AS client_first_name,
//         u_client.last_name AS client_last_name,
//         u_client.email AS client_email,
//         u_rmt.id AS rmt_id,
//         u_rmt.first_name AS rmt_first_name,
//         u_rmt.last_name AS rmt_last_name,
//         u_client.can_book_at_ids  -- Get can_book_at_ids directly from the users table
//       FROM
//         treatments t
//       JOIN
//         users u_client ON t.client_id = u_client.id
//       JOIN
//         users u_rmt ON t.rmt_id = u_rmt.id
//       WHERE
//         t.id = ${appointmentId}
//     `;

//     console.log("appointment data", appointmentData);

//     if (appointmentData.length === 0) {
//       throw new Error(`Appointment not found with id: ${appointmentId}`);
//     }

//     const appointment = appointmentData[0];
//     const rmtId = appointment.rmt_id;

//     // Get can_book_at_ids directly from the appointment data
//     const canBookAtIds = appointment.can_book_at_ids || [];

//     console.log("can book at ids", canBookAtIds);

//     // Get all RMT locations that the user can book at
//     const { rows: locationData } = await sql`
//       SELECT
//         rl.*
//       FROM
//         rmt_locations rl
//       WHERE
//         rl.user_id = ${rmtId}
//         AND rl.id = ANY(${canBookAtIds})
//     `;

//     // Get massage services for each location individually
//     const massageServicesByLocation = {};

//     // Process each location one by one to avoid using IN with arrays
//     for (const location of locationData) {
//       const { rows: services } = await sql`
//         SELECT
//           service,
//           duration,
//           price,
//           plus_hst
//         FROM
//           massage_services
//         WHERE
//           rmt_location_id = ${location.id}
//         ORDER BY
//           duration
//       `;

//       // Format the services
//       massageServicesByLocation[location.id] = services.map((service) => ({
//         service: service.service,
//         duration: service.duration.toString(),
//         price: service.price.toString(),
//         plusHst: service.plus_hst,
//       }));
//     }

//     // Transform the location data to match expected format
//     const formattedLocations = locationData.map((location) => {
//       // Get massage services for this location or use default if none found
//       const locationServices = massageServicesByLocation[location.id] || [
//         {
//           service: "Massage Therapy",
//           duration: "60",
//           price: "100",
//           plusHst: true,
//         },
//         {
//           service: "Massage Therapy",
//           duration: "90",
//           price: "150",
//           plusHst: true,
//         },
//       ];

//       // Create the expected structure with formattedFormData
//       return {
//         _id: location.id,
//         id: location.id,
//         formattedFormData: {
//           address: {
//             streetAddress: location.street_address,
//             locationName: location.location_name || location.street_address,
//             city: location.city,
//             province: location.province,
//             country: location.country,
//             postalCode: location.postal_code,
//           },
//           massageServices: locationServices,
//           // Add other expected fields
//           whatToWear: location.what_to_wear,
//           description: location.description,
//           payment: location.payment,
//         },
//       };
//     });

//     // Format the appointment to match expected structure
//     const formattedAppointment = {
//       ...appointment,
//       _id: appointment.id,
//       appointmentDate: appointment.date,
//       appointmentBeginsAt: appointment.appointment_begins_at,
//       RMTLocationId: appointment.rmt_location_id,
//     };

//     // Return all the data needed for the page
//     return {
//       currentUser: {
//         id: userId,
//         resultObj: {
//           id: userId,
//           rmtId: rmtId,
//           canBookAtIds: canBookAtIds,
//         },
//       },
//       appointment: formattedAppointment,
//       rmtLocations: formattedLocations,
//     };
//   } catch (error) {
//     console.error("Error fetching data for reschedule page:", error);
//     throw new Error("Failed to fetch data for reschedule page");
//   }
// }

export async function getRMTSetupById(id) {
  try {
    const { rows } = await sql`
      SELECT * FROM rmt_locations
      WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  } catch (error) {
    console.error("Error fetching RMT setup:", error);
    throw new Error("Failed to fetch RMT setup");
  }
}

export async function getUsersAppointments(id) {
  try {
    const session = await getSession();

    if (!session || !session.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    // Safely access session properties
    const userId = session.resultObj.id;
    const userType = session.resultObj.userType;
    const firstName = session.resultObj.firstName || "";
    const lastName = session.resultObj.lastName || "";
    const fullName = `${firstName} ${lastName}`;

    // Check if the user has permission to access these appointments
    const canAccess = userType === "rmt" || userId === id;

    if (!canAccess) {
      throw new Error(
        "Unauthorized: User does not have permission to access these appointments",
      );
    }

    // Determine reason for access based on user type and relationship
    let reasonForAccess = "Self-access";
    if (userType === "rmt") {
      reasonForAccess = "Provider accessing patient data";
    } else if (userId !== id) {
      reasonForAccess = "Administrative access";
    }

    // Fetch appointments using PostgreSQL
    const { rows: treatments } = await sql`
      SELECT * FROM treatments
      WHERE client_id = ${id}
      ORDER BY date ASC, appointment_begins_at ASC
    `;

    // Get patient name for the log (if different from current user)
    let patientName = fullName;
    if (userId !== id) {
      try {
        const { rows } = await sql`
          SELECT first_name, last_name FROM users WHERE id = ${id}
        `;
        if (rows.length > 0) {
          patientName = `${rows[0].first_name} ${rows[0].last_name}`;
        }
      } catch (nameError) {
        console.error("Error fetching patient name:", nameError);
      }
    }

    // Log the audit event - wrapped in try/catch to prevent it from breaking the main function
    try {
      await logAuditEvent({
        typeOfInfo: "user treatments",
        actionPerformed: "viewed",
        accessedById: userId, // Changed from accessedBy to accessedById
        whoseInfoId: id, // Changed from whoseInfo to whoseInfoId
        reasonForAccess, // Added reason for access
        additionalDetails: {
          accessedByUserType: userType,
          accessedByName: fullName, // Moved name to additionalDetails
          whoseInfoName: patientName, // Added patient name
          numberOfTreatments: treatments.length,
          accessMethod: "web application",
        },
      });
    } catch (logError) {
      // Just log the error but don't let it break the main function
      console.error("Error logging audit event:", logError);
    }

    return treatments;
  } catch (error) {
    console.error("Error fetching user treatments:", error);
    throw new Error("Failed to fetch user treatments");
  }
}

export const getAvailableAppointments = async (rmtLocationId, duration) => {
  // Convert duration to an integer
  const durationMinutes = parseInt(duration, 10);

  // Fetch the RMT location details
  const { rows: rmtLocations } = await sql`
    SELECT 
      id,
      workplace_type
    FROM rmt_locations
    WHERE id = ${rmtLocationId}
  `;

  if (rmtLocations.length === 0) {
    throw new Error("RMT location not found");
  }

  const { workplace_type: workplaceType } = rmtLocations[0];

  let availableTimes = [];

  // Fetch appointments with the given rmtLocationId and status 'available'
  const { rows: appointments } = await sql`
    SELECT 
      id,
      date,
      appointment_begins_at,
      appointment_ends_at,
      appointment_window_start,
      appointment_window_end,
      booking_cutoff_hours
    FROM treatments
    WHERE rmt_location_id = ${rmtLocationId}
    AND status = 'available'
  `;

  if (workplaceType === "irregular") {
    // For irregular workplaces, use the stored appointment times without adding breaks
    appointments.forEach((appointment) => {
      // Format the date as YYYY-MM-DD
      const appointmentDate = new Date(appointment.date)
        .toISOString()
        .split("T")[0];

      // Parse start and end times
      const startTime = new Date(
        `${appointmentDate}T${appointment.appointment_window_start}`,
      );
      const endTime = new Date(
        `${appointmentDate}T${appointment.appointment_window_end}`,
      );
      if (endTime <= startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }

      // Check if the appointment duration fits within the available time slot
      if (endTime.getTime() - startTime.getTime() >= durationMinutes * 60000) {
        availableTimes.push({
          date: appointmentDate,
          startTime: appointment.appointment_window_start.slice(0, 5), // Format as HH:MM
          endTime: appointment.appointment_window_end.slice(0, 5), // Format as HH:MM
          windowStartTime: appointment.appointment_window_start.slice(0, 5),
          bookingCutoffHours: Number(appointment.booking_cutoff_hours || 0),
        });
      }
    });
  } else {
    // For regular workplaces, use the existing logic
    appointments.forEach((appointment) => {
      // Format the date as YYYY-MM-DD
      const appointmentDate = new Date(appointment.date)
        .toISOString()
        .split("T")[0];

      // Parse start and end times
      const startTime = new Date(
        `${appointmentDate}T${appointment.appointment_window_start}`,
      );
      const endTime = new Date(
        `${appointmentDate}T${appointment.appointment_window_end}`,
      );
      if (endTime <= startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }

      let currentTime = new Date(startTime);

      while (currentTime <= endTime) {
        const nextTime = new Date(currentTime);
        nextTime.setMinutes(currentTime.getMinutes() + durationMinutes);

        if (nextTime <= endTime) {
          availableTimes.push({
            date: appointmentDate,
            startTime: currentTime.toTimeString().slice(0, 5), // Format as HH:MM
            endTime: nextTime.toTimeString().slice(0, 5), // Format as HH:MM
            windowStartTime: appointment.appointment_window_start.slice(0, 5),
            bookingCutoffHours: Number(appointment.booking_cutoff_hours || 0),
          });
        }

        currentTime.setMinutes(currentTime.getMinutes() + 30); // Increment by 30 minutes
      }
    });
  }

  // Fetch busy times from Google Calendar
  const now = new Date();
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(now.getMonth() + 2.5);

  const busyTimes = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: oneMonthLater.toISOString(),
      items: [{ id: GOOGLE_CALENDAR_ID }],
      timeZone: "America/Toronto",
    },
  });

  const busyPeriods = busyTimes.data.calendars[GOOGLE_CALENDAR_ID].busy.map(
    (period) => {
      const start = period.start;
      const end = period.end;

      // Function to add or subtract minutes from a date-time string
      const addMinutes = (dateTimeStr, minutes) => {
        const [date, time] = dateTimeStr.split("T");
        const [hours, minutesStr] = time.split(":");
        const totalMinutes =
          parseInt(hours) * 60 + parseInt(minutesStr) + minutes;
        const newHours = Math.floor(totalMinutes / 60)
          .toString()
          .padStart(2, "0");
        const newMinutes = (totalMinutes % 60).toString().padStart(2, "0");
        return `${date}T${newHours}:${newMinutes}:00Z`;
      };

      // Function to convert date-time string to desired format
      const formatDateTime = (dateTimeStr) => {
        const [date, time] = dateTimeStr.split("T");
        const [hours, minutes] = time.split(":");
        return {
          date,
          time: `${hours}:${minutes}`,
        };
      };

      const bufferedStart = addMinutes(start, -30); // Subtract 30 minutes from start
      const bufferedEnd = addMinutes(end, 30); // Add 30 minutes to end

      return {
        date: formatDateTime(bufferedStart).date,
        startTime: formatDateTime(bufferedStart).time,
        endTime: formatDateTime(bufferedEnd).time,
      };
    },
  );

  // Filter out conflicting times
  const filteredAvailableTimes = availableTimes.filter((available) => {
    return !busyPeriods.some((busy) => {
      return (
        available.date === busy.date &&
        ((available.startTime >= busy.startTime &&
          available.startTime < busy.endTime) ||
          (available.endTime > busy.startTime &&
            available.endTime <= busy.endTime) ||
          (available.startTime <= busy.startTime &&
            available.endTime >= busy.endTime))
      );
    });
  });

  // Deduplicate identical slots that can occur from duplicate availability rows
  const uniqueSlotKeys = new Set();
  const dedupedAvailableTimes = filteredAvailableTimes.filter((available) => {
    const key = `${available.date}|${available.startTime}|${available.endTime}`;
    if (uniqueSlotKeys.has(key)) return false;
    uniqueSlotKeys.add(key);
    return true;
  });

  // Apply booking cutoff: only show slots before the configured lead-time deadline.
  const nowToronto = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }),
  );
  const cutoffFilteredTimes = dedupedAvailableTimes.filter((available) => {
    const windowStartTime = available.windowStartTime || available.startTime;
    if (!available.date || !windowStartTime) return false;
    const windowStart = new Date(`${available.date}T${windowStartTime}:00`);
    if (Number.isNaN(windowStart.getTime())) return false;
    const cutoffHours = Math.max(0, Number(available.bookingCutoffHours || 0));
    const cutoffDeadline = new Date(
      windowStart.getTime() - cutoffHours * 60 * 60 * 1000,
    );
    return nowToronto <= cutoffDeadline;
  });

  // Sort the results by date/time
  const sortedAvailableTimes = cutoffFilteredTimes.sort(
    (a, b) =>
      new Date(`${a.date}T${a.startTime}:00`) -
      new Date(`${b.date}T${b.startTime}:00`),
  );

  return sortedAvailableTimes;
};

export async function bookAppointment({
  location,
  duration,
  appointmentTime,
  workplace,
  appointmentDate,
  RMTLocationId,
  giftCardCode = null,
}) {
  const session = await getSession();

  if (!session || !session.resultObj) {
    console.error("No session or resultObj found");
    return {
      success: false,
      message: "You must be logged in to book an appointment.",
    };
  }

  const { id, firstName, lastName, email, phoneNumber } = session.resultObj;

  if (giftCardCode) {
    try {
      // Check if gift card exists and is valid
      const { rows: giftCardRows } = await sql`
        SELECT id, code, duration, recipient_name, message, status, redeemed, redeemed_by_user_id
        FROM gift_cards
        WHERE code = ${giftCardCode}
      `;

      if (giftCardRows.length === 0) {
        return {
          success: false,
          message: "Invalid gift card code.",
        };
      }

      const giftCard = giftCardRows[0];

      // Check if already fully redeemed (booked)
      if (giftCard.redeemed || giftCard.status === "booked") {
        return {
          success: false,
          message: "This gift card has already been redeemed.",
        };
      }

      // Validate duration - only reject if selected duration is LESS than gift card duration
      const selectedDuration = Number.parseInt(duration);
      const giftCardDuration = Number.parseInt(giftCard.duration);

      if (selectedDuration < giftCardDuration) {
        return {
          success: false,
          message: `This gift card is for a ${giftCardDuration} minute massage. You cannot book a shorter appointment (${selectedDuration} minutes) with this gift card.`,
        };
      }

      // If selectedDuration >= giftCardDuration, allow booking
      // User will pay difference in person if selectedDuration > giftCardDuration
    } catch (error) {
      console.error("Error validating gift card:", error);
      return {
        success: false,
        message: "An error occurred while validating the gift card.",
      };
    }
  }

  // Ensure appointmentDate is in "YYYY-MM-DD" format
  const formattedDate = new Date(appointmentDate).toISOString().split("T")[0];

  // Convert appointmentTime to "HH:MM" (24-hour format)
  const startDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
  const formattedStartTime = startDateTime.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate end time
  const endDateTime = new Date(
    startDateTime.getTime() + Number.parseInt(duration) * 60000,
  );
  const formattedEndTime = endDateTime.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    // Find an available appointment that matches the criteria
    const { rows: availableAppointments } = await sql`
      SELECT id
      FROM treatments
      WHERE rmt_location_id = ${RMTLocationId}
      AND date = ${formattedDate}::date
      AND appointment_window_start <= ${formattedStartTime}::time
      AND appointment_window_end >= ${formattedEndTime}::time
      AND status = 'available'
      LIMIT 1
    `;

    if (availableAppointments.length === 0) {
      console.error("No matching appointment found");
      return {
        success: false,
        message:
          "No matching appointment found. Please try again or contact support.",
      };
    }

    const appointmentId = availableAppointments[0].id;

    // Create Google Calendar event
    const event = {
      summary: `[Requested] Mx ${firstName} ${lastName}`,
      location: location,
      description: `Email: ${email}\nPhone: ${phoneNumber || "N/A"}${
        giftCardCode ? `\nGift Card: ${giftCardCode}` : ""
      }`,
      start: {
        dateTime: `${formattedDate}T${formattedStartTime}:00`,
        timeZone: "America/Toronto",
      },
      end: {
        dateTime: `${formattedDate}T${formattedEndTime}:00`,
        timeZone: "America/Toronto",
      },
      colorId: giftCardCode ? "5" : "6", // Yellow for gift cards, tangerine for regular
    };

    const createdEvent = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      resource: event,
    });

    const updateResult = await sql`
      UPDATE treatments
      SET 
        status = 'requested',
        location = ${location},
        appointment_begins_at = ${formattedStartTime}::time,
        appointment_ends_at = ${formattedEndTime}::time,
        client_id = ${id},
        duration = ${Number.parseInt(duration)},
        workplace = ${workplace},
        google_calendar_event_id = ${createdEvent.data.id},
        google_calendar_event_link = ${createdEvent.data.htmlLink},
        code = ${giftCardCode || null}
      WHERE id = ${appointmentId}
      RETURNING id, status, client_id
    `;

    if (updateResult.rowCount === 0) {
      console.error("Failed to update appointment");

      // If update failed, delete the Google Calendar event
      await calendar.events.delete({
        calendarId: GOOGLE_CALENDAR_ID,
        eventId: createdEvent.data.id,
      });

      return {
        success: false,
        message:
          "Failed to update appointment. Please try again or contact support.",
      };
    }

    // Log the audit event
    try {
      await logAuditEvent({
        typeOfInfo: "appointment booking",
        actionPerformed: "created",
        accessedById: id,
        whoseInfoId: id, // Self-booking
        reasonForAccess: "Self-scheduling appointment",
        additionalDetails: {
          accessedByName: `${firstName} ${lastName}`,
          whoseInfoName: `${firstName} ${lastName}`,
          appointmentId: appointmentId,
          appointmentDate: formattedDate,
          appointmentTime: formattedStartTime,
          duration: duration,
          location: location,
          workplace: workplace,
          accessMethod: "web application",
          googleCalendarEventId: createdEvent.data.id,
          giftCardCode: giftCardCode || null,
        },
      });
    } catch (logError) {
      // Just log the error but don't let it break the main function
      console.error("Error logging audit event:", logError);
    }

    // Send email notification
    const transporter = getEmailTransporter();
    const confirmationLink = `${BASE_URL}/dashboard/rmt/confirm-appointment/${appointmentId}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Appointment Scheduled",
      text: `A new appointment has been scheduled for ${firstName} ${lastName} on ${formattedDate} at ${formattedStartTime}.${
        giftCardCode ? ` Gift card ${giftCardCode} will be applied.` : ""
      } Click here to confirm: ${confirmationLink}`,
      html: `
        <h1>New Appointment Scheduled</h1>
        <p>A new appointment has been scheduled with the following details:</p>
        <ul>
          <li>Client: ${firstName} ${lastName}</li>
          <li>Date: ${formattedDate}</li>
          <li>Time: ${formattedStartTime}</li>
          <li>Duration: ${duration} minutes</li>
          <li>Location: ${location}</li>
          ${
            giftCardCode
              ? `<li><strong>Gift Card Code:</strong> ${giftCardCode}</li>`
              : ""
          }
          <li>Google Calendar Event: <a href="${
            createdEvent.data.htmlLink
          }">View Event</a></li>
        </ul>
        <p><a href="${confirmationLink}">Click here to confirm the appointment</a></p>
      `,
    });

    revalidatePath("/dashboard/patient");

    return {
      success: true,
      message: giftCardCode
        ? "Appointment booked successfully with gift card applied!"
        : "Appointment booked successfully!",
      appointmentId: appointmentId,
      redirectTo: "/dashboard/patient",
      resultObj: session.resultObj,
    };
  } catch (error) {
    console.error("Error in bookAppointment:", error);

    return {
      success: false,
      message: "An error occurred while booking the appointment.",
    };
  }
}

// Gift card validation function
export async function validateGiftCard(code) {
  try {
    // Check if gift card exists and is valid
    const { rows } = await sql`
      SELECT id, code, duration, recipient_name, message, status, redeemed, redeemed_by_user_id
      FROM gift_cards
      WHERE code = ${code}
    `;

    if (rows.length === 0) {
      return { success: false, message: "Invalid gift card code." };
    }

    const giftCard = rows[0];

    // Check if already fully redeemed (booked)
    if (giftCard.redeemed || giftCard.status === "booked") {
      return {
        success: false,
        message: "This gift card has already been redeemed.",
      };
    }

    return {
      success: true,
      giftCard: {
        id: giftCard.id,
        code: giftCard.code,
        duration: giftCard.duration,
        recipientName: giftCard.recipient_name,
        message: giftCard.message,
        status: giftCard.status,
        redeemedByUserId: giftCard.redeemed_by_user_id,
      },
    };
  } catch (error) {
    console.error("Error validating gift card:", error);
    return {
      success: false,
      message: "An error occurred while validating the gift card.",
    };
  }
}
// export async function bookAppointment({
//   location,
//   duration,
//   appointmentTime,
//   workplace,
//   appointmentDate,
//   RMTLocationId,
// }) {
//   const session = await getSession();

//   if (!session || !session.resultObj) {
//     console.error("No session or resultObj found");
//     return {
//       success: false,
//       message: "You must be logged in to book an appointment.",
//     };
//   }

//   const { id, firstName, lastName, email, phoneNumber } = session.resultObj;

//   // Ensure appointmentDate is in "YYYY-MM-DD" format
//   const formattedDate = new Date(appointmentDate).toISOString().split("T")[0];

//   // Convert appointmentTime to "HH:MM" (24-hour format)
//   const startDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
//   const formattedStartTime = startDateTime.toLocaleTimeString("en-US", {
//     hour12: false,
//     hour: "2-digit",
//     minute: "2-digit",
//   });

//   // Calculate end time
//   const endDateTime = new Date(
//     startDateTime.getTime() + Number.parseInt(duration) * 60000
//   );
//   const formattedEndTime = endDateTime.toLocaleTimeString("en-US", {
//     hour12: false,
//     hour: "2-digit",
//     minute: "2-digit",
//   });

//   try {
//     // Find an available appointment that matches the criteria
//     const { rows: availableAppointments } = await sql`
//       SELECT id
//       FROM treatments
//       WHERE rmt_location_id = ${RMTLocationId}
//       AND date = ${formattedDate}::date
//       AND appointment_window_start <= ${formattedStartTime}::time
//       AND appointment_window_end >= ${formattedEndTime}::time
//       AND status = 'available'
//       LIMIT 1
//     `;

//     if (availableAppointments.length === 0) {
//       console.error("No matching appointment found");
//       return {
//         success: false,
//         message:
//           "No matching appointment found. Please try again or contact support.",
//       };
//     }

//     const appointmentId = availableAppointments[0].id;

//     // Create Google Calendar event
//     const event = {
//       summary: `[Requested] Mx ${firstName} ${lastName}`,
//       location: location,
//       description: `Email: ${email}\nPhone: ${phoneNumber || "N/A"}`,
//       start: {
//         dateTime: `${formattedDate}T${formattedStartTime}:00`,
//         timeZone: "America/Toronto",
//       },
//       end: {
//         dateTime: `${formattedDate}T${formattedEndTime}:00`,
//         timeZone: "America/Toronto",
//       },
//       colorId: "6", // tangerine color
//     };

//     const createdEvent = await calendar.events.insert({
//       calendarId: GOOGLE_CALENDAR_ID,
//       resource: event,
//     });

//     console.log("Google Calendar event created:", {
//       id: createdEvent.data.id,
//       link: createdEvent.data.htmlLink,
//     });

//     // Update the appointment
//     const updateResult = await sql`
//       UPDATE treatments
//       SET
//         status = 'requested',
//         location = ${location},
//         appointment_begins_at = ${formattedStartTime}::time,
//         appointment_ends_at = ${formattedEndTime}::time,
//         client_id = ${id},
//         duration = ${Number.parseInt(duration)},
//         workplace = ${workplace},
//         google_calendar_event_id = ${createdEvent.data.id},
//         google_calendar_event_link = ${createdEvent.data.htmlLink}
//       WHERE id = ${appointmentId}
//       RETURNING id, status, client_id
//     `;

//     if (updateResult.rowCount === 0) {
//       console.error("Failed to update appointment");

//       // If update failed, delete the Google Calendar event
//       await calendar.events.delete({
//         calendarId: GOOGLE_CALENDAR_ID,
//         eventId: createdEvent.data.id,
//       });

//       return {
//         success: false,
//         message:
//           "Failed to update appointment. Please try again or contact support.",
//       };
//     }

//     // Log the audit event
//     try {
//       await logAuditEvent({
//         typeOfInfo: "appointment booking",
//         actionPerformed: "created",
//         accessedById: id,
//         whoseInfoId: id, // Self-booking
//         reasonForAccess: "Self-scheduling appointment",
//         additionalDetails: {
//           accessedByName: `${firstName} ${lastName}`,
//           whoseInfoName: `${firstName} ${lastName}`,
//           appointmentId: appointmentId,
//           appointmentDate: formattedDate,
//           appointmentTime: formattedStartTime,
//           duration: duration,
//           location: location,
//           workplace: workplace,
//           accessMethod: "web application",
//           googleCalendarEventId: createdEvent.data.id,
//         },
//       });
//     } catch (logError) {
//       // Just log the error but don't let it break the main function
//       console.error("Error logging audit event:", logError);
//     }

//     // Send email notification
//     console.log("Sending email notification");
//     const transporter = getEmailTransporter();
//     const confirmationLink = `${BASE_URL}/dashboard/rmt/confirm-appointment/${appointmentId}`;

//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: process.env.EMAIL_USER,
//       subject: "New Appointment Scheduled",
//       text: `A new appointment has been scheduled for ${firstName} ${lastName} on ${formattedDate} at ${formattedStartTime}. Click here to confirm: ${confirmationLink}`,
//       html: `
//         <h1>New Appointment Scheduled</h1>
//         <p>A new appointment has been scheduled with the following details:</p>
//         <ul>
//           <li>Client: ${firstName} ${lastName}</li>
//           <li>Date: ${formattedDate}</li>
//           <li>Time: ${formattedStartTime}</li>
//           <li>Duration: ${duration} minutes</li>
//           <li>Location: ${location}</li>
//           <li>Google Calendar Event: <a href="${createdEvent.data.htmlLink}">View Event</a></li>
//         </ul>
//         <p><a href="${confirmationLink}">Click here to confirm the appointment</a></p>
//       `,
//     });

//     revalidatePath("/dashboard/patient");

//     return {
//       success: true,
//       message: "Appointment booked successfully!",
//       appointmentId: appointmentId,
//       redirectTo: "/dashboard/patient",
//     };
//   } catch (error) {
//     console.error("Error in bookAppointment:", error);
//     console.error("Error stack:", error.stack);

//     // Log more details about the error
//     if (error.response) {
//       console.error("Error response data:", error.response.data);
//       console.error("Error response status:", error.response.status);
//     }

//     return {
//       success: false,
//       message: "An error occurred while booking the appointment.",
//     };
//   }
// }

export const cancelAppointment = async (prevState, formData) => {
  const session = await getSession();
  if (!session) {
    return {
      message: "You must be logged in to cancel an appointment.",
      status: "error",
    };
  }

  const { id, firstName, lastName } = session.resultObj;

  try {
    const appointmentId = formData.get("id");

    // First, fetch the appointment to get the Google Calendar event ID
    const { rows } = await sql`
      SELECT 
        id, 
        date, 
        appointment_begins_at, 
        google_calendar_event_id
        
      FROM treatments
      WHERE id = ${appointmentId}
      AND client_id = ${id}
    `;

    if (rows.length === 0) {
      return {
        message: "No matching appointment found.",
        status: "error",
      };
    }

    const appointment = rows[0];

    // If there's a Google Calendar event ID, delete the event
    if (appointment.google_calendar_event_id) {
      try {
        await calendar.events.delete({
          calendarId: GOOGLE_CALENDAR_ID,
          eventId: appointment.google_calendar_event_id,
        });
      } catch (calendarError) {
        console.error("Error deleting Google Calendar event:", calendarError);
        // We'll continue with the cancellation even if the Calendar deletion fails
      }
    }

    // Update the appointment to set it back to available
    const updateResult = await sql`
      UPDATE treatments
      SET 
        status = 'available',
        client_id = NULL,
        duration = NULL,
        workplace = NULL,
        consent_form = NULL,
        consent_form_submitted_at = NULL,
        google_calendar_event_id = NULL,
        google_calendar_event_link = NULL,
        appointment_begins_at = NULL,
        appointment_ends_at = NULL,
        location = NULL,
        code = NULL
      WHERE id = ${appointmentId}
      AND client_id = ${id}
      RETURNING id
    `;

    if (updateResult.rowCount > 0) {

      try {
        await logAuditEvent({
          typeOfInfo: "appointment cancellation",
          actionPerformed: "cancelled",
          accessedById: id,
          whoseInfoId: id,
          reasonForAccess: "Self-cancelling appointment",
          additionalDetails: {
            accessedByName: `${firstName} ${lastName}`,
            whoseInfoName: `${firstName} ${lastName}`,
            appointmentId: appointmentId,
            appointmentDate: appointment.date,
            appointmentTime: appointment.appointment_begins_at,
            accessMethod: "web application",
          },
        });
      } catch (logError) {
        // Just log the error but don't let it break the main function
        console.error("Error logging audit event:", logError);
      }

      const transporter = getEmailTransporter();
      const formattedDate = formatDateForDisplay(appointment.date);
      const formattedTime = formatTimeForDisplay(
        appointment.appointment_begins_at,
      );

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: "cipdevries@ciprmt.com",
        subject: "Appointment Cancelled",
        text: `Appointment for ${firstName} ${lastName} on ${formattedDate} at ${formattedTime} has been cancelled.`,
        html: `
          <p>Appointment for ${firstName} ${lastName} has been cancelled.</p>
          <p>Date: ${formattedDate}</p>
          <p>Time: ${formattedTime}</p>
        `,
      });

      revalidatePath("/dashboard/patient");
      return {
        status: "success",
        message: "Appointment cancelled successfully.",
      };
    } else {
      return {
        message: "No matching appointment found.",
        status: "error",
      };
    }
  } catch (error) {
    console.error("An error occurred while cancelling the appointment:", error);
    return {
      message: "An error occurred while cancelling the appointment.",
      status: "error",
    };
  }
};

// export const cancelAppointment = async (prevState, formData) => {
//   const session = await getSession();
//   if (!session) {
//     return {
//       message: "You must be logged in to cancel an appointment.",
//       status: "error",
//     };
//   }

//   const { id, firstName, lastName } = session.resultObj;

//   try {
//     const appointmentId = formData.get("id");

//     // First, fetch the appointment to get the Google Calendar event ID
//     const { rows } = await sql`
//       SELECT
//         id,
//         date,
//         appointment_begins_at,
//         google_calendar_event_id

//       FROM treatments
//       WHERE id = ${appointmentId}
//       AND client_id = ${id}
//     `;

//     if (rows.length === 0) {
//       console.log("No matching appointment found.");
//       return {
//         message: "No matching appointment found.",
//         status: "error",
//       };
//     }

//     const appointment = rows[0];

//     // If there's a Google Calendar event ID, delete the event
//     if (appointment.google_calendar_event_id) {
//       try {
//         await calendar.events.delete({
//           calendarId: GOOGLE_CALENDAR_ID,
//           eventId: appointment.google_calendar_event_id,
//         });
//         console.log("Google Calendar event deleted successfully.");
//       } catch (calendarError) {
//         console.error("Error deleting Google Calendar event:", calendarError);
//         // We'll continue with the cancellation even if the Calendar deletion fails
//       }
//     }

//     // Update the appointment to set it back to available
//     const updateResult = await sql`
//       UPDATE treatments
//       SET
//         status = 'available',
//         client_id = NULL,
//         duration = NULL,
//         workplace = NULL,
//         consent_form = NULL,
//         consent_form_submitted_at = NULL,
//         google_calendar_event_id = NULL,
//         google_calendar_event_link = NULL,
//         appointment_begins_at = NULL,
//         appointment_ends_at = NULL,
//         location = NULL
//       WHERE id = ${appointmentId}
//       AND client_id = ${id}
//       RETURNING id
//     `;

//     if (updateResult.rowCount > 0) {
//       console.log("Appointment cancelled successfully.");

//       try {
//         await logAuditEvent({
//           typeOfInfo: "appointment cancellation",
//           actionPerformed: "cancelled",
//           accessedById: id,
//           whoseInfoId: id,
//           reasonForAccess: "Self-cancelling appointment",
//           additionalDetails: {
//             accessedByName: `${firstName} ${lastName}`,
//             whoseInfoName: `${firstName} ${lastName}`,
//             appointmentId: appointmentId,
//             appointmentDate: appointment.date,
//             appointmentTime: appointment.appointment_begins_at,
//             accessMethod: "web application",
//           },
//         });
//       } catch (logError) {
//         // Just log the error but don't let it break the main function
//         console.error("Error logging audit event:", logError);
//       }

//       revalidatePath("/dashboard/patient");
//       return {
//         status: "success",
//         message: "Appointment cancelled successfully.",
//       };
//     } else {
//       console.log("No matching appointment found or no update performed.");
//       return {
//         message: "No matching appointment found.",
//         status: "error",
//       };
//     }
//   } catch (error) {
//     console.error("An error occurred while cancelling the appointment:", error);
//     console.error("Error stack:", error.stack);
//     return {
//       message: "An error occurred while cancelling the appointment.",
//       status: "error",
//     };
//   }
// };

export async function getAppointmentById(id) {
  try {
    const session = await getSession();
    if (!session?.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    const { rows } = await sql`
      SELECT * FROM treatments
      WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return null;
    }

    const appointment = rows[0];
    const canAccess =
      session.resultObj.userType === "rmt" ||
      appointment.client_id === session.resultObj.id ||
      appointment.client_id === null;

    if (!canAccess) {
      throw new Error(
        "Unauthorized: User does not have permission to access this appointment",
      );
    }

    if (appointment.client_id) {
      try {
        let reasonForAccess = "Self-access to appointment";
        if (session.resultObj.userType === "rmt") {
          reasonForAccess = "Provider accessing patient appointment";
        }

        await logAuditEvent({
          typeOfInfo: "appointment",
          actionPerformed: "viewed",
          accessedById: session.resultObj.id,
          whoseInfoId: appointment.client_id,
          reasonForAccess,
          additionalDetails: {
            accessedByUserType: session.resultObj.userType,
            appointmentId: appointment.id,
            appointmentDate: appointment.date,
            accessMethod: "web application",
          },
        });
      } catch (logError) {
        console.error("Error logging audit event:", logError);
      }
    }

    return appointment;
  } catch (error) {
    console.error("Error fetching appointment:", error);
    throw new Error("Failed to fetch appointment");
  }
}

export async function submitConsentForm(data) {
  try {
    const session = await getSession();
    if (!session || !session.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    // Rename id to userId to avoid naming conflict
    const { id: userId, firstName, lastName } = session.resultObj;

    const { id, ...consentData } = data;

    // Check if the user has permission to submit this consent form
    const { rows } = await sql`
      SELECT * FROM treatments
      WHERE id = ${id}
    `;

    if (rows.length === 0) {
      throw new Error("Appointment not found");
    }

    const appointment = rows[0];

    // Check if the user has permission to submit this consent form
    if (appointment.client_id !== userId) {
      throw new Error(
        "Unauthorized: User does not have permission to submit this consent form",
      );
    }

    // Update the appointment with the consent form data
    const result = await sql`
      UPDATE treatments
      SET 
        consent_form = ${JSON.stringify(consentData)},
        consent_form_submitted_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `;

    if (result.rows.length === 1) {
      try {
        await logAuditEvent({
          typeOfInfo: "consent form",
          actionPerformed: "submitted",
          accessedById: userId,
          whoseInfoId: userId,
          reasonForAccess: "Self-submitting consent form",
          additionalDetails: {
            accessedByName: `${firstName} ${lastName}`,
            whoseInfoName: `${firstName} ${lastName}`,
            appointmentId: id,
            appointmentDate: appointment.date,
            appointmentTime: appointment.appointment_begins_at,
            accessMethod: "web application",
          },
        });
      } catch (logError) {
        // Just log the error but don't let it break the main function
        console.error("Error logging audit event:", logError);
      }

      revalidatePath("/dashboard/patient");
      return { success: true };
    } else {
      return {
        success: false,
        error: "Failed to update appointment with consent form data",
      };
    }
  } catch (error) {
    console.error("Error submitting consent form:", error);
    return { success: false, error: error.message };
  }
}

export async function setAppointmentStatus(appointmentId, status) {
  try {
    // Check if appointment exists and get current status
    const { rows } = await sql`
      SELECT * FROM treatments
      WHERE id = ${appointmentId}
    `;

    if (rows.length === 0) {
      throw new Error(`Appointment not found with id: ${appointmentId}`);
    }

    const appointment = rows[0];

    if (appointment.status === status) {
      return {
        success: true,
        message: `Appointment is already in ${status} status`,
      };
    }

    let updateQuery;

    if (status === "rescheduling") {
      // If changing to rescheduling status, store the previous status and timestamp
      updateQuery = sql`
        UPDATE treatments
        SET 
          status = ${status},
          rescheduling_started_at = NOW(),
          previous_status = ${appointment.status}
        WHERE id = ${appointmentId}
        RETURNING id
      `;
    } else {
      // If changing to any other status, clear the rescheduling fields
      updateQuery = sql`
        UPDATE treatments
        SET 
          status = ${status},
          rescheduling_started_at = NULL,
          previous_status = NULL
        WHERE id = ${appointmentId}
        RETURNING id
      `;
    }

    const result = await updateQuery;

    if (result.rows.length === 1) {
      return {
        success: true,
        message: `Appointment status updated to ${status}`,
      };
    } else {
      throw new Error("Failed to update appointment status");
    }
  } catch (error) {
    console.error("Error updating appointment status:", error);
    throw error;
  }
}

export const getAllAvailableAppointments = async (
  rmtLocationId,
  duration,
  currentEventGoogleId,
) => {
  // Convert duration to an integer
  const durationMinutes = parseInt(duration, 10);

  // Fetch the RMT location details
  const { rows: rmtLocations } = await sql`
    SELECT 
      id,
      workplace_type
    FROM rmt_locations
    WHERE id = ${rmtLocationId}
  `;

  if (rmtLocations.length === 0) {
    throw new Error("RMT location not found");
  }

  const { workplace_type: workplaceType } = rmtLocations[0];

  let availableTimes = [];

  // Fetch appointments with the given rmtLocationId and status 'available' or 'rescheduling'
  const { rows: appointments } = await sql`
    SELECT 
      id,
      date,
      appointment_begins_at,
      appointment_ends_at,
      appointment_window_start,
      appointment_window_end,
      status
    FROM treatments
    WHERE rmt_location_id = ${rmtLocationId}
    AND status IN ('available', 'rescheduling')
  `;

  if (workplaceType === "irregular") {
    // For irregular workplaces, use the stored appointment times without adding breaks
    appointments.forEach((appointment) => {
      // Format the date as YYYY-MM-DD
      const appointmentDate = new Date(appointment.date)
        .toISOString()
        .split("T")[0];

      // Parse start and end times
      const startTime = new Date(
        `${appointmentDate}T${appointment.appointment_window_start}`,
      );
      const endTime = new Date(
        `${appointmentDate}T${appointment.appointment_window_end}`,
      );

      // Check if the appointment duration fits within the available time slot
      if (endTime.getTime() - startTime.getTime() >= durationMinutes * 60000) {
        availableTimes.push({
          date: appointmentDate,
          startTime: appointment.appointment_window_start.slice(0, 5), // Format as HH:MM
          endTime: appointment.appointment_window_end.slice(0, 5), // Format as HH:MM
        });
      }
    });
  } else {
    // For regular workplaces, use the existing logic
    appointments.forEach((appointment) => {
      // Format the date as YYYY-MM-DD
      const appointmentDate = new Date(appointment.date)
        .toISOString()
        .split("T")[0];

      // Parse start and end times
      const startTime = new Date(
        `${appointmentDate}T${appointment.appointment_window_start}`,
      );
      const endTime = new Date(
        `${appointmentDate}T${appointment.appointment_window_end}`,
      );

      let currentTime = new Date(startTime);

      while (currentTime <= endTime) {
        const nextTime = new Date(currentTime);
        nextTime.setMinutes(currentTime.getMinutes() + durationMinutes);

        if (nextTime <= endTime) {
          availableTimes.push({
            date: appointmentDate,
            startTime: currentTime.toTimeString().slice(0, 5), // Format as HH:MM
            endTime: nextTime.toTimeString().slice(0, 5), // Format as HH:MM
          });
        }

        currentTime.setMinutes(currentTime.getMinutes() + 30); // Increment by 30 minutes
      }
    });
  }

  // Fetch busy times from Google Calendar
  const now = new Date();
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(now.getMonth() + 2.5);

  const busyTimes = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: oneMonthLater.toISOString(),
      items: [{ id: GOOGLE_CALENDAR_ID }],
      timeZone: "America/Toronto",
    },
  });

  // Fetch the event with the currentEventGoogleId
  let event;
  try {
    if (currentEventGoogleId) {
      event = await calendar.events.get({
        calendarId: GOOGLE_CALENDAR_ID,
        eventId: currentEventGoogleId,
      });
    }
  } catch (error) {
  }

  // Filter out the event with the currentEventGoogleId from the busyTimes
  let filteredBusyTimes = busyTimes.data.calendars[GOOGLE_CALENDAR_ID].busy;

  if (event) {
    const eventStart = new Date(
      event.data.start.dateTime || event.data.start.date,
    ).toISOString();
    const eventEnd = new Date(
      event.data.end.dateTime || event.data.end.date,
    ).toISOString();

    filteredBusyTimes = busyTimes.data.calendars[
      GOOGLE_CALENDAR_ID
    ].busy.filter((busyTime) => {
      const busyStart = new Date(busyTime.start).toISOString();
      const busyEnd = new Date(busyTime.end).toISOString();
      return !(busyStart === eventStart && busyEnd === eventEnd);
    });
  }

  const busyPeriods = filteredBusyTimes.map((period) => {
    const start = period.start;
    const end = period.end;

    // Function to add or subtract minutes from a date-time string
    const addMinutes = (dateTimeStr, minutes) => {
      const [date, time] = dateTimeStr.split("T");
      const [hours, minutesStr] = time.split(":");
      const totalMinutes =
        parseInt(hours) * 60 + parseInt(minutesStr) + minutes;
      const newHours = Math.floor(totalMinutes / 60)
        .toString()
        .padStart(2, "0");
      const newMinutes = (totalMinutes % 60).toString().padStart(2, "0");
      return `${date}T${newHours}:${newMinutes}:00Z`;
    };

    // Function to convert date-time string to desired format
    const formatDateTime = (dateTimeStr) => {
      const [date, time] = dateTimeStr.split("T");
      const [hours, minutes] = time.split(":");
      return {
        date,
        time: `${hours}:${minutes}`,
      };
    };

    const bufferedStart = addMinutes(start, -30); // Subtract 30 minutes from start
    const bufferedEnd = addMinutes(end, 30); // Add 30 minutes to end

    return {
      date: formatDateTime(bufferedStart).date,
      startTime: formatDateTime(bufferedStart).time,
      endTime: formatDateTime(bufferedEnd).time,
    };
  });

  // Filter out conflicting times
  const filteredAvailableTimes = availableTimes.filter((available) => {
    return !busyPeriods.some((busy) => {
      const isConflict =
        available.date === busy.date &&
        ((available.startTime >= busy.startTime &&
          available.startTime < busy.endTime) ||
          (available.endTime > busy.startTime &&
            available.endTime <= busy.endTime) ||
          (available.startTime <= busy.startTime &&
            available.endTime >= busy.endTime));

      return isConflict;
    });
  });

  // Filter out dates that are not greater than today
  const today = new Date().toISOString().split("T")[0];

  const futureAvailableTimes = filteredAvailableTimes.filter(
    (available) => available.date > today,
  );

  // Sort the results by date
  const sortedAvailableTimes = futureAvailableTimes.sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  return sortedAvailableTimes;
};
// export const getAllAvailableAppointments = async (
//   rmtLocationId,
//   duration,
//   currentEventGoogleId
// ) => {
//   // Convert duration to an integer
//   const durationMinutes = parseInt(duration, 10);

//   // Fetch appointments with the given rmtLocationId and status 'available' or 'rescheduling'
//   const { rows: appointments } = await sql`
//     SELECT
//       id,
//       date,
//       appointment_begins_at,
//       appointment_ends_at,
//       appointment_window_start,
//       appointment_window_end
//     FROM treatments
//     WHERE rmt_location_id = ${rmtLocationId}
//     AND status IN ('available', 'rescheduling')
//   `;

//   const availableTimes = [];

//   appointments.forEach((appointment) => {
//     // Format the date as YYYY-MM-DD
//     const appointmentDate = new Date(appointment.date)
//       .toISOString()
//       .split("T")[0];

//     // Parse start and end times
//     const startTime = new Date(
//       `${appointmentDate}T${appointment.appointment_window_start}`
//     );
//     const endTime = new Date(
//       `${appointmentDate}T${appointment.appointment_window_end}`
//     );

//     let currentTime = new Date(startTime);

//     while (currentTime <= endTime) {
//       const nextTime = new Date(currentTime);
//       nextTime.setMinutes(currentTime.getMinutes() + durationMinutes);

//       if (nextTime <= endTime) {
//         availableTimes.push({
//           date: appointmentDate,
//           startTime: currentTime.toTimeString().slice(0, 5), // Format as HH:MM
//           endTime: nextTime.toTimeString().slice(0, 5), // Format as HH:MM
//         });
//       }

//       currentTime.setMinutes(currentTime.getMinutes() + 30); // Increment by 30 minutes
//     }
//   });

//   // Fetch busy times from Google Calendar
//   const now = new Date();
//   const oneMonthLater = new Date();
//   oneMonthLater.setMonth(now.getMonth() + 2.5);

//   const busyTimes = await calendar.freebusy.query({
//     requestBody: {
//       timeMin: now.toISOString(),
//       timeMax: oneMonthLater.toISOString(),
//       items: [{ id: GOOGLE_CALENDAR_ID }],
//       timeZone: "America/Toronto",
//     },
//   });

//   let filteredBusyTimes = busyTimes.data.calendars[GOOGLE_CALENDAR_ID].busy;

//   // Only filter out the current event if currentEventGoogleId is provided
//   let currentEventStart = null;
//   let currentEventEnd = null;

//   if (currentEventGoogleId) {
//     try {
//       // Fetch the event with the currentEventGoogleId
//       const event = await calendar.events.get({
//         calendarId: GOOGLE_CALENDAR_ID,
//         eventId: currentEventGoogleId,
//       });

//       // Store the current event's start and end times
//       currentEventStart = event.data.start.dateTime || event.data.start.date;
//       currentEventEnd = event.data.end.dateTime || event.data.end.date;

//       console.log("Current Google Calendar event:", {
//         start: currentEventStart,
//         end: currentEventEnd,
//       });

//       // Extract date and time for the current event
//       const currentEventDate = new Date(currentEventStart)
//         .toISOString()
//         .split("T")[0];
//       const currentEventStartTime = new Date(currentEventStart)
//         .toTimeString()
//         .slice(0, 5);
//       const currentEventEndTime = new Date(currentEventEnd)
//         .toTimeString()
//         .slice(0, 5);

//       console.log("Current event formatted:", {
//         date: currentEventDate,
//         startTime: currentEventStartTime,
//         endTime: currentEventEndTime,
//       });

//       // Add the current event time as an available option
//       availableTimes.push({
//         date: currentEventDate,
//         startTime: currentEventStartTime,
//         endTime: currentEventEndTime,
//       });

//       console.log("Added current event time to available times");
//     } catch (error) {
//       console.error("Error fetching Google Calendar event:", error);
//     }
//   }

//   // Convert busy times to a standardized format for easier comparison
//   const busyPeriods = filteredBusyTimes
//     .map((period) => {
//       const busyStart = new Date(period.start);
//       const busyEnd = new Date(period.end);

//       // Check if this is the current event
//       if (currentEventStart && currentEventEnd) {
//         const eventStart = new Date(currentEventStart);
//         const eventEnd = new Date(currentEventEnd);

//         // If this is the current event, skip it
//         if (
//           busyStart.getTime() === eventStart.getTime() &&
//           busyEnd.getTime() === eventEnd.getTime()
//         ) {
//           console.log("Skipping current event in busy times");
//           return null;
//         }
//       }

//       // Add buffer time (30 minutes before and after)
//       const bufferedStart = new Date(busyStart);
//       bufferedStart.setMinutes(bufferedStart.getMinutes() - 30);

//       const bufferedEnd = new Date(busyEnd);
//       bufferedEnd.setMinutes(bufferedEnd.getMinutes() + 30);

//       return {
//         date: bufferedStart.toISOString().split("T")[0],
//         startTime: bufferedStart.toTimeString().slice(0, 5),
//         endTime: bufferedEnd.toTimeString().slice(0, 5),
//       };
//     })
//     .filter((period) => period !== null); // Remove null entries (current event)

//   // Filter out conflicting times
//   const filteredAvailableTimes = availableTimes.filter((available) => {
//     // If this is the current event's time slot, always include it
//     if (currentEventStart) {
//       const currentEventDate = new Date(currentEventStart)
//         .toISOString()
//         .split("T")[0];
//       const currentEventStartTime = new Date(currentEventStart)
//         .toTimeString()
//         .slice(0, 5);

//       if (
//         available.date === currentEventDate &&
//         available.startTime === currentEventStartTime
//       ) {
//         console.log("Keeping current event time slot:", available);
//         return true;
//       }
//     }

//     const isConflicting = busyPeriods.some((busy) => {
//       // Convert times to minutes for easier comparison
//       const getMinutes = (timeStr) => {
//         const [hours, minutes] = timeStr.split(":").map(Number);
//         return hours * 60 + minutes;
//       };

//       const availableStartMinutes = getMinutes(available.startTime);
//       const availableEndMinutes = getMinutes(available.endTime);
//       const busyStartMinutes = getMinutes(busy.startTime);
//       const busyEndMinutes = getMinutes(busy.endTime);

//       return (
//         available.date === busy.date &&
//         ((availableStartMinutes >= busyStartMinutes &&
//           availableStartMinutes < busyEndMinutes) ||
//           (availableEndMinutes > busyStartMinutes &&
//             availableEndMinutes <= busyEndMinutes) ||
//           (availableStartMinutes <= busyStartMinutes &&
//             availableEndMinutes >= busyEndMinutes))
//       );
//     });

//     return !isConflicting;
//   });

//   console.log(
//     "Available times after filtering conflicts:",
//     filteredAvailableTimes.length
//   );

//   // Filter out dates that are not greater than today
//   const today = new Date().toISOString().split("T")[0];
//   const futureAvailableTimes = filteredAvailableTimes.filter(
//     (available) => available.date >= today
//   );

//   // Sort the results by date
//   const sortedAvailableTimes = futureAvailableTimes.sort(
//     (a, b) => new Date(a.date) - new Date(b.date)
//   );

//   // Remove duplicates
//   const uniqueTimes = [];
//   const seen = new Set();

//   sortedAvailableTimes.forEach((time) => {
//     const key = `${time.date}-${time.startTime}-${time.endTime}`;
//     if (!seen.has(key)) {
//       seen.add(key);
//       uniqueTimes.push(time);
//     }
//   });

//   return uniqueTimes;
// };

export async function keepAppointment(appointmentId) {
  try {
    // First, get the appointment to check its status
    const { rows } = await sql`
      SELECT id, status, previous_status
      FROM treatments
      WHERE id = ${appointmentId}
    `;

    if (rows.length === 0) {
      return { success: false, message: "Appointment not found" };
    }

    const appointment = rows[0];

    if (appointment.status !== "rescheduling") {
      return {
        success: true,
        message: "Appointment is not in rescheduling status",
      };
    }

    // Update the appointment status
    const updateResult = await sql`
      UPDATE treatments
      SET 
        status = ${appointment.previous_status || "booked"},
        previous_status = NULL,
        rescheduling_started_at = NULL
      WHERE id = ${appointmentId}
      RETURNING id
    `;

    if (updateResult.rowCount === 1) {
      revalidatePath("/dashboard/patient");
      return {
        success: true,
        message: "Appointment status reverted successfully",
      };
    } else {
      return { success: false, message: "Failed to revert appointment status" };
    }
  } catch (error) {
    console.error("Error reverting appointment status:", error);
    return {
      success: false,
      message: "An error occurred while reverting appointment status",
    };
  }
}

export async function rescheduleAppointment(
  currentAppointmentId,
  {
    location,
    duration,
    appointmentTime,
    workplace,
    appointmentDate,
    RMTLocationId,
  },
) {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: "You must be logged in to reschedule an appointment.",
    };
  }

  const { id, firstName, lastName, email, phoneNumber } = session.resultObj;

  // Convert appointmentDate from "Month Day, Year" to "YYYY-MM-DD"
  const formattedDate = new Date(appointmentDate).toISOString().split("T")[0];

  // Convert appointmentTime from "HH:MM AM/PM - HH:MM AM/PM" to "HH:MM" (24-hour format)
  const [startTime, endTime] = appointmentTime.split(" - ");
  const formattedStartTime = new Date(
    `${appointmentDate} ${startTime}`,
  ).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedEndTime = new Date(
    `${appointmentDate} ${endTime}`,
  ).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    // Get the current appointment with explicit column selection
    const { rows: currentAppointments } = await sql`
      SELECT 
        id,
        status,
        client_id,
        consent_form,
        consent_form_submitted_at,
        google_calendar_event_id,
        google_calendar_event_link,
        code,
        date,
        appointment_begins_at,
        appointment_ends_at
      FROM treatments 
      WHERE id = ${currentAppointmentId}
    `;

    const currentAppointment = currentAppointments[0];

    if (!currentAppointment) {
      return {
        success: false,
        message: "Current appointment not found.",
      };
    }
    const consentForm = currentAppointment.consent_form;
    const consentFormSubmittedAt = currentAppointment.consent_form_submitted_at;
    const giftCardCode = currentAppointment.code; // Gift card code
    // Update Google Calendar if there's an event ID
    if (currentAppointment.google_calendar_event_id) {
      const updatedEvent = {
        summary: `[Requested] Mx ${firstName} ${lastName}`,
        location: location,
        description: `Email: ${email}\nPhone: ${phoneNumber || "N/A"}${
          giftCardCode ? `\nGift Card: ${giftCardCode}` : ""
        }`,
        start: {
          dateTime: `${formattedDate}T${formattedStartTime}:00`,
          timeZone: "America/Toronto",
        },
        end: {
          dateTime: `${formattedDate}T${formattedEndTime}:00`,
          timeZone: "America/Toronto",
        },
        colorId: giftCardCode ? "5" : "6", // Yellow for gift cards, tangerine for regular
      };

      try {
        await calendar.events.update({
          calendarId: GOOGLE_CALENDAR_ID,
          eventId: currentAppointment.google_calendar_event_id,
          resource: updatedEvent,
        });
      } catch (calendarError) {
        console.error("Error updating Google Calendar event:", calendarError);
      }
    }

    await sql`
      UPDATE treatments
      SET 
        status = 'available',
        client_id = NULL,
        consent_form = NULL,
        consent_form_submitted_at = NULL,
        google_calendar_event_id = NULL,
        google_calendar_event_link = NULL,
        code = NULL
      WHERE id = ${currentAppointmentId}
    `;


    // Find a new available appointment slot
    const { rows: availableAppointments } = await sql`
      SELECT * FROM treatments
      WHERE 
        rmt_location_id = ${RMTLocationId}
        AND date = ${formattedDate}
        AND appointment_window_start <= ${formattedStartTime}::time
        AND appointment_window_end >= ${formattedEndTime}::time
        AND status IN ('available', 'rescheduling')
      LIMIT 1
    `;

    if (availableAppointments.length > 0) {
      const newAppointmentId = availableAppointments[0].id;
      const updateResult = await sql`
        UPDATE treatments
        SET 
          status = 'requested',
          location = ${location},
          client_id = ${id},
          appointment_begins_at = ${formattedStartTime}::time,
          appointment_ends_at = ${formattedEndTime}::time,
          duration = ${Number.parseInt(duration)},
          workplace = ${workplace},
          google_calendar_event_id = ${
            currentAppointment.google_calendar_event_id
          },
          google_calendar_event_link = ${
            currentAppointment.google_calendar_event_link
          },
          consent_form = ${consentForm},
          consent_form_submitted_at = ${consentFormSubmittedAt},
          code = ${giftCardCode || null}
        WHERE id = ${newAppointmentId}
        RETURNING id, code
      `;
      try {
        await logAuditEvent({
          typeOfInfo: "appointment rescheduling",
          actionPerformed: "rescheduled",
          accessedById: id,
          whoseInfoId: id,
          reasonForAccess: "Self-rescheduling appointment",
          additionalDetails: {
            accessedByName: `${firstName} ${lastName}`,
            whoseInfoName: `${firstName} ${lastName}`,
            oldAppointmentId: currentAppointmentId,
            newAppointmentId: newAppointmentId,
            newAppointmentDate: formattedDate,
            newAppointmentTime: `${formattedStartTime} - ${formattedEndTime}`,
            location,
            duration,
            workplace,
            consentFormTransferred: consentForm ? true : false,
            giftCardCodeTransferred: giftCardCode ? true : false,
            giftCardCode: giftCardCode || null,
            accessMethod: "web application",
          },
        });
      } catch (logError) {
        console.error("Error logging audit event:", logError);
      }

      revalidatePath("/dashboard/patient");
      return {
        success: true,
        message: "Appointment rescheduled successfully.",
      };
    } else {

      // Revert Google Calendar event if needed
      if (currentAppointment.google_calendar_event_id) {
        try {
          await calendar.events.update({
            calendarId: GOOGLE_CALENDAR_ID,
            eventId: currentAppointment.google_calendar_event_id,
            resource: {
              start: {
                dateTime: `${
                  new Date(currentAppointment.date).toISOString().split("T")[0]
                }T${currentAppointment.appointment_begins_at}:00`,
                timeZone: "America/Toronto",
              },
              end: {
                dateTime: `${
                  new Date(currentAppointment.date).toISOString().split("T")[0]
                }T${currentAppointment.appointment_ends_at}:00`,
                timeZone: "America/Toronto",
              },
            },
          });
        } catch (calendarError) {
          console.error(
            "Error reverting Google Calendar event:",
            calendarError,
          );
        }
      }

      await sql`
        UPDATE treatments
        SET 
          status = 'booked',
          client_id = ${id},
          google_calendar_event_id = ${
            currentAppointment.google_calendar_event_id
          },
          google_calendar_event_link = ${
            currentAppointment.google_calendar_event_link
          },
          consent_form = ${consentForm},
          consent_form_submitted_at = ${consentFormSubmittedAt},
          code = ${giftCardCode || null}
        WHERE id = ${currentAppointmentId}
      `;

      return {
        success: false,
        message: "No matching appointment found for rescheduling.",
      };
    }
  } catch (error) {
    console.error(
      "An error occurred while rescheduling the appointment:",
      error,
    );
    return {
      success: false,
      message: "An error occurred while rescheduling the appointment.",
    };
  }
}

// export async function rescheduleAppointment(
//   currentAppointmentId,
//   {
//     location,
//     duration,
//     appointmentTime,
//     workplace,
//     appointmentDate,
//     RMTLocationId,
//   }
// ) {
//   const session = await getSession();
//   if (!session) {
//     return {
//       success: false,
//       message: "You must be logged in to reschedule an appointment.",
//     };
//   }

//   const { id, firstName, lastName, email, phoneNumber } = session.resultObj;

//   // Convert appointmentDate from "Month Day, Year" to "YYYY-MM-DD"
//   const formattedDate = new Date(appointmentDate).toISOString().split("T")[0];

//   // Convert appointmentTime from "HH:MM AM/PM - HH:MM AM/PM" to "HH:MM" (24-hour format)
//   const [startTime, endTime] = appointmentTime.split(" - ");
//   const formattedStartTime = new Date(
//     `${appointmentDate} ${startTime}`
//   ).toLocaleTimeString("en-US", {
//     hour12: false,
//     hour: "2-digit",
//     minute: "2-digit",
//   });
//   const formattedEndTime = new Date(
//     `${appointmentDate} ${endTime}`
//   ).toLocaleTimeString("en-US", {
//     hour12: false,
//     hour: "2-digit",
//     minute: "2-digit",
//   });

//   try {
//     // Get the current appointment
//     const { rows: currentAppointments } = await sql`
//       SELECT * FROM treatments
//       WHERE id = ${currentAppointmentId}
//     `;

//     const currentAppointment = currentAppointments[0];

//     if (!currentAppointment) {
//       return {
//         success: false,
//         message: "Current appointment not found.",
//       };
//     }

//     // Store consent form data to transfer to the new appointment
//     const consentForm = currentAppointment.consent_form;
//     const consentFormSubmittedAt = currentAppointment.consent_form_submitted_at;

//     // Update Google Calendar if there's an event ID
//     if (currentAppointment.google_calendar_event_id) {
//       const updatedEvent = {
//         summary: `[Requested] Mx ${firstName} ${lastName}`,
//         location: location,
//         description: `Email: ${email}\nPhone: ${phoneNumber || "N/A"}`,
//         start: {
//           dateTime: `${formattedDate}T${formattedStartTime}:00`,
//           timeZone: "America/Toronto",
//         },
//         end: {
//           dateTime: `${formattedDate}T${formattedEndTime}:00`,
//           timeZone: "America/Toronto",
//         },
//         colorId: "6", // tangerine color
//       };

//       try {
//         await calendar.events.update({
//           calendarId: GOOGLE_CALENDAR_ID,
//           eventId: currentAppointment.google_calendar_event_id,
//           resource: updatedEvent,
//         });
//         console.log("Google Calendar event updated successfully.");
//       } catch (calendarError) {
//         console.error("Error updating Google Calendar event:", calendarError);
//       }
//     }

//     // Mark the current appointment as available
//     await sql`
//       UPDATE treatments
//       SET
//         status = 'available',
//         client_id = NULL,
//         consent_form = NULL,
//         consent_form_submitted_at = NULL,
//         google_calendar_event_id = NULL,
//         google_calendar_event_link = NULL
//       WHERE id = ${currentAppointmentId}
//     `;

//     // Find a new available appointment slot
//     const { rows: availableAppointments } = await sql`
//       SELECT * FROM treatments
//       WHERE
//         rmt_location_id = ${RMTLocationId}
//         AND date = ${formattedDate}
//         AND appointment_window_start <= ${formattedStartTime}::time
//         AND appointment_window_end >= ${formattedEndTime}::time
//         AND status IN ('available', 'rescheduling')
//       LIMIT 1
//     `;

//     if (availableAppointments.length > 0) {
//       const newAppointmentId = availableAppointments[0].id;

//       // Update the new appointment with all data including consent form
//       await sql`
//         UPDATE treatments
//         SET
//           status = 'requested',
//           location = ${location},
//           client_id = ${id},
//           appointment_begins_at = ${formattedStartTime}::time,
//           appointment_ends_at = ${formattedEndTime}::time,
//           duration = ${parseInt(duration)},
//           workplace = ${workplace},
//           google_calendar_event_id = ${
//             currentAppointment.google_calendar_event_id
//           },
//           google_calendar_event_link = ${
//             currentAppointment.google_calendar_event_link
//           },
//           consent_form = ${consentForm},
//           consent_form_submitted_at = ${consentFormSubmittedAt}
//         WHERE id = ${newAppointmentId}
//       `;

//       try {
//         await logAuditEvent({
//           typeOfInfo: "appointment rescheduling",
//           actionPerformed: "rescheduled",
//           accessedById: id,
//           whoseInfoId: id,
//           reasonForAccess: "Self-rescheduling appointment",
//           additionalDetails: {
//             accessedByName: `${firstName} ${lastName}`,
//             whoseInfoName: `${firstName} ${lastName}`,
//             oldAppointmentId: currentAppointmentId,
//             newAppointmentDate: formattedDate,
//             newAppointmentTime: `${formattedStartTime} - ${formattedEndTime}`,
//             location,
//             duration,
//             workplace,
//             consentFormTransferred: consentForm ? true : false,
//             accessMethod: "web application",
//           },
//         });
//       } catch (logError) {
//         // Just log the error but don't let it break the main function
//         console.error("Error logging audit event:", logError);
//       }

//       // Send email notification
//       await sendRescheduleNotificationEmail(
//         currentAppointment,
//         { firstName, lastName, email, phoneNumber },
//         {
//           appointmentDate: formattedDate,
//           appointmentTime: `${formattedStartTime} - ${formattedEndTime}`,
//           location,
//           duration,
//         }
//       );

//       revalidatePath("/dashboard/patient");
//       return {
//         success: true,
//         message: "Appointment rescheduled successfully.",
//       };
//     } else {
//       console.log("No matching appointment found for rescheduling.");

//       // Revert Google Calendar event if needed
//       if (currentAppointment.google_calendar_event_id) {
//         try {
//           await calendar.events.update({
//             calendarId: GOOGLE_CALENDAR_ID,
//             eventId: currentAppointment.google_calendar_event_id,
//             resource: {
//               start: {
//                 dateTime: `${
//                   new Date(currentAppointment.date).toISOString().split("T")[0]
//                 }T${currentAppointment.appointment_begins_at}:00`,
//                 timeZone: "America/Toronto",
//               },
//               end: {
//                 dateTime: `${
//                   new Date(currentAppointment.date).toISOString().split("T")[0]
//                 }T${currentAppointment.appointment_ends_at}:00`,
//                 timeZone: "America/Toronto",
//               },
//             },
//           });
//           console.log("Google Calendar event reverted successfully.");
//         } catch (calendarError) {
//           console.error(
//             "Error reverting Google Calendar event:",
//             calendarError
//           );
//         }
//       }

//       // Revert the current appointment back to booked with the consent form data
//       await sql`
//         UPDATE treatments
//         SET
//           status = 'booked',
//           client_id = ${id},
//           google_calendar_event_id = ${currentAppointment.google_calendar_event_id},
//           google_calendar_event_link = ${currentAppointment.google_calendar_event_link},
//           consent_form = ${consentForm},
//           consent_form_submitted_at = ${consentFormSubmittedAt}
//         WHERE id = ${currentAppointmentId}
//       `;

//       return {
//         success: false,
//         message: "No matching appointment found for rescheduling.",
//       };
//     }
//   } catch (error) {
//     console.error(
//       "An error occurred while rescheduling the appointment:",
//       error
//     );
//     return {
//       success: false,
//       message: "An error occurred while rescheduling the appointment.",
//     };
//   }
// }

async function sendRescheduleNotificationEmail(
  currentAppointment,
  user,
  newAppointment,
) {
  const transporter = getEmailTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER, // Sending to the RMT
    subject: "Appointment Reschedule Request",
    text: `
      A reschedule request has been made by ${user.firstName} ${user.lastName}.

      Current Appointment:
      Date: ${currentAppointment.appointmentDate}
      Time: ${currentAppointment.appointmentBeginsAt} - ${
        currentAppointment.appointmentEndsAt
      }

      Requested New Appointment:
      Date: ${newAppointment.appointmentDate}
      Time: ${newAppointment.appointmentTime}
      Location: ${newAppointment.location}
      Duration: ${newAppointment.duration} minutes

      User Details:
      Name: ${user.firstName} ${user.lastName}
      Email: ${user.email}
      Phone: ${user?.phoneNumber || "N/A"}

      Please log in to your dashboard to approve or deny this request.
    `,
    html: `
      <h2>Appointment Reschedule Request</h2>
      <p>A reschedule request has been made by ${user.firstName} ${
        user.lastName
      }.</p>

      <h3>Current Appointment:</h3>
      <p>
        Date: ${currentAppointment.appointmentDate}<br>
        Time: ${currentAppointment.appointmentBeginsAt} - ${
          currentAppointment.appointmentEndsAt
        }
      </p>

      <h3>Requested New Appointment:</h3>
      <p>
        Date: ${newAppointment.appointmentDate}<br>
        Time: ${newAppointment.appointmentTime}<br>
        Location: ${newAppointment.location}<br>
        Duration: ${newAppointment.duration} minutes
      </p>

      <h3>User Details:</h3>
      <p>
        Name: ${user.firstName} ${user.lastName}<br>
        Email: ${user.email}<br>
        Phone: ${user?.phoneNumber || "N/A"}
      </p>

      <p>Please <a href="https://www.ciprmt.com/auth/sign-in">log in to your dashboard</a> to approve or deny this request.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending reschedule notification email:", error);
  }
}

export async function addHealthHistory(data) {
  try {
    const userId = await checkAuth();

    // Server-side validation
    const validatedData = healthHistorySchema.parse(data);

    // Encrypt sensitive data
    const encryptedData = await encryptData(validatedData);
    if (!encryptedData) {
      throw new Error("Failed to encrypt health history data");
    }

    // Insert into PostgreSQL
    const { rows } = await sql`
      INSERT INTO health_histories (
        user_id,
        encrypted_data,
        created_at
      ) VALUES (
        ${userId},
        ${encryptedData},
        NOW()
      )
      RETURNING id, created_at
    `;

    if (rows.length > 0) {
      const newHealthHistory = rows[0];

      // Update the user's lastHealthHistoryUpdate field
      await sql`
        UPDATE users
        SET last_health_history_update = NOW()
        WHERE id = ${userId}
      `;

      // Fetch updated user data
      const { rows: userRows } = await sql`
        SELECT 
          id, 
          first_name, 
          last_name,
          last_health_history_update
        FROM users
        WHERE id = ${userId}
      `;

      if (userRows.length === 0) {
        throw new Error("User not found after update");
      }

      const updatedUser = userRows[0];

      // Regenerate the session with updated user data
      const session = await getSession();
      const newSession = {
        ...session,
        resultObj: {
          ...session.resultObj,
          lastHealthHistoryUpdate: updatedUser.last_health_history_update,
        },
      };

      const expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
      const encryptedSession = await encrypt({ ...newSession, expires });

      const cookieStore = await cookies();
      cookieStore.set("session", encryptedSession, {
        expires,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });

      // Log the audit event
      try {
        await logAuditEvent({
          typeOfInfo: "health history",
          actionPerformed: "added",
          accessedById: userId,
          whoseInfoId: userId,
          reasonForAccess: "Self-adding health history",
          additionalDetails: {
            accessedByName: `${updatedUser.first_name} ${updatedUser.last_name}`,
            whoseInfoName: `${updatedUser.first_name} ${updatedUser.last_name}`,
            healthHistoryId: newHealthHistory.id,
            createdAt: newHealthHistory.created_at,
            accessMethod: "web application",
          },
        });
      } catch (logError) {
        // Just log the error but don't let it break the main function
        console.error("Error logging audit event:", logError);
      }

      revalidatePath("/dashboard/patient");
      return { success: true, id: newHealthHistory.id };
    } else {
      throw new Error("Failed to insert health history");
    }
  } catch (error) {
    console.error("Error adding health history:", error);
    if (error.name === "ZodError") {
      throw new Error(
        `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      );
    }
    throw new Error(error.message || "Failed to add health history");
  }
}

export async function getClientHealthHistories(id) {
  try {
    const authenticatedUserId = await checkAuth();

    // For PostgreSQL, we're comparing UUIDs directly, no need for toString()
    if (id !== authenticatedUserId) {
      throw new Error("Unauthorized access: User ID mismatch");
    }

    // Query health histories from PostgreSQL
    const { rows: healthHistories } = await sql`
      SELECT 
        id, 
        user_id, 
        encrypted_data, 
        created_at
      FROM health_histories
      WHERE user_id = ${authenticatedUserId}
      ORDER BY created_at DESC
    `;

    const decryptedHealthHistories = healthHistories
      .map((history) => {
        let decryptedData = {};
        if (history.encrypted_data) {
          try {
            // Use the proper decryptData function
            decryptedData = decryptData(history.encrypted_data);
            if (!decryptedData) {
              console.error(`Failed to decrypt health history ${history.id}`);
              return null;
            }

            // Add backwards compatibility - ensure new fields exist with default values
            decryptedData = {
              ...decryptedData,
              preferredLanguage: decryptedData.preferredLanguage || "",
              accessibilityNeeds: decryptedData.accessibilityNeeds || "",
              emergencyContactName: decryptedData.emergencyContactName || "",
              emergencyContactPhone: decryptedData.emergencyContactPhone || "",
              practitionerReferral: decryptedData.practitionerReferral || {
                hasReferral: false,
                practitionerName: "",
                practitionerAddress: "",
              },
            };
          } catch (e) {
            console.error(`Failed to decrypt health history ${history.id}:`, e);
            return null;
          }
        } else {
          // Handle unencrypted data
          const { id, user_id, created_at, ...unencryptedData } = history;
          decryptedData = unencryptedData;
        }

        // Serialize the data to avoid symbol properties
        return JSON.parse(
          JSON.stringify({
            _id: history.id, // Use PostgreSQL UUID as _id for compatibility
            userId: history.user_id,
            createdAt: history.created_at.toISOString(),
            ...decryptedData,
          }),
        );
      })
      .filter(Boolean); // Remove any null entries from failed decryption

    // Fetch user details for audit log
    const { rows: userRows } = await sql`
      SELECT first_name, last_name
      FROM users
      WHERE id = ${authenticatedUserId}
    `;

    if (userRows.length === 0) {
      throw new Error("User not found");
    }

    const user = userRows[0];

    // Log the audit event
    try {
      await logAuditEvent({
        typeOfInfo: "health histories",
        actionPerformed: "viewed",
        accessedById: authenticatedUserId,
        whoseInfoId: authenticatedUserId,
        reasonForAccess: "Self-viewing health history records",
        additionalDetails: {
          accessedByName: `${user.first_name} ${user.last_name}`,
          whoseInfoName: `${user.first_name} ${user.last_name}`,
          numberOfHistories: decryptedHealthHistories.length,
          oldestHistoryDate:
            decryptedHealthHistories[decryptedHealthHistories.length - 1]
              ?.createdAt,
          newestHistoryDate: decryptedHealthHistories[0]?.createdAt,
          accessMethod: "web application",
        },
      });
    } catch (logError) {
      // Just log the error but don't let it break the main function
      console.error("Error logging audit event:", logError);
    }

    return decryptedHealthHistories;
  } catch (error) {
    console.error("Error fetching client health histories:", error);
    throw new Error("Failed to fetch client health histories");
  }
}

// export async function addHealthHistory(data) {
//   try {
//     const userId = await checkAuth();

//     // Server-side validation
//     const validatedData = healthHistorySchema.parse(data);

//     // Encrypt sensitive data
//     const encryptedData = encryptData(validatedData);
//     if (!encryptedData) {
//       throw new Error("Failed to encrypt health history data");
//     }

//     // Insert into PostgreSQL
//     const { rows } = await sql`
//       INSERT INTO health_histories (
//         user_id,
//         encrypted_data,
//         created_at
//       ) VALUES (
//         ${userId},
//         ${encryptedData},
//         NOW()
//       )
//       RETURNING id, created_at
//     `;

//     if (rows.length > 0) {
//       const newHealthHistory = rows[0];

//       // Update the user's lastHealthHistoryUpdate field
//       await sql`
//         UPDATE users
//         SET last_health_history_update = NOW()
//         WHERE id = ${userId}
//       `;

//       // Fetch updated user data
//       const { rows: userRows } = await sql`
//         SELECT
//           id,
//           first_name,
//           last_name,
//           last_health_history_update
//         FROM users
//         WHERE id = ${userId}
//       `;

//       if (userRows.length === 0) {
//         throw new Error("User not found after update");
//       }

//       const updatedUser = userRows[0];

//       // Regenerate the session with updated user data
//       const session = await getSession();
//       const newSession = {
//         ...session,
//         resultObj: {
//           ...session.resultObj,
//           lastHealthHistoryUpdate: updatedUser.last_health_history_update,
//         },
//       };

//       const expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
//       const encryptedSession = await encrypt({ ...newSession, expires });

//       const cookieStore = await cookies();
//       cookieStore.set("session", encryptedSession, {
//         expires,
//         httpOnly: true,
//         secure: true,
//         sameSite: "strict",
//       });

//       // Log the audit event
//       try {
//         await logAuditEvent({
//           typeOfInfo: "health history",
//           actionPerformed: "added",
//           accessedById: userId,
//           whoseInfoId: userId,
//           reasonForAccess: "Self-adding health history",
//           additionalDetails: {
//             accessedByName: `${updatedUser.first_name} ${updatedUser.last_name}`,
//             whoseInfoName: `${updatedUser.first_name} ${updatedUser.last_name}`,
//             healthHistoryId: newHealthHistory.id,
//             createdAt: newHealthHistory.created_at,
//             accessMethod: "web application",
//           },
//         });
//       } catch (logError) {
//         // Just log the error but don't let it break the main function
//         console.error("Error logging audit event:", logError);
//       }

//       revalidatePath("/dashboard/patient");
//       return { success: true, id: newHealthHistory.id };
//     } else {
//       throw new Error("Failed to insert health history");
//     }
//   } catch (error) {
//     console.error("Error adding health history:", error);
//     if (error.name === "ZodError") {
//       throw new Error(
//         `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
//       );
//     }
//     throw new Error(error.message || "Failed to add health history");
//   }
// }

// export async function getClientHealthHistories(id) {
//   try {
//     const authenticatedUserId = await checkAuth();

//     // For PostgreSQL, we're comparing UUIDs directly, no need for toString()
//     if (id !== authenticatedUserId) {
//       throw new Error("Unauthorized access: User ID mismatch");
//     }

//     // Query health histories from PostgreSQL
//     const { rows: healthHistories } = await sql`
//       SELECT
//         id,
//         user_id,
//         encrypted_data,
//         created_at
//       FROM health_histories
//       WHERE user_id = ${authenticatedUserId}
//       ORDER BY created_at DESC
//     `;

//     const decryptedHealthHistories = healthHistories.map((history) => {
//       let decryptedData = {};
//       if (history.encrypted_data) {
//         const decrypted = decryptData(history.encrypted_data);
//         if (decrypted) {
//           decryptedData = decrypted;
//         } else {
//           console.error(`Failed to decrypt health history ${history.id}`);
//         }
//       } else {
//         // Handle unencrypted data
//         const { id, user_id, created_at, ...unencryptedData } = history;
//         decryptedData = unencryptedData;
//       }

//       // Serialize the data to avoid symbol properties
//       return JSON.parse(
//         JSON.stringify({
//           _id: history.id, // Use PostgreSQL UUID as _id for compatibility
//           userId: history.user_id,
//           createdAt: history.created_at.toISOString(),
//           ...decryptedData,
//         })
//       );
//     });

//     // Fetch user details for audit log
//     const { rows: userRows } = await sql`
//       SELECT first_name, last_name
//       FROM users
//       WHERE id = ${authenticatedUserId}
//     `;

//     if (userRows.length === 0) {
//       throw new Error("User not found");
//     }

//     const user = userRows[0];

//     // Log the audit event
//     try {
//       await logAuditEvent({
//         typeOfInfo: "health histories",
//         actionPerformed: "viewed",
//         accessedById: authenticatedUserId,
//         whoseInfoId: authenticatedUserId,
//         reasonForAccess: "Self-viewing health history records",
//         additionalDetails: {
//           accessedByName: `${user.first_name} ${user.last_name}`,
//           whoseInfoName: `${user.first_name} ${user.last_name}`,
//           numberOfHistories: decryptedHealthHistories.length,
//           oldestHistoryDate:
//             decryptedHealthHistories[decryptedHealthHistories.length - 1]
//               ?.createdAt,
//           newestHistoryDate: decryptedHealthHistories[0]?.createdAt,
//           accessMethod: "web application",
//         },
//       });
//     } catch (logError) {
//       // Just log the error but don't let it break the main function
//       console.error("Error logging audit event:", logError);
//     }

//     return decryptedHealthHistories;
//   } catch (error) {
//     console.error("Error fetching client health histories:", error);
//     throw new Error("Failed to fetch client health histories");
//   }
// }

//////////////////////////////////////////////////
//////////CONTACT PAGE////////////////////////////
//////////////////////////////////////////////////

export async function sendMessageToCip(prevState, formData) {
  try {
    const currentUser = await getSession();

    if (!currentUser || !currentUser.resultObj) {
      throw new Error("User not authenticated");
    }

    const userName = currentUser.resultObj.preferredName
      ? `${currentUser.resultObj.preferredName} ${currentUser.resultObj.lastName}`
      : `${currentUser.resultObj.firstName} ${currentUser.resultObj.lastName}`;

    const message = formData.get("message");

    // Insert the message into the PostgreSQL database
    const result = await sql`
      INSERT INTO messages (
        status, 
        email, 
        first_name, 
        last_name, 
        phone, 
        message, 
        rmt_id
      ) VALUES (
        'sent', 
        ${currentUser.resultObj.email}, 
        ${currentUser.resultObj.firstName}, 
        ${currentUser.resultObj.lastName}, 
        ${currentUser.resultObj.phoneNumber || "N/A"}, 
        ${message}, 
        ${currentUser.resultObj.rmtId}
      ) 
      RETURNING id
    `;

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Failed to save message to database");
    }

    const messageId = result.rows[0].id;

    const transporter = await getEmailTransporter();

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New message from CipRMT.com</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">New message from CipRMT.com</h2>
        <p style="font-weight: bold;">This is a message from ${he.encode(
          userName,
        )}:</p>
        <div style="background-color: #ffffff; border-left: 4px solid #3498db; padding: 15px; margin: 10px 0;">
          <p style="margin: 0;">${he.encode(message)}</p>
        </div>
        <div style="margin-top: 20px; background-color: #e8f4f8; padding: 15px; border-radius: 5px;">
          <p style="margin: 5px 0;">
            <strong>Reply by email:</strong> 
            <a href="mailto:${he.encode(
              currentUser.resultObj.email,
            )}" style="color: #3498db; text-decoration: none;">${he.encode(
              currentUser.resultObj.email,
            )}</a>
          </p>
          <p style="margin: 5px 0;">
            <strong>Reply by phone:</strong> 
            <a href="tel:${he.encode(
              currentUser.resultObj.phoneNumber || "N/A",
            )}" style="color: #3498db; text-decoration: none;">${he.encode(
              currentUser.resultObj.phoneNumber || "N/A",
            )}</a>
          </p>
        </div>
        <div style="margin-top: 20px; font-size: 12px; color: #7f8c8d; text-align: center;">
          <p>This is an automated message from CipRMT.com. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `CipRMT.com: Message from ${userName}`,
      text: `New message from ${userName}:

${message}

Reply by email: ${currentUser.resultObj.email}
Reply by phone: ${currentUser.resultObj.phoneNumber || "N/A"}`,
      html: emailHtml,
    });

    // Update the message status to "sent" after email is delivered
    await sql`
      UPDATE messages 
      SET status = 'delivered' 
      WHERE id = ${messageId}
    `;

    return { success: true, message: "Message sent and saved successfully" };
  } catch (error) {
    console.error("Error sending message:", error);
    return {
      success: false,
      message: "Failed to send message",
    };
  }
}

export async function getAllMessagesByRMTId(rmtId) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can access messages");
    }
    if (session.resultObj.rmtId !== rmtId) {
      throw new Error("Unauthorized: RMT mismatch");
    }

    // Use the sql template literal from @vercel/postgres
    const { rows: messages } = await sql`
      SELECT 
        id,
        created_at as "createdAt",
        rmt_id as "rmtId",
        first_name as "firstName",
        last_name as "lastName",
        phone,
        message,
        mongodb_id as "mongodbId",
        status,
        email
      FROM messages
      WHERE rmt_id = ${rmtId}
      ORDER BY created_at DESC
    `;

    return messages;
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw new Error("Failed to fetch messages");
  }
}

export async function sendReply(messageId, replyText) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can reply");
    }

    // First, find the message
    const { rows: messages } = await sql`
      SELECT * FROM messages
      WHERE id = ${messageId}
    `;

    if (messages.length === 0) {
      throw new Error("Message not found");
    }

    const message = messages[0];
    if (message.rmt_id !== session.resultObj.rmtId) {
      throw new Error("Unauthorized: RMT mismatch");
    }

    // Update message status
    await sql`
      UPDATE messages
      SET status = 'replied'
      WHERE id = ${messageId}
    `;

    // Send email reply
    const transporter = await getEmailTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: message.email,
      subject: "Re: Your message to CipRMT.com",
      text: replyText,
      html: `<p>${replyText.replace(/\n/g, "<br>")}</p>`,
    });

    revalidatePath("/dashboard/rmt");
    return { success: true, message: "Reply sent successfully" };
  } catch (error) {
    console.error("Error sending reply:", error);
    return {
      success: false,
      message: "An error occurred while sending the reply",
    };
  }
}

export async function updateMessageStatus(formData) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can update messages");
    }

    const messageId = formData.get("messageId");
    const status = formData.get("status");

    if (!messageId || !status) {
      throw new Error("Message ID and status are required");
    }

    // Update the message status in PostgreSQL
    const { rowCount } = await sql`
      UPDATE messages
      SET status = ${status}
      WHERE id = ${messageId}
        AND rmt_id = ${session.resultObj.rmtId}
    `;

    if (rowCount === 0) {
      throw new Error("Message not found");
    }

    // Revalidate the dashboard page to reflect the changes
    revalidatePath("/dashboard/rmt");

    return {
      success: true,
      message: `Message status updated to ${status}`,
    };
  } catch (error) {
    console.error("Error updating message status:", error);
    return {
      success: false,
      message: "An error occurred while updating the message status",
    };
  }
}

//////////////////////////////////////////////////
//////////PASSWORD RESET//////////////////////////
//////////////////////////////////////////////////

async function saveResetTokenToDatabase(email, token) {
  try {
    // Calculate token expiration (1 hour from now)
    const tokenExpires = new Date(Date.now() + 3600000);

    // Update the user record with the reset token
    const { rowCount } = await sql`
      UPDATE users
      SET 
        reset_token = ${token},
        reset_token_expires = ${tokenExpires.toISOString()}
      WHERE email = ${email}
    `;

    if (rowCount === 0) {
      throw new Error("No user found with that email address.");
    }
  } catch (error) {
    console.error("Error in saveResetTokenToDatabase:", error);
    throw error;
  }
}

export async function resetPassword(email) {
  try {
    // Generate a random token
    const token = randomBytes(32).toString("hex");

    // Save the token to the database
    await saveResetTokenToDatabase(email, token);

    // Get the email transporter
    const transporter = getEmailTransporter();

    // Create the reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    // Send the reset email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      text: `To reset your password, please click on this link: ${resetUrl}`,
      html: `
        <p>To reset your password, please click on this link: <a href="${resetUrl}">Reset Password</a></p>
      `,
    });

    return {
      message:
        "Password reset link sent to your email. Check your inbox (and spam folder).",
    };
  } catch (error) {
    console.error("Error in resetPassword:", error);
    throw new Error(
      "Failed to process password reset request. Please try again.",
    );
  }
}

export async function resetPasswordWithToken(token, newPassword) {
  try {
    // Find user with the given reset token and check if it's still valid
    const { rows: users } = await sql`
      SELECT id
      FROM users
      WHERE 
        reset_token = ${token} AND
        reset_token_expires > CURRENT_TIMESTAMP
    `;

    if (!users || users.length === 0) {
      throw new Error("Invalid or expired reset token");
    }

    const userId = users[0].id;

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and remove reset token
    await sql`
      UPDATE users
      SET 
        password = ${hashedPassword},
        reset_token = NULL,
        reset_token_expires = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `;

    return { message: "Your password has been reset successfully" };
  } catch (error) {
    console.error("Error resetting password:", error);
    throw new Error("Failed to reset password. Please try again.");
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////RMT SIDE/////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function getDashboardAppointments(rmtId) {
  try {
    // Get current date and time in Toronto timezone
    const now = new Date();
    const torontoTime = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Toronto" }),
    );
    const currentDateString = torontoTime.toISOString().split("T")[0];
    const currentHour = torontoTime.getHours();
    const currentMinute = torontoTime.getMinutes();
    const currentTimeString = `${currentHour
      .toString()
      .padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}:00`;

    // Query all treatments for this RMT with status "requested" or "booked"
    const { rows: treatments } = await sql`
      SELECT
        t.id,
        t.client_id AS "clientId",
        t.date AS "appointmentDate",
        t.appointment_begins_at AS "appointmentBeginsAt",
        t.appointment_ends_at AS "appointmentEndsAt",
        t.status,
        t.location,
        t.duration,
        t.workplace,
        t.price,
        t.payment_type AS "paymentType",
        t.google_calendar_event_id AS "googleCalendarEventId",
        t.google_calendar_event_link AS "googleCalendarEventLink",
        t.created_at AS "createdAt",
        t.consent_form AS "consentForm",
        t.code,
        u.first_name AS "firstName",
        u.last_name AS "lastName",
        u.email,
        u.phone_number AS "phoneNumber",
        u.last_health_history_update AS "lastHealthHistoryUpdate"
      FROM
        treatments t
      JOIN
        users u ON t.client_id = u.id
      WHERE
        t.rmt_id = ${rmtId}
        AND t.status IN ('requested', 'booked')
      ORDER BY
        t.date ASC,
        t.appointment_begins_at ASC
    `;

    // Categorize treatments
    const requested = [];
    const upcoming = [];
    const past = [];

    // Process each treatment
    treatments.forEach((treatment) => {
      // For PostgreSQL date type, we need to convert to a string for comparison
      let appointmentDateStr;

      if (treatment.appointmentDate instanceof Date) {
        appointmentDateStr = treatment.appointmentDate
          .toISOString()
          .split("T")[0];
      } else if (typeof treatment.appointmentDate === "string") {
        appointmentDateStr = treatment.appointmentDate;
      } else {
        const dateObj = new Date(treatment.appointmentDate);
        appointmentDateStr = dateObj.toISOString().split("T")[0];
      }

      if (treatment.status === "requested") {
        requested.push(treatment);
      } else if (treatment.status === "booked") {
        // Compare dates as strings in YYYY-MM-DD format
        if (appointmentDateStr > currentDateString) {
          // Future date
          upcoming.push(treatment);
        } else if (appointmentDateStr < currentDateString) {
          // Past date
          past.push(treatment);
        } else {
          // Same date - check the time (including currently happening appointments)
          const appointmentEndTime = treatment.appointmentEndsAt;

          // Show appointment if it hasn't ended yet (future or currently happening)
          if (appointmentEndTime >= currentTimeString) {
            upcoming.push(treatment);
          } else {
            // Already ended today
            past.push(treatment);
          }
        }
      }
    });

    return {
      requested,
      upcoming,
      past,
    };
  } catch (error) {
    console.error("Error fetching dashboard treatments:", error);
    throw new Error("Failed to fetch treatments. Please try again.");
  }
}

// export async function getDashboardAppointments(rmtId) {
//   try {
//     // Get current date for comparison
//     const now = new Date();
//     const currentDateString = now.toISOString().split("T")[0];

//     // Query all treatments for this RMT with status "requested" or "booked"
//     const { rows: treatments } = await sql`
//       SELECT
//         t.id,
//         t.client_id AS "clientId",
//         t.date AS "appointmentDate",
//         t.appointment_begins_at AS "appointmentBeginsAt",
//         t.appointment_ends_at AS "appointmentEndsAt",
//         t.status,
//         t.location,
//         t.duration,
//         t.workplace,
//         t.price,
//         t.payment_type AS "paymentType",
//         t.google_calendar_event_id AS "googleCalendarEventId",
//         t.google_calendar_event_link AS "googleCalendarEventLink",
//         t.created_at AS "createdAt",
//         t.consent_form AS "consentForm",
//         u.first_name AS "firstName",
//         u.last_name AS "lastName",
//         u.email
//       FROM
//         treatments t
//       JOIN
//         users u ON t.client_id = u.id
//       WHERE
//         t.rmt_id = ${rmtId}
//         AND t.status IN ('requested', 'booked')
//       ORDER BY
//         t.date ASC,
//         t.appointment_begins_at ASC
//     `;

//     // Categorize treatments
//     const requested = [];
//     const upcoming = [];
//     const past = [];

//     // Process each treatment
//     treatments.forEach((treatment) => {
//       // For PostgreSQL date type, we need to convert to a string for comparison
//       let appointmentDateStr;

//       if (treatment.appointmentDate instanceof Date) {
//         appointmentDateStr = treatment.appointmentDate
//           .toISOString()
//           .split("T")[0];
//       } else if (typeof treatment.appointmentDate === "string") {
//         appointmentDateStr = treatment.appointmentDate;
//       } else {
//         const dateObj = new Date(treatment.appointmentDate);
//         appointmentDateStr = dateObj.toISOString().split("T")[0];
//       }

//       if (treatment.status === "requested") {
//         requested.push(treatment);
//       } else if (treatment.status === "booked") {
//         // Compare dates as strings in YYYY-MM-DD format
//         if (appointmentDateStr > currentDateString) {
//           // Future date
//           upcoming.push(treatment);
//         } else if (appointmentDateStr < currentDateString) {
//           // Past date
//           past.push(treatment);
//         } else {
//           // Same date - check the time
//           const appointmentTime = treatment.appointmentBeginsAt;
//           const currentHour = now.getHours();
//           const currentMinute = now.getMinutes();
//           const currentTimeString = `${currentHour
//             .toString()
//             .padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}:00`;

//           if (appointmentTime > currentTimeString) {
//             // Later today
//             upcoming.push(treatment);
//           } else {
//             // Earlier today
//             past.push(treatment);
//           }
//         }
//       }
//     });

//     return {
//       requested,
//       upcoming,
//       past,
//     };
//   } catch (error) {
//     console.error("Error fetching dashboard treatments:", error);
//     throw new Error("Failed to fetch treatments. Please try again.");
//   }
// }

// Helper function to format dates consistently
function formatDateToYYYYMMDD(date) {
  if (!date) return null;

  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function updateAppointmentStatus(formData) {
  const appointmentId = formData.get("appointmentId");
  const status = formData.get("status");

  try {
    // Get the appointment with gift card code
    const { rows } = await sql`
      SELECT 
        t.id,
        t.date,
        t.appointment_begins_at,
        t.appointment_ends_at,
        t.location,
        t.duration,
        t.status,
        t.google_calendar_event_id,
        t.workplace,
        t.code,
        u.first_name AS "firstName",
        u.last_name AS "lastName",
        u.email
      FROM 
        treatments t
      LEFT JOIN
        users u ON t.client_id = u.id
      WHERE 
        t.id = ${appointmentId}
    `;

    if (rows.length === 0) {
      return { success: false, message: "Appointment not found" };
    }

    const appointment = rows[0];

    if (status === "available") {
      // Deny request
      if (appointment.google_calendar_event_id) {
        try {
          await calendar.events.delete({
            calendarId: GOOGLE_CALENDAR_ID,
            eventId: appointment.google_calendar_event_id,
          });
        } catch (calendarError) {
          console.error("Error deleting Google Calendar event:", calendarError);
        }
      }

      // Clear all user-related fields including gift card code
      await sql`
        UPDATE treatments
        SET 
          status = ${status},
          client_id = NULL,
          duration = NULL,
          workplace = NULL,
          consent_form = NULL,
          consent_form_submitted_at = NULL,
          google_calendar_event_id = NULL,
          google_calendar_event_link = NULL,
          appointment_begins_at = NULL,
          appointment_ends_at = NULL,
          location = NULL,
          code = NULL
        WHERE 
          id = ${appointmentId}
      `;

      // Send denial email
      const transporter = getEmailTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: appointment.email,
        subject: "Appointment Request Update",
        text: `Unfortunately, your appointment request for ${appointment.date} has been declined. Please contact us to find an alternative time.`,
        html: `
          <h2>Appointment Request Update</h2>
          <p>Unfortunately, your appointment request for ${appointment.date} has been declined.</p>
          <p>Please contact us at ${process.env.EMAIL_USER} to find an alternative time.</p>
        `,
      });
    } else if (status === "booked") {
      // Accept request
      if (appointment.google_calendar_event_id) {
        try {
          await calendar.events.patch({
            calendarId: GOOGLE_CALENDAR_ID,
            eventId: appointment.google_calendar_event_id,
            resource: {
              colorId: appointment.code ? "5" : "2",
              summary: `[Confirmed]: Mx ${appointment.firstName} ${appointment.lastName}`,
            },
          });
        } catch (calendarError) {
          console.error("Error updating Google Calendar event:", calendarError);
        }
      }

      // Update status to booked
      await sql`
        UPDATE treatments
        SET status = ${status}
        WHERE id = ${appointmentId}
      `;

      // Send approval email
      const transporter = getEmailTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: appointment.email,
        subject: "Appointment Confirmed",
        text: `Your appointment for ${appointment.date} at ${
          appointment.appointment_begins_at
        } has been confirmed!${
          appointment.code
            ? ` Your gift card ${appointment.code} will be applied.`
            : ""
        }`,
        html: `
          <h2>Appointment Confirmed</h2>
          <p>Your appointment has been confirmed with the following details:</p>
          <ul>
            <li><strong>Date:</strong> ${appointment.date}</li>
            <li><strong>Time:</strong> ${appointment.appointment_begins_at}</li>
            <li><strong>Duration:</strong> ${appointment.duration} minutes</li>
            <li><strong>Location:</strong> ${appointment.location}</li>
            ${
              appointment.code
                ? `<li><strong>Gift Card:</strong> ${appointment.code}</li>`
                : ""
            }
          </ul>
          <p>We look forward to seeing you!</p>
        `,
      });
    }

    revalidatePath("/dashboard/rmt");
    return {
      success: true,
      message: `Appointment ${
        status === "booked" ? "accepted" : "denied"
      } successfully`,
    };
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return {
      success: false,
      message: "An error occurred while updating the appointment status",
    };
  }
}

// export async function updateAppointmentStatus(formData) {
//   const appointmentId = formData.get("appointmentId");
//   const status = formData.get("status");

//   try {
//     // Get the appointment with consistent property naming
//     const { rows } = await sql`
//       SELECT
//         t.id,
//         t.date,
//         t.appointment_begins_at,
//         t.appointment_ends_at,
//         t.location,
//         t.duration,
//         t.status,
//         t.google_calendar_event_id,
//         t.workplace,
//         u.first_name AS "firstName",
//         u.last_name AS "lastName",
//         u.email
//       FROM
//         treatments t
//       LEFT JOIN
//         users u ON t.client_id = u.id
//       WHERE
//         t.id = ${appointmentId}
//     `;

//     if (rows.length === 0) {
//       return { success: false, message: "Appointment not found" };
//     }

//     const appointment = rows[0];

//     // Transform the appointment object to include formatted date and time
//     const formattedAppointment = {
//       ...appointment,
//       appointmentDate: formatDateForDisplay(appointment.date),
//       appointmentBeginsAt: formatTimeForDisplay(
//         appointment.appointment_begins_at
//       ),
//     };

//     // Log the formatted appointment data
//     console.log("Formatted appointment data for email:", {
//       id: appointment.id,
//       firstName: appointment.firstName,
//       lastName: appointment.lastName,
//       email: appointment.email,
//       date: appointment.date,
//       formattedDate: formattedAppointment.appointmentDate,
//       time: appointment.appointment_begins_at,
//       formattedTime: formattedAppointment.appointmentBeginsAt,
//     });

//     if (status === "available") {
//       // Deny request
//       if (appointment.google_calendar_event_id) {
//         try {
//           await calendar.events.delete({
//             calendarId: GOOGLE_CALENDAR_ID,
//             eventId: appointment.google_calendar_event_id,
//           });
//           console.log("Google Calendar event deleted successfully.");
//         } catch (calendarError) {
//           console.error("Error deleting Google Calendar event:", calendarError);
//         }
//       }

//       // Clear all user-related fields
//       await sql`
//         UPDATE treatments
//         SET
//           status = ${status},
//           client_id = NULL,
//           duration = NULL,
//           workplace = NULL,
//           consent_form = NULL,
//           consent_form_submitted_at = NULL,
//           google_calendar_event_id = NULL,
//           google_calendar_event_link = NULL,
//           appointment_begins_at = NULL,
//           appointment_ends_at = NULL,
//           location = NULL
//         WHERE
//           id = ${appointmentId}
//       `;

//       await sendDenialEmail(formattedAppointment);
//     } else if (status === "booked") {
//       // Accept request
//       if (appointment.google_calendar_event_id) {
//         try {
//           await calendar.events.patch({
//             calendarId: GOOGLE_CALENDAR_ID,
//             eventId: appointment.google_calendar_event_id,
//             resource: {
//               colorId: "2", // "2" corresponds to "sage" in Google Calendar
//               summary: `[Confirmed]: Mx ${appointment.firstName} ${appointment.lastName}`,
//             },
//           });
//           console.log("Google Calendar event updated successfully.");
//         } catch (calendarError) {
//           console.error("Error updating Google Calendar event:", calendarError);
//         }
//       }

//       // Update status to booked
//       await sql`
//         UPDATE treatments
//         SET status = ${status}
//         WHERE id = ${appointmentId}
//       `;

//       await sendApprovalEmail(formattedAppointment);
//     }

//     revalidatePath("/dashboard/rmt");
//     return {
//       success: true,
//       message: `Appointment ${
//         status === "booked" ? "accepted" : "denied"
//       } successfully`,
//     };
//   } catch (error) {
//     console.error("Error updating appointment status:", error);
//     return {
//       success: false,
//       message: "An error occurred while updating the appointment status",
//     };
//   }
// }

async function sendDenialEmail(appointment) {
  const transporter = getEmailTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: appointment.email,
    subject: "Massage Appointment Request Update",
    text: `Hi ${appointment.firstName},\n\nI'm sorry, but I can't accommodate your massage appointment request for ${appointment.appointmentDate} at ${appointment.appointmentBeginsAt}. If you would like to schedule a different appointment, please login and search for another appointment time.\n\nIf you don't see a time that works for you, contact me directly: ${process.env.EMAIL_USER}`,
    html: `<p>Hi ${appointment.firstName},</p>
           <p>I'm sorry, but I can't accommodate your massage appointment request for ${appointment.appointmentDate} at ${appointment.appointmentBeginsAt}.</p>
           <p>If you would like to schedule a different appointment, please <a href="https://www.ciprmt.com/auth/sign-in">login</a> and search for another appointment time.</p>
           <p>If you don't see a time that works for you, contact me directly: <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending denial email:", error);
  }
}

async function sendApprovalEmail(appointment) {
  const transporter = getEmailTransporter();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: appointment.email,
    subject: "Massage Appointment Request Confirmed",
    text: `Hi ${appointment.firstName},\n\nYour massage appointment request for ${appointment.appointmentDate} at ${appointment.appointmentBeginsAt} has been confirmed. See you then!\n\nIf you need to make any changes, please login to your account or contact me directly: ${process.env.EMAIL_USER}`,
    html: `<p>Hi ${appointment.firstName},</p>
           <p>Your massage appointment request for ${appointment.appointmentDate} at ${appointment.appointmentBeginsAt} has been confirmed. See you then!</p>
           <p>If you need to make any changes, please <a href="https://www.ciprmt.com/auth/sign-in">login to your account</a> or contact me directly: <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending approval email:", error);
  }
}

// Function to get treatment plans for a user
// export async function getTreatmentPlansForUser(userId) {
//   try {
//     const session = await getSession();
//     if (!session || !session.resultObj) {
//       throw new Error("Unauthorized: User not logged in");
//     }

//     // Check if the user has permission to access these treatment plans
//     const canAccess =
//       session.resultObj.userType === "rmt" ||
//       session.resultObj.id.toString() === userId;

//     if (!canAccess) {
//       throw new Error(
//         "Unauthorized: User does not have permission to access these treatment plans"
//       );
//     }

//     // Query treatment plans from PostgreSQL - using only columns that exist
//     const { rows: plans } = await sql`
//       SELECT
//         tp.id,
//         tp.mongodb_id AS "mongodbId",
//         tp.client_id AS "clientId",
//         tp.created_by AS "createdBy",
//         tp.created_at AS "createdAt",
//         tp.encrypted_data AS "encryptedData",
//         tp.start_date AS "startDate",
//         u.first_name AS "clientFirstName",
//         u.last_name AS "clientLastName"
//       FROM
//         treatment_plans tp
//       JOIN
//         users u ON tp.client_id = u.id
//       WHERE
//         tp.client_id = ${userId} OR tp.created_by = ${userId}
//     `;

//     // Get associated treatments for each plan
//     const plansWithTreatments = await Promise.all(
//       plans.map(async (plan) => {
//         const { rows: treatments } = await sql`
//         SELECT
//           id,
//           date AS "appointmentDate",
//           appointment_begins_at AS "appointmentBeginsAt",
//           status
//         FROM
//           treatments
//         WHERE
//           treatment_plan_id = ${plan.id}
//         ORDER BY
//           date ASC, appointment_begins_at ASC
//       `;

//         const processedPlan = { ...plan };

//         // Add treatments to the plan
//         processedPlan.treatments = treatments;

//         // Decrypt encrypted data if present
//         if (plan.encryptedData) {
//           try {
//             processedPlan.decryptedData = decryptData(plan.encryptedData);
//           } catch (decryptError) {
//             console.error(
//               "Error decrypting data for plan:",
//               plan.id,
//               decryptError
//             );
//             processedPlan.decryptedData = null;
//           }
//         }

//         return processedPlan;
//       })
//     );

//     // Log the audit event
//     try {
//       // Determine reason for access based on user type and relationship
//       let reasonForAccess = "Self-viewing treatment plans";
//       if (session.resultObj.userType === "rmt") {
//         reasonForAccess = "Provider accessing patient treatment plans";
//       } else if (session.resultObj.id.toString() !== userId) {
//         reasonForAccess = "Administrative access to treatment plans";
//       }

//       await logAuditEvent({
//         typeOfInfo: "treatment plans",
//         actionPerformed: "viewed",
//         accessedById: session.resultObj.id,
//         whoseInfoId: userId,
//         reasonForAccess,
//         additionalDetails: {
//           accessedByName: `${session.resultObj.firstName} ${session.resultObj.lastName}`,
//           accessedByUserType: session.resultObj.userType,
//           numberOfPlans: plansWithTreatments.length,
//           planIds: plansWithTreatments.map((plan) => plan.id),
//           accessMethod: "web application",
//         },
//       });
//     } catch (logError) {
//       // Just log the error but don't let it break the main function
//       console.error("Error logging audit event:", logError);
//     }

//     return { success: true, data: plansWithTreatments };
//   } catch (error) {
//     console.error("Error fetching treatment plans:", error);
//     return {
//       success: false,
//       message: "Failed to fetch treatment plans: " + error.message,
//     };
//   }
// }

// Function to get a single treatment by ID
export async function getTreatmentById(id) {
  try {
    // Get the current user session
    const session = await getSession();
    if (!session || !session.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    // Query the treatment from PostgreSQL
    const { rows } = await sql`
      SELECT 
        t.id,
        t.mongodb_id AS "mongodbId",
        t.client_id AS "clientId",
        t.rmt_id AS "rmtId",
        t.date AS "appointmentDate",
        t.appointment_begins_at AS "appointmentBeginsAt",
        t.appointment_ends_at AS "appointmentEndsAt",
        t.status,
        t.location,
        t.duration,
        t.workplace,
        t.price,
        t.payment_type AS "paymentType",
        t.google_calendar_event_id AS "googleCalendarEventId",
        t.google_calendar_event_link AS "googleCalendarEventLink",
        t.created_at AS "createdAt",
        t.consent_form AS "consentForm",
        t.encrypted_treatment_notes AS "treatmentNotes",
        t.treatment_plan_id AS "treatmentPlanId",
        u.id AS "userId",
        u.first_name AS "firstName",
        u.last_name AS "lastName",
        u.email
      FROM 
        treatments t
      JOIN
        users u ON t.client_id = u.id
      WHERE 
        t.id = ${id}
    `;

    // Check if treatment exists
    if (rows.length === 0) {
      throw new Error("Treatment not found");
    }

    const treatment = rows[0];

    // Determine if the user has the right to access this treatment
    const canAccess =
      session.resultObj.userType === "rmt" ||
      treatment.clientId.toString() === session.resultObj.id.toString();

    if (!canAccess) {
      throw new Error(
        "Unauthorized: User does not have permission to access this treatment",
      );
    }

    // Log the audit event
    try {
      // Determine reason for access based on user type and relationship
      let reasonForAccess = "Self-viewing treatment details";
      if (session.resultObj.userType === "rmt") {
        reasonForAccess = "Provider accessing patient treatment details";
      } else if (
        treatment.clientId.toString() !== session.resultObj.id.toString()
      ) {
        reasonForAccess = "Administrative access to treatment details";
      }

      await logAuditEvent({
        typeOfInfo: "treatment details",
        actionPerformed: "viewed",
        accessedById: session.resultObj.id,
        whoseInfoId: treatment.clientId,
        reasonForAccess,
        additionalDetails: {
          accessedByName: `${session.resultObj.firstName} ${session.resultObj.lastName}`,
          whoseInfoName: `${treatment.firstName} ${treatment.lastName}`,
          treatmentId: id,
          treatmentDate: treatment.appointmentDate,
          treatmentTime: treatment.appointmentBeginsAt,
          accessedByUserType: session.resultObj.userType,
          accessMethod: "web application",
        },
      });
    } catch (logError) {
      // Just log the error but don't let it break the main function
      console.error("Error logging audit event:", logError);
    }

    // Parse/decrypt treatment notes (supports encrypted and legacy plain JSON).
    treatment.treatmentNotes = parseStoredTreatmentNotes(
      treatment.treatmentNotes,
    );

    // Parse JSON fields if needed
    if (treatment.consentForm && typeof treatment.consentForm === "string") {
      try {
        treatment.consentForm = JSON.parse(treatment.consentForm);
      } catch (e) {
        console.error("Error parsing consent form JSON:", e);
      }
    }

    return treatment;
  } catch (error) {
    console.error("Error fetching treatment:", error);
    throw new Error("Failed to fetch treatment: " + error.message);
  }
}

export async function getTreatmentsForPlan(
  treatmentPlanId,
  includeAllTreatments = false,
) {
  try {
    const session = await getSession();
    if (!session?.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    const { rows: planRows } = await sql`
      SELECT client_id
      FROM treatment_plans
      WHERE id = ${treatmentPlanId}
    `;

    if (planRows.length === 0) {
      throw new Error("Treatment plan not found");
    }

    const canAccess =
      session.resultObj.userType === "rmt" ||
      planRows[0].client_id === session.resultObj.id;
    if (!canAccess) {
      throw new Error("Unauthorized: Access denied");
    }

    const { rows: treatments } = await sql`
      SELECT
        t.id,
        t.date,
        t.status,
        t.location,
        t.workplace,
        t.duration,
        t.price,
        t.payment_type AS "paymentType",
        t.appointment_begins_at AS "appointmentBeginsAt",
        t.appointment_ends_at AS "appointmentEndsAt",
        t.encrypted_treatment_notes AS "encryptedTreatmentNotes",
        t.treatment_plan_id AS "treatmentPlanId"
      FROM treatments t
      WHERE
        (
          t.treatment_plan_id = ${treatmentPlanId}
          OR EXISTS (
            SELECT 1
            FROM treatment_plan_treatments tpt
            WHERE tpt.treatment_id = t.id
              AND tpt.treatment_plan_id = ${treatmentPlanId}
          )
        )
        AND (${includeAllTreatments} = true OR t.encrypted_treatment_notes IS NOT NULL)
      ORDER BY t.date ASC, COALESCE(t.appointment_begins_at, t.appointment_window_start) ASC
    `;

    // Decrypt the treatment notes
    const decryptedTreatments = treatments.map((treatment) => {
      let decryptedNotes = null;

      if (treatment.encryptedTreatmentNotes) {
        decryptedNotes = parseStoredTreatmentNotes(
          treatment.encryptedTreatmentNotes,
        );
      }

      return {
        ...treatment,
        treatmentNotes: decryptedNotes,
      };
    });

    return {
      success: true,
      data: decryptedTreatments,
    };
  } catch (error) {
    console.error("Error fetching treatments for plan:", error);
    return {
      success: false,
      message: "Failed to fetch treatments: " + error.message,
      data: [],
    };
  }
}

// New consolidated function that gets both treatment and treatment plans
export async function getTreatmentAndPlans(treatmentId) {
  try {
    // First get the treatment
    const treatment = await getTreatmentById(treatmentId);

    // Then get the treatment plans for the user
    const treatmentPlans = await getTreatmentPlansForUser(treatment.userId);

    return {
      success: true,
      treatment,
      treatmentPlans: treatmentPlans.success ? treatmentPlans.data : [],
    };
  } catch (error) {
    console.error("Error fetching treatment and plans:", error);
    return {
      success: false,
      message: "Failed to fetch treatment and plans: " + error.message,
    };
  }
}

export async function saveTreatmentNotes(treatmentId, treatmentPlanId, notes) {
  try {
    const session = await getSession();
    if (!session || !session.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    // Check if the user is an RMT
    if (session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can save treatment notes");
    }

    if (notes.paymentType === "Gift Card" && notes.giftCardCode) {
      // Validate and redeem gift card
      const { rows: giftCards } = await sql`
        SELECT id, duration, redeemed, code
        FROM gift_cards
        WHERE code = ${notes.giftCardCode}
      `;

      if (giftCards.length === 0) {
        return {
          success: false,
          message: "Invalid gift card code",
        };
      }

      const giftCard = giftCards[0];

      if (giftCard.redeemed) {
        return {
          success: false,
          message: "This gift card has already been redeemed",
        };
      }

      // Mark gift card as redeemed
      await sql`
        UPDATE gift_cards
        SET
          redeemed = true,
          redeemed_at = NOW(),
          redeemed_by_user_id = (SELECT client_id FROM treatments WHERE id = ${treatmentId})
        WHERE id = ${giftCard.id}
      `;
    }

    // Handle "other" price option
    let finalPrice = notes.price;
    if (notes.price === "other") {
      if (!notes.otherPrice || isNaN(Number.parseFloat(notes.otherPrice))) {
        return {
          success: false,
          message: "Please enter a valid price when selecting 'Other'",
        };
      }
      finalPrice = Number.parseFloat(notes.otherPrice);
    } else if (notes.paymentType === "Gift Card") {
      finalPrice = 0;
    } else {
      finalPrice = Number.parseFloat(notes.price);
    }

    // Save encrypted when key exists; keep JSON fallback for environments without key.
    const encryptedNotes = encryptData(notes) || JSON.stringify(notes);

    const receiptIssued =
      typeof notes?.receiptIssued === "boolean"
        ? notes.receiptIssued
        : notes?.receiptIssued === "true"
          ? true
          : notes?.receiptIssued === "false"
            ? false
            : true;

    let updatedTreatment = [];

    if (receiptIssued) {
      // Update the treatment with the notes and associated plan
      const { rows } = await sql`
        UPDATE treatments
        SET 
          encrypted_treatment_notes = ${encryptedNotes},
          status = 'completed',
          price = ${finalPrice},
          payment_type = ${notes?.paymentType || null},
          treatment_plan_id = ${treatmentPlanId},
          receipt_issued = ${receiptIssued}
        WHERE id = ${treatmentId}
        RETURNING 
          id, 
          client_id,
          rmt_id,
          date,
          appointment_begins_at,
          appointment_ends_at,
          status,
          location,
          duration,
          workplace,
          price,
          payment_type,
          encrypted_treatment_notes
      `;

      updatedTreatment = rows;
    } else {
      // Store full notes in additional_treatments only
      await sql`
        INSERT INTO additional_treatments
        SELECT * FROM treatments
        WHERE id = ${treatmentId}
        ON CONFLICT (id) DO NOTHING
      `;

      const { rows } = await sql`
        UPDATE additional_treatments
        SET 
          encrypted_treatment_notes = ${encryptedNotes},
          status = 'completed',
          price = ${finalPrice},
          payment_type = ${notes?.paymentType || null},
          treatment_plan_id = ${treatmentPlanId},
          receipt_issued = ${receiptIssued}
        WHERE id = ${treatmentId}
        RETURNING 
          id, 
          client_id,
          rmt_id,
          date,
          appointment_begins_at,
          appointment_ends_at,
          status,
          location,
          duration,
          workplace,
          price,
          payment_type,
          encrypted_treatment_notes
      `;

      updatedTreatment = rows;

      // Remove from treatments and any existing plan associations
      await sql`
        DELETE FROM incomes
        WHERE treatment_id = ${treatmentId}
      `;

      await sql`
        DELETE FROM treatment_plan_treatments
        WHERE treatment_id = ${treatmentId}
      `;

      await sql`
        DELETE FROM treatments
        WHERE id = ${treatmentId}
      `;
    }

    if (!updatedTreatment || updatedTreatment.length === 0) {
      throw new Error("Failed to update treatment with notes");
    }

    // Get client information for the treatment
    const { rows: clientInfo } = receiptIssued
      ? await sql`
          SELECT 
            u.id, 
            u.first_name, 
            u.last_name, 
            u.email
          FROM users u
          JOIN treatments t ON u.id = t.client_id
          WHERE t.id = ${treatmentId}
        `
      : await sql`
          SELECT 
            u.id, 
            u.first_name, 
            u.last_name, 
            u.email
          FROM users u
          JOIN additional_treatments t ON u.id = t.client_id
          WHERE t.id = ${treatmentId}
        `;

    if (!clientInfo || clientInfo.length === 0) {
      throw new Error("Failed to retrieve client information");
    }

    const client = clientInfo[0];

    // Associate the treatment with the treatment plan
    // This should only happen if treatmentPlanId is provided and valid
    if (receiptIssued && treatmentPlanId) {
      await sql`
        INSERT INTO treatment_plan_treatments (treatment_plan_id, treatment_id)
        VALUES (${treatmentPlanId}, ${treatmentId})
        ON CONFLICT (treatment_plan_id, treatment_id) 
        DO NOTHING
      `;
    }

    // Calculate revenue excluding HST
    const totalPrice = Number.parseFloat(finalPrice || 0);
    const hstRate = 0.13; // Assuming HST is 13%
    const revenueExcludingHST = totalPrice / (1 + hstRate);
    const hstAmount = totalPrice - revenueExcludingHST;

    // Create a new income record
    const appointmentDate = new Date(updatedTreatment[0].date);

    // Only insert income if the final price is greater than 0 (i.e., not fully covered by gift card)
    if (receiptIssued && totalPrice > 0) {
      const { rows: incomeResult } = await sql`
        INSERT INTO incomes (
          rmt_id,
          treatment_id,
          date,
          year,
          category,
          amount,
          total_price,
          hst_amount,
          details,
          created_at
        ) VALUES (
          ${updatedTreatment[0].rmt_id},
          ${treatmentId},
          ${appointmentDate.toISOString()},
          ${appointmentDate.getFullYear().toString()},
          'revenue',
          ${Number.parseFloat(revenueExcludingHST.toFixed(2))},
          ${totalPrice},
          ${Number.parseFloat(hstAmount.toFixed(2))},
          ${`${client.first_name} ${client.last_name}`},
          CURRENT_TIMESTAMP
        )
        RETURNING id
      `;

      if (!incomeResult || incomeResult.length === 0) {
        throw new Error("Failed to insert income record");
      }
    }

    // Fetch RMT details for audit log
    const { rows: rmtInfo } = await sql`
      SELECT id, first_name, last_name
      FROM users
      WHERE id = ${session.resultObj.id}
    `;

    if (!rmtInfo || rmtInfo.length === 0) {
      throw new Error("Failed to retrieve RMT information");
    }

    const rmt = rmtInfo[0];

    // Log the audit event
    try {
      await logAuditEvent({
        typeOfInfo: "treatment notes",
        actionPerformed: "saved",
        accessedById: rmt.id,
        whoseInfoId: client.id,
        reasonForAccess: "Provider documenting patient treatment",
        additionalDetails: {
          accessedByName: `${rmt.first_name} ${rmt.last_name}`,
          whoseInfoName: `${client.first_name} ${client.last_name}`,
          treatmentId: treatmentId,
          treatmentPlanId: treatmentPlanId,
          appointmentDate: updatedTreatment[0].date,
          price: finalPrice,
          paymentType: notes.paymentType,
          giftCardRedeemed: notes.paymentType === "Gift Card",
          accessMethod: "web application",
        },
      });
    } catch (logError) {
      // Just log the error but don't let it break the main function
      console.error("Error logging audit event:", logError);
    }

    if (receiptIssued) {
      // Send email to the client
      const transporter = getEmailTransporter();
      const formattedDate = new Date(
        updatedTreatment[0].date,
      ).toLocaleDateString();

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: client.email,
        subject: "Your Receipt is Ready to Download",
        text: `Hi ${client.first_name},

Your receipt from ${formattedDate} is now ready to download. You can access it by logging into your account at www.ciprmt.com.

Thank you for your visit!

Stay healthy,
Cip`,
        html: `
          <h2>Your Receipt is Ready to Download</h2>
          <p>Dear ${client.first_name},</p>
          <p>Your receipt from ${formattedDate} is now ready to download. You can access it by logging into your account at <a href="https://www.ciprmt.com">www.ciprmt.com</a>.</p>
          <p>Thank you for your visit!</p>
          <p>Stay healthy,<br>Cip</p>
        `,
      });
    }

    revalidatePath("/dashboard/rmt");
    return { success: true, message: "Treatment notes saved successfully" };
  } catch (error) {
    console.error("Error saving treatment notes:", error);
    return { success: false, message: error.message };
  }
}

export async function getPublicDataForBookAppointmentsForm() {
  const session = await getSession();

  if (session?.resultObj?.id) {
    return getDataForBookAppointmentsForm();
  }

  try {
    const { rows: rmtLocations } = await sql`
      SELECT
        id,
        location_name,
        street_address,
        city,
        province,
        postal_code,
        country,
        workplace_type,
        description,
        what_to_wear,
        payment
      FROM rmt_locations
      WHERE user_id = ${DEFAULT_RMT_ID}
    `;

    const rmtSetup = await Promise.all(
      rmtLocations.map(async (location) => {
        const { rows: massageServices } = await sql`
          SELECT
            service,
            duration,
            price,
            plus_hst as "plusHst"
          FROM massage_services
          WHERE rmt_location_id = ${location.id}
          ORDER BY duration
        `;

        return {
          _id: location.id,
          formattedFormData: {
            address: {
              streetAddress: location.street_address,
              city: location.city,
              province: location.province,
              postalCode: location.postal_code,
              country: location.country,
              locationName: location.location_name || location.street_address,
            },
            massageServices,
            workplaceType: location.workplace_type,
            description: location.description,
            whatToWear: location.what_to_wear,
            payment: location.payment,
          },
        };
      }),
    );

    return {
      user: {
        resultObj: {
          canBookAtIds: rmtSetup.map((location) => location._id),
        },
      },
      rmtSetup,
    };
  } catch (error) {
    console.error("Error fetching public booking data:", error);
    throw error;
  }
}

// export async function saveTreatmentNotes(treatmentId, treatmentPlanId, notes) {
//   try {
//     const session = await getSession();
//     if (!session || !session.resultObj) {
//       throw new Error("Unauthorized: User not logged in");
//     }

//     // Handle "other" price option
//     let finalPrice = notes.price;
//     if (notes.price === "other") {
//       if (!notes.otherPrice || isNaN(Number.parseFloat(notes.otherPrice))) {
//         return {
//           success: false,
//           message: "Please enter a valid price when selecting 'Other'",
//         };
//       }
//       finalPrice = Number.parseFloat(notes.otherPrice);
//     } else {
//       finalPrice = Number.parseFloat(notes.price);
//     }

//     // Encrypt the notes (you'll need to implement encryptData function)
//     const encryptedNotes = JSON.stringify(notes); // Replace with actual encryption

//     // Update the treatment with the notes and associated plan
//     const { rows: updatedTreatment } = await sql`
//       UPDATE treatments
//       SET
//         encrypted_treatment_notes = ${encryptedNotes},
//         status = 'completed',
//         price = ${finalPrice},
//         payment_type = ${notes?.paymentType || null},
//         treatment_plan_id = ${treatmentPlanId}
//       WHERE id = ${treatmentId}
//       RETURNING
//         id,
//         client_id,
//         rmt_id,
//         date,
//         appointment_begins_at,
//         appointment_ends_at,
//         status,
//         location,
//         duration,
//         workplace,
//         price,
//         payment_type,
//         encrypted_treatment_notes
//     `;

//     if (!updatedTreatment || updatedTreatment.length === 0) {
//       throw new Error("Failed to update treatment with notes");
//     }

//     // Get client information for the treatment
//     const { rows: clientInfo } = await sql`
//       SELECT
//         u.id,
//         u.first_name,
//         u.last_name,
//         u.email
//       FROM users u
//       JOIN treatments t ON u.id = t.client_id
//       WHERE t.id = ${treatmentId}
//     `;

//     if (!clientInfo || clientInfo.length === 0) {
//       throw new Error("Failed to retrieve client information");
//     }

//     const client = clientInfo[0];

//     // Associate the treatment with the treatment plan
//     await sql`
//       INSERT INTO treatment_plan_treatments (treatment_plan_id, treatment_id)
//       VALUES (${treatmentPlanId}, ${treatmentId})
//       ON CONFLICT (treatment_plan_id, treatment_id)
//       DO NOTHING
//     `;

//     // Calculate revenue excluding HST
//     const totalPrice = Number.parseFloat(finalPrice || 0);
//     const hstRate = 0.13;
//     const revenueExcludingHST = totalPrice / (1 + hstRate);
//     const hstAmount = totalPrice - revenueExcludingHST;

//     // Create a new income record
//     const appointmentDate = new Date(updatedTreatment[0].date);

//     const { rows: incomeResult } = await sql`
//       INSERT INTO incomes (
//         rmt_id,
//         treatment_id,
//         date,
//         year,
//         category,
//         amount,
//         total_price,
//         hst_amount,
//         details,
//         created_at
//       ) VALUES (
//         ${updatedTreatment[0].rmt_id},
//         ${treatmentId},
//         ${appointmentDate.toISOString()},
//         ${appointmentDate.getFullYear().toString()},
//         'revenue',
//         ${Number.parseFloat(revenueExcludingHST.toFixed(2))},
//         ${totalPrice},
//         ${Number.parseFloat(hstAmount.toFixed(2))},
//         ${`${client.first_name} ${client.last_name}`},
//         CURRENT_TIMESTAMP
//       )
//       RETURNING id
//     `;

//     if (!incomeResult || incomeResult.length === 0) {
//       throw new Error("Failed to insert income record");
//     }

//     // Fetch RMT details for audit log
//     const { rows: rmtInfo } = await sql`
//       SELECT id, first_name, last_name
//       FROM users
//       WHERE id = ${session.resultObj.id}
//     `;

//     if (!rmtInfo || rmtInfo.length === 0) {
//       throw new Error("Failed to retrieve RMT information");
//     }

//     const rmt = rmtInfo[0];

//     // Log the audit event
//     try {
//       await logAuditEvent({
//         typeOfInfo: "treatment notes",
//         actionPerformed: "saved",
//         accessedById: rmt.id,
//         whoseInfoId: client.id,
//         reasonForAccess: "Provider documenting patient treatment",
//         additionalDetails: {
//           accessedByName: `${rmt.first_name} ${rmt.last_name}`,
//           whoseInfoName: `${client.first_name} ${client.last_name}`,
//           treatmentId: treatmentId,
//           treatmentPlanId: treatmentPlanId,
//           appointmentDate: updatedTreatment[0].date,
//           price: finalPrice,
//           paymentType: notes.paymentType,
//           accessMethod: "web application",
//         },
//       });
//     } catch (logError) {
//       // Just log the error but don't let it break the main function
//       console.error("Error logging audit event:", logError);
//     }

//     // Send email to the client
//     const transporter = getEmailTransporter();
//     const formattedDate = new Date(
//       updatedTreatment[0].date
//     ).toLocaleDateString();

//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: client.email,
//       subject: "Your Receipt is Ready to Download",
//       text: `Hi ${client.first_name},

// Your receipt from ${formattedDate} is now ready to download. You can access it by logging into your account at www.ciprmt.com.

// Thank you for your visit!

// Stay healthy,
// Cip`,
//       html: `
//         <h2>Your Receipt is Ready to Download</h2>
//         <p>Dear ${client.first_name},</p>
//         <p>Your receipt from ${formattedDate} is now ready to download. You can access it by logging into your account at <a href="https://www.ciprmt.com">www.ciprmt.com</a>.</p>
//         <p>Thank you for your visit!</p>
//         <p>Stay healthy,<br>Cip</p>
//       `,
//     });

//     revalidatePath("/dashboard/rmt");
//     return { success: true, message: "Treatment notes saved successfully" };
//   } catch (error) {
//     console.error("Error saving treatment notes:", error);
//     console.error("Error details:", {
//       name: error.name,
//       message: error.message,
//       stack: error.stack,
//     });
//     return { success: false, message: error.message };
//   }
// }

export async function setDNSTreatmentStatusAttachment(treatmentId) {
  try {
    const session = await getSession();
    if (!session || !session.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    // Update the treatment status to DNS
    const { rows: updatedTreatment } = await sql`
      UPDATE treatments
      SET 
        status = 'dns'
      WHERE id = ${treatmentId}
      RETURNING 
        id, 
        client_id,
        rmt_id,
        status
    `;

    if (!updatedTreatment || updatedTreatment.length === 0) {
      throw new Error("Failed to update treatment status to DNS");
    }

    // Get client information for the treatment
    const { rows: clientInfo } = await sql`
      SELECT 
        u.id, 
        u.first_name, 
        u.last_name, 
        u.email,
        u.dns_count
      FROM users u
      JOIN treatments t ON u.id = t.client_id
      WHERE t.id = ${treatmentId}
    `;

    if (!clientInfo || clientInfo.length === 0) {
      throw new Error("Failed to retrieve client information");
    }

    const client = clientInfo[0];

    // Increment the DNS count for the client
    const newDnsCount = (client.dns_count || 0) + 1;

    await sql`
      UPDATE users
      SET 
        dns_count = ${newDnsCount}
      WHERE id = ${client.id}
    `;

    // Fetch RMT details for audit log
    const { rows: rmtInfo } = await sql`
      SELECT id, first_name, last_name
      FROM users
      WHERE id = ${session.resultObj.id}
    `;

    if (!rmtInfo || rmtInfo.length === 0) {
      throw new Error("Failed to retrieve RMT information");
    }

    const rmt = rmtInfo[0];

    // Log the audit event
    try {
      await logAuditEvent({
        typeOfInfo: "treatment status",
        actionPerformed: "marked as DNS",
        accessedById: rmt.id,
        whoseInfoId: client.id,
        reasonForAccess: "Provider updating patient appointment status",
        additionalDetails: {
          accessedByName: `${rmt.first_name} ${rmt.last_name}`,
          whoseInfoName: `${client.first_name} ${client.last_name}`,
          treatmentId: treatmentId,
          newDnsCount: newDnsCount,
          accessMethod: "web application",
        },
      });
    } catch (logError) {
      // Just log the error but don't let it break the main function
      console.error("Error logging audit event:", logError);
    }

    revalidatePath("/dashboard/rmt");
    return { success: true, message: "Treatment marked as DNS successfully" };
  } catch (error) {
    console.error("Error marking treatment as DNS:", error);
    return { success: false, message: error.message };
  }
}

// Helper function to format dates for display
// function formatDateForDisplay(dateValue) {
//   if (!dateValue) return "Not specified";

//   try {
//     // If it's already a Date object, format it
//     if (dateValue instanceof Date) {
//       return dateValue.toLocaleDateString();
//     }

//     // Otherwise, parse it as a date and format it
//     return new Date(dateValue).toLocaleDateString();
//   } catch (e) {
//     console.error("Error formatting date for display:", e);
//     return String(dateValue); // Convert to string to avoid React rendering errors
//   }
// }

export async function createTreatmentPlan(planData, clientId) {
  try {
    const session = await getSession();
    if (!session || !session.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    // Encrypt sensitive data
    const encryptedPlanData = encryptData({
      objectivesOfTreatmentPlan: planData.objectivesOfTreatmentPlan,
      clientGoals: planData.clientGoals,
      areasToBeTreated: planData.areasToBeTreated,
      durationAndFrequency: planData.durationAndFrequency,
      typeAndFocusOfTreatments: planData.typeAndFocusOfTreatments,
      recommendedSelfCare: planData.recommendedSelfCare,
      scheduleForReassessment: planData.scheduleForReassessment,
      anticipatedClientResponse: planData.anticipatedClientResponse,
      conclusionOfTreatmentPlan: planData.conclusionOfTreatmentPlan,
      endDate: planData.endDate,
    });

    if (!encryptedPlanData) {
      throw new Error("Failed to encrypt treatment plan data");
    }

    // Format the start date properly for PostgreSQL
    const startDate = planData.startDate
      ? new Date(planData.startDate).toISOString().split("T")[0]
      : null;

    // Insert the new treatment plan into PostgreSQL
    const {
      rows: [newPlan],
    } = await sql`
      INSERT INTO treatment_plans (
        client_id,
        created_by,
        encrypted_data,
        start_date,
        created_at
      ) VALUES (
        ${clientId},
        ${session.resultObj.id},
        ${encryptedPlanData},
        ${startDate},
        CURRENT_TIMESTAMP
      )
      RETURNING id, client_id, created_by, start_date, created_at
    `;

    // Fetch RMT and client details for audit log
    const {
      rows: [rmt],
    } = await sql`
      SELECT first_name AS "firstName", last_name AS "lastName", id
      FROM users
      WHERE id = ${session.resultObj.id}
    `;

    const {
      rows: [client],
    } = await sql`
      SELECT first_name AS "firstName", last_name AS "lastName"
      FROM users
      WHERE id = ${clientId}
    `;

    // Log the audit event
    try {
      await logAuditEvent({
        typeOfInfo: "treatment plan",
        actionPerformed: "created",
        accessedById: rmt.id,
        whoseInfoId: clientId,
        reasonForAccess: "Provider creating patient treatment plan",
        additionalDetails: {
          accessedByName: `${rmt.firstName} ${rmt.lastName}`,
          whoseInfoName: `${client.firstName} ${client.lastName}`,
          treatmentPlanId: newPlan.id,
          startDate: newPlan.start_date,
          createdAt: newPlan.created_at,
          accessMethod: "web application",
        },
      });
    } catch (logError) {
      // Just log the error but don't let it break the main function
      console.error("Error logging audit event:", logError);
    }

    revalidatePath("/dashboard/rmt");

    // Return a safe version of the plan (without encrypted data)
    const safePlan = {
      id: newPlan.id,
      startDate: newPlan.start_date,
      createdAt: newPlan.created_at,
      clientId: newPlan.client_id,
      treatments: [],
    };

    return {
      success: true,
      message: "Treatment plan created successfully",
      plan: safePlan,
    };
  } catch (error) {
    console.error("Error creating treatment plan:", error);
    return { success: false, message: error.message };
  }
}

// export async function createTreatmentPlan(planData, clientId) {
//   try {
//     const session = await getSession();
//     if (!session || !session.resultObj) {
//       throw new Error("Unauthorized: User not logged in");
//     }

//     // Encrypt sensitive data
//     const encryptedPlanData = encryptData({
//       objectivesOfTreatmentPlan: planData.objectivesOfTreatmentPlan,
//       clientGoals: planData.clientGoals,
//       areasToBeTreated: planData.areasToBeTreated,
//       durationAndFrequency: planData.durationAndFrequency,
//       typeAndFocusOfTreatments: planData.typeAndFocusOfTreatments,
//       recommendedSelfCare: planData.recommendedSelfCare,
//       scheduleForReassessment: planData.scheduleForReassessment,
//       anticipatedClientResponse: planData.anticipatedClientResponse,
//       conclusionOfTreatmentPlan: planData.conclusionOfTreatmentPlan,
//       endDate: planData.endDate,
//     });

//     if (!encryptedPlanData) {
//       throw new Error("Failed to encrypt treatment plan data");
//     }

//     // Format the start date properly for PostgreSQL
//     const startDate = planData.startDate
//       ? new Date(planData.startDate).toISOString().split("T")[0]
//       : null;

//     // Insert the new treatment plan into PostgreSQL
//     const {
//       rows: [newPlan],
//     } = await sql`
//       INSERT INTO treatment_plans (
//         client_id,
//         created_by,
//         encrypted_data,
//         start_date,
//         created_at
//       ) VALUES (
//         ${clientId},
//         ${session.resultObj.id},
//         ${encryptedPlanData},
//         ${startDate},
//         CURRENT_TIMESTAMP
//       )
//       RETURNING id, client_id, created_by, start_date, created_at
//     `;

//     // Fetch RMT and client details for audit log
//     const {
//       rows: [rmt],
//     } = await sql`
//       SELECT first_name AS "firstName", last_name AS "lastName", id
//       FROM users
//       WHERE id = ${session.resultObj.id}
//     `;

//     const {
//       rows: [client],
//     } = await sql`
//       SELECT first_name AS "firstName", last_name AS "lastName"
//       FROM users
//       WHERE id = ${clientId}
//     `;

//     // Log the audit event
//     try {
//       await logAuditEvent({
//         typeOfInfo: "treatment plan",
//         actionPerformed: "created",
//         accessedById: rmt.id,
//         whoseInfoId: clientId,
//         reasonForAccess: "Provider creating patient treatment plan",
//         additionalDetails: {
//           accessedByName: `${rmt.firstName} ${rmt.lastName}`,
//           whoseInfoName: `${client.firstName} ${client.lastName}`,
//           treatmentPlanId: newPlan.id,
//           startDate: newPlan.start_date,
//           createdAt: newPlan.created_at,
//           accessMethod: "web application",
//         },
//       });
//     } catch (logError) {
//       // Just log the error but don't let it break the main function
//       console.error("Error logging audit event:", logError);
//     }

//     revalidatePath("/dashboard/rmt");

//     // Return a safe version of the plan (without encrypted data)
//     const safePlan = {
//       id: newPlan.id,
//       startDate: newPlan.start_date,
//       createdAt: newPlan.created_at,
//       clientId: newPlan.client_id,
//       treatments: [],
//     };

//     return {
//       success: true,
//       message: "Treatment plan created successfully",
//       plan: safePlan,
//     };
//   } catch (error) {
//     console.error("Error creating treatment plan:", error);
//     return { success: false, message: error.message };
//   }
// }

export async function searchUsers(query) {
  try {
    // Check if the user is logged in
    const session = await getSession();
    if (!session || !session.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    // Check if the user is an RMT
    if (session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can search users");
    }

    // Use the UUID id from the session for PostgreSQL
    const userId = session.resultObj.id;

    // Apply rate limiting with the PostgreSQL user ID
    await checkRateLimit(userId, "searchUsers", 10, 60); // 10 requests per minute

    const normalizedQuery = String(query || "").trim();
    if (!normalizedQuery) {
      return [];
    }

    // Use ILIKE for case-insensitive search in Postgres
    const searchPattern = `%${normalizedQuery}%`;

    const { rows: users } = await sql`
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone_number
      FROM users
      WHERE
        rmt_id = ${userId}
        AND user_type = 'patient'
        AND (
          first_name ILIKE ${searchPattern}
          OR last_name ILIKE ${searchPattern}
          OR email ILIKE ${searchPattern}
          OR phone_number ILIKE ${searchPattern}
        )
      ORDER BY first_name ASC, last_name ASC
      LIMIT 25
    `;

    // Format the results similar to the MongoDB version
    return users.map((user) => ({
      id: user.id,
      name: `${user.first_name || user.firstName || ""} ${
        user.last_name || user.lastName || ""
      }`.trim(),
      email: user.email || "",
      phoneNumber: user.phone_number || user.phoneNumber || "N/A",
    }));
  } catch (error) {
    console.error("Error in searchUsers:", error);
    throw new Error("Failed to search users. Please try again.");
  }
}

export async function getClientWithHealthHistory(userId) {
  try {
    const session = await getSession();
    if (!session?.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    const canAccess =
      session.resultObj.userType === "rmt" || session.resultObj.id === userId;
    if (!canAccess) {
      throw new Error("Unauthorized: Access denied");
    }

    // Get client information
    let clientRows;
    try {
      const queryResult = await sql`
        SELECT
          id,
          first_name AS "firstName",
          last_name AS "lastName",
          preferred_name AS "preferredName",
          email,
          phone_number AS "phoneNumber",
          last_health_history_update AS "lastHealthHistoryUpdate",
          benefits_coverage AS "benefitsCoverage",
          benefits_renewal_date AS "benefitsRenewalDate",
          pronouns,
          rmt_id AS "rmtId",
          user_type AS "userType"
        FROM users
        WHERE id = ${userId}
      `;
      clientRows = queryResult.rows;
    } catch (error) {
      if (error?.code !== "42703") {
        throw error;
      }

      // Fallback for environments where benefits_coverage migration has not run yet.
      const fallbackResult = await sql`
        SELECT
          id,
          first_name AS "firstName",
          last_name AS "lastName",
          preferred_name AS "preferredName",
          email,
          phone_number AS "phoneNumber",
          last_health_history_update AS "lastHealthHistoryUpdate",
          pronouns,
          rmt_id AS "rmtId",
          user_type AS "userType"
        FROM users
        WHERE id = ${userId}
      `;
      clientRows = fallbackResult.rows.map((row) => ({
        ...row,
        benefitsCoverage: null,
        benefitsRenewalDate: null,
      }));
    }

    if (clientRows.length === 0) {
      throw new Error("Client not found");
    }

    const client = clientRows[0];

    // Get health history
    const { rows: healthHistoryRows } = await sql`
      SELECT
        id,
        user_id AS "userId",
        encrypted_data AS "encryptedData",
        created_at AS "createdAt"
      FROM health_histories
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    const healthHistory = healthHistoryRows.map((record) => {
      let decryptedData = null;
      if (record.encryptedData) {
        try {
          decryptedData = decryptData(record.encryptedData);
        } catch (error) {
          console.error(
            `[v0] Error decrypting health history ${record.id}:`,
            error,
          );
        }
      }

      // Flatten the decrypted data into the record so fields can be accessed directly
      return {
        id: record.id,
        userId: record.userId,
        createdAt: record.createdAt,
        encryptedData: record.encryptedData,
        decryptedData,
        // Spread the decrypted data fields so they can be accessed directly
        ...(decryptedData || {}),
      };
    });

    try {
      let reasonForAccess = "Self-access to health history";
      if (session.resultObj.userType === "rmt") {
        reasonForAccess = "Provider accessing patient health history";
      }

      await logAuditEvent({
        typeOfInfo: "health history",
        actionPerformed: "viewed",
        accessedById: session.resultObj.id,
        whoseInfoId: userId,
        reasonForAccess,
        additionalDetails: {
          accessedByUserType: session.resultObj.userType,
          numberOfHistories: healthHistory.length,
          accessMethod: "web application",
        },
      });
    } catch (logError) {
      console.error("Error logging audit event:", logError);
    }

    return { client, healthHistory };
  } catch (error) {
    console.error("[v0] Error fetching client with health history:", error);
    throw error;
  }
}

export async function getClientProfileData(userId) {
  try {
    const session = await getSession();
    if (!session || !session.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    // Check if the user is an RMT
    if (session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can access client profiles");
    }

    // Get client information with health history
    const clientData = await getClientWithHealthHistory(userId);

    // Get all treatments for this client
    const { rows: treatments } = await sql`
      SELECT
        id,
        client_id AS "clientId",
        rmt_id AS "rmtId",
        date AS "appointmentDate",
        appointment_begins_at AS "appointmentBeginsAt",
        appointment_ends_at AS "appointmentEndsAt",
        status,
        location,
        duration,
        workplace,
        price,
        payment_type AS "paymentType",
        encrypted_treatment_notes AS "treatmentNotes",
        treatment_plan_id AS "treatmentPlanId",
        google_calendar_event_id AS "googleCalendarEventId",
        google_calendar_event_link AS "googleCalendarEventLink",
        created_at AS "createdAt",
        consent_form AS "consentForm",
        consent_form_submitted_at AS "consentFormSubmittedAt",
        code
      FROM treatments
      WHERE client_id = ${userId}
      ORDER BY date DESC, appointment_begins_at DESC
    `;

    const decryptedTreatments = treatments.map((treatment) => {
      let decryptedNotes = null;
      if (treatment.treatmentNotes) {
        decryptedNotes = parseStoredTreatmentNotes(treatment.treatmentNotes);
      }

      return {
        ...treatment,
        treatmentNotes: decryptedNotes,
      };
    });

    const clientNotes = decryptedTreatments
      .filter((treatment) => treatment.treatmentNotes)
      .map((treatment) => ({
        id: treatment.id,
        appointmentDate: treatment.appointmentDate,
        appointmentBeginsAt: treatment.appointmentBeginsAt,
        duration: treatment.duration,
        treatmentNotes: treatment.treatmentNotes,
      }));

    // Get treatment plans for this client
    const treatmentPlans = await getTreatmentPlansForUser(userId);

    return {
      success: true,
      client: clientData.client,
      healthHistory: clientData.healthHistory,
      treatments: decryptedTreatments,
      clientNotes,
      treatmentPlans: treatmentPlans.success ? treatmentPlans.data : [],
    };
  } catch (error) {
    console.error("Error fetching client profile data:", error);
    return {
      success: false,
      message: "Failed to fetch client profile data: " + error.message,
    };
  }
}

export async function getRMTCalendarData(rangeStart, rangeEnd) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can access calendar data");
    }

    if (!rangeStart || !rangeEnd) {
      throw new Error("Missing required date range");
    }

    const rmtId = session.resultObj.id;
    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error("Invalid date range");
    }

    const startDateKey = startDate.toISOString().split("T")[0];
    const endDateKey = endDate.toISOString().split("T")[0];

    const { rows: treatmentRows } = await sql`
      SELECT
        t.id,
        t.client_id AS "clientId",
        t.date AS "appointmentDate",
        t.appointment_begins_at AS "appointmentBeginsAt",
        t.appointment_ends_at AS "appointmentEndsAt",
        t.appointment_window_start AS "appointmentWindowStartsAt",
        t.appointment_window_end AS "appointmentWindowEndsAt",
        COALESCE(t.appointment_begins_at, t.appointment_window_start) AS "displayStartsAt",
        COALESCE(t.appointment_ends_at, t.appointment_window_end) AS "displayEndsAt",
        t.status,
        t.duration,
        t.location,
        t.workplace,
        t.consent_form AS "consentForm",
        t.google_calendar_event_id AS "googleCalendarEventId",
        t.google_calendar_event_link AS "googleCalendarEventLink",
        u.first_name AS "clientFirstName",
        u.last_name AS "clientLastName",
        u.email AS "clientEmail"
      FROM treatments t
      LEFT JOIN users u ON u.id = t.client_id
      WHERE
        t.rmt_id = ${rmtId}
        AND t.date >= ${startDateKey}::date
        AND t.date <= ${endDateKey}::date
        AND COALESCE(t.appointment_begins_at, t.appointment_window_start) IS NOT NULL
        AND COALESCE(t.appointment_ends_at, t.appointment_window_end) IS NOT NULL
      ORDER BY t.date ASC, COALESCE(t.appointment_begins_at, t.appointment_window_start) ASC
    `;

    const statusPriority = (status) => {
      const normalized = String(status || "").toLowerCase();
      if (normalized === "completed") return 3;
      if (normalized === "booked") return 2;
      if (normalized === "requested") return 1;
      if (normalized === "available") return 0;
      return 0;
    };

    const todayTorontoKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
    }).format(new Date());

    const dedupedRowsBySlot = new Map();
    for (const row of treatmentRows) {
      const rowDateKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
      }).format(new Date(row.appointmentDate));
      if (
        String(row.status || "").toLowerCase() === "available" &&
        rowDateKey < todayTorontoKey
      ) {
        continue;
      }

      const dateKey = new Date(row.appointmentDate).toISOString().split("T")[0];
      const startKey = String(
        row.appointmentWindowStartsAt || row.displayStartsAt || "",
      ).slice(0, 8);
      const endKey = String(
        row.appointmentWindowEndsAt || row.displayEndsAt || "",
      ).slice(0, 8);
      const slotKey = `${dateKey}|${startKey}|${endKey}`;
      const existing = dedupedRowsBySlot.get(slotKey);

      if (!existing) {
        dedupedRowsBySlot.set(slotKey, row);
        continue;
      }

      const currentPriority = statusPriority(row.status);
      const existingPriority = statusPriority(existing.status);
      if (
        currentPriority > existingPriority ||
        (currentPriority === existingPriority &&
          row.clientId &&
          !existing.clientId)
      ) {
        dedupedRowsBySlot.set(slotKey, row);
      }
    }

    const dedupedTreatmentRows = [...dedupedRowsBySlot.values()].sort(
      (a, b) => {
        const aTs = new Date(
          `${new Date(a.appointmentDate).toISOString().split("T")[0]}T${String(a.displayStartsAt).slice(0, 8)}`,
        ).getTime();
        const bTs = new Date(
          `${new Date(b.appointmentDate).toISOString().split("T")[0]}T${String(b.displayStartsAt).slice(0, 8)}`,
        ).getTime();
        return aTs - bTs;
      },
    );

    const treatmentGoogleIds = new Set(
      dedupedTreatmentRows
        .map((row) => row.googleCalendarEventId)
        .filter((id) => typeof id === "string" && id.length > 0),
    );

    let personalEvents = [];
    try {
      const googleResult = await calendar.events.list({
        calendarId: GOOGLE_CALENDAR_ID,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      personalEvents = (googleResult.data.items || [])
        .filter(
          (event) =>
            event?.id &&
            !treatmentGoogleIds.has(event.id) &&
            (event?.start?.dateTime || event?.start?.date),
        )
        .map((event) => ({
          id: event.id,
          title: event.summary || "Google Calendar Event",
          description: event.description || "",
          startDateTime:
            event.start?.dateTime || `${event.start?.date}T00:00:00`,
          endDateTime: event.end?.dateTime || `${event.end?.date}T00:00:00`,
          isAllDay: Boolean(event.start?.date && !event.start?.dateTime),
          source: "google",
          htmlLink: event.htmlLink || null,
        }));
    } catch (calendarError) {
      console.error(
        "Error fetching personal Google Calendar events:",
        calendarError,
      );
    }

    const dbEvents = dedupedTreatmentRows.map((row) => ({
      consentForm:
        typeof row.consentForm === "string"
          ? (() => {
              try {
                return JSON.parse(row.consentForm);
              } catch {
                return null;
              }
            })()
          : row.consentForm || null,
      id: row.id,
      title:
        String(row.status || "").toLowerCase() === "available"
          ? "Open Timeslot"
          : `${row.clientFirstName || ""} ${row.clientLastName || ""}`.trim() ||
            "Booked Appointment",
      status: row.status,
      clientId: row.clientId,
      clientName: row.clientId
        ? `${row.clientFirstName || ""} ${row.clientLastName || ""}`.trim()
        : null,
      clientEmail: row.clientEmail,
      duration: row.duration,
      location: row.location,
      workplace: row.workplace,
      startDateTime: `${
        new Date(row.appointmentDate).toISOString().split("T")[0]
      }T${String(row.displayStartsAt).slice(0, 8)}`,
      endDateTime: `${
        new Date(row.appointmentDate).toISOString().split("T")[0]
      }T${String(row.displayEndsAt).slice(0, 8)}`,
      source: "db",
      googleCalendarEventId: row.googleCalendarEventId,
      googleCalendarEventLink: row.googleCalendarEventLink,
    }));

    const { rows: clientRows } = await sql`
      SELECT
        id,
        first_name AS "firstName",
        last_name AS "lastName",
        email,
        phone_number AS "phoneNumber"
      FROM users
      WHERE rmt_id = ${rmtId}
        AND user_type = 'patient'
      ORDER BY first_name ASC, last_name ASC
    `;

    return {
      success: true,
      events: [...dbEvents, ...personalEvents],
      clients: clientRows,
    };
  } catch (error) {
    console.error("Error fetching RMT calendar data:", error);
    return {
      success: false,
      message: error.message || "Failed to load calendar data",
      events: [],
      clients: [],
    };
  }
}

export async function addAvailableAppointmentTimesForDate(
  date,
  times,
  duration = 60,
  cutoffHours = 0,
) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can add available appointments");
    }

    if (!date || !Array.isArray(times) || times.length === 0) {
      throw new Error("Date and at least one time are required");
    }

    const durationMinutes = Number(duration);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw new Error("Invalid duration");
    }
    const parsedCutoffHours = Number(cutoffHours);
    const safeCutoffHours =
      Number.isFinite(parsedCutoffHours) && parsedCutoffHours >= 0
        ? parsedCutoffHours
        : 0;

    const normalizedDate = new Date(date).toISOString().split("T")[0];
    const normalizedTimes = [
      ...new Set(
        times
          .map((t) => String(t || "").trim())
          .filter((t) => /^\d{2}:\d{2}$/.test(t)),
      ),
    ];

    if (!normalizedTimes.length) {
      throw new Error("No valid times provided");
    }

    const toEndTime = (startTime) => {
      const [h, m] = startTime.split(":").map(Number);
      const dt = new Date(Date.UTC(1970, 0, 1, h, m, 0));
      dt.setUTCMinutes(dt.getUTCMinutes() + durationMinutes);
      const hh = String(dt.getUTCHours()).padStart(2, "0");
      const mm = String(dt.getUTCMinutes()).padStart(2, "0");
      return `${hh}:${mm}:00`;
    };

    let createdCount = 0;
    let skippedCount = 0;

    for (const startTime of normalizedTimes) {
      const startTimeFull = `${startTime}:00`;
      const endTimeFull = toEndTime(startTime);

      const { rows: existing } = await sql`
        SELECT id
        FROM treatments
        WHERE
          rmt_id = ${session.resultObj.id}
          AND date = ${normalizedDate}::date
          AND COALESCE(appointment_window_start, appointment_begins_at) = ${startTimeFull}::time
        LIMIT 1
      `;

      if (existing.length > 0) {
        skippedCount++;
        continue;
      }

      await sql`
        INSERT INTO treatments (
          rmt_id,
          rmt_location_id,
          date,
          status,
          appointment_window_start,
          appointment_window_end,
          booking_cutoff_hours,
          created_at
        ) VALUES (
          ${session.resultObj.id},
          ${"ea5fbe60-7d3c-44ff-9307-b97ea3bc10f9"}::uuid,
          ${normalizedDate}::date,
          'available',
          ${startTimeFull}::time,
          ${endTimeFull}::time,
          ${safeCutoffHours},
          CURRENT_TIMESTAMP
        )
      `;

      createdCount++;
    }

    revalidatePath("/dashboard/rmt/calendar");
    revalidatePath("/dashboard/rmt");

    return {
      success: true,
      message: `Added ${createdCount} slot(s). Skipped ${skippedCount} existing slot(s).`,
      createdCount,
      skippedCount,
    };
  } catch (error) {
    console.error("Error adding available appointment times:", error);
    return {
      success: false,
      message: error.message || "Failed to add available appointment times",
    };
  }
}

export async function updateTreatmentPlan(planId, planData) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can update treatment plans");
    }

    const { rows: planRows } = await sql`
      SELECT id, client_id AS "clientId", created_by AS "createdBy"
      FROM treatment_plans
      WHERE id = ${planId}
      LIMIT 1
    `;

    if (!planRows || planRows.length === 0) {
      throw new Error("Treatment plan not found");
    }

    const plan = planRows[0];

    const { rows: clientRows } = await sql`
      SELECT id, rmt_id AS "rmtId"
      FROM users
      WHERE id = ${plan.clientId}
      LIMIT 1
    `;

    if (!clientRows || clientRows.length === 0) {
      throw new Error("Client not found");
    }

    if (clientRows[0].rmtId !== session.resultObj.id) {
      throw new Error("Unauthorized: You do not manage this client");
    }

    const encryptedPlanData = encryptData({
      objectivesOfTreatmentPlan: planData.objectivesOfTreatmentPlan || "",
      clientGoals: planData.clientGoals || "",
      areasToBeTreated: planData.areasToBeTreated || "",
      durationAndFrequency: planData.durationAndFrequency || "",
      typeAndFocusOfTreatments: planData.typeAndFocusOfTreatments || "",
      recommendedSelfCare: planData.recommendedSelfCare || "",
      scheduleForReassessment: planData.scheduleForReassessment || "",
      anticipatedClientResponse: planData.anticipatedClientResponse || "",
      conclusionOfTreatmentPlan: planData.conclusionOfTreatmentPlan || "",
      endDate:
        planData.endDate ||
        (planData.conclusionOfTreatmentPlan
          ? new Intl.DateTimeFormat("en-CA", {
              timeZone: "America/Toronto",
            }).format(new Date())
          : ""),
    });

    if (!encryptedPlanData) {
      throw new Error("Failed to encrypt treatment plan data");
    }

    const normalizedStartDate = planData.startDate
      ? new Date(planData.startDate).toISOString().split("T")[0]
      : null;

    await sql`
      UPDATE treatment_plans
      SET
        encrypted_data = ${encryptedPlanData},
        start_date = ${normalizedStartDate}
      WHERE id = ${planId}
    `;

    revalidatePath("/dashboard/rmt");
    revalidatePath(`/dashboard/rmt/client-profile/${plan.clientId}`);

    return {
      success: true,
      message: "Treatment plan updated successfully.",
    };
  } catch (error) {
    console.error("Error updating treatment plan:", error);
    return {
      success: false,
      message: error.message || "Failed to update treatment plan",
    };
  }
}

export async function emailClientToUpdateHealthHistory(clientId) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can send this reminder");
    }

    const { rows: clients } = await sql`
      SELECT
        id,
        first_name AS "firstName",
        last_name AS "lastName",
        email,
        rmt_id AS "rmtId"
      FROM users
      WHERE id = ${clientId}
    `;

    if (!clients || clients.length === 0) {
      throw new Error("Client not found");
    }

    const client = clients[0];
    if (client.rmtId !== session.resultObj.id) {
      throw new Error("Unauthorized: You do not manage this client");
    }

    if (!client.email) {
      throw new Error("Client does not have an email address");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.ciprmt.com";
    const healthHistoryUrl = `${appUrl}/dashboard/patient/health-history`;

    const transporter = getEmailTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: client.email,
      bcc: process.env.EMAIL_USER,
      subject: "Please Update Your Health History",
      text: `Hi ${client.firstName},\n\nPlease log in to your account and update your health history before your next appointment.\n\nUpdate here: ${healthHistoryUrl}\n\nThank you,\nCip De Vries, RMT`,
      html: `
        <p>Hi ${client.firstName},</p>
        <p>Please log in to your account and update your health history before your next appointment.</p>
        <p><a href="${healthHistoryUrl}">Update Your Health History</a></p>
        <p>Thank you,<br/>Cip De Vries, RMT</p>
      `,
    });

    return {
      success: true,
      message: `Health history reminder sent to ${client.firstName} ${client.lastName}`,
    };
  } catch (error) {
    console.error("Error sending health history reminder:", error);
    return {
      success: false,
      message:
        error.message || "Failed to send health history update reminder email",
    };
  }
}

export async function sendConsentFormReminderForAppointment(appointmentId) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can send this reminder");
    }

    if (!appointmentId) {
      throw new Error("Appointment id is required");
    }

    const { rows } = await sql`
      SELECT
        t.id,
        t.rmt_id AS "rmtId",
        t.client_id AS "clientId",
        t.date,
        t.status,
        t.appointment_begins_at AS "appointmentBeginsAt",
        t.duration,
        t.location,
        t.consent_form AS "consentForm",
        u.first_name AS "firstName",
        u.last_name AS "lastName",
        u.email
      FROM treatments t
      LEFT JOIN users u ON u.id = t.client_id
      WHERE t.id = ${appointmentId}
      LIMIT 1
    `;

    if (!rows.length) {
      throw new Error("Appointment not found");
    }

    const appointment = rows[0];
    if (appointment.rmtId !== session.resultObj.id) {
      throw new Error("Unauthorized: You do not manage this appointment");
    }

    if (String(appointment.status || "").toLowerCase() !== "booked") {
      throw new Error("Reminder can only be sent for booked appointments");
    }

    const todayTorontoKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
    }).format(new Date());
    const appointmentDateKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
    }).format(new Date(appointment.date));

    if (appointmentDateKey !== todayTorontoKey) {
      throw new Error(
        "Reminder can only be sent for appointments happening today",
      );
    }

    if (!appointment.email) {
      throw new Error("Client does not have an email address");
    }

    const parsedConsentForm =
      typeof appointment.consentForm === "string"
        ? (() => {
            try {
              return JSON.parse(appointment.consentForm);
            } catch {
              return null;
            }
          })()
        : appointment.consentForm || null;
    const hasConsentForm =
      parsedConsentForm &&
      typeof parsedConsentForm === "object" &&
      Object.keys(parsedConsentForm).length > 0;

    if (hasConsentForm) {
      return {
        success: true,
        message: "Consent form has already been completed for this appointment.",
      };
    }

    const appointmentData = {
      firstName: appointment.firstName || "there",
      lastName: appointment.lastName || "",
      email: appointment.email,
      appointmentDate: formatDateForDisplay(appointment.date),
      appointmentBeginsAt: formatTimeForDisplay(appointment.appointmentBeginsAt),
      location: appointment.location || "Not specified",
      duration: appointment.duration || 60,
    };

    const emailContent = getConsentFormReminderEmail(appointmentData);
    await ensureEmailIdempotencyTable();
    const idempotencyKey = `manual-consent-reminder/${appointment.id}/${todayTorontoKey}`;

    const claimResult = await claimEmailIdempotencyKey({
      key: idempotencyKey,
      emailType: "manual_consent_reminder",
      payload: {
        to: appointment.email,
        subject: "Reminder: Please Complete Your Consent Form",
        appointmentId: appointment.id,
        appointmentDate: appointmentData.appointmentDate,
      },
    });

    if (!claimResult.shouldSend) {
      return {
        success: true,
        message: "Reminder already sent for this appointment today.",
      };
    }

    const transporter = getEmailTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: appointment.email,
      bcc: process.env.EMAIL_USER,
      subject: "Reminder: Please Complete Your Consent Form",
      text: emailContent.text,
      html: emailContent.html,
    });

    await markEmailIdempotencySent({
      key: idempotencyKey,
      payloadHash: claimResult.payloadHash,
      messageId: info?.messageId || null,
    });

    return {
      success: true,
      message: `Consent form reminder sent to ${appointment.firstName || "client"}.`,
    };
  } catch (error) {
    console.error("Error sending consent form reminder:", error);
    return {
      success: false,
      message: error.message || "Failed to send consent form reminder",
    };
  }
}

export async function saveClientPhoneNumber(clientId, phoneNumber) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can update client phone number");
    }

    const normalizedPhone = normalizePhoneToDigits(phoneNumber || "");
    if (!normalizedPhone) {
      throw new Error("Phone number is required");
    }
    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      throw new Error("Phone number must be between 10 and 15 digits");
    }

    const { rows: clients } = await sql`
      SELECT id, rmt_id AS "rmtId"
      FROM users
      WHERE id = ${clientId}
      LIMIT 1
    `;

    if (!clients || clients.length === 0) {
      throw new Error("Client not found");
    }

    if (clients[0].rmtId !== session.resultObj.id) {
      throw new Error("Unauthorized: You do not manage this client");
    }

    const { rows: updatedRows } = await sql`
      UPDATE users
      SET phone_number = ${normalizedPhone}
      WHERE id = ${clientId}
      RETURNING id, phone_number AS "phoneNumber"
    `;

    if (!updatedRows || updatedRows.length === 0) {
      throw new Error("Failed to update client phone number");
    }

    revalidatePath(`/dashboard/rmt/client-profile/${clientId}`);

    return {
      success: true,
      message: "Phone number saved.",
      data: updatedRows[0],
    };
  } catch (error) {
    console.error("Error saving client phone number:", error);
    return {
      success: false,
      message: error.message || "Failed to save phone number",
    };
  }
}

export async function getClientBenefitsCoverage(clientId) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can access benefits coverage");
    }

    let rows;
    try {
      const queryResult = await sql`
        SELECT
          id,
          rmt_id AS "rmtId",
          benefits_coverage AS "benefitsCoverage",
          benefits_renewal_date AS "benefitsRenewalDate",
          send_reminders AS "sendReminders",
          reminder_frequency AS "reminderFrequency"
        FROM users
        WHERE id = ${clientId}
        LIMIT 1
      `;
      rows = queryResult.rows;
    } catch (error) {
      if (error?.code !== "42703") {
        throw error;
      }

      // Fallback for environments that only have the first benefits migration.
      try {
        const fallbackWithBenefits = await sql`
          SELECT
            id,
            rmt_id AS "rmtId",
            benefits_coverage AS "benefitsCoverage",
            benefits_renewal_date AS "benefitsRenewalDate"
          FROM users
          WHERE id = ${clientId}
          LIMIT 1
        `;
        rows = fallbackWithBenefits.rows.map((row) => ({
          ...row,
          sendReminders: false,
          reminderFrequency: null,
        }));
      } catch (fallbackError) {
        if (fallbackError?.code !== "42703") {
          throw fallbackError;
        }

        const fallbackResult = await sql`
          SELECT id, rmt_id AS "rmtId"
          FROM users
          WHERE id = ${clientId}
          LIMIT 1
        `;
        rows = fallbackResult.rows.map((row) => ({
          ...row,
          benefitsCoverage: null,
          benefitsRenewalDate: null,
          sendReminders: false,
          reminderFrequency: null,
        }));
      }
    }

    if (!rows || rows.length === 0) {
      throw new Error("Client not found");
    }

    const client = rows[0];
    if (client.rmtId !== session.resultObj.id) {
      throw new Error("Unauthorized: You do not manage this client");
    }

    const renewalRaw = client.benefitsRenewalDate;

    const todayParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const todayYear = Number(
      todayParts.find((part) => part.type === "year")?.value || "1970",
    );
    const todayMonth = Number(
      todayParts.find((part) => part.type === "month")?.value || "01",
    );
    const todayDay = Number(
      todayParts.find((part) => part.type === "day")?.value || "01",
    );

    const parseMonthDay = (value) => {
      if (!value) return { month: 1, day: 1 };

      if (typeof value === "string") {
        const parts = value.split("-");
        if (parts.length >= 3) {
          return {
            month: Number(parts[1]) || 1,
            day: Number(parts[2]) || 1,
          };
        }
      }

      const dateObj = new Date(value);
      if (!Number.isNaN(dateObj.getTime())) {
        return {
          month: dateObj.getUTCMonth() + 1,
          day: dateObj.getUTCDate(),
        };
      }

      return { month: 1, day: 1 };
    };

    const pad2 = (num) => String(num).padStart(2, "0");
    const { month, day } = parseMonthDay(renewalRaw);
    const torontoTodayString = `${todayYear}-${pad2(todayMonth)}-${pad2(todayDay)}`;

    const thisYearRenewal = `${todayYear}-${pad2(month)}-${pad2(day)}`;
    const cycleStart =
      torontoTodayString >= thisYearRenewal
        ? thisYearRenewal
        : `${todayYear - 1}-${pad2(month)}-${pad2(day)}`;
    const cycleEnd = `${Number(cycleStart.slice(0, 4)) + 1}-${pad2(month)}-${pad2(
      day,
    )}`;

    const { rows: usedRows } = await sql`
      SELECT COALESCE(SUM(price), 0) AS "usedAmount"
      FROM treatments
      WHERE client_id = ${clientId}
        AND status = 'completed'
        AND date >= ${cycleStart}::date
        AND date < ${cycleEnd}::date
    `;

    const usedAmount = Number(usedRows?.[0]?.usedAmount) || 0;

    return {
      success: true,
      data: {
        benefitsCoverage:
          client.benefitsCoverage === null
            ? null
            : Number(client.benefitsCoverage),
        benefitsRenewalDate:
          renewalRaw === null
            ? `${todayYear}-01-01`
            : new Date(renewalRaw).toISOString().split("T")[0],
        sendReminders: Boolean(client.sendReminders),
        reminderFrequency:
          client.reminderFrequency === null
            ? null
            : Number(client.reminderFrequency),
        usedAmount,
        cycleStart,
        cycleEnd,
      },
    };
  } catch (error) {
    console.error("Error fetching client benefits coverage:", error);
    return {
      success: false,
      message: error.message || "Failed to fetch benefits coverage",
    };
  }
}

export async function saveClientBenefitsCoverage(
  clientId,
  coverageAmount,
  renewalDate,
  sendReminders,
  reminderFrequency,
) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can save benefits coverage");
    }

    const parsedCoverage =
      coverageAmount === null ||
      coverageAmount === undefined ||
      coverageAmount === ""
        ? null
        : Number(coverageAmount);

    if (
      parsedCoverage !== null &&
      (!Number.isFinite(parsedCoverage) || parsedCoverage < 0)
    ) {
      throw new Error("Coverage amount must be a non-negative number");
    }

    const parsedRenewalDate = renewalDate || "2000-01-01";
    if (Number.isNaN(new Date(parsedRenewalDate).getTime())) {
      throw new Error("Renewal date is invalid");
    }

    const parsedSendReminders = Boolean(sendReminders);
    const parsedReminderFrequency =
      reminderFrequency === null ||
      reminderFrequency === undefined ||
      reminderFrequency === ""
        ? null
        : Number(reminderFrequency);

    if (
      parsedReminderFrequency !== null &&
      (!Number.isFinite(parsedReminderFrequency) || parsedReminderFrequency < 0)
    ) {
      throw new Error("Reminder frequency must be a non-negative number");
    }

    if (parsedSendReminders) {
      if (
        parsedReminderFrequency === null ||
        !Number.isFinite(parsedReminderFrequency) ||
        parsedReminderFrequency <= 0
      ) {
        throw new Error(
          "Select a valid reminder frequency option before enabling reminders",
        );
      }
    }

    const { rows: clients } = await sql`
      SELECT id, rmt_id AS "rmtId"
      FROM users
      WHERE id = ${clientId}
      LIMIT 1
    `;

    if (!clients || clients.length === 0) {
      throw new Error("Client not found");
    }

    if (clients[0].rmtId !== session.resultObj.id) {
      throw new Error("Unauthorized: You do not manage this client");
    }

    let updatedRows;
    try {
      const queryResult = await sql`
        UPDATE users
        SET
          benefits_coverage = ${parsedCoverage},
          benefits_renewal_date = ${parsedRenewalDate}::date,
          send_reminders = ${parsedSendReminders},
          reminder_frequency = ${parsedReminderFrequency}
        WHERE id = ${clientId}
        RETURNING
          benefits_coverage AS "benefitsCoverage",
          benefits_renewal_date AS "benefitsRenewalDate",
          send_reminders AS "sendReminders",
          reminder_frequency AS "reminderFrequency"
      `;
      updatedRows = queryResult.rows;
    } catch (error) {
      if (error?.code === "42703") {
        // Fallback for environments that only have the first benefits migration.
        try {
          const fallbackUpdate = await sql`
            UPDATE users
            SET
              benefits_coverage = ${parsedCoverage},
              benefits_renewal_date = ${parsedRenewalDate}::date
            WHERE id = ${clientId}
            RETURNING
              benefits_coverage AS "benefitsCoverage",
              benefits_renewal_date AS "benefitsRenewalDate"
          `;
          updatedRows = fallbackUpdate.rows.map((row) => ({
            ...row,
            sendReminders: false,
            reminderFrequency: null,
          }));
        } catch (fallbackError) {
          if (fallbackError?.code === "42703") {
            return {
              success: false,
              message:
                "Benefits columns are not in the database yet. Run the migration SQL first.",
            };
          }
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }

    revalidatePath(`/dashboard/rmt/client-profile/${clientId}`);

    return {
      success: true,
      data: {
        benefitsCoverage:
          updatedRows[0].benefitsCoverage === null
            ? null
            : Number(updatedRows[0].benefitsCoverage),
        benefitsRenewalDate:
          updatedRows[0].benefitsRenewalDate === null
            ? null
            : new Date(updatedRows[0].benefitsRenewalDate)
                .toISOString()
                .split("T")[0],
        sendReminders: Boolean(updatedRows[0].sendReminders),
        reminderFrequency:
          updatedRows[0].reminderFrequency === null
            ? null
            : Number(updatedRows[0].reminderFrequency),
      },
      message: "reminder details saved.",
    };
  } catch (error) {
    console.error("Error saving client benefits coverage:", error);
    return {
      success: false,
      message: error.message || "Failed to save benefits coverage",
    };
  }
}

// export async function getClientProfileData(userId) {
//   try {
//     const session = await getSession();
//     if (!session || !session.resultObj) {
//       throw new Error("Unauthorized: User not logged in");
//     }

//     // Check if the user is an RMT
//     if (session.resultObj.userType !== "rmt") {
//       throw new Error("Unauthorized: Only RMTs can access client profiles");
//     }

//     // Get client information with health history
//     const clientData = await getClientWithHealthHistory(userId);

//     // Get all treatments for this client
//     const { rows: treatments } = await sql`
//       SELECT
//         id,
//         client_id AS "clientId",
//         rmt_id AS "rmtId",
//         date AS "appointmentDate",
//         appointment_begins_at AS "appointmentBeginsAt",
//         appointment_ends_at AS "appointmentEndsAt",
//         status,
//         location,
//         duration,
//         workplace,
//         price,
//         payment_type AS "paymentType",
//         encrypted_treatment_notes AS "treatmentNotes",
//         treatment_plan_id AS "treatmentPlanId",
//         google_calendar_event_id AS "googleCalendarEventId",
//         google_calendar_event_link AS "googleCalendarEventLink",
//         created_at AS "createdAt",
//         consent_form AS "consentForm",
//         consent_form_submitted_at AS "consentFormSubmittedAt",
//         code
//       FROM treatments
//       WHERE client_id = ${userId}
//       ORDER BY date DESC, appointment_begins_at DESC
//     `;

//     // Get treatment plans for this client
//     const treatmentPlans = await getTreatmentPlansForUser(userId);

//     console.log(
//       "[v0] getClientProfileData - treatments sample:",
//       treatments.slice(0, 2)
//     );
//     console.log("[v0] getClientProfileData - treatmentPlans:", treatmentPlans);

//     return {
//       success: true,
//       client: clientData.client,
//       healthHistory: clientData.healthHistory,
//       treatments,
//       treatmentPlans: treatmentPlans.success ? treatmentPlans.data : [],
//     };
//   } catch (error) {
//     console.error("Error fetching client profile data:", error);
//     return {
//       success: false,
//       message: "Failed to fetch client profile data: " + error.message,
//     };
//   }
// }

export async function getTreatmentPlansForUser(userId) {
  try {
    const session = await getSession();
    if (!session?.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    const canAccess =
      session.resultObj.userType === "rmt" || session.resultObj.id === userId;
    if (!canAccess) {
      throw new Error("Unauthorized: Access denied");
    }

    const { rows: plans } = await sql`
      SELECT
        tp.id,
        tp.client_id AS "clientId",
        tp.created_by AS "createdBy",
        tp.start_date AS "startDate",
        tp.created_at AS "createdAt",
        tp.encrypted_data AS "encryptedData",
        u.first_name AS "clientFirstName",
        u.last_name AS "clientLastName"
      FROM treatment_plans tp
      LEFT JOIN users u ON tp.client_id = u.id
      WHERE tp.client_id = ${userId}
      ORDER BY tp.created_at DESC
    `;

    // Decrypt the treatment plan data
    const decryptedPlans = plans.map((plan) => {
      let decryptedData = null;

      if (plan.encryptedData) {
        try {
          decryptedData = decryptData(plan.encryptedData);
        } catch (error) {
          console.error(`Error decrypting plan ${plan.id}:`, error);
        }
      }

      return {
        ...plan,
        decryptedData,
        // Flatten commonly used fields for easier access
        clientGoals: decryptedData?.clientGoals,
        areasToBeTreated: decryptedData?.areasToBeTreated,
        durationAndFrequency: decryptedData?.durationAndFrequency,
        endDate: decryptedData?.endDate,
      };
    });

    return {
      success: true,
      data: decryptedPlans,
    };
  } catch (error) {
    console.error("Error fetching treatment plans:", error);
    return {
      success: false,
      message: "Failed to fetch treatment plans: " + error.message,
      data: [],
    };
  }
}

export async function bookAppointmentForClient(clientId, appointmentData) {
  try {
    // ---------------------
    // 1. AUTHENTICATION
    // ---------------------
    const session = await getSession();
    if (!session?.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }
    if (session.resultObj.userType !== "rmt") {
      throw new Error(
        "Unauthorized: Only RMTs can book appointments for clients",
      );
    }

    const {
      date,
      time,
      duration,
      appointmentId: selectedAppointmentId,
    } = appointmentData;
    if (!date || !time || !duration) {
      throw new Error("Missing required fields: date, time, or duration");
    }

    // ---------------------
    // 2. LOAD CLIENT
    // ---------------------
    const { rows: clientRows } = await sql`
      SELECT 
        id,
        first_name AS "firstName",
        last_name AS "lastName",
        email,
        phone_number AS "phoneNumber",
        rmt_id AS "rmtId"
      FROM users
      WHERE id = ${clientId}
      LIMIT 1
    `;

    if (clientRows.length === 0) throw new Error("Client not found");
    const client = clientRows[0];

    // ---------------------
    // 3. FORMAT DATE & TIME (OLD WORKING METHOD)
    // ---------------------

    // Use browser-style parsing so deployment servers behave correctly
    const startDateTime = new Date(`${date}T${time}:00`);

    const formattedStartTime = startDateTime.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Calculate end time
    const endDateTime = new Date(
      startDateTime.getTime() + Number(duration) * 60000,
    );

    const formattedEndTime = endDateTime.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Format date
    const formattedDate = new Date(date).toISOString().split("T")[0];

    // ---------------------
    // 4. PREVENT OVERLAPPING BOOKINGS
    // ---------------------
    const { rows: overlapping } = await sql`
      SELECT id
      FROM treatments
      WHERE rmt_id = ${client.rmtId}
      AND date = ${formattedDate}::date
      AND status = 'booked'
      AND (${selectedAppointmentId || null}::uuid IS NULL OR id <> ${selectedAppointmentId || null}::uuid)
      AND (
            (appointment_begins_at <= ${formattedStartTime}::time 
              AND appointment_ends_at > ${formattedStartTime}::time)
         OR (appointment_begins_at < ${formattedEndTime}::time 
              AND appointment_ends_at >= ${formattedEndTime}::time)
          )
      LIMIT 1
    `;

    if (overlapping.length > 0) {
      throw new Error("This time overlaps with another booked appointment.");
    }

    // ---------------------
    // 5. FIND AVAILABLE SLOT OR CREATE NEW ONE
    // ---------------------
    let appointmentId;
    let rmtLocationId;
    if (selectedAppointmentId) {
      const { rows: selectedSlotRows } = await sql`
        SELECT id, rmt_location_id, rmt_id
        FROM treatments
        WHERE id = ${selectedAppointmentId}
        LIMIT 1
      `;

      if (!selectedSlotRows.length) {
        throw new Error("Selected appointment slot not found.");
      }

      const selectedSlot = selectedSlotRows[0];
      if (selectedSlot.rmt_id !== client.rmtId) {
        throw new Error("Selected slot does not belong to this RMT.");
      }

      appointmentId = selectedSlot.id;
      rmtLocationId = selectedSlot.rmt_location_id;

      await sql`
        UPDATE treatments
        SET
          date = ${formattedDate}::date,
          status = 'booked',
          appointment_begins_at = ${formattedStartTime}::time,
          appointment_ends_at = ${formattedEndTime}::time,
          duration = ${Number(duration)},
          client_id = ${clientId},
          location = '268 Shuter Street, Toronto, ON'
        WHERE id = ${appointmentId}
      `;
    } else {
      const { rows: availableSlots } = await sql`
        SELECT id, rmt_location_id
        FROM treatments
        WHERE rmt_id = ${client.rmtId}
        AND date = ${formattedDate}::date
        AND status = 'available'
        AND appointment_window_start <= ${formattedStartTime}::time
        AND appointment_window_end >= ${formattedEndTime}::time
        LIMIT 1
      `;

      if (availableSlots.length === 0) {
        // Create new row
        const { rows: created } = await sql`
          INSERT INTO treatments (
            rmt_id,
            client_id,
            date,
            appointment_begins_at,
            appointment_ends_at,
            duration,
            status,
            location
          )
          VALUES (
            ${client.rmtId},
            ${clientId},
            ${formattedDate}::date,
            ${formattedStartTime}::time,
            ${formattedEndTime}::time,
            ${Number(duration)},
            'booked',
            '268 Shuter Street, Toronto, ON'
          )
          RETURNING id, rmt_location_id
        `;

        appointmentId = created[0].id;
        rmtLocationId = created[0].rmt_location_id;
      } else {
        // Use the existing slot
        appointmentId = availableSlots[0].id;
        rmtLocationId = availableSlots[0].rmt_location_id;

        await sql`
          UPDATE treatments
          SET 
            status = 'booked',
            appointment_begins_at = ${formattedStartTime}::time,
            appointment_ends_at = ${formattedEndTime}::time,
            duration = ${Number(duration)},
            client_id = ${clientId},
            location = '268 Shuter Street, Toronto, ON'
          WHERE id = ${appointmentId}
        `;
      }
    }

    // ---------------------
    // 6. CREATE GOOGLE CALENDAR EVENT
    // ---------------------
    const event = {
      summary: `[Booked] Mx ${client.firstName} ${client.lastName}`,
      location: "268 Shuter Street, Toronto, ON",
      description: `Email: ${client.email}\nPhone: ${
        client.phoneNumber || "N/A"
      }`,
      start: {
        dateTime: `${formattedDate}T${formattedStartTime}`,
        timeZone: "America/Toronto",
      },
      end: {
        dateTime: `${formattedDate}T${formattedEndTime}`,
        timeZone: "America/Toronto",
      },
      colorId: "2",
    };

    const createdEvent = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      resource: event,
    });

    // ---------------------
    // 7. UPDATE DB WITH GOOGLE EVENT INFO
    // ---------------------
    await sql`
      UPDATE treatments
      SET 
        google_calendar_event_id = ${createdEvent.data.id},
        google_calendar_event_link = ${createdEvent.data.htmlLink}
      WHERE id = ${appointmentId}
    `;

    // ---------------------
    // 8. AUDIT LOG
    // ---------------------
    try {
      await logAuditEvent({
        typeOfInfo: "appointment booking",
        actionPerformed: "created by RMT",
        accessedById: session.resultObj.id,
        whoseInfoId: clientId,
        reasonForAccess: "RMT booking appointment for client",
        additionalDetails: {
          accessedByName: `${session.resultObj.firstName} ${session.resultObj.lastName}`,
          whoseInfoName: `${client.firstName} ${client.lastName}`,
          appointmentId,
          appointmentDate: formattedDate,
          appointmentTime: formattedStartTime,
          duration,
          googleCalendarEventId: createdEvent.data.id,
        },
      });
    } catch (_) {}

    revalidatePath("/dashboard/rmt");

    return {
      success: true,
      message: "Appointment booked successfully!",
      appointmentId,
    };
  } catch (error) {
    console.error("Error booking appointment for client:", error);
    return {
      success: false,
      message: error.message || "Failed to book appointment",
    };
  }
}

export async function getRMTAppointmentForReschedule(appointmentId) {
  try {
    const session = await getSession();
    if (!session?.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }
    if (session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized: Only RMTs can access this page");
    }

    const { rows } = await sql`
      SELECT
        t.id,
        t.rmt_id AS "rmtId",
        t.client_id AS "clientId",
        t.rmt_location_id AS "rmtLocationId",
        t.date AS "appointmentDate",
        t.appointment_begins_at AS "appointmentBeginsAt",
        t.appointment_ends_at AS "appointmentEndsAt",
        t.duration,
        t.status,
        t.location,
        t.workplace,
        t.price,
        t.payment_type AS "paymentType",
        t.google_calendar_event_id AS "googleCalendarEventId",
        t.google_calendar_event_link AS "googleCalendarEventLink",
        t.consent_form AS "consentForm",
        t.consent_form_submitted_at AS "consentFormSubmittedAt",
        t.code,
        u.first_name AS "clientFirstName",
        u.last_name AS "clientLastName",
        u.email AS "clientEmail",
        u.phone_number AS "clientPhoneNumber"
      FROM treatments t
      LEFT JOIN users u ON t.client_id = u.id
      WHERE t.id = ${appointmentId}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return { success: false, message: "Appointment not found." };
    }

    const appointment = rows[0];
    if (appointment.rmtId !== session.resultObj.id) {
      return {
        success: false,
        message: "Unauthorized: You do not have access to this appointment.",
      };
    }

    return { success: true, appointment };
  } catch (error) {
    console.error("Error fetching RMT reschedule appointment:", error);
    return {
      success: false,
      message: "Failed to fetch appointment details.",
    };
  }
}

export async function rescheduleAppointmentByRMT(
  currentAppointmentId,
  { date, time, duration },
) {
  try {
    const session = await getSession();
    if (!session?.resultObj) {
      return {
        success: false,
        message: "Unauthorized: User not logged in",
      };
    }
    if (session.resultObj.userType !== "rmt") {
      return {
        success: false,
        message: "Unauthorized: Only RMTs can reschedule appointments",
      };
    }

    if (!date || !time || !duration) {
      return {
        success: false,
        message: "Missing required fields: date, time, or duration",
      };
    }

    const { rows: currentRows } = await sql`
      SELECT
        treatments.id,
        treatments.rmt_id AS "rmtId",
        treatments.client_id AS "clientId",
        u.first_name AS "clientFirstName",
        u.last_name AS "clientLastName",
        u.email AS "clientEmail",
        treatments.rmt_location_id AS "rmtLocationId",
        treatments.status,
        treatments.location,
        treatments.workplace,
        treatments.consent_form AS "consentForm",
        treatments.consent_form_submitted_at AS "consentFormSubmittedAt",
        treatments.google_calendar_event_id AS "googleCalendarEventId",
        treatments.google_calendar_event_link AS "googleCalendarEventLink",
        treatments.code,
        treatments.date AS "appointmentDate",
        treatments.appointment_begins_at AS "appointmentBeginsAt",
        treatments.appointment_ends_at AS "appointmentEndsAt"
      FROM treatments
      LEFT JOIN users u ON treatments.client_id = u.id
      WHERE treatments.id = ${currentAppointmentId}
      LIMIT 1
    `;

    if (!currentRows || currentRows.length === 0) {
      return { success: false, message: "Current appointment not found." };
    }

    const currentAppointment = currentRows[0];
    if (currentAppointment.rmtId !== session.resultObj.id) {
      return {
        success: false,
        message: "Unauthorized: You do not manage this appointment.",
      };
    }
    if (!currentAppointment.clientId) {
      return {
        success: false,
        message: "This appointment has no client assigned.",
      };
    }

    const startDateTime = new Date(`${date}T${time}:00`);
    const formattedStartTime = startDateTime.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const endDateTime = new Date(
      startDateTime.getTime() + Number(duration) * 60000,
    );
    const formattedEndTime = endDateTime.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const formattedDate = new Date(date).toISOString().split("T")[0];

    const { rows: targetSlots } = await sql`
      SELECT id
      FROM treatments
      WHERE
        rmt_id = ${currentAppointment.rmtId}
        AND rmt_location_id = ${currentAppointment.rmtLocationId}
        AND date = ${formattedDate}::date
        AND status = 'available'
        AND appointment_window_start <= ${formattedStartTime}::time
        AND appointment_window_end >= ${formattedEndTime}::time
      LIMIT 1
    `;
    let newAppointmentId = null;

    if (currentAppointment.googleCalendarEventId) {
      try {
        await calendar.events.update({
          calendarId: GOOGLE_CALENDAR_ID,
          eventId: currentAppointment.googleCalendarEventId,
          resource: {
            summary: `[Booked] Mx ${currentAppointment.clientFirstName || ""} ${
              currentAppointment.clientLastName || ""
            }`.trim(),
            location: currentAppointment.location || "Not specified",
            start: {
              dateTime: `${formattedDate}T${formattedStartTime}`,
              timeZone: "America/Toronto",
            },
            end: {
              dateTime: `${formattedDate}T${formattedEndTime}`,
              timeZone: "America/Toronto",
            },
          },
        });
      } catch (calendarError) {
        console.error("Error updating Google Calendar event:", calendarError);
      }
    }

    // Clear old appointment so it becomes bookable again
    await sql`
      UPDATE treatments
      SET 
        status = 'available',
        client_id = NULL,
        duration = NULL,
        workplace = NULL,
        consent_form = NULL,
        consent_form_submitted_at = NULL,
        google_calendar_event_id = NULL,
        google_calendar_event_link = NULL,
        appointment_begins_at = NULL,
        appointment_ends_at = NULL,
        location = NULL,
        code = NULL
      WHERE id = ${currentAppointmentId}
    `;

    if (targetSlots && targetSlots.length > 0) {
      newAppointmentId = targetSlots[0].id;

      await sql`
        UPDATE treatments
        SET
          status = ${
            currentAppointment.status === "requested" ? "requested" : "booked"
          },
          client_id = ${currentAppointment.clientId},
          appointment_begins_at = ${formattedStartTime}::time,
          appointment_ends_at = ${formattedEndTime}::time,
          duration = ${Number(duration)},
          workplace = ${currentAppointment.workplace},
          location = ${currentAppointment.location},
          consent_form = ${currentAppointment.consentForm},
          consent_form_submitted_at = ${currentAppointment.consentFormSubmittedAt},
          google_calendar_event_id = ${currentAppointment.googleCalendarEventId},
          google_calendar_event_link = ${currentAppointment.googleCalendarEventLink},
          code = ${currentAppointment.code || null}
        WHERE id = ${newAppointmentId}
      `;
    } else {
      const { rows: createdRows } = await sql`
        INSERT INTO treatments (
          rmt_id,
          rmt_location_id,
          client_id,
          date,
          appointment_begins_at,
          appointment_ends_at,
          duration,
          status,
          location,
          workplace,
          consent_form,
          consent_form_submitted_at,
          google_calendar_event_id,
          google_calendar_event_link,
          code
        )
        VALUES (
          ${currentAppointment.rmtId},
          ${currentAppointment.rmtLocationId},
          ${currentAppointment.clientId},
          ${formattedDate}::date,
          ${formattedStartTime}::time,
          ${formattedEndTime}::time,
          ${Number(duration)},
          ${currentAppointment.status === "requested" ? "requested" : "booked"},
          ${currentAppointment.location},
          ${currentAppointment.workplace},
          ${currentAppointment.consentForm},
          ${currentAppointment.consentFormSubmittedAt},
          ${currentAppointment.googleCalendarEventId},
          ${currentAppointment.googleCalendarEventLink},
          ${currentAppointment.code || null}
        )
        RETURNING id
      `;

      newAppointmentId = createdRows[0].id;
    }

    if (currentAppointment.clientEmail) {
      try {
        const transporter = getEmailTransporter();
        const formattedDisplayDate = new Date(
          `${formattedDate}T00:00:00`,
        ).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const [startHour, startMinute] = formattedStartTime
          .split(":")
          .map(Number);
        const [endHour, endMinute] = formattedEndTime.split(":").map(Number);
        const startSuffix = startHour >= 12 ? "PM" : "AM";
        const endSuffix = endHour >= 12 ? "PM" : "AM";
        const displayStart = `${startHour % 12 || 12}:${String(startMinute).padStart(2, "0")} ${startSuffix}`;
        const displayEnd = `${endHour % 12 || 12}:${String(endMinute).padStart(2, "0")} ${endSuffix}`;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: currentAppointment.clientEmail,
          bcc: process.env.EMAIL_USER,
          subject: "Your Appointment Has Been Rescheduled",
          text: `Hi ${currentAppointment.clientFirstName || "there"},\n\nYour appointment has been rescheduled.\n\nNew appointment details:\nDate: ${formattedDisplayDate}\nTime: ${displayStart} - ${displayEnd}\nDuration: ${Number(duration)} minutes\nLocation: ${currentAppointment.location || "Not specified"}\n\nIf this time no longer works for you, please log in to your account to request another change.\n\nThank you,\nCip De Vries, RMT`,
          html: `
            <h2>Your Appointment Has Been Rescheduled</h2>
            <p>Hi ${currentAppointment.clientFirstName || "there"},</p>
            <p>Your appointment has been rescheduled.</p>
            <p><strong>New appointment details:</strong></p>
            <ul>
              <li><strong>Date:</strong> ${formattedDisplayDate}</li>
              <li><strong>Time:</strong> ${displayStart} - ${displayEnd}</li>
              <li><strong>Duration:</strong> ${Number(duration)} minutes</li>
              <li><strong>Location:</strong> ${
                currentAppointment.location || "Not specified"
              }</li>
            </ul>
            <p>If this time no longer works for you, please log in to your account to request another change.</p>
            <p>Thank you,<br/>Cip De Vries, RMT</p>
          `,
        });
      } catch (emailError) {
        console.error(
          "Failed to send RMT reschedule notification email:",
          emailError,
        );
      }
    }

    revalidatePath("/dashboard/rmt");
    revalidatePath(
      `/dashboard/rmt/reschedule-appointment/${currentAppointmentId}`,
    );

    return {
      success: true,
      message: "Appointment rescheduled successfully.",
      newAppointmentId,
    };
  } catch (error) {
    console.error("Error rescheduling appointment from RMT side:", error);
    return {
      success: false,
      message: "Failed to reschedule appointment.",
    };
  }
}

// export async function bookAppointmentForClient(clientId, appointmentData) {
//   try {
//     const session = await getSession();
//     if (!session || !session.resultObj) {
//       throw new Error("Unauthorized: User not logged in");
//     }

//     // Check if the user is an RMT
//     if (session.resultObj.userType !== "rmt") {
//       throw new Error(
//         "Unauthorized: Only RMTs can book appointments for clients"
//       );
//     }

//     const { date, time, duration } = appointmentData;

//     // Get client information
//     const { rows: clientRows } = await sql`
//       SELECT
//         id,
//         first_name AS "firstName",
//         last_name AS "lastName",
//         email,
//         phone_number AS "phoneNumber",
//         rmt_id AS "rmtId"
//       FROM users
//       WHERE id = ${clientId}
//     `;

//     if (clientRows.length === 0) {
//       throw new Error("Client not found");
//     }

//     const client = clientRows[0];

//     // Format the date and time
//     const formattedDate = new Date(date).toISOString().split("T")[0];
//     const startDateTime = new Date(`${date} ${time}`);
//     const formattedStartTime = startDateTime.toLocaleTimeString("en-US", {
//       hour12: false,
//       hour: "2-digit",
//       minute: "2-digit",
//     });

//     // Calculate end time
//     const endDateTime = new Date(
//       startDateTime.getTime() + Number.parseInt(duration) * 60000
//     );
//     const formattedEndTime = endDateTime.toLocaleTimeString("en-US", {
//       hour12: false,
//       hour: "2-digit",
//       minute: "2-digit",
//     });

//     // Find an available appointment slot
//     const { rows: availableAppointments } = await sql`
//       SELECT id, rmt_location_id
//       FROM treatments
//       WHERE rmt_id = ${client.rmtId}
//       AND date = ${formattedDate}::date
//       AND appointment_window_start <= ${formattedStartTime}::time
//       AND appointment_window_end >= ${formattedEndTime}::time
//       AND status = 'available'
//       LIMIT 1
//     `;

//     if (availableAppointments.length === 0) {
//       throw new Error(
//         "No available appointment slot found for the selected time"
//       );
//     }

//     const appointmentId = availableAppointments[0].id;

//     // Create Google Calendar event
//     const event = {
//       summary: `[Booked] Mx ${client.firstName} ${client.lastName}`,
//       location: "268 Shuter Street, Toronto, ON",
//       description: `Email: ${client.email}\nPhone: ${
//         client.phoneNumber || "N/A"
//       }`,
//       start: {
//         dateTime: `${formattedDate}T${formattedStartTime}:00`,
//         timeZone: "America/Toronto",
//       },
//       end: {
//         dateTime: `${formattedDate}T${formattedEndTime}:00`,
//         timeZone: "America/Toronto",
//       },
//       colorId: "2", // Green for booked
//     };

//     const createdEvent = await calendar.events.insert({
//       calendarId: GOOGLE_CALENDAR_ID,
//       resource: event,
//     });

//     // Update the appointment
//     await sql`
//       UPDATE treatments
//       SET
//         status = 'booked',
//         location = '268 Shuter Street, Toronto, ON',
//         appointment_begins_at = ${formattedStartTime}::time,
//         appointment_ends_at = ${formattedEndTime}::time,
//         client_id = ${clientId},
//         duration = ${Number.parseInt(duration)},
//         google_calendar_event_id = ${createdEvent.data.id},
//         google_calendar_event_link = ${createdEvent.data.htmlLink}
//       WHERE id = ${appointmentId}
//     `;

//     // Log audit event
//     try {
//       await logAuditEvent({
//         typeOfInfo: "appointment booking",
//         actionPerformed: "created by RMT",
//         accessedById: session.resultObj.id,
//         whoseInfoId: clientId,
//         reasonForAccess: "RMT booking appointment for client",
//         additionalDetails: {
//           accessedByName: `${session.resultObj.firstName} ${session.resultObj.lastName}`,
//           whoseInfoName: `${client.firstName} ${client.lastName}`,
//           appointmentId: appointmentId,
//           appointmentDate: formattedDate,
//           appointmentTime: formattedStartTime,
//           duration: duration,
//           accessMethod: "web application",
//           googleCalendarEventId: createdEvent.data.id,
//         },
//       });
//     } catch (logError) {
//       console.error("Error logging audit event:", logError);
//     }

//     revalidatePath("/dashboard/rmt");

//     return {
//       success: true,
//       message: "Appointment booked successfully!",
//       appointmentId: appointmentId,
//     };
//   } catch (error) {
//     console.error("Error booking appointment for client:", error);
//     return {
//       success: false,
//       message: error.message || "Failed to book appointment",
//     };
//   }
// }

// export async function getClientWithHealthHistory(userId) {
//   // Mock implementation: Replace with actual data fetching and decryption
//   const mockClient = {
//     id: userId,
//     first_name: "John",
//     last_name: "Doe",
//     email: "john.doe@example.com",
//     phone_number: "123-456-7890",
//     rmt_id: "some-rmt-id",
//   };
//   const mockHealthHistory = [
//     {
//       id: 1,
//       condition: "Migraines",
//       diagnosis_date: "2023-01-01",
//       notes: "Frequent migraines",
//     },
//   ];
//   return { client: mockClient, healthHistory: mockHealthHistory };
// }

// export async function getClientWithHealthHistory(clientId) {
//   try {
//     // Get the current user session
//     const session = await getSession();
//     if (!session || !session.resultObj) {
//       throw new Error("Unauthorized: User not logged in");
//     }

//     // Check if the user is an RMT
//     if (session.resultObj.userType !== "rmt") {
//       throw new Error("Unauthorized: Only RMTs can access client profiles");
//     }

//     // Get the user ID from the session, handling both MongoDB and PostgreSQL formats
//     const userId = session.resultObj.id || session.resultObj._id;

//     if (!userId) {
//       console.error("User ID not found in session", session.resultObj);
//       throw new Error("User ID not found in session");
//     }

//     // Apply rate limiting using the user ID as a string
//     await checkRateLimit(String(userId), "getClientWithHealthHistory", 10, 60); // 10 requests per minute

//     // Query the database for the client
//     const { rows: userRows } = await sql`
//       SELECT
//         id,
//         first_name AS "firstName",
//         last_name AS "lastName",
//         email,
//         phone_number AS "phoneNumber",
//         rmt_id AS "rmtId"
//       FROM
//         users
//       WHERE
//         id = ${clientId}
//     `;

//     if (userRows.length === 0) {
//       throw new Error("Client not found");
//     }

//     const client = userRows[0];

//     // Query health histories using the correct column names
//     const { rows: healthHistories } = await sql`
//       SELECT
//         id,
//         user_id AS "userId",
//         created_at AS "createdAt",
//         mongodb_id AS "mongodbId",
//         encrypted_data AS "encryptedData"
//       FROM
//         health_histories
//       WHERE
//         user_id = ${clientId}
//       ORDER BY
//         created_at DESC
//     `;

//     // Process health histories if they're encrypted
//     const processedHistories = healthHistories.map((history) => {
//       // If we have encrypted data and a decryption function
//       if (history.encryptedData && typeof decryptData === "function") {
//         try {
//           const decrypted = decryptData(history.encryptedData);
//           if (decrypted) {
//             // Merge the decrypted data with the history object
//             return {
//               ...history,
//               ...decrypted, // Spread the decrypted data into the result
//             };
//           }
//         } catch (decryptError) {
//           console.error(
//             `Error decrypting health history ${history.id}:`,
//             decryptError
//           );
//         }
//       }

//       // If no encryption or decryption failed, return as is
//       return history;
//     });

//     // Return both client profile and health histories
//     return {
//       client: {
//         id: client.id,
//         firstName: client.firstName,
//         lastName: client.lastName,
//         email: client.email,
//         phoneNumber: client.phoneNumber || "N/A",
//         rmtId: client.rmtId,
//       },
//       healthHistory: processedHistories,
//     };
//   } catch (error) {
//     console.error("Error in getClientWithHealthHistory:", error);
//     throw new Error("Failed to fetch client data. Please try again.");
//   }
// }

// export async function bookAppointmentForClient(clientId, appointmentData) {
//   try {
//     const session = await getSession();
//     if (!session || !session.resultObj) {
//       throw new Error("Unauthorized: User not logged in");
//     }

//     if (session.resultObj.userType !== "rmt") {
//       throw new Error("Unauthorized: Only RMTs can book appointments");
//     }

//     await checkRateLimit(
//       session.resultObj.id,
//       "bookAppointmentForClient",
//       5,
//       60
//     ); // 5 requests per minute

//     // Get client information
//     const { rows: clients } = await sql`
//           SELECT * FROM users
//           WHERE id = ${clientId}
//         `;

//     if (clients.length === 0) {
//       throw new Error("Client not found");
//     }
//     const client = clients[0];

//     const { date, time, duration } = appointmentData;

//     // Ensure appointmentDate is in "YYYY-MM-DD" format
//     const formattedDate = new Date(date).toISOString().split("T")[0];

//     // Convert appointmentTime to "HH:MM" (24-hour format)
//     const startDateTime = new Date(`${date} ${time}`);
//     const formattedStartTime = startDateTime.toLocaleTimeString("en-US", {
//       hour12: false,
//       hour: "2-digit",
//       minute: "2-digit",
//     });

//     // Calculate end time
//     const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
//     const formattedEndTime = endDateTime.toLocaleTimeString("en-US", {
//       hour12: false,
//       hour: "2-digit",
//       minute: "2-digit",
//     });

//     // Create Google Calendar event
//     const calendar = google.calendar({ version: "v3", auth: jwtClient });
//     const event = {
//       summary: `[Booked] Mx: ${client.first_name} ${client.last_name}`,
//       location: "268 Shuter Street",
//       description: `Email: ${client.email}\nPhone: ${
//         client.phone_number || "N/A"
//       }`,
//       start: {
//         dateTime: `${formattedDate}T${formattedStartTime}:00`,
//         timeZone: "America/Toronto",
//       },
//       end: {
//         dateTime: `${formattedDate}T${formattedEndTime}:00`,
//         timeZone: "America/Toronto",
//       },
//       colorId: "2", // "2" corresponds to "sage" in Google Calendar
//     };

//     const calendarEvent = await calendar.events.insert({
//       calendarId: GOOGLE_CALENDAR_ID,
//       resource: event,
//     });

//     //     // Insert the treatment into the database
//     const { rows: insertedTreatment } = await sql`
//           INSERT INTO treatments (
//             rmt_id,
//             client_id,
//             date,
//             appointment_begins_at,
//             appointment_ends_at,
//             status,
//             location,
//             duration,
//             workplace,
//             google_calendar_event_id,
//             google_calendar_event_link,
//             consent_form,
//             consent_form_submitted_at,
//             created_at,
//             rmt_location_id
//           ) VALUES (
//             ${session.resultObj.id},
//             ${clientId},
//             ${formattedDate},
//             ${formattedStartTime},
//             ${formattedEndTime},
//             'booked',
//             '268 Shuter Street',
//             ${duration.toString()},
//             '',
//             ${calendarEvent.data.id},
//             ${calendarEvent.data.htmlLink},
//             NULL,
//             NULL,
//             NOW(),
//             '644fee83-bfeb-4418-935f-a094ad821766'
//           )
//           RETURNING id
//         `;

//     const appointmentId = insertedTreatment[0].id;

//     // Log audit event
//     try {
//       await logAuditEvent({
//         typeOfInfo: "appointment booking",
//         actionPerformed: "booked",
//         accessedById: session.resultObj.id,
//         whoseInfoId: clientId,
//         reasonForAccess: "Provider scheduling appointment for patient",
//         additionalDetails: {
//           accessedByName: `${session.resultObj.firstName} ${session.resultObj.lastName}`,
//           whoseInfoName: `${client.first_name} ${client.last_name}`,
//           appointmentId: appointmentId,
//           appointmentDate: formattedDate,
//           appointmentTime: formattedStartTime,
//           duration: duration,
//           accessMethod: "web application",
//         },
//       });
//     } catch (logError) {
//       // Just log the error but don't let it break the main function
//       console.error("Error logging audit event:", logError);
//     }

//     // Send email notification
//     const transporter = getEmailTransporter();
//     const confirmationLink = `${BASE_URL}/dashboard/patient`;

//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: client.email,
//       subject: "Massage Appointment Confirmation",
//       text: `Hi ${client.first_name},

//     Your massage appointment has been booked for ${formattedDate} at ${formattedStartTime}.

//     Appointment Details:
//     - Date: ${formattedDate}
//     - Time: ${formattedStartTime}
//     - Duration: ${duration} minutes

//     Please login at ${confirmationLink} to complete the consent form and view your appointment details.

//     If you need to make any changes or have any questions, please use the website to make any changes, or reach out by text: 416-258-1230.
//     `,
//       html: `
//             <p>Hi ${client.first_name},</p>
//             <p>Your massage appointment has been booked for ${formattedDate} at ${formattedStartTime}.</p>
//             <h2>Appointment Details:</h2>
//             <ul>
//               <li>Date: ${formattedDate}</li>
//               <li>Time: ${formattedStartTime}</li>
//               <li>Duration: ${duration} minutes</li>
//             </ul>
//             <p>Please login at <a href="${confirmationLink}"> www.ciprmt.com</a> to complete the consent form and view your appointment details.</p>
//             <p>If you need to make any changes or have any questions, please contact Cip at 416-258-1230.</p>
//           `,
//     });

//     return { success: true, appointmentId: appointmentId };
//   } catch (error) {
//     console.error("Error in bookAppointmentForClient:", error);
//     throw new Error("Failed to book appointment. Please try again.");
//   }
// }

export async function deleteAppointment(appointmentId) {
  try {
    const session = await getSession();
    if (
      !session ||
      !session.resultObj ||
      session.resultObj.userType !== "rmt"
    ) {
      throw new Error("Unauthorized: Only RMTs can delete appointments");
    }

    await checkRateLimit(session.resultObj.id, "deleteAppointment", 10, 60);

    // Get the appointment
    const { rows } = await sql`
      SELECT 
        t.*,
        u.first_name AS "firstName",
        u.last_name AS "lastName"
      FROM 
        treatments t
      LEFT JOIN
        users u ON t.client_id = u.id
      WHERE 
        t.id = ${appointmentId}
    `;

    if (rows.length === 0) {
      throw new Error("Appointment not found");
    }

    const appointment = rows[0];

    // Delete Google Calendar event if it exists
    if (appointment.google_calendar_event_id) {
      try {
        await calendar.events.delete({
          calendarId: GOOGLE_CALENDAR_ID,
          eventId: appointment.google_calendar_event_id,
        });
      } catch (error) {
        console.error("Error deleting Google Calendar event:", error);
      }
    }

    // Delete the appointment
    await sql`
      DELETE FROM treatments
      WHERE id = ${appointmentId}
    `;

    // Log audit event
    try {
      // Determine if this is a patient appointment or just a time slot
      const hasPatient = appointment.client_id !== null;

      await logAuditEvent({
        typeOfInfo: "appointment",
        actionPerformed: "deleted",
        accessedById: session.resultObj.id,
        whoseInfoId: appointment.client_id || session.resultObj.id, // If no client, use RMT's ID
        reasonForAccess: hasPatient
          ? "Provider deleting patient appointment"
          : "Provider managing schedule",
        additionalDetails: {
          accessedByName: `${session.resultObj.firstName} ${session.resultObj.lastName}`,
          whoseInfoName: hasPatient
            ? `${appointment.firstName} ${appointment.lastName}`
            : "N/A",
          appointmentId: appointmentId,
          appointmentDate: appointment.date,
          appointmentStatus: appointment.status,
          accessMethod: "web application",
        },
      });
    } catch (logError) {
      // Just log the error but don't let it break the main function
      console.error("Error logging audit event:", logError);
    }
    revalidatePath("/dashboard/rmt");
    revalidatePath("/dashboard/rmt/calendar");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteAppointment:", error);
    return {
      success: false,
      message: "Failed to delete appointment. Please try again.",
    };
  }
}

export async function clearAppointment(appointmentId) {
  try {
    const session = await getSession();
    if (
      !session ||
      !session.resultObj ||
      session.resultObj.userType !== "rmt"
    ) {
      throw new Error("Unauthorized: Only RMTs can clear appointments");
    }

    await checkRateLimit(session.resultObj.id, "clearAppointment", 10, 60);

    // Get the appointment
    const { rows } = await sql`
      SELECT 
        t.*,
        u.first_name AS "firstName",
        u.last_name AS "lastName"
      FROM 
        treatments t
      LEFT JOIN
        users u ON t.client_id = u.id
      WHERE 
        t.id = ${appointmentId}
    `;

    if (rows.length === 0) {
      throw new Error("Appointment not found");
    }

    const appointment = rows[0];

    // Delete Google Calendar event if it exists
    if (appointment.google_calendar_event_id) {
      try {
        await calendar.events.delete({
          calendarId: GOOGLE_CALENDAR_ID,
          eventId: appointment.google_calendar_event_id,
        });
      } catch (error) {
        console.error("Error deleting Google Calendar event:", error);
      }
    }

    // Clear the appointment
    await sql`
      UPDATE treatments
      SET 
        status = 'available',
        appointment_begins_at = NULL,
        appointment_ends_at = NULL,
        duration = NULL,
        client_id = NULL,
        google_calendar_event_id = NULL,
        google_calendar_event_link = NULL,
        location = NULL,
        consent_form = NULL,
        consent_form_submitted_at = NULL
      WHERE 
        id = ${appointmentId}
    `;

    // Log audit event
    try {
      // Determine if this is a patient appointment or just a time slot
      const hasPatient = appointment.client_id !== null;

      await logAuditEvent({
        typeOfInfo: "appointment",
        actionPerformed: "cleared",
        accessedById: session.resultObj.id,
        whoseInfoId: appointment.client_id || session.resultObj.id, // If no client, use RMT's ID
        reasonForAccess: hasPatient
          ? "Provider clearing patient appointment"
          : "Provider managing schedule",
        additionalDetails: {
          accessedByName: `${session.resultObj.firstName} ${session.resultObj.lastName}`,
          whoseInfoName: hasPatient
            ? `${appointment.firstName} ${appointment.lastName}`
            : "N/A",
          appointmentId: appointmentId,
          appointmentDate: appointment.date,
          previousStatus: appointment.status,
          accessMethod: "web application",
        },
      });
    } catch (logError) {
      // Just log the error but don't let it break the main function
      console.error("Error logging audit event:", logError);
    }
  } catch (error) {
    console.error("Error in clearAppointment:", error);
    throw new Error("Failed to clear appointment. Please try again.");
  }

  revalidatePath("/dashboard/rmt");
  revalidatePath("/dashboard/rmt/calendar");
}

////////////////////////////////////////
// Cron Jobs////////////////////////////
////////////////////////////////////////
const CRON_LOCK_KEYS = {
  addAppointments: { key1: 712345001, key2: 1 },
  sendAppointmentReminders: { key1: 712345001, key2: 2 },
  sendBenefitReminders: { key1: 712345001, key2: 3 },
};

const EMAIL_IDEMPOTENCY_STALE_PROCESSING_HOURS = 6;

const hashEmailPayload = (payload) =>
  createHash("sha256").update(JSON.stringify(payload)).digest("hex");

async function ensureEmailIdempotencyTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS email_idempotency_keys (
      key TEXT PRIMARY KEY,
      email_type TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      message_id TEXT,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function claimEmailIdempotencyKey({ key, emailType, payload }) {
  const payloadHash = hashEmailPayload(payload);

  const { rows: insertedRows } = await sql`
    INSERT INTO email_idempotency_keys (
      key,
      email_type,
      payload_hash,
      status,
      first_seen_at,
      updated_at
    ) VALUES (
      ${key},
      ${emailType},
      ${payloadHash},
      'processing',
      NOW(),
      NOW()
    )
    ON CONFLICT (key) DO NOTHING
    RETURNING key
  `;

  if (insertedRows.length > 0) {
    return { shouldSend: true, payloadHash };
  }

  const { rows: existingRows } = await sql`
    SELECT key, payload_hash AS "payloadHash", status, first_seen_at AS "firstSeenAt"
    FROM email_idempotency_keys
    WHERE key = ${key}
    LIMIT 1
  `;

  if (!existingRows.length) {
    return { shouldSend: false, reason: "missing_existing_record" };
  }

  const existing = existingRows[0];

  if (existing.payloadHash !== payloadHash) {
    return { shouldSend: false, reason: "payload_mismatch" };
  }

  if (existing.status === "sent") {
    return { shouldSend: false, reason: "already_sent" };
  }

  const staleCutoff = new Date(
    Date.now() - EMAIL_IDEMPOTENCY_STALE_PROCESSING_HOURS * 60 * 60 * 1000,
  );
  const isStaleProcessing =
    existing.status === "processing" &&
    existing.firstSeenAt &&
    new Date(existing.firstSeenAt) < staleCutoff;

  if (existing.status === "failed" || isStaleProcessing) {
    const { rowCount } = await sql`
      UPDATE email_idempotency_keys
      SET
        status = 'processing',
        updated_at = NOW()
      WHERE key = ${key}
        AND payload_hash = ${payloadHash}
    `;

    if (rowCount > 0) {
      return { shouldSend: true, payloadHash };
    }
  }

  return { shouldSend: false, reason: "in_progress" };
}

async function markEmailIdempotencySent({ key, payloadHash, messageId }) {
  await sql`
    UPDATE email_idempotency_keys
    SET
      status = 'sent',
      message_id = ${messageId || null},
      sent_at = NOW(),
      updated_at = NOW()
    WHERE key = ${key}
      AND payload_hash = ${payloadHash}
  `;
}

async function markEmailIdempotencyFailed({ key, payloadHash }) {
  await sql`
    UPDATE email_idempotency_keys
    SET
      status = 'failed',
      updated_at = NOW()
    WHERE key = ${key}
      AND payload_hash = ${payloadHash}
      AND status = 'processing'
  `;
}

export async function resetStaleReschedulingAppointments() {
  try {

    // Find all appointments with status "rescheduling"
    const { rows: staleAppointments } = await sql`
      SELECT 
        id, 
        status, 
        previous_status as "previousStatus",
        rescheduling_started_at as "reschedulingStartedAt"
      FROM treatments
      WHERE status = 'rescheduling'
    `;

    // Process each stale appointment
    for (const appointment of staleAppointments) {
      // Update the appointment status
      await sql`
        UPDATE treatments
        SET 
          status = ${appointment.previousStatus || "booked"},
          rescheduling_started_at = NULL,
          previous_status = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${appointment.id}
      `;
    }
    return {
      success: true,
      message: `Reset ${staleAppointments.length} stale appointments`,
    };
  } catch (error) {
    console.error("Error resetting stale appointments:", error);
    return {
      success: false,
      message: error.message,
    };
  }
}

export async function addAppointments() {
  const lock = CRON_LOCK_KEYS.addAppointments;
  let lockAcquired = false;

  try {
    const { rows: lockRows } = await sql`
      SELECT pg_try_advisory_lock(${lock.key1}, ${lock.key2}) AS locked
    `;
    lockAcquired = lockRows?.[0]?.locked === true;

    if (!lockAcquired) {
      return {
        success: true,
        message: "Skipped addAppointments: another run is already in progress.",
      };
    }


    const today = new Date();
    const currentDay = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][today.getDay()];

    // Fetch the specific RMT location
    // Note: Using the MongoDB ID from the original function
    const mongodbId = "673a415085f1bd8631e7a426";

    const { rows: locations } = await sql`
      SELECT 
        id, 
        user_id
      FROM rmt_locations
      WHERE mongodb_id = ${mongodbId}
    `;

    if (!locations || locations.length === 0) {
      return { success: false, message: "RMT location not found" };
    }

    const location = locations[0];

    // Get work day for the current day of the week
    const { rows: workDays } = await sql`
      SELECT 
        id,
        booking_cutoff_hours AS "bookingCutoffHours"
      FROM work_days2
      WHERE 
        location_id = ${location.id} AND
        day_name = ${currentDay} AND
        is_working = true
    `;

    if (!workDays || workDays.length === 0) {
      return { success: false, message: `No work day found for ${currentDay}` };
    }

    const workDay = workDays[0];

    // Get appointment times for this work day
    const { rows: appointmentTimes } = await sql`
      SELECT 
        id,
        start_time,
        end_time
      FROM appointment_times2
      WHERE work_day_id = ${workDay.id}
    `;

    if (!appointmentTimes || appointmentTimes.length === 0) {
      return { success: false, message: "No appointment times found" };
    }

    // Calculate the date 8 weeks from today
    const appointmentDate = new Date(today);
    appointmentDate.setDate(today.getDate() + 56); // 8 weeks from today
    const formattedDate = appointmentDate.toISOString().split("T")[0]; // Format as "YYYY-MM-DD"

    // Insert appointments for each time slot
    let insertedCount = 0;

    for (const timeSlot of appointmentTimes) {
      // Insert only if this exact available window does not already exist
      const insertResult = await sql`
        INSERT INTO treatments (
          rmt_id,
          rmt_location_id,
          date,
          appointment_window_start,
          appointment_window_end,
          booking_cutoff_hours,
          status,
          created_at
        ) VALUES (
          ${location.user_id},
          ${location.id},
          ${formattedDate},
          ${timeSlot.start_time},
          ${timeSlot.end_time},
          ${workDay.bookingCutoffHours || 0},
          'available',
          CURRENT_TIMESTAMP
        )
        WHERE NOT EXISTS (
          SELECT 1
          FROM treatments t
          WHERE t.rmt_location_id = ${location.id}
            AND t.date = ${formattedDate}::date
            AND t.appointment_window_start = ${timeSlot.start_time}::time
            AND t.appointment_window_end = ${timeSlot.end_time}::time
            AND t.status = 'available'
        )
        RETURNING id
      `;

      if (insertResult.rows.length > 0) {
        insertedCount++;
      }
    }
    // Note: PostgreSQL doesn't have the exact equivalent of MongoDB's TTL indexes
    // You would typically handle expiration through a separate cron job or using PostgreSQL's
    // built-in partitioning features for time-series data

    return {
      success: true,
      message: `Inserted ${insertedCount} appointments for date ${formattedDate}`,
    };
  } catch (error) {
    console.error("Error in addAppointments function:", error);
    return {
      success: false,
      message: error.message,
    };
  } finally {
    if (lockAcquired) {
      try {
        await sql`
          SELECT pg_advisory_unlock(${lock.key1}, ${lock.key2})
        `;
      } catch (unlockError) {
        console.error(
          "Failed to release addAppointments cron lock:",
          unlockError,
        );
      }
    }
  }
}

// export async function addAppointments() {
//   try {
//     console.log("Starting addAppointments cron job...");

//     const today = new Date();
//     const currentDay = [
//       "Sunday",
//       "Monday",
//       "Tuesday",
//       "Wednesday",
//       "Thursday",
//       "Friday",
//       "Saturday",
//     ][today.getDay()];

//     // Fetch the specific RMT location
//     // Note: Using the MongoDB ID from the original function
//     const mongodbId = "673a415085f1bd8631e7a426";

//     const { rows: locations } = await sql`
//       SELECT
//         id,
//         user_id
//       FROM rmt_locations
//       WHERE mongodb_id = ${mongodbId}
//     `;

//     if (!locations || locations.length === 0) {
//       console.log("Specified RMT location not found");
//       return { success: false, message: "RMT location not found" };
//     }

//     const location = locations[0];

//     // Get work day for the current day of the week
//     const { rows: workDays } = await sql`
//       SELECT
//         id
//       FROM work_days
//       WHERE
//         location_id = ${location.id} AND
//         day = ${currentDay}
//     `;

//     if (!workDays || workDays.length === 0) {
//       console.log(
//         `No work day found for ${currentDay} for the specified RMT location`
//       );
//       return { success: false, message: `No work day found for ${currentDay}` };
//     }

//     const workDay = workDays[0];

//     // Get appointment times for this work day
//     const { rows: appointmentTimes } = await sql`
//       SELECT
//         id,
//         start_time,
//         end_time
//       FROM appointment_times
//       WHERE work_day_id = ${workDay.id}
//     `;

//     if (!appointmentTimes || appointmentTimes.length === 0) {
//       console.log(`No appointment times found for work day ID: ${workDay.id}`);
//       return { success: false, message: "No appointment times found" };
//     }

//     // Calculate the date 8 weeks from today
//     const appointmentDate = new Date(today);
//     appointmentDate.setDate(today.getDate() + 56); // 8 weeks from today
//     const formattedDate = appointmentDate.toISOString().split("T")[0]; // Format as "YYYY-MM-DD"

//     // Insert appointments for each time slot
//     let insertedCount = 0;

//     for (const timeSlot of appointmentTimes) {
//       // Calculate expiry date (7 days after appointment date)
//       const expiryDate = new Date(appointmentDate);
//       expiryDate.setDate(appointmentDate.getDate() + 7);

//       // Insert the appointment
//       await sql`
//         INSERT INTO treatments (
//           rmt_id,
//           rmt_location_id,
//           date,
//           appointment_window_start,
//           appointment_window_end,
//           status,
//           created_at
//         ) VALUES (
//           ${location.user_id},
//           ${location.id},
//           ${formattedDate},
//           ${timeSlot.start_time},
//           ${timeSlot.end_time},
//           'available',
//           CURRENT_TIMESTAMP
//         )
//       `;

//       insertedCount++;
//     }

//     console.log(
//       `Inserted ${insertedCount} appointments for RMT ${location.user_id}`
//     );

//     // Note: PostgreSQL doesn't have the exact equivalent of MongoDB's TTL indexes
//     // You would typically handle expiration through a separate cron job or using PostgreSQL's
//     // built-in partitioning features for time-series data

//     return {
//       success: true,
//       message: `Inserted ${insertedCount} appointments for date ${formattedDate}`,
//     };
//   } catch (error) {
//     console.error("Error in addAppointments function:", error);
//     return {
//       success: false,
//       message: error.message,
//     };
//   }
// }

export async function deleteExpiredAppointments() {
  try {

    // Calculate the cutoff date (2 weeks ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14); // 2 weeks ago
    const formattedCutoffDate = cutoffDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD


    // Delete expired appointments
    const { rowCount } = await sql`
      DELETE FROM treatments
      WHERE 
        status = 'available' AND
        date < ${formattedCutoffDate}
      RETURNING id
    `;


    return {
      success: true,
      message: `Deleted ${rowCount} expired appointments older than ${formattedCutoffDate}`,
    };
  } catch (error) {
    console.error("Error deleting expired appointments:", error);
    return {
      success: false,
      message: error.message,
    };
  }
}

export async function sendAppointmentReminders() {
  const lock = CRON_LOCK_KEYS.sendAppointmentReminders;
  let lockAcquired = false;

  try {
    const { rows: lockRows } = await sql`
      SELECT pg_try_advisory_lock(${lock.key1}, ${lock.key2}) AS locked
    `;
    lockAcquired = lockRows?.[0]?.locked === true;

    if (!lockAcquired) {
      return {
        success: true,
        message:
          "Skipped sendAppointmentReminders: another run is already in progress.",
      };
    }

    const transporter = getEmailTransporter();
    await ensureEmailIdempotencyTable();

    // Get the date 2 days from now in YYYY-MM-DD format
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const targetDate = twoDaysFromNow.toISOString().split("T")[0];


    // Find all appointments for 2 days from now with status "booked"
    // Using the correct column names from your schema
    const { rows: appointments } = await sql`
      SELECT 
        t.id,
        t.date,
        t.appointment_begins_at,
        t.appointment_ends_at,
        t.location,
        t.duration,
        t.status,
        t.consent_form,
        t.consent_form_submitted_at,
        u.first_name,
        u.last_name,
        u.email
      FROM treatments t
      JOIN users u ON t.client_id = u.id
      WHERE 
        t.date = ${targetDate} AND
        t.status = 'booked'
    `;
    // Add a delay between sending emails to avoid rate limiting
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Track successful and failed emails
    let successCount = 0;
    let failCount = 0;

    for (const appointment of appointments) {
      let claimedKey = null;
      let claimedPayloadHash = null;
      try {
        // Determine if the consent form is completed
        // Check both the consent_form field and the submission timestamp
        const isConsentFormCompleted =
          appointment.consent_form !== null &&
          appointment.consent_form_submitted_at !== null;

        // Format appointment data for email
        const appointmentData = {
          firstName: appointment.first_name,
          lastName: appointment.last_name,
          email: appointment.email,
          appointmentDate: formatDateForDisplay(appointment.date),
          appointmentBeginsAt: formatTimeForDisplay(
            appointment.appointment_begins_at,
          ),
          location: appointment.location || "Not specified",
          duration: appointment.duration || "60",
        };

        // Choose the appropriate email template
        const emailContent = isConsentFormCompleted
          ? getStandardReminderEmail(appointmentData)
          : getConsentFormReminderEmail(appointmentData);

        const idempotencyKey = `appointment-reminder/${appointment.id}/${targetDate}`;
        const claimResult = await claimEmailIdempotencyKey({
          key: idempotencyKey,
          emailType: "appointment_reminder",
          payload: {
            to: appointmentData.email,
            subject: "Reminder: Your Upcoming Massage Appointment",
            appointmentId: appointment.id,
            appointmentDate: appointmentData.appointmentDate,
            appointmentBeginsAt: appointmentData.appointmentBeginsAt,
            consentVariant: isConsentFormCompleted ? "standard" : "consent",
          },
        });

        if (!claimResult.shouldSend) {
          continue;
        }

        claimedKey = idempotencyKey;
        claimedPayloadHash = claimResult.payloadHash;

        // Send reminder email
        const info = await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: appointmentData.email,
          bcc: process.env.EMAIL_USER, // Send a BCC to process.env.EMAIL_USER
          subject: "Reminder: Your Upcoming Massage Appointment",
          text: emailContent.text,
          html: emailContent.html,
        });

        await markEmailIdempotencySent({
          key: claimedKey,
          payloadHash: claimedPayloadHash,
          messageId: info?.messageId || null,
        });
        successCount++;

        // Add a delay between emails (1 second)
        await delay(1000);
      } catch (emailError) {
        if (claimedKey && claimedPayloadHash) {
          try {
            await markEmailIdempotencyFailed({
              key: claimedKey,
              payloadHash: claimedPayloadHash,
            });
          } catch (markFailedError) {
            console.error(
              `Failed to update appointment reminder idempotency status for ${claimedKey}:`,
              markFailedError,
            );
          }
        }
        console.error(
          `Error sending email for appointment ${appointment.id}:`,
          emailError,
        );
        failCount++;
        // Continue with the next appointment even if this one fails
      }
    }
    return {
      success: true,
      message: `Sent ${successCount} reminder emails (${failCount} failed)`,
    };
  } catch (error) {
    console.error("Error in sendAppointmentReminders:", error);
    return { success: false, message: error.message };
  } finally {
    if (lockAcquired) {
      try {
        await sql`
          SELECT pg_advisory_unlock(${lock.key1}, ${lock.key2})
        `;
      } catch (unlockError) {
        console.error(
          "Failed to release sendAppointmentReminders cron lock:",
          unlockError,
        );
      }
    }
  }
}

export async function sendBenefitReminders(options = {}) {
  const lock = CRON_LOCK_KEYS.sendBenefitReminders;
  let lockAcquired = false;
  const dryRun = options?.dryRun === true;
  const nowOverride =
    options?.now && !Number.isNaN(new Date(options.now).getTime())
      ? new Date(options.now)
      : null;

  try {
    const { rows: lockRows } = await sql`
      SELECT pg_try_advisory_lock(${lock.key1}, ${lock.key2}) AS locked
    `;
    lockAcquired = lockRows?.[0]?.locked === true;

    if (!lockAcquired) {
      return {
        success: true,
        message:
          "Skipped sendBenefitReminders: another run is already in progress.",
      };
    }

    let candidates = [];
    try {
      const { rows } = await sql`
        SELECT
          u.id,
          u.first_name AS "firstName",
          u.last_name AS "lastName",
          u.email,
          u.reminder_frequency AS "reminderFrequency",
          u.last_reminder_sent_at AS "lastReminderSentAt",
          latest.last_completed_date AS "lastCompletedDate"
        FROM users u
        JOIN LATERAL (
          SELECT t.date AS last_completed_date
          FROM treatments t
          WHERE t.client_id = u.id
            AND t.status = 'completed'
            AND t.date IS NOT NULL
          ORDER BY t.date DESC
          LIMIT 1
        ) latest ON TRUE
        WHERE u.send_reminders = TRUE
          AND u.reminder_frequency IS NOT NULL
          AND u.reminder_frequency > 0
          AND u.email IS NOT NULL
      `;
      candidates = rows;
    } catch (queryError) {
      if (queryError?.code === "42703") {
        return {
          success: true,
          message:
            "Benefits reminder columns are not present yet. Skipping benefit reminders.",
        };
      }
      throw queryError;
    }

    if (!candidates.length) {
      return {
        success: true,
        message: "No clients eligible for benefit reminder checks.",
        data: {
          candidatesCount: 0,
          dueCount: 0,
          sentCount: 0,
          failedCount: 0,
          skippedByReason: {},
        },
      };
    }

    const transporter = getEmailTransporter();
    await ensureEmailIdempotencyTable();
    const torontoToday =
      nowOverride ||
      new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }),
      );

    const weeksBetween = (startDate, endDate) => {
      const ms = endDate.getTime() - startDate.getTime();
      return ms / (1000 * 60 * 60 * 24 * 7);
    };

    const dueClients = candidates.filter((client) => {
      const reminderFrequency = Number(client.reminderFrequency);
      if (!Number.isFinite(reminderFrequency) || reminderFrequency <= 0) {
        return false;
      }

      const lastCompletedDate = client.lastCompletedDate
        ? new Date(client.lastCompletedDate)
        : null;
      const lastReminderSentAt = client.lastReminderSentAt
        ? new Date(client.lastReminderSentAt)
        : null;

      if (!lastCompletedDate || Number.isNaN(lastCompletedDate.getTime())) {
        return false;
      }

      const referenceDate =
        lastReminderSentAt && lastReminderSentAt > lastCompletedDate
          ? lastReminderSentAt
          : lastCompletedDate;

      const elapsedWeeks = weeksBetween(referenceDate, torontoToday);
      return elapsedWeeks > reminderFrequency;
    });

    let sentCount = 0;
    let failedCount = 0;
    const skippedByReason = {};

    for (const client of dueClients) {
      let claimedKey = null;
      let claimedPayloadHash = null;
      try {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://www.ciprmt.com";
        const bookingUrl = `${appUrl}/auth/sign-in`;
        const reminderAnchor = client.lastReminderSentAt
          ? new Date(client.lastReminderSentAt)
          : new Date(client.lastCompletedDate);
        const reminderAnchorKey = Number.isNaN(reminderAnchor.getTime())
          ? "unknown-anchor"
          : reminderAnchor.toISOString().split("T")[0];
        const idempotencyKey = `benefit-reminder/${client.id}/${reminderAnchorKey}`;

        // Dry run should not mutate idempotency state.
        if (dryRun) {
          skippedByReason.dry_run = (skippedByReason.dry_run || 0) + 1;
          continue;
        }

        const claimResult = await claimEmailIdempotencyKey({
          key: idempotencyKey,
          emailType: "benefit_reminder",
          payload: {
            to: client.email,
            subject: "Time to Book Your Next Massage",
            clientId: client.id,
            reminderFrequency: client.reminderFrequency,
            lastCompletedDate: client.lastCompletedDate,
            lastReminderSentAt: client.lastReminderSentAt,
          },
        });

        if (!claimResult.shouldSend) {
          const reason = claimResult.reason || "unknown";
          skippedByReason[reason] = (skippedByReason[reason] || 0) + 1;
          continue;
        }

        claimedKey = idempotencyKey;
        claimedPayloadHash = claimResult.payloadHash;

        const info = await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: client.email,
          bcc: process.env.EMAIL_USER,
          subject: "Time to Book Your Next Massage",
          text: `Hi ${client.firstName || "there"},\n\nIt's been a while since your last massage. If you're ready for your next treatment, you can log in and book an appointment here:\n\n${bookingUrl}\n\nThanks and have a great day,\nCip De Vries, RMT`,
          html: `
            <h2>Time to Book Your Next Massage</h2>
            <p>Hi ${client.firstName || "there"},</p>
            <p>It's been a while since your last massage. If you're ready for your next treatment, you can log in and book an appointment here:</p>
            <p><a href="${bookingUrl}">Book Your Next Appointment</a></p>
            <p>Thanks and have a great day,<br/>Cip De Vries, RMT</p>
          `,
        });

        await markEmailIdempotencySent({
          key: claimedKey,
          payloadHash: claimedPayloadHash,
          messageId: info?.messageId || null,
        });

        await sql`
          UPDATE users
          SET last_reminder_sent_at = NOW()
          WHERE id = ${client.id}
        `;

        sentCount++;
      } catch (emailError) {
        if (claimedKey && claimedPayloadHash) {
          try {
            await markEmailIdempotencyFailed({
              key: claimedKey,
              payloadHash: claimedPayloadHash,
            });
          } catch (markFailedError) {
            console.error(
              `Failed to update benefit reminder idempotency status for ${claimedKey}:`,
              markFailedError,
            );
          }
        }
        console.error(
          `Failed sending benefit reminder to ${client.email}:`,
          emailError,
        );
        failedCount++;
      }
    }

    return {
      success: true,
      message: `Benefit reminders processed. Candidates: ${candidates.length}, Due: ${dueClients.length}, Sent: ${sentCount}, Failed: ${failedCount}.`,
      data: {
        candidatesCount: candidates.length,
        dueCount: dueClients.length,
        sentCount,
        failedCount,
        skippedByReason,
        dryRun,
        torontoToday: torontoToday.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error sending benefit reminders:", error);
    return { success: false, message: error.message };
  } finally {
    if (lockAcquired) {
      try {
        await sql`
          SELECT pg_advisory_unlock(${lock.key1}, ${lock.key2})
        `;
      } catch (unlockError) {
        console.error(
          "Failed to release sendBenefitReminders cron lock:",
          unlockError,
        );
      }
    }
  }
}
//save this in case i need to populate appointments in the future
// export async function populateAppointmentsForDateRange() {
//   console.log("Populating appointments for Jan 13, 2025 to Jan 28, 2025...");
//   try {
//     const db = await getDatabase();

//     // Fetch the RMT location
//     const rmtLocation = await db.collection("rmtLocations").findOne({
//       _id: new ObjectId("673a415085f1bd8631e7a426"), // Hardcoded ID as requested
//     });

//     if (!rmtLocation) {
//       console.log("RMT location not found");
//       return;
//     }

//     const startDate = new Date("2025-01-13T00:00:00-05:00"); // Ensure correct timezone
//     const endDate = new Date("2025-01-28T23:59:59-05:00"); // Ensure correct timezone
//     const appointments = [];

//     // Iterate through each day in the date range
//     for (
//       let date = new Date(startDate);
//       date <= endDate;
//       date.setDate(date.getDate() + 1)
//     ) {
//       const dayName = [
//         "Sunday",
//         "Monday",
//         "Tuesday",
//         "Wednesday",
//         "Thursday",
//         "Friday",
//         "Saturday",
//       ][date.getDay()];

//       // Find if this day exists in workdays
//       const workDay = rmtLocation.formattedFormData.workDays.find(
//         (day) => day.day === dayName
//       );

//       if (workDay) {
//         // Add appointments for each time slot on this workday
//         for (const timeSlot of workDay.appointmentTimes) {
//           const appointmentDate = new Date(date);
//           const [hours, minutes] = timeSlot.start.split(":");
//           appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

//           const expiryDate = new Date(appointmentDate);
//           expiryDate.setDate(appointmentDate.getDate() + 7);

//           appointments.push({
//             RMTId: new ObjectId("615b37ba970196ca0d3122fe"), // Using the RMTId from your example
//             RMTLocationId: new ObjectId("673a415085f1bd8631e7a426"),
//             appointmentDate: appointmentDate.toISOString().split("T")[0],
//             appointmentStartTime: timeSlot.start,
//             appointmentEndTime: timeSlot.end,
//             status: "available",
//             expiryDate: expiryDate,
//           });
//         }
//       }
//     }

//     if (appointments.length > 0) {
//       const result = await db
//         .collection("appointments")
//         .insertMany(appointments);
//       console.log(`Inserted ${result.insertedCount} appointments`);

//       // Ensure index for appointment expiry
//       await db.collection("appointments").createIndex(
//         { expiryDate: 1 },
//         {
//           expireAfterSeconds: 0,
//           partialFilterExpression: { status: "available" },
//         }
//       );
//     } else {
//       console.log("No appointments to insert for the specified date range");
//     }

//     console.log("Appointment population completed successfully");
//   } catch (error) {
//     console.error("Error populating appointments:", error);
//   }
// }

export async function unsubscribeEmail(email) {
  try {
    // Update the user's subscription status in PostgreSQL
    const { rowCount } = await sql`
      UPDATE users
      SET email_list = FALSE
      WHERE email = ${email}
    `;

    if (rowCount === 0) {
      throw new Error("Email not found or already unsubscribed");
    }

    // Send notification email to admin
    const transporter = getEmailTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Unsubscribe Notification",
      text: `The following email has unsubscribed from the email list: ${email}`,
      html: `<p>The following email has unsubscribed from the email list: <strong>${email}</strong></p>`,
    };

    await transporter.sendMail(mailOptions);

    return { success: true, message: "User unsubscribed successfully" };
  } catch (error) {
    console.error("Error unsubscribing:", error);
    throw new Error("Failed to unsubscribe");
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// MIGRATION SCRIPTS
////////////////////////////////////////////////////////////////////////////////////////////////////

export async function migrateTreatmentsWithTimeWindows() {
  try {
    // Connect to MongoDB
    const db = await getDatabase();

    // Step 1: Migrate treatment plans (unchanged from your original function)
    const treatmentPlansCollection = db.collection("treatmentPlans");
    const treatmentPlans = await treatmentPlansCollection.find({}).toArray();


    // Map to store MongoDB ID to PostgreSQL UUID mapping
    const planIdMap = new Map();

    for (const plan of treatmentPlans) {
      try {
        // Convert MongoDB ObjectId to string
        const mongoId = plan._id.toString();
        const clientId = plan.clientId ? plan.clientId.toString() : null;
        const createdById = plan.createdBy ? plan.createdBy.toString() : null;

        // Check if client and creator exist in PostgreSQL
        let postgresClientId = null;
        let postgresCreatedById = null;

        if (clientId) {
          const { rows: clientRows } = await sql`
            SELECT id FROM users WHERE mongodb_id = ${clientId}
          `;
          if (clientRows.length > 0) {
            postgresClientId = clientRows[0].id;
          } else {
            continue; // Skip this plan if client doesn't exist
          }
        }

        if (createdById) {
          const { rows: creatorRows } = await sql`
            SELECT id FROM users WHERE mongodb_id = ${createdById}
          `;
          if (creatorRows.length > 0) {
            postgresCreatedById = creatorRows[0].id;
          } else {
            // Use a default RMT ID if creator not found
            postgresCreatedById =
              process.env.DEFAULT_RMT_ID ||
              "bc509c91-74b7-49fb-9312-967d9cc15118";
          }
        }

        // Insert into PostgreSQL
        const { rows } = await sql`
          INSERT INTO treatment_plans (
            mongodb_id, 
            client_id, 
            created_by, 
            encrypted_data, 
            start_date, 
            created_at
          ) VALUES (
            ${mongoId}, 
            ${postgresClientId}, 
            ${postgresCreatedById}, 
            ${plan.encryptedData || ""}, 
            ${plan.startDate ? new Date(plan.startDate.$date) : null}, 
            ${plan.createdAt ? new Date(plan.createdAt.$date) : new Date()}
          ) 
          ON CONFLICT (mongodb_id) DO UPDATE 
          SET 
            encrypted_data = EXCLUDED.encrypted_data,
            start_date = EXCLUDED.start_date
          RETURNING id
        `;

        if (rows.length > 0) {
          planIdMap.set(mongoId, rows[0].id);
        }
      } catch (error) {
        console.error(
          `Error migrating treatment plan ${plan._id.toString()}:`,
          error,
        );
      }
    }

    // Step 2: Migrate treatments with time window support
    const treatmentsCollection = db.collection("tomigrateTreatments");
    const treatments = await treatmentsCollection.find({}).toArray();

    // Map to store MongoDB ID to PostgreSQL UUID mapping
    const treatmentIdMap = new Map();

    // First, check if the treatments table has the new columns
    try {
      const { rows: columnCheck } = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'treatments' 
        AND column_name IN ('appointment_start_time', 'appointment_end_time')
      `;

      if (columnCheck.length < 2) {
        await sql`
          ALTER TABLE treatments 
          ADD COLUMN IF NOT EXISTS appointment_start_time TIME,
          ADD COLUMN IF NOT EXISTS appointment_end_time TIME;
          
          COMMENT ON COLUMN treatments.appointment_start_time IS 'The start time of the available appointment window';
          COMMENT ON COLUMN treatments.appointment_end_time IS 'The end time of the available appointment window';
          COMMENT ON COLUMN treatments.appointment_begins_at IS 'The actual start time when user booked within the window';
          COMMENT ON COLUMN treatments.appointment_ends_at IS 'The actual end time when user booked within the window';
        `;
      }
    } catch (error) {
      console.error("Error checking/adding columns:", error);
      // Continue with migration anyway
    }

    for (const treatment of treatments) {
      try {
        // Convert MongoDB ObjectId to string
        const mongoId = treatment._id.toString();
        const rmtId = treatment.RMTId
          ? treatment.RMTId.toString()
          : treatment.rmtId
            ? treatment.rmtId.toString()
            : null;
        const clientId = treatment.userId
          ? treatment.userId.toString()
          : treatment.clientId
            ? treatment.clientId.toString()
            : null;
        const treatmentPlanId = treatment.treatmentPlanId
          ? treatment.treatmentPlanId.toString()
          : null;

        // Check if client and RMT exist in PostgreSQL
        let postgresClientId = null;
        let postgresRmtId = null;
        let postgresTreatmentPlanId = null;

        if (clientId) {
          const { rows: clientRows } = await sql`
            SELECT id FROM users WHERE mongodb_id = ${clientId}
          `;
          if (clientRows.length > 0) {
            postgresClientId = clientRows[0].id;
          } else {
            continue; // Skip this treatment if client doesn't exist
          }
        }

        if (rmtId) {
          const { rows: rmtRows } = await sql`
            SELECT id FROM users WHERE mongodb_id = ${rmtId}
          `;
          if (rmtRows.length > 0) {
            postgresRmtId = rmtRows[0].id;
          } else {
            // Use a default RMT ID if RMT not found
            postgresRmtId =
              process.env.DEFAULT_RMT_ID ||
              "bc509c91-74b7-49fb-9312-967d9cc15118";
          }
        }

        // Get treatment plan ID from map if it exists
        if (treatmentPlanId && planIdMap.has(treatmentPlanId)) {
          postgresTreatmentPlanId = planIdMap.get(treatmentPlanId);
        }

        // Format dates and times
        const appointmentDate = treatment.appointmentDate || treatment.date;

        // Handle the time window fields (new)
        const appointmentStartTime = treatment.appointmentStartTime || null;
        const appointmentEndTime = treatment.appointmentEndTime || null;

        // Handle the actual booked times
        const appointmentBeginsAt =
          treatment.appointmentBeginsAt ||
          treatment.appointmentStartTime ||
          null;
        const appointmentEndsAt =
          treatment.appointmentEndsAt || treatment.appointmentEndTime || null;

        // If we have booked times but no window times, use the booked times as the window
        const finalAppointmentStartTime =
          appointmentStartTime || appointmentBeginsAt;
        const finalAppointmentEndTime = appointmentEndTime || appointmentEndsAt;

        // Handle consent form (it's stored as JSON in PostgreSQL)
        const consentForm = treatment.consentForm
          ? JSON.stringify(treatment.consentForm)
          : null;

        // Handle treatment notes (encrypt if needed)
        let encryptedTreatmentNotes = null;
        if (treatment.treatmentNotes) {
          encryptedTreatmentNotes = treatment.treatmentNotes;
        }

        // Get RMT location ID
        let rmtLocationId = null;
        if (treatment.RMTLocationId) {
          const rmtLocationMongoId = treatment.RMTLocationId.toString();
          const { rows: locationRows } = await sql`
            SELECT id FROM rmt_locations WHERE mongodb_id = ${rmtLocationMongoId}
          `;
          if (locationRows.length > 0) {
            rmtLocationId = locationRows[0].id;
          }
        }

        // Use default RMT location ID if not found
        if (!rmtLocationId) {
          rmtLocationId =
            process.env.DEFAULT_RMT_LOCATION_ID ||
            "644fee83-bfeb-4418-935f-a094ad821766";
        }

        // Insert into PostgreSQL with the new time window fields
        const { rows } = await sql`
          INSERT INTO treatments (
            mongodb_id,
            rmt_id,
            client_id,
            date,
            price,
            payment_type,
            status,
            rmt_location_id,
            appointment_start_time,
            appointment_end_time,
            appointment_begins_at,
            appointment_ends_at,
            duration,
            location,
            workplace,
            google_calendar_event_id,
            google_calendar_event_link,
            consent_form,
            consent_form_submitted_at,
            encrypted_treatment_notes,
            treatment_plan_id,
            created_at,
            updated_at
          ) VALUES (
            ${mongoId},
            ${postgresRmtId},
            ${postgresClientId},
            ${appointmentDate || null},
            ${treatment.price || null},
            ${treatment.paymentType || null},
            ${treatment.status || "completed"},
            ${rmtLocationId},
            ${finalAppointmentStartTime},
            ${finalAppointmentEndTime},
            ${appointmentBeginsAt},
            ${appointmentEndsAt},
            ${treatment.duration ? parseInt(treatment.duration) : null},
            ${treatment.location || null},
            ${treatment.workplace || null},
            ${treatment.googleCalendarEventId || null},
            ${treatment.googleCalendarEventLink || null},
            ${consentForm},
            ${
              treatment.consentFormSubmittedAt
                ? new Date(treatment.consentFormSubmittedAt.$date)
                : null
            },
            ${encryptedTreatmentNotes},
            ${postgresTreatmentPlanId},
            ${
              treatment.createdAt
                ? new Date(treatment.createdAt.$date)
                : new Date()
            },
            ${new Date()}
          )
          ON CONFLICT (mongodb_id) DO UPDATE 
          SET 
            price = EXCLUDED.price,
            payment_type = EXCLUDED.payment_type,
            status = EXCLUDED.status,
            rmt_location_id = EXCLUDED.rmt_location_id,
            appointment_start_time = EXCLUDED.appointment_start_time,
            appointment_end_time = EXCLUDED.appointment_end_time,
            appointment_begins_at = EXCLUDED.appointment_begins_at,
            appointment_ends_at = EXCLUDED.appointment_ends_at,
            duration = EXCLUDED.duration,
            encrypted_treatment_notes = EXCLUDED.encrypted_treatment_notes,
            treatment_plan_id = EXCLUDED.treatment_plan_id
          RETURNING id
        `;

        if (rows.length > 0) {
          treatmentIdMap.set(mongoId, rows[0].id);
        }
      } catch (error) {
        console.error(
          `Error migrating treatment ${treatment._id.toString()}:`,
          error,
        );
      }
    }

    // Step 3: Create treatment_plan_treatments relationships (unchanged)
    for (const plan of treatmentPlans) {
      if (
        plan.treatments &&
        Array.isArray(plan.treatments) &&
        plan.treatments.length > 0
      ) {
        const planId = planIdMap.get(plan._id.toString());

        if (!planId) {
          continue;
        }

        for (const treatmentRef of plan.treatments) {
          const treatmentMongoId = treatmentRef.toString();
          const treatmentId = treatmentIdMap.get(treatmentMongoId);

          if (!treatmentId) {
            continue;
          }

          try {
            await sql`
              INSERT INTO treatment_plan_treatments (
                treatment_plan_id,
                treatment_id,
                created_at
              ) VALUES (
                ${planId},
                ${treatmentId},
                ${new Date()}
              )
              ON CONFLICT (treatment_plan_id, treatment_id) DO NOTHING
            `;
          } catch (error) {
            console.error(
              `Error creating relationship for plan ${planId} and treatment ${treatmentId}:`,
              error,
            );
          }
        }
      }
    }

    // Step 4: Verify and fix any missing data
    const { rows: incompleteRecords } = await sql`
      SELECT id, mongodb_id 
      FROM treatments 
      WHERE 
        (appointment_start_time IS NULL AND appointment_begins_at IS NOT NULL) OR
        (appointment_end_time IS NULL AND appointment_ends_at IS NOT NULL)
    `;
    for (const record of incompleteRecords) {
      try {
        // Get the current record
        const { rows: currentData } = await sql`
          SELECT 
            appointment_begins_at, 
            appointment_ends_at,
            appointment_start_time,
            appointment_end_time
          FROM treatments 
          WHERE id = ${record.id}
        `;

        if (currentData.length === 0) continue;

        const current = currentData[0];

        // If we have booked times but no window times, use the booked times as the window
        if (!current.appointment_start_time && current.appointment_begins_at) {
          await sql`
            UPDATE treatments 
            SET appointment_start_time = ${current.appointment_begins_at}
            WHERE id = ${record.id}
          `;
        }

        if (!current.appointment_end_time && current.appointment_ends_at) {
          await sql`
            UPDATE treatments 
            SET appointment_end_time = ${current.appointment_ends_at}
            WHERE id = ${record.id}
          `;
        }
      } catch (error) {
        console.error(`Error fixing treatment ${record.id}:`, error);
      }
    }

    return { success: true, message: "Migration completed successfully" };
  } catch (error) {
    console.error("Migration failed:", error);
    return { success: false, message: `Migration failed: ${error.message}` };
  }
}

// Execute the function if this file is run directly
if (require.main === module) {
  migrateTreatmentsWithTimeWindows()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Unhandled error:", error);
      process.exit(1);
    });
}

export async function consolidateUsers() {

  try {
    // Connect to MongoDB
    const db = await getDatabase();

    // Check if migrateUsers collection already exists and drop it if it does
    const collections = await db
      .listCollections({ name: "migrateUsers" })
      .toArray();
    if (collections.length > 0) {
      await db.collection("migrateUsers").drop();
    }

    // Use aggregation pipeline to normalize the documents
    const pipeline = [
      {
        $project: {
          _id: 1,
          first_name: { $ifNull: ["$firstName", "$first_name"] },
          last_name: { $ifNull: ["$lastName", "$last_name"] },
          email: 1,
          phone_number: { $ifNull: ["$phone", "$phoneNumber"] },
          password: 1,
          user_type: { $ifNull: ["$userType", "$user_type"] },
          rmt_id: { $ifNull: ["$rmtId", "$rmt_id"] },
          created_at: { $ifNull: ["$createdAt", new Date()] },
          preferred_name: { $ifNull: ["$preferredName", "$preferred_name"] },
          pronouns: 1,
          last_health_history_update: {
            $ifNull: [
              "$lastHealthHistoryUpdate",
              "$last_health_history_update",
            ],
          },
          dns_count: { $ifNull: ["$dnsCount", "$dns_count", 0] },
          reset_token: { $ifNull: ["$resetToken", "$reset_token"] },
          reset_token_expires: {
            $ifNull: ["$resetTokenExpires", "$reset_token_expires"],
          },
          cancel_count: { $ifNull: ["$cancelCount", "$cancel_count", 0] },
          email_list: { $ifNull: ["$emailList", "$email_list", true] },
          can_book_at_ids: {
            $ifNull: ["$canBookAtIds", "$can_book_at_ids", []],
          },
        },
      },
      { $out: "migrateUsers" },
    ];

    // Execute the aggregation pipeline
    await db.collection("users").aggregate(pipeline).toArray();

    // Verify the results
    const originalCount = await db.collection("users").countDocuments();
    const migratedCount = await db.collection("migrateUsers").countDocuments();
    // Check for any missing fields in the migrated collection
    const sampleUser = await db.collection("migrateUsers").findOne();
    const fields = Object.keys(sampleUser).filter((key) => key !== "_id");

    return {
      success: true,
      message: `Successfully consolidated ${migratedCount} users`,
      stats: {
        originalCount,
        migratedCount,
        fields,
      },
    };
  } catch (error) {
    console.error("Consolidation failed:", error);
    return {
      success: false,
      message: `Consolidation failed: ${error.message}`,
    };
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// FINANCIAL TRACKING
////////////////////////////////////////////////////////////////////////////////////////////////////

export async function getTreatmentsRevenueByMonth(year) {
  try {
    const queryResult = await sql`
      SELECT 
        EXTRACT(MONTH FROM t.date) as month,
        t.date,
        t.price,
        t.duration,
        u.first_name,
        u.last_name
      FROM treatments t
      LEFT JOIN users u ON t.client_id = u.id
      WHERE EXTRACT(YEAR FROM t.date) = ${year}
        AND t.status = 'completed'
        AND t.date < CURRENT_DATE
      ORDER BY t.date
    `;
    const result = queryResult.rows || queryResult;
    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching treatments revenue:", error);
    return { success: false, error: "Failed to fetch treatments revenue" };
  }
}

async function ensureRmtYearlyTaxesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS rmt_yearly_taxes (
      rmt_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tax_year INTEGER NOT NULL,
      actual_tax_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (rmt_id, tax_year)
    )
  `;
}

export async function getActualTaxPaidForYear(year) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized");
    }

    const parsedYear = Number.parseInt(year, 10);
    if (!Number.isFinite(parsedYear) || parsedYear < 2000 || parsedYear > 3000) {
      throw new Error("Invalid year");
    }

    await ensureRmtYearlyTaxesTable();

    const { rows } = await sql`
      SELECT actual_tax_paid AS "actualTaxPaid"
      FROM rmt_yearly_taxes
      WHERE rmt_id = ${session.resultObj.id}
        AND tax_year = ${parsedYear}
      LIMIT 1
    `;

    return {
      success: true,
      data: {
        year: parsedYear,
        actualTaxPaid:
          rows.length > 0 && rows[0].actualTaxPaid !== null
            ? Number(rows[0].actualTaxPaid)
            : null,
      },
    };
  } catch (error) {
    console.error("Error fetching actual tax paid:", error);
    return { success: false, error: error.message || "Failed to fetch tax paid" };
  }
}

export async function saveActualTaxPaidForYear(year, actualTaxPaid) {
  try {
    const session = await getSession();
    if (!session?.resultObj || session.resultObj.userType !== "rmt") {
      throw new Error("Unauthorized");
    }

    const parsedYear = Number.parseInt(year, 10);
    if (!Number.isFinite(parsedYear) || parsedYear < 2000 || parsedYear > 3000) {
      throw new Error("Invalid year");
    }

    const parsedTax = Number(actualTaxPaid);
    if (!Number.isFinite(parsedTax) || parsedTax < 0) {
      throw new Error("Actual tax paid must be 0 or greater");
    }

    await ensureRmtYearlyTaxesTable();

    const { rows } = await sql`
      INSERT INTO rmt_yearly_taxes (
        rmt_id,
        tax_year,
        actual_tax_paid,
        updated_at
      ) VALUES (
        ${session.resultObj.id},
        ${parsedYear},
        ${parsedTax},
        NOW()
      )
      ON CONFLICT (rmt_id, tax_year)
      DO UPDATE SET
        actual_tax_paid = EXCLUDED.actual_tax_paid,
        updated_at = NOW()
      RETURNING tax_year AS "year", actual_tax_paid AS "actualTaxPaid"
    `;

    revalidatePath(`/dashboard/rmt/finances?year=${parsedYear}`);
    revalidatePath("/dashboard/rmt/finances");

    return {
      success: true,
      message: "Actual tax paid saved.",
      data: {
        year: rows[0].year,
        actualTaxPaid: Number(rows[0].actualTaxPaid),
      },
    };
  } catch (error) {
    console.error("Error saving actual tax paid:", error);
    return { success: false, error: error.message || "Failed to save actual tax paid" };
  }
}

export async function getAvailableYears() {
  try {
    const queryResult = await sql`
      SELECT DISTINCT EXTRACT(YEAR FROM date)::integer as year
      FROM treatments
      WHERE date IS NOT NULL
      ORDER BY year DESC
    `;
    const years = queryResult.rows || queryResult;

    return { success: true, data: years.map((row) => row.year) };
  } catch (error) {
    console.error("Error fetching available years:", error);
    return { success: true, data: [new Date().getFullYear()] };
  }
}

export async function addAdditionalIncome(formData) {
  try {
    await ensureAdditionalIncomeFlagsColumns();

    const amount = formData.get("amount");
    const source = formData.get("source");
    const details = formData.get("details") || null;
    const date = formData.get("date");
    const includeInIncomeTax = formData.get("includeInIncomeTax") === "on";
    const includeInHstQuickMethod =
      formData.get("includeInHstQuickMethod") === "on";

    const queryResult = await sql`
      INSERT INTO additional_income (
        amount,
        source,
        details,
        date,
        include_in_income_tax,
        include_in_hst_quick_method
      )
      VALUES (
        ${amount},
        ${source},
        ${details},
        ${date},
        ${includeInIncomeTax},
        ${includeInHstQuickMethod}
      )
      RETURNING *
    `;
    const result = queryResult.rows || queryResult;
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error adding additional income:", error);
    return { success: false, error: "Failed to add additional income" };
  }
}

export async function getAdditionalIncomeByMonth(year) {
  try {
    await ensureAdditionalIncomeFlagsColumns();

    const queryResult = await sql`
      SELECT 
        id,
        EXTRACT(MONTH FROM date) as month,
        date,
        amount,
        source,
        details,
        include_in_income_tax AS "includeInIncomeTax",
        include_in_hst_quick_method AS "includeInHstQuickMethod"
      FROM additional_income
      WHERE EXTRACT(YEAR FROM date) = ${year}
      ORDER BY date
    `;
    const result = queryResult.rows || queryResult;
    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching additional income:", error);
    return { success: false, error: "Failed to fetch additional income" };
  }
}

async function ensureAdditionalIncomeFlagsColumns() {
  await sql`
    ALTER TABLE additional_income
      ADD COLUMN IF NOT EXISTS include_in_income_tax BOOLEAN NOT NULL DEFAULT TRUE
  `;
  await sql`
    ALTER TABLE additional_income
      ADD COLUMN IF NOT EXISTS include_in_hst_quick_method BOOLEAN NOT NULL DEFAULT FALSE
  `;
}

export async function getAdditionalTreatmentsRevenueByMonth(year) {
  try {
    const queryResult = await sql`
      SELECT 
        EXTRACT(MONTH FROM t.date) as month,
        t.date,
        t.duration,
        t.price,
        u.first_name,
        u.last_name
      FROM additional_treatments t
      LEFT JOIN users u ON t.client_id = u.id
      WHERE EXTRACT(YEAR FROM t.date) = ${year}
        AND t.status = 'completed'
        AND t.date < CURRENT_DATE
      ORDER BY t.date
    `;
    const result = queryResult.rows || queryResult;
    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching additional treatments revenue:", error);
    return {
      success: false,
      error: "Failed to fetch additional treatments revenue",
    };
  }
}

export async function addExpense(formData) {
  try {
    const enteredAmount = Number.parseFloat(formData.get("amount"));
    const category = formData.get("category");
    const subcategory = formData.get("subcategory") || null;
    const details = formData.get("details") || null;
    const date = formData.get("date");
    const includesHst = formData.get("includesHst") === "on";

    let amount = enteredAmount;
    let hst = 0;

    // Special case: Rent has no HST
    if (subcategory === "Rent") {
      amount = enteredAmount;
      hst = 0;
    } else if (includesHst) {
      // HST is included in the entered amount, extract it
      // amount / 1.13 gives the base amount
      // amount - (amount / 1.13) gives the HST portion
      amount = enteredAmount / 1.13;
      hst = enteredAmount - amount;
    } else {
      // HST is not included, calculate it separately
      amount = enteredAmount;
      hst = enteredAmount * 0.13;
    }

    const queryResult = await sql`
      INSERT INTO expenses (amount, category, subcategory, details, date, hst)
      VALUES (${amount}, ${category}, ${subcategory}, ${details}, ${date}, ${hst})
      RETURNING *
    `;
    const result = queryResult.rows || queryResult;
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error adding expense:", error);
    return { success: false, error: "Failed to add expense" };
  }
}

export async function getExpensesByMonth(year) {
  try {
    const queryResult = await sql`
      SELECT 
        id,
        EXTRACT(MONTH FROM date) as month,
        date,
        amount,
        category,
        subcategory,
        details,
        hst
      FROM expenses
      WHERE EXTRACT(YEAR FROM date) = ${year}
      ORDER BY date
    `;
    const result = queryResult.rows || queryResult;
    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return { success: false, error: "Failed to fetch expenses" };
  }
}

export async function deleteExpense(expenseId) {
  try {
    await sql`
      DELETE FROM expenses
      WHERE id = ${expenseId}
    `;
    return { success: true };
  } catch (error) {
    console.error("Error deleting expense:", error);
    return { success: false, error: "Failed to delete expense" };
  }
}

export async function deleteAdditionalIncome(incomeId) {
  try {
    await sql`
      DELETE FROM additional_income
      WHERE id = ${incomeId}
    `;
    return { success: true };
  } catch (error) {
    console.error("Error deleting additional income:", error);
    return { success: false, error: "Failed to delete additional income" };
  }
}

export async function addMaintenanceLog(formData) {
  try {
    const massageMat = formData.get("massage_mat") === "on";
    const speakerAndCables = formData.get("speaker_and_cables") === "on";
    const towelsAndLinens = formData.get("towels_and_linens") === "on";
    const lighting = formData.get("lighting") === "on";
    const accessories = formData.get("accessories") === "on";
    const notes = (formData.get("notes") || "").toString().trim() || null;

    const queryResult = await sql`
      INSERT INTO maintenance_log (
        massage_mat,
        speaker_and_cables,
        towels_and_linens,
        lighting,
        accessories,
        notes
      )
      VALUES (
        ${massageMat},
        ${speakerAndCables},
        ${towelsAndLinens},
        ${lighting},
        ${accessories},
        ${notes}
      )
      RETURNING *
    `;

    const result = queryResult.rows || queryResult;
    revalidatePath("/dashboard/rmt/logs/maintenance");
    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error adding maintenance log:", error);
    return { success: false, error: "Failed to save maintenance log" };
  }
}

export async function autoCompleteMonthlyMaintenanceLog() {
  try {
    const queryResult = await sql`
      INSERT INTO maintenance_log (
        massage_mat,
        speaker_and_cables,
        towels_and_linens,
        lighting,
        accessories,
        notes
      )
      SELECT
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        NULL
      WHERE NOT EXISTS (
        SELECT 1
        FROM maintenance_log
        WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE::timestamp)
      )
      RETURNING *
    `;

    const result = queryResult.rows || queryResult;
    revalidatePath("/dashboard/rmt/logs/maintenance");

    if (result.length === 0) {
      return {
        success: true,
        skipped: true,
        message: "Monthly maintenance log already exists for this month.",
      };
    }

    return {
      success: true,
      skipped: false,
      message: "Monthly maintenance log auto-completed.",
      data: result[0],
    };
  } catch (error) {
    console.error("Error auto-completing monthly maintenance log:", error);
    return {
      success: false,
      error: "Failed to auto-complete monthly maintenance log",
    };
  }
}

// export async function getIncomeByMonth() {
//   try {
//     const session = await getSession();
//     if (!session || !session.resultObj) {
//       throw new Error("Unauthorized: User not logged in");
//     }

//     const rmtId = session.resultObj.id;

//     // Query the incomes table for all income records
//     const { rows: incomeData } = await sql`
//       SELECT
//         id,
//         date,
//         total_price as "totalPrice",
//         amount,
//         hst_amount as "hstAmount",
//         category,
//         details,
//         year
//       FROM incomes
//       WHERE rmt_id = ${rmtId}
//       ORDER BY date DESC
//     `;

//     // Organize data by year and month
//     const incomeByYear = {};
//     const currentDate = new Date();
//     const currentYear = currentDate.getFullYear().toString();

//     // Initialize the current year if it doesn't exist
//     if (!incomeByYear[currentYear]) {
//       incomeByYear[currentYear] = {
//         months: {},
//         yearTotal: 0,
//         yearToDateTotal: 0,
//       };
//     }

//     // Process each income record
//     incomeData.forEach((income) => {
//       const date = new Date(income.date);
//       const year = date.getFullYear().toString();
//       const month = date.getMonth(); // 0-11

//       // Initialize year if it doesn't exist
//       if (!incomeByYear[year]) {
//         incomeByYear[year] = {
//           months: {},
//           yearTotal: 0,
//           yearToDateTotal: 0,
//         };
//       }

//       // Initialize month if it doesn't exist
//       if (!incomeByYear[year].months[month]) {
//         incomeByYear[year].months[month] = {
//           monthTotal: 0,
//           incomes: [],
//         };
//       }

//       // Add income to the appropriate month
//       incomeByYear[year].months[month].incomes.push(income);

//       // Update month total
//       incomeByYear[year].months[month].monthTotal += Number.parseFloat(
//         income.totalPrice || 0
//       );

//       // Update year total
//       incomeByYear[year].yearTotal += Number.parseFloat(income.totalPrice || 0);

//       // Update year-to-date total (for current year only)
//       if (year === currentYear && date <= currentDate) {
//         incomeByYear[year].yearToDateTotal += Number.parseFloat(
//           income.totalPrice || 0
//         );
//       }
//     });

//     return { success: true, data: incomeByYear };
//   } catch (error) {
//     console.error("Error fetching income data:", error);
//     return { success: false, message: error.message };
//   }
// }

/////////////////////////////////////////////////////////////////
//RMT WEEKLY SCHEDULE
/////////////////////////////////////////////////////////////////

export async function loadScheduleData(locationId) {
  try {
    const result = await sql`
      SELECT 
        wd.id,
        wd.day_of_week,
        wd.day_name,
        wd.is_working,
        wd.booking_cutoff_hours,
        COALESCE(
          json_agg(
            json_build_object(
              'id', at.id,
              'start_time', at.start_time,
              'end_time', at.end_time
            )
          ) FILTER (WHERE at.id IS NOT NULL),
          '[]'::json
        ) as appointment_times
      FROM work_days2 wd
      LEFT JOIN appointment_times2 at ON wd.id = at.work_day_id
      WHERE wd.location_id = ${locationId}
      GROUP BY wd.id, wd.day_of_week, wd.day_name, wd.is_working, wd.booking_cutoff_hours
      ORDER BY wd.day_of_week
    `;

    const rows = result.rows || [];

    const plainData = rows.map((row) => ({
      id: row.id,
      day_of_week: row.day_of_week,
      day_name: row.day_name,
      is_working: row.is_working,
      booking_cutoff_hours: row.booking_cutoff_hours,
      appointment_times: row.appointment_times,
    }));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Failed to load schedule:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleWorkingDay(workDayId, isWorking) {
  try {
    await sql`
      UPDATE work_days2 
      SET is_working = ${isWorking}
      WHERE id = ${workDayId}
    `;
    return { success: true };
  } catch (error) {
    console.error("Failed to update working day:", error);
    return { success: false, error: error.message };
  }
}

export async function updateWorkDayBookingCutoffHours(workDayId, hours) {
  try {
    const parsedHours = Number(hours);
    const safeHours =
      Number.isFinite(parsedHours) && parsedHours >= 0 ? parsedHours : 0;

    await sql`
      UPDATE work_days2
      SET booking_cutoff_hours = ${safeHours}
      WHERE id = ${workDayId}
    `;

    return { success: true, data: { bookingCutoffHours: safeHours } };
  } catch (error) {
    console.error("Failed to update booking cutoff hours:", error);
    return { success: false, error: error.message };
  }
}

export async function getRmtAccountSettings() {
  try {
    const session = await getSession();
    if (!session?.resultObj?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.resultObj.id;
    const { rows: userRows } = await sql`
      SELECT id, user_type, email, phone_number
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (userRows.length === 0 || userRows[0].user_type !== "rmt") {
      return { success: false, error: "Unauthorized" };
    }

    const { rows: locationRows } = await sql`
      SELECT
        id,
        location_name,
        street_address,
        city,
        province,
        country,
        postal_code,
        phone,
        email,
        workplace_type,
        description,
        what_to_wear,
        payment,
        url
      FROM rmt_locations
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
    `;

    const locations = [];
    for (const location of locationRows) {
      const { rows: serviceRows } = await sql`
        SELECT id, service, duration, price, plus_hst
        FROM massage_services
        WHERE rmt_location_id = ${location.id}
        ORDER BY duration ASC, service ASC
      `;

      locations.push({
        id: location.id,
        locationName: location.location_name || "",
        streetAddress: location.street_address || "",
        city: location.city || "",
        province: location.province || "",
        country: location.country || "",
        postalCode: location.postal_code || "",
        phone: location.phone || "",
        email: location.email || "",
        workplaceType: location.workplace_type || "",
        description: location.description || "",
        whatToWear: location.what_to_wear || "",
        payment: location.payment || "",
        url: location.url || "",
        services: serviceRows.map((service) => ({
          id: service.id,
          service: service.service || "",
          duration: Number(service.duration || 0),
          price: Number(service.price || 0),
          plusHst: Boolean(service.plus_hst),
        })),
      });
    }

    return {
      success: true,
      data: {
        contact: {
          email: userRows[0].email || "",
          phoneNumber: userRows[0].phone_number || "",
        },
        locations,
      },
    };
  } catch (error) {
    console.error("Error loading RMT account settings:", error);
    return { success: false, error: "Failed to load account settings" };
  }
}

export async function saveRmtContactSettings(formData) {
  try {
    const session = await getSession();
    if (!session?.resultObj?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.resultObj.id;
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    const phoneNumberRaw = String(formData.get("phoneNumber") || "").trim();
    const phoneNumber = normalizePhoneToDigits(phoneNumberRaw);

    if (!email) {
      return { success: false, error: "Email is required" };
    }

    const { rows: userRows } = await sql`
      SELECT id, user_type
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    if (userRows.length === 0 || userRows[0].user_type !== "rmt") {
      return { success: false, error: "Unauthorized" };
    }

    await sql`
      UPDATE users
      SET email = ${email},
          phone_number = ${phoneNumber || null}
      WHERE id = ${userId}
    `;

    revalidatePath("/dashboard/rmt/account");
    return { success: true };
  } catch (error) {
    console.error("Error saving RMT contact settings:", error);
    return { success: false, error: "Failed to save contact information" };
  }
}

export async function saveRmtLocationSettings(formData) {
  try {
    const session = await getSession();
    if (!session?.resultObj?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.resultObj.id;
    const locationId = String(formData.get("locationId") || "");
    if (!locationId) {
      return { success: false, error: "Location is required" };
    }

    const { rows: ownershipRows } = await sql`
      SELECT id, workplace_type
      FROM rmt_locations
      WHERE id = ${locationId}::uuid AND user_id = ${userId}
      LIMIT 1
    `;
    if (ownershipRows.length === 0) {
      return { success: false, error: "Unauthorized location access" };
    }

    const workplaceTypeInput = String(formData.get("workplaceType") || "")
      .trim()
      .toLowerCase();
    const normalizedWorkplaceType =
      workplaceTypeInput === "regular" || workplaceTypeInput === "irregular"
        ? workplaceTypeInput
        : ownershipRows[0].workplace_type || "regular";

    await sql`
      UPDATE rmt_locations
      SET
        location_name = ${String(formData.get("locationName") || "").trim() || null},
        street_address = ${String(formData.get("streetAddress") || "").trim() || null},
        city = ${String(formData.get("city") || "").trim() || null},
        province = ${String(formData.get("province") || "").trim() || null},
        country = ${String(formData.get("country") || "").trim() || null},
        postal_code = ${String(formData.get("postalCode") || "").trim() || null},
        phone = ${normalizePhoneToDigits(String(formData.get("phone") || "").trim()) || null},
        email = ${String(formData.get("email") || "").trim().toLowerCase() || null},
        workplace_type = ${normalizedWorkplaceType},
        description = ${String(formData.get("description") || "").trim() || null},
        what_to_wear = ${String(formData.get("whatToWear") || "").trim() || null},
        payment = ${String(formData.get("payment") || "").trim() || null},
        url = ${String(formData.get("url") || "").trim() || null}
      WHERE id = ${locationId}::uuid
    `;

    revalidatePath("/dashboard/rmt/account");
    return { success: true };
  } catch (error) {
    console.error("Error saving RMT location settings:", error);
    return { success: false, error: "Failed to save location settings" };
  }
}

export async function addRmtLocationSettings(formData) {
  try {
    const session = await getSession();
    if (!session?.resultObj?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.resultObj.id;
    const { rows: userRows } = await sql`
      SELECT id, user_type
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    if (userRows.length === 0 || userRows[0].user_type !== "rmt") {
      return { success: false, error: "Unauthorized" };
    }

    const workplaceTypeInput = String(formData.get("workplaceType") || "")
      .trim()
      .toLowerCase();
    const workplaceType =
      workplaceTypeInput === "regular" || workplaceTypeInput === "irregular"
        ? workplaceTypeInput
        : "regular";

    const { rows: locationRows } = await sql`
      INSERT INTO rmt_locations (
        user_id,
        location_name,
        street_address,
        city,
        province,
        country,
        postal_code,
        phone,
        email,
        workplace_type,
        description,
        what_to_wear,
        payment,
        url
      ) VALUES (
        ${userId},
        ${String(formData.get("locationName") || "").trim() || null},
        ${String(formData.get("streetAddress") || "").trim() || null},
        ${String(formData.get("city") || "").trim() || null},
        ${String(formData.get("province") || "").trim() || null},
        ${String(formData.get("country") || "").trim() || null},
        ${String(formData.get("postalCode") || "").trim() || null},
        ${normalizePhoneToDigits(String(formData.get("phone") || "").trim()) || null},
        ${String(formData.get("email") || "").trim().toLowerCase() || null},
        ${workplaceType},
        ${String(formData.get("description") || "").trim() || null},
        ${String(formData.get("whatToWear") || "").trim() || null},
        ${String(formData.get("payment") || "").trim() || null},
        ${String(formData.get("url") || "").trim() || null}
      )
      RETURNING id
    `;

    if (locationRows.length === 0) {
      return { success: false, error: "Failed to create location" };
    }

    const locationId = locationRows[0].id;

    await sql`
      INSERT INTO user_rmt_locations (user_id, rmt_location_id, is_primary)
      VALUES (${userId}, ${locationId}, false)
      ON CONFLICT (user_id, rmt_location_id) DO NOTHING
    `;

    const weekTemplate = [
      { dayOfWeek: 1, dayName: "Monday" },
      { dayOfWeek: 2, dayName: "Tuesday" },
      { dayOfWeek: 3, dayName: "Wednesday" },
      { dayOfWeek: 4, dayName: "Thursday" },
      { dayOfWeek: 5, dayName: "Friday" },
      { dayOfWeek: 6, dayName: "Saturday" },
      { dayOfWeek: 0, dayName: "Sunday" },
    ];

    for (const day of weekTemplate) {
      await sql`
        INSERT INTO work_days2 (
          location_id,
          day_of_week,
          day_name,
          is_working,
          booking_cutoff_hours
        ) VALUES (
          ${locationId},
          ${day.dayOfWeek},
          ${day.dayName},
          false,
          0
        )
      `;
    }

    revalidatePath("/dashboard/rmt/account");
    return { success: true, data: { locationId } };
  } catch (error) {
    console.error("Error creating RMT location:", error);
    return { success: false, error: "Failed to create location" };
  }
}

export async function saveRmtServiceRate(formData) {
  try {
    const session = await getSession();
    if (!session?.resultObj?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.resultObj.id;
    const serviceId = String(formData.get("serviceId") || "");
    if (!serviceId) {
      return { success: false, error: "Service is required" };
    }

    const service = String(formData.get("service") || "").trim();
    const duration = Number(formData.get("duration"));
    const price = Number(formData.get("price"));
    const plusHst = formData.get("plusHst") === "on";

    if (!service || !Number.isFinite(duration) || !Number.isFinite(price)) {
      return { success: false, error: "Service, duration, and price are required" };
    }

    const { rows: ownershipRows } = await sql`
      SELECT ms.id
      FROM massage_services ms
      JOIN rmt_locations rl ON rl.id = ms.rmt_location_id
      WHERE ms.id = ${serviceId}::uuid
        AND rl.user_id = ${userId}
      LIMIT 1
    `;
    if (ownershipRows.length === 0) {
      return { success: false, error: "Unauthorized service access" };
    }

    await sql`
      UPDATE massage_services
      SET
        service = ${service},
        duration = ${duration},
        price = ${price},
        plus_hst = ${plusHst}
      WHERE id = ${serviceId}::uuid
    `;

    revalidatePath("/dashboard/rmt/account");
    return { success: true };
  } catch (error) {
    console.error("Error saving RMT service rate:", error);
    return { success: false, error: "Failed to save service rate" };
  }
}

export async function addRmtServiceRate(formData) {
  try {
    const session = await getSession();
    if (!session?.resultObj?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.resultObj.id;
    const locationId = String(formData.get("locationId") || "");
    const service = String(formData.get("service") || "").trim();
    const duration = Number(formData.get("duration"));
    const price = Number(formData.get("price"));
    const plusHst = formData.get("plusHst") === "on";

    if (!locationId || !service || !Number.isFinite(duration) || !Number.isFinite(price)) {
      return { success: false, error: "Location, service, duration, and price are required" };
    }

    const { rows: locationRows } = await sql`
      SELECT id
      FROM rmt_locations
      WHERE id = ${locationId}::uuid
        AND user_id = ${userId}
      LIMIT 1
    `;
    if (locationRows.length === 0) {
      return { success: false, error: "Unauthorized location access" };
    }

    await sql`
      INSERT INTO massage_services (
        rmt_location_id,
        service,
        duration,
        price,
        plus_hst
      ) VALUES (
        ${locationId}::uuid,
        ${service},
        ${duration},
        ${price},
        ${plusHst}
      )
    `;

    revalidatePath("/dashboard/rmt/account");
    return { success: true };
  } catch (error) {
    console.error("Error adding RMT service rate:", error);
    return { success: false, error: "Failed to add service rate" };
  }
}

export async function addAppointmentTime(workDayId, startTime, endTime) {
  try {
    const result = await sql`
      INSERT INTO appointment_times2 (work_day_id, start_time, end_time)
      VALUES (${workDayId}, ${startTime}, ${endTime})
      RETURNING id, start_time, end_time
    `;
    const plainData = {
      id: result.rows[0].id,
      start_time: result.rows[0].start_time,
      end_time: result.rows[0].end_time,
    };
    return { success: true, data: plainData };
  } catch (error) {
    console.error("Failed to add appointment time:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAppointmentTime(timeId, startTime, endTime) {
  try {
    await sql`
      UPDATE appointment_times2 
      SET start_time = ${startTime}, end_time = ${endTime}
      WHERE id = ${timeId}
    `;
    return { success: true };
  } catch (error) {
    console.error("Failed to update appointment time:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAppointmentTime(timeId) {
  try {
    await sql`DELETE FROM appointment_times2 WHERE id = ${timeId}`;
    return { success: true };
  } catch (error) {
    console.error("Failed to delete appointment time:", error);
    return { success: false, error: error.message };
  }
}

////////////////////////////////////////////////////////////////////
//email list unsubscribe
////////////////////////////////////////////////////////////////////

export async function unsubscribeByToken(token) {
  try {
    const { rows } = await sql`
      UPDATE users 
      SET subscribed = false 
      WHERE unsubscribe_token = ${token} AND subscribed = true
      RETURNING email
    `;

    if (rows.length === 0) {
      return {
        success: false,
        message: "Invalid token or already unsubscribed",
      };
    }

    const userEmail = rows[0].email;

    // Send notification email to admin
    const transporter = getEmailTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Unsubscribe Notification",
      text: `Your email, ${userEmail}, has been unsubscribed from ciprmt.com.`,
      html: `<p>Your email, ${userEmail}, has been unsubscribed from ciprmt.com.</p>`,
    };

    await transporter.sendMail(mailOptions);

    return { success: true, message: "Successfully unsubscribed" };
  } catch (error) {
    console.error("Error unsubscribing by token:", error);
    return { success: false, message: "Failed to unsubscribe" };
  }
}

//////////////////////////////////////////////////////////
//email newsletter
//////////////////////////////////////////////////////////

export async function generateUnsubscribeLink(email) {
  try {
    const { rows } = await sql`
      SELECT unsubscribe_token FROM users WHERE email = ${email}
    `;

    if (rows.length === 0) return null;

    return `https://ciprmt.com/unsubscribe/${rows[0].unsubscribe_token}`;
  } catch (error) {
    console.error("Error generating unsubscribe link:", error);
    return null;
  }
}

function simpleMarkdownToHtml(markdown) {
  return markdown
    .replace(
      /^# (.*$)/gim,
      '<h1 style="font-size: 24px; font-weight: bold; margin: 16px 0;">$1</h1>',
    )
    .replace(
      /^## (.*$)/gim,
      '<h2 style="font-size: 20px; font-weight: bold; margin: 14px 0;">$1</h2>',
    )
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*$)/gim, '<li style="margin: 4px 0;">$1</li>')
    .replace(
      /\[([^\]]+)\]$$([^)]+)$$/g,
      '<a href="$2" style="color: #2563eb; text-decoration: underline;">$1</a>',
    )
    .replace(/\n/g, "<br>")
    .replace(
      /(<li.*?>.*?<\/li>)/gs,
      '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>',
    );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function sendEmailBlast(formData) {
  try {
    const subject = formData.get("subject");
    const emailContent = formData.get("emailContent");

    if (!subject || !emailContent) {
      return {
        success: false,
        message: "Subject and content are required",
      };
    }

    // Convert markdown to HTML
    const contentHtml = simpleMarkdownToHtml(emailContent);

    // Get all subscribed users
    const { rows: users } = await sql`
      SELECT email, unsubscribe_token 
      FROM users 
      WHERE subscribed = true
    `;

    if (users.length === 0) {
      return {
        success: false,
        message: "No subscribed users found",
      };
    }

    // Randomize the order to avoid hitting all Gmail addresses at once
    const shuffledUsers = shuffleArray(users);

    const transporter = getEmailTransporter();
    const batchSize = 50; // Send 50 emails per batch
    const delayBetweenBatches = 65000; // 65 seconds between batches

    let successCount = 0;
    let failureCount = 0;

    // Process emails in batches
    for (let i = 0; i < shuffledUsers.length; i += batchSize) {
      const batch = shuffledUsers.slice(i, i + batchSize);
      // Send emails in current batch
      const batchPromises = batch.map(async (user) => {
        try {
          const unsubscribeLink = `https://www.ciprmt.com/unsubscribe/${user.unsubscribe_token}`;

          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                ${contentHtml}
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #666; text-align: center;">
                  If you no longer wish to receive these emails, you can 
                  <a href="${unsubscribeLink}" style="color: #666;">unsubscribe here</a>.
                </p>
              </div>
            `,
            text: emailContent + `\n\nUnsubscribe: ${unsubscribeLink}`,
          };

          await transporter.sendMail(mailOptions);
          return { success: true };
        } catch (error) {
          console.error("Failed to send email to newsletter recipient:", error);
          return { success: false, error };
        }
      });

      // Wait for current batch to complete
      const batchResults = await Promise.allSettled(batchPromises);

      // Count successes and failures
      batchResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value.success) {
          successCount++;
        } else {
          failureCount++;
        }
      });

      // Add delay between batches (except for the last batch)
      if (i + batchSize < shuffledUsers.length) {
        await delay(delayBetweenBatches);
      }
    }
    return {
      success: true,
      message: `Email campaign sent successfully! ${successCount} emails delivered, ${failureCount} failed.`,
      stats: {
        successCount,
        failureCount,
        totalUsers: users.length,
      },
    };
  } catch (error) {
    console.error("Error sending email blast:", error);
    return {
      success: false,
      message: "Failed to send email campaign. Please try again.",
    };
  }
}

//////////////////////////////////////////////////////////////////
//gift cards
//////////////////////////////////////////////////////////////////

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const getStripe = () => {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
  }
  return new Stripe(STRIPE_SECRET_KEY);
};

function generateGiftCardCode() {
  const { randomBytes } = require("crypto");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous characters
  let code = "";
  const bytes = randomBytes(12);

  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
  }

  // Format as XXXX-XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

// Generate PDF gift card with QR code
async function generateGiftCardPDF(giftCardData) {
  const pdfMake = require("pdfmake/build/pdfmake");
  const pdfFonts = require("pdfmake/build/vfs_fonts");
  const fs = require("fs");
  const path = require("path");

  pdfMake.vfs = pdfFonts.pdfMake.vfs;

  const { code, recipient_name, duration, message, id, purchaser_first_name } =
    giftCardData;

  // Read and convert logo to base64
  const logoPath = path.join(process.cwd(), "public", "images", "icon.png");
  const logoBuffer = fs.readFileSync(logoPath);
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  const docDefinition = {
    pageSize: "LETTER",
    pageMargins: [40, 60, 40, 40],
    content: [
      {
        stack: [
          {
            alignment: "center",
            stack: [
              recipient_name
                ? {
                    text: `To: ${recipient_name}`,
                    fontSize: 18,
                    bold: true,
                    color: "#15803d",
                    margin: [0, 0, 0, 16],
                  }
                : { text: "", margin: [0, 0, 0, 16] },
              message
                ? {
                    text: `"${message}"`,
                    fontSize: 16,
                    italics: true,
                    color: "#3d7f2f",
                    margin: [0, 0, 0, 16],
                  }
                : { text: "", margin: [0, 0, 0, 16] },
              {
                text: `From: ${purchaser_first_name}`,
                fontSize: 16,
                bold: true,
                color: "#15803d",
              },
            ],
            fillColor: "#dcfce7",
            padding: [24, 24, 24, 24],
            border: [1, 1, 1, 1],
            borderColor: "#15803d",
            borderWidth: 1,
          },
        ],
        margin: [0, 0, 0, 24],
      },
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  {
                    text: "This gift card entitles you to a",
                    fontSize: 13,
                    color: "#1f2937",
                    alignment: "center",
                    margin: [0, 16, 0, 8],
                  },
                  {
                    text: `${duration} Minute Massage`,
                    fontSize: 28,
                    bold: true,
                    color: "#15803d",
                    alignment: "center",
                    margin: [0, 0, 0, 8],
                  },
                  {
                    text: "from Cip de Vries, RMT",
                    fontSize: 12,
                    color: "#3d7f2f",
                    alignment: "center",
                    margin: [0, 0, 0, 20],
                  },
                  {
                    text: "Your Gift Card Code:",
                    fontSize: 12,
                    bold: true,
                    color: "#1f2937",
                    alignment: "center",
                    margin: [0, 0, 0, 8],
                  },
                  {
                    text: code,
                    fontSize: 20,
                    bold: true,
                    color: "#15803d",
                    alignment: "center",
                    margin: [0, 0, 0, 20],
                    characterSpacing: 2,
                  },
                  {
                    text: "How to Redeem Your Gift Card",
                    fontSize: 14,
                    bold: true,
                    color: "#1f2937",
                    alignment: "left",
                    margin: [20, 0, 0, 12],
                  },
                  {
                    ol: [
                      {
                        text: [
                          { text: "Visit ", fontSize: 11, color: "#4b5563" },
                          {
                            text: "www.ciprmt.com/signup",
                            fontSize: 11,
                            bold: true,
                            color: "#15803d",
                          },
                          {
                            text: " to create a profile",
                            fontSize: 11,
                            color: "#4b5563",
                          },
                        ],
                        margin: [0, 0, 0, 8],
                      },
                      {
                        text: 'Once logged in, select "Book a Massage"',
                        fontSize: 11,
                        color: "#4b5563",
                        margin: [0, 0, 0, 8],
                      },
                      {
                        text: "Select the location and duration of massage your gift card entitles you to",
                        fontSize: 11,
                        color: "#4b5563",
                        margin: [0, 0, 0, 8],
                      },
                      {
                        text: "Find a time that works for your schedule",
                        fontSize: 11,
                        color: "#4b5563",
                        margin: [0, 0, 0, 8],
                      },
                      {
                        text: [
                          {
                            text: "At the confirmation screen, enter this code: ",
                            fontSize: 11,
                            color: "#4b5563",
                          },
                          {
                            text: code,
                            fontSize: 11,
                            bold: true,
                            color: "#15803d",
                          },
                        ],
                        margin: [0, 0, 0, 8],
                      },
                      {
                        text: 'Press "Yes, Book Appointment"',
                        fontSize: 11,
                        color: "#4b5563",
                        margin: [0, 0, 0, 8],
                      },
                    ],
                    margin: [20, 0, 0, 16],
                  },
                  {
                    text: [
                      {
                        text: "Can't find a time? Email me at ",
                        fontSize: 10,
                        color: "#6b7280",
                      },
                      {
                        text: "cipdevries@ciprmt.com",
                        fontSize: 10,
                        bold: true,
                        color: "#15803d",
                      },
                      {
                        text: " and I'll do my best to accommodate you.",
                        fontSize: 10,
                        color: "#6b7280",
                      },
                    ],
                    alignment: "center",
                    margin: [0, 0, 0, 16],
                  },
                ],
                border: [1, 1, 1, 1],
                borderColor: "#15803d",
                borderWidth: 2,
                padding: [25, 25, 30, 25],
                fillColor: "#dcfce7",
              },
            ],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 20],
      },
      // Logo and contact info section
      {
        columns: [
          {
            image: logoBase64,
            width: 40,
            margin: [0, 0, 20, 0],
          },
          {
            stack: [
              {
                text: "Cip de Vries, RMT",
                fontSize: 12,
                bold: true,
                color: "#1f2937",
                margin: [0, 0, 0, 4],
              },
              {
                text: "268 Shuter Street\nToronto, ON",
                fontSize: 10,
                color: "#4b5563",
                margin: [0, 0, 0, 4],
              },
              {
                text: "www.ciprmt.com",
                fontSize: 10,
                color: "#15803d",
                bold: true,
              },
            ],
            width: "*",
          },
        ],
      },
    ],
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.getBuffer((buffer) => {
      resolve(buffer);
    });
  });
}

// Generate receipt PDF for gift card purchase
async function generateReceiptPDF(purchaseData) {
  const pdfMake = require("pdfmake/build/pdfmake");
  const pdfFonts = require("pdfmake/build/vfs_fonts");
  const fs = require("fs");
  const path = require("path");

  pdfMake.vfs = pdfFonts.pdfMake.vfs;

  const {
    code,
    recipient_name,
    duration,
    price,
    purchaser_first_name,
    purchaser_email,
    purchase_date,
    stripe_payment_intent_id,
  } = purchaseData;

  // Calculate base price and HST (13%)
  const basePrice = price / 1.13;
  const hst = price - basePrice;

  // Read and convert logos to base64
  const logoPath = path.join(process.cwd(), "public", "images", "icon.png");
  const logoBuffer = fs.readFileSync(logoPath);
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  const stripeLogoPath = path.join(
    process.cwd(),
    "public",
    "images",
    "stripe-logo.png",
  );
  const stripeLogoBuffer = fs.readFileSync(stripeLogoPath);
  const stripeLogoBase64 = `data:image/png;base64,${stripeLogoBuffer.toString(
    "base64",
  )}`;

  const docDefinition = {
    pageSize: "LETTER",
    pageMargins: [40, 60, 40, 40],
    content: [
      // Header with logo and business info
      {
        columns: [
          {
            image: logoBase64,
            width: 50,
            margin: [0, 0, 20, 0],
          },
          {
            stack: [
              {
                text: "Cip de Vries, RMT",
                fontSize: 18,
                bold: true,
                color: "#1f2937",
              },
              {
                text: "268 Shuter Street\nToronto, ON\nwww.ciprmt.com",
                fontSize: 10,
                color: "#4b5563",
                margin: [0, 4, 0, 0],
              },
            ],
            width: "*",
          },
        ],
        margin: [0, 0, 0, 30],
      },

      // Receipt title
      {
        text: "RECEIPT",
        fontSize: 24,
        bold: true,
        color: "#15803d",
        alignment: "center",
        margin: [0, 0, 0, 20],
      },

      // Purchase details
      {
        table: {
          widths: ["*", "auto"],
          body: [
            [
              {
                text: "Date:",
                bold: true,
                color: "#1f2937",
                border: [false, false, false, false],
              },
              {
                text: new Date(purchase_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                color: "#4b5563",
                border: [false, false, false, false],
              },
            ],
            [
              {
                text: "Receipt #:",
                bold: true,
                color: "#1f2937",
                border: [false, false, false, false],
              },
              {
                text: stripe_payment_intent_id,
                color: "#4b5563",
                border: [false, false, false, false],
              },
            ],
            [
              {
                text: "Customer:",
                bold: true,
                color: "#1f2937",
                border: [false, false, false, false],
              },
              {
                text: `${purchaser_first_name}\n${purchaser_email}`,
                color: "#4b5563",
                border: [false, false, false, false],
              },
            ],
          ],
        },
        margin: [0, 0, 0, 30],
      },

      // Items purchased
      {
        text: "Items Purchased",
        fontSize: 14,
        bold: true,
        color: "#1f2937",
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            [
              {
                text: `Gift Card - ${duration} Minute Massage`,
                fontSize: 12,
                color: "#1f2937",
                border: [false, false, false, true],
                borderColor: ["#e5e7eb", "#e5e7eb", "#e5e7eb", "#e5e7eb"],
              },
              {
                text: `$${basePrice.toFixed(2)}`,
                fontSize: 12,
                color: "#1f2937",
                alignment: "right",
                border: [false, false, false, true],
                borderColor: ["#e5e7eb", "#e5e7eb", "#e5e7eb", "#e5e7eb"],
              },
            ],
            [
              {
                text: recipient_name
                  ? `Recipient: ${recipient_name}`
                  : "Recipient: Not specified",
                fontSize: 10,
                color: "#6b7280",
                italics: true,
                border: [false, false, false, true],
                borderColor: ["#e5e7eb", "#e5e7eb", "#e5e7eb", "#e5e7eb"],
              },
              {
                text: "",
                border: [false, false, false, true],
                borderColor: ["#e5e7eb", "#e5e7eb", "#e5e7eb", "#e5e7eb"],
              },
            ],
            [
              {
                text: `Gift Card Code: ${code}`,
                fontSize: 10,
                color: "#15803d",
                bold: true,
                border: [false, false, false, true],
                borderColor: ["#e5e7eb", "#e5e7eb", "#e5e7eb", "#e5e7eb"],
              },
              {
                text: "",
                border: [false, false, false, true],
                borderColor: ["#e5e7eb", "#e5e7eb", "#e5e7eb", "#e5e7eb"],
              },
            ],
          ],
        },
        margin: [0, 0, 0, 20],
      },

      // Price breakdown
      {
        table: {
          widths: ["*", "auto"],
          body: [
            [
              {
                text: "Subtotal:",
                color: "#4b5563",
                border: [false, false, false, false],
              },
              {
                text: `$${basePrice.toFixed(2)}`,
                color: "#4b5563",
                alignment: "right",
                border: [false, false, false, false],
              },
            ],
            [
              {
                text: "HST (13%):",
                color: "#4b5563",
                border: [false, false, false, false],
              },
              {
                text: `$${hst.toFixed(2)}`,
                color: "#4b5563",
                alignment: "right",
                border: [false, false, false, false],
              },
            ],
            [
              {
                text: "Total:",
                bold: true,
                fontSize: 14,
                color: "#1f2937",
                border: [false, true, false, false],
                borderColor: ["#000000", "#000000", "#000000", "#000000"],
                margin: [0, 8, 0, 0],
              },
              {
                text: `$${price.toFixed(2)}`,
                bold: true,
                fontSize: 14,
                color: "#15803d",
                alignment: "right",
                border: [false, true, false, false],
                borderColor: ["#000000", "#000000", "#000000", "#000000"],
                margin: [0, 8, 0, 0],
              },
            ],
          ],
        },
        margin: [0, 0, 0, 30],
      },

      // Payment method
      {
        stack: [
          {
            text: "Payment Method",
            fontSize: 12,
            bold: true,
            color: "#1f2937",
            margin: [0, 0, 0, 8],
          },
          {
            columns: [
              {
                text: "Credit Card",
                fontSize: 10,
                color: "#4b5563",
              },
              {
                image: stripeLogoBase64,
                width: 50,
                alignment: "right",
              },
            ],
          },
        ],
        margin: [0, 0, 0, 30],
      },

      // Footer
      {
        text: "Thank you for your purchase!",
        fontSize: 12,
        color: "#15803d",
        bold: true,
        alignment: "center",
        margin: [0, 20, 0, 10],
      },
      {
        text: "The gift card PDF has been sent in a separate email.",
        fontSize: 10,
        color: "#6b7280",
        alignment: "center",
      },
    ],
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.getBuffer((buffer) => {
      resolve(buffer);
    });
  });
}

// Main server action to purchase gift card
export async function purchaseGiftCard(data) {
  try {
    const {
      email,
      purchaserFirstName,
      recipientName,
      message,
      duration,
      price,
      paymentMethodId,
    } = data;

    // Validate duration
    if (![60, 75, 90].includes(duration)) {
      return {
        success: false,
        message: "Invalid massage duration selected",
      };
    }

    // Generate unique gift card code
    let code;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      code = generateGiftCardCode();
      const { rows } = await sql`
        SELECT id FROM gift_cards WHERE code = ${code}
      `;
      if (rows.length === 0) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return {
        success: false,
        message: "Failed to generate unique gift card code. Please try again.",
      };
    }

    // Create Stripe payment intent
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100), // Convert to cents
      currency: "cad",
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      description: `Gift Card - ${duration} min massage`,
      receipt_email: email,
      metadata: {
        type: "gift_card",
        duration: duration.toString(),
        code: code,
      },
    });

    // Check if payment requires additional action (3D Secure)
    if (paymentIntent.status === "requires_action") {
      return {
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
      };
    }

    // Check if payment was successful
    if (paymentIntent.status !== "succeeded") {
      return {
        success: false,
        message: "Payment failed. Please try again.",
      };
    }

    // Insert gift card into database
    const { rows } = await sql`
      INSERT INTO gift_cards (
        code,
        purchaser_email,
        purchaser_first_name,
        recipient_name,
        message,
        duration,
        price,
        stripe_payment_intent_id
      ) VALUES (
        ${code},
        ${email},
        ${purchaserFirstName},
        ${recipientName},
        ${message},
        ${duration},
        ${price},
        ${paymentIntent.id}
      )
      RETURNING id, code, recipient_name, message, duration, purchaser_first_name, created_at
    `;

    if (rows.length === 0) {
      // Refund the payment if database insert fails
      const stripe = getStripe();
      await stripe.refunds.create({
        payment_intent: paymentIntent.id,
      });

      return {
        success: false,
        message: "Failed to create gift card. Payment has been refunded.",
      };
    }

    const giftCard = rows[0];

    const giftCardPdfBuffer = await generateGiftCardPDF(giftCard);
    const receiptPdfBuffer = await generateReceiptPDF({
      code: giftCard.code,
      recipient_name: giftCard.recipient_name,
      duration: giftCard.duration,
      price: price,
      purchaser_first_name: giftCard.purchaser_first_name,
      purchaser_email: email,
      purchase_date: giftCard.created_at,
      stripe_payment_intent_id: paymentIntent.id,
    });

    const transporter = getEmailTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Massage Gift Card & Receipt",
      text: `Thank you for your purchase! Your gift card code is: ${code}\n\nPlease find your gift card and receipt PDFs attached.\n\nTo redeem, visit ${BASE_URL}/signup to create an account and book your appointment.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #15803d; text-align: center;">Your Massage Gift Card</h1>
          <p>Thank you for your purchase!</p>
          <p>Your gift card code is: <strong style="font-size: 18px; color: #15803d;">${code}</strong></p>
          <p>Please find your gift card and receipt PDFs attached. You can print them or forward the gift card to the recipient.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">How to Redeem:</h3>
            <ol>
              <li>Visit <a href="${BASE_URL}/signup" style="color: #15803d;">ciprmt.com/signup</a> to create an account</li>
              <li>Once logged in, select "Book a Massage"</li>
              <li>Find a time that works for you</li>
              <li>Enter the gift card code at checkout</li>
            </ol>
          </div>
          <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
            If you have any questions, please contact us at cipdevries@ciprmt.com
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `gift-card-${code}.pdf`,
          content: giftCardPdfBuffer,
          contentType: "application/pdf",
        },
        {
          filename: `receipt-${code}.pdf`,
          content: receiptPdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    // Send notification to admin
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Gift Card Purchase",
      text: `A new gift card has been purchased:\n\nCode: ${code}\nDuration: ${duration} minutes\nPrice: $${price}\nPurchaser: ${email}\nRecipient: ${
        recipientName || "Not specified"
      }`,
      html: `
        <h2>New Gift Card Purchase</h2>
        <p>A new gift card has been purchased:</p>
        <ul>
          <li><strong>Code:</strong> ${code}</li>
          <li><strong>Duration:</strong> ${duration} minutes</li>
          <li><strong>Price:</strong> $${price}</li>
          <li><strong>Purchaser:</strong> ${email}</li>
          <li><strong>Recipient:</strong> ${
            recipientName || "Not specified"
          }</li>
        </ul>
      `,
    });

    return {
      success: true,
      message: "Gift card purchased successfully!",
      giftCardId: giftCard.id,
    };
  } catch (error) {
    console.error("Error purchasing gift card:", error);
    return {
      success: false,
      message:
        error.message || "An error occurred while processing your purchase",
    };
  }
}


