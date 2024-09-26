"use server";

import dbConnection from "./lib/database/dbconnection";
import { ObjectId } from "mongodb";
import { getDatabase } from "./lib/database/dbconnection";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { registerPatientSchema, loginSchema } from "./lib/zod/zodSchemas";
import client from "./lib/database/db";
import { z } from "zod";
import { healthHistorySchema } from "./lib/zod/zodSchemas";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// import {
//   addDays,
//   addMinutes,
//   addMonths,
//   differenceInMilliseconds,
//   differenceInMinutes,
//   format,
//   isBefore,
//   isAfter,
//   isEqual,
//   parseISO,
//   subMinutes,
// } from "date-fns";
// import { TZDate, tz } from "@date-fns/tz";

// Set up JWT
const secretKey = process.env.JWT_SECRET_KEY;
const key = new TextEncoder().encode(secretKey);

// Set up Google Calendar API
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
// const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PROJECT_NUMBER = process.env.GOOGLE_PROJECT_NUMBER;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

const jwtClient = new google.auth.JWT(
  GOOGLE_CLIENT_EMAIL,
  null,
  GOOGLE_PRIVATE_KEY,
  SCOPES
);

const calendar = google.calendar({
  version: "v3",
  auth: jwtClient,
});

// Helper function to serialize MongoDB documents
function serializeDocument(doc) {
  return JSON.parse(
    JSON.stringify(doc, (key, value) => {
      if (value instanceof ObjectId) {
        return value.toString();
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    })
  );
}

export async function encrypt(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("6d")
    .sign(key);
}

export async function decrypt(input) {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload;
}

export const getCurrentMember = async () => {
  const session = await getSession();
  if (session) {
    const _id = new ObjectId(session.resultObj._id);
    const db = await getDatabase();
    const currentUser = await db.collection("members").findOne({ _id });
    delete currentUser?.password;
    return serializeDocument(currentUser);
  }
  return null;
};

export async function registerNewPatient(prevState, formData) {
  const formDataObj = Object.fromEntries(formData.entries());
  formDataObj.email = formDataObj.email.toLowerCase().trim();
  formDataObj.firstName =
    formDataObj.firstName.charAt(0).toUpperCase() +
    formDataObj.firstName.slice(1);
  formDataObj.preferredName =
    formDataObj.preferredName.charAt(0).toUpperCase() +
    formDataObj.preferredName.slice(1);
  formDataObj.phone = formDataObj.phone.replace(/\D/g, "");

  const result = registerPatientSchema.safeParse(formDataObj);

  if (result.error) {
    const passwordError = result.error.issues.find(
      (issue) =>
        issue.path[0] === "password" &&
        issue.type === "string" &&
        issue.minimum === 6
    );

    const confirmPasswordError = result.error.issues.find(
      (issue) =>
        issue.path[0] === "confirmPassword" &&
        issue.type === "string" &&
        issue.minimum === 6
    );

    if (passwordError) {
      return { password: "^ Password must be at least 8 characters long" };
    }

    if (confirmPasswordError) {
      return {
        confirmPassword:
          "^ Passwords must be at least 8 characters long and match",
      };
    }

    const emailError = result.error.issues.find((issue) => {
      return (
        issue.path[0] === "email" &&
        issue.validation === "email" &&
        issue.code === "invalid_string"
      );
    });

    if (emailError) {
      return { email: "^ Please enter a valid email address" };
    }

    if (!result.success) {
      return {
        message:
          "Failed to register: make sure all required fields are completed and try again",
      };
    }
  }

  const {
    firstName,
    lastName,
    preferredName,
    phone,
    pronouns,
    email,
    password,
    confirmPassword,
  } = result.data;

  if (password !== confirmPassword) {
    return { confirmPassword: "^ Passwords do not match" };
  }

  try {
    const db = await getDatabase();
    const patientExists = await db
      .collection("users")
      .findOne({ email: email });

    if (patientExists) {
      return { email: "^ This email is already registered" };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newPatient = {
      firstName,
      lastName,
      preferredName,
      pronouns,
      email,
      phone,
      userType: "patient",
      password: hashedPassword,
      createdAt: new Date(),
    };

    await db.collection("users").insertOne(newPatient);

    let resultObj = { ...newPatient };
    delete resultObj.password;

    const expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    const session = await encrypt({ resultObj, expires });

    cookies().set("session", session, {
      expires,
      httpOnly: true,
      secure: true,
    });
  } catch (error) {
    console.log(error);
    return {
      message:
        "Failed to register: make sure all required fields are completed and try again",
    };
  }
  revalidatePath("/");
  redirect("/");
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

  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const result = await db.collection("users").findOne({ email: user.email });

  if (!result) {
    return { message: "Invalid credentials" };
  }
  const passwordsMatch = await bcrypt.compare(user.password, result.password);
  if (!passwordsMatch) {
    return { message: "Invalid credentials" };
  }

  let resultObj = { ...result };
  delete resultObj.password;

  const expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ resultObj, expires });

  cookies().set("session", session, { expires, httpOnly: true, secure: true });

  revalidatePath("/");
  redirect("/");
}

export async function logout() {
  cookies().set("session", "", { expires: new Date(0) });
  revalidatePath("/");
  redirect("/");
}

export async function getSession() {
  const session = cookies().get("session")?.value;
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
    secure: true,
  });
  return res;
}

export const getJwtSecretKey = () => {
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
      new TextEncoder().encode(getJwtSecretKey())
    );
    return verified.payload;
  } catch (error) {
    throw new Error("Invalid token");
  }
};

export async function submitScheduleSetup(prevState, formData) {
  console.log(formData);
  return;
}

export async function getAllTreatments() {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const treatments = await db.collection("treatments").find({}).toArray();
  return serializeDocument(treatments);
}

export async function getTreatmentById(id) {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const treatment = await db
    .collection("treatments")
    .findOne({ _id: new ObjectId(id) });
  return serializeDocument(treatment);
}

export async function getAllUsers() {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const users = await db.collection("users").find({}).toArray();
  return serializeDocument(users);
}

export async function getAllSurveys() {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const surveys = await db.collection("surveys").find({}).toArray();
  return serializeDocument(surveys);
}

export async function getReceipts(id) {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const receipts = await db
    .collection("appointments")
    .find({ userId: id })
    .toArray();
  return serializeDocument(receipts);
}

export async function getReceiptById(id) {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const receipt = await db
    .collection("appointments")
    .findOne({ _id: new ObjectId(id) });
  return serializeDocument(receipt);
}

export async function RMTSetup({
  address,
  contactInfo,
  workplaceType,
  massageServices,
  workDays,
}) {
  const session = await getSession();
  if (session.resultObj.userType !== "rmt") {
    return {
      message: "You must be logged in as a RMT to create a new set up.",
    };
  }

  const { locationName, streetAddress, city, province, country, postalCode } =
    address;
  const { phone, email } = contactInfo;

  const trimAndCapitalize = (str) =>
    typeof str === "string" ? str.trim().toUpperCase() : "";
  const capitalize = (str) =>
    typeof str === "string"
      ? str.trim().replace(/\b\w/g, (char) => char.toUpperCase())
      : "";
  const formatPhoneNumber = (phone) => {
    const cleaned =
      typeof phone === "string" ? phone.trim().replace(/\D/g, "") : "";
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return phone;
  };

  const formattedPhone = formatPhoneNumber(phone);
  const formattedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  const formattedFormData = {
    address: {
      locationName: capitalize(locationName),
      streetAddress:
        typeof streetAddress === "string" ? streetAddress.trim() : "",
      city: capitalize(city),
      province: capitalize(province),
      country: capitalize(country),
      postalCode: trimAndCapitalize(postalCode),
    },
    contactInfo: {
      phone: formattedPhone,
      email: formattedEmail,
    },
    workDays,
    workplaceType,
    massageServices,
  };

  const { _id } = session.resultObj;
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);

  const setup = {
    userId: _id,
    formattedFormData,
  };

  try {
    const result = await db.collection("rmtLocations").insertOne(setup);
    if (result.acknowledged) {
      console.log("Document inserted with _id:", result.insertedId);

      const appointments = [];
      const today = new Date();
      const daysOfWeek = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      for (const workDay of workDays) {
        const dayIndex = daysOfWeek.indexOf(workDay.day);
        for (let i = 0; i < 8; i++) {
          const appointmentDate = new Date(today);
          const daysUntilNextWorkday = (dayIndex - today.getDay() + 7) % 7;
          appointmentDate.setDate(
            today.getDate() + daysUntilNextWorkday + i * 7
          );
          for (const timeSlot of workDay.appointmentTimes) {
            const expiryDate = new Date(appointmentDate);
            expiryDate.setDate(expiryDate.getDate() + 7);

            appointments.push({
              RMTLocationId: result.insertedId,
              appointmentDate: appointmentDate.toISOString().split("T")[0],
              appointmentStartTime: timeSlot.start,
              appointmentEndTime: timeSlot.end,
              status: "available",
              expiryDate: expiryDate,
            });
          }
        }
      }

      const appointmentResult = await db
        .collection("appointments")
        .insertMany(appointments);
      if (appointmentResult.acknowledged) {
        console.log("Appointments inserted:", appointmentResult.insertedCount);

        await db.collection("appointments").createIndex(
          { expiryDate: 1 },
          {
            expireAfterSeconds: 0,
            partialFilterExpression: { status: "available" },
          }
        );
      } else {
        console.error("Failed to insert appointments.");
      }
    } else {
      console.error("Failed to insert the document.");
    }
  } catch (error) {
    console.error("An error occurred while inserting the document:", error);
  }

  return;
}

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
//   const dbClient = await dbConnection;
//   const db = await dbClient.db(process.env.DB_NAME);

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

export const getRMTSetup = async () => {
  const session = await getSession();

  const { rmtId } = session.resultObj;
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);

  const setupArray = await db
    .collection("rmtLocations")
    .find({ userId: rmtId })
    .toArray();

  return serializeDocument(setupArray);
};

export async function getUsersAppointments(id) {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const appointments = await db
    .collection("appointments")
    .find({ userId: id })
    .toArray();
  return serializeDocument(appointments);
}

//////////////////////////////////////////////////////////////////
///////////////////FROM COPILOT///////////////////////////////////
//////////////////////////////////////////////////////////////////

export const getAvailableAppointments = async (rmtLocationId, duration) => {
  const db = await getDatabase();
  const appointmentsCollection = db.collection("appointments");

  // Convert duration to an integer
  const durationMinutes = parseInt(duration, 10);

  // Fetch appointments with the given rmtLocationId and status 'available'
  const appointments = await appointmentsCollection
    .find({
      RMTLocationId: new ObjectId(rmtLocationId),
      status: "available",
    })
    .toArray();

  const availableTimes = [];

  appointments.forEach((appointment) => {
    const startTime = new Date(
      `${appointment.appointmentDate}T${appointment.appointmentStartTime}`
    );
    const endTime = new Date(
      `${appointment.appointmentDate}T${appointment.appointmentEndTime}`
    );

    let currentTime = new Date(startTime);

    while (currentTime <= endTime) {
      const nextTime = new Date(currentTime);
      nextTime.setMinutes(currentTime.getMinutes() + durationMinutes);

      if (nextTime <= endTime) {
        availableTimes.push({
          date: appointment.appointmentDate,
          startTime: currentTime.toTimeString().slice(0, 5), // Format as HH:MM
          endTime: nextTime.toTimeString().slice(0, 5), // Format as HH:MM
        });
      }

      currentTime.setMinutes(currentTime.getMinutes() + 30); // Increment by 30 minutes
    }
  });

  console.log("Available times:", availableTimes);

  // Fetch busy times from Google Calendar
  const now = new Date();
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(now.getMonth() + 3);

  const busyTimes = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: oneMonthLater.toISOString(),
      items: [{ id: GOOGLE_CALENDAR_ID }],
    },
  });

  const busyPeriods = busyTimes.data.calendars[GOOGLE_CALENDAR_ID].busy;

  // Convert busy times from UTC to local timezone and format them
  const localBusyPeriods = busyPeriods.map((period) => {
    const start = new Date(period.start);
    const end = new Date(period.end);

    // Add 30-minute buffer before and after the busy period
    start.setMinutes(start.getMinutes() - 30);
    end.setMinutes(end.getMinutes() + 30);

    return {
      date: start.toISOString().split("T")[0], // Extract date in YYYY-MM-DD format
      startTime: start.toTimeString().slice(0, 5), // Format as HH:MM
      endTime: end.toTimeString().slice(0, 5), // Format as HH:MM
    };
  });

  console.log("Busy times (local with buffer):", localBusyPeriods);

  // Filter out conflicting times
  const filteredAvailableTimes = availableTimes.filter((available) => {
    return !localBusyPeriods.some((busy) => {
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

  console.log("Filtered available times:", filteredAvailableTimes);

  // Filter out dates that are not greater than today
  const today = new Date().toISOString().split("T")[0];
  const futureAvailableTimes = filteredAvailableTimes.filter(
    (available) => available.date > today
  );

  console.log("Future available times:", futureAvailableTimes);

  // Sort the results by date
  const sortedAvailableTimes = futureAvailableTimes.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  console.log("Sorted available times:", sortedAvailableTimes);

  return sortedAvailableTimes;
};

// export async function getAvailableAppointments(
//   rmtLocationId,
//   duration,
//   timezone = process.env.NEXT_PUBLIC_TIMEZONE
// ) {
//   console.log(
//     `getAvailableAppointments called with rmtLocationId: ${rmtLocationId}, duration: ${duration}, timezone: ${timezone}`
//   );

//   const dbClient = await dbConnection;
//   const db = await dbClient.db(process.env.DB_NAME);

//   try {
//     const objectId = new ObjectId(rmtLocationId);
//     const tomorrow = new UTCDate(new Date());
//     tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
//     tomorrow.setUTCHours(0, 0, 0, 0);
//     const tomorrowString = format(tomorrow, "yyyy-MM-dd", {
//       timeZone: timezone,
//     });

//     // Calculate end date (4 months from tomorrow)
//     const endDate = addMonths(tomorrow, 4);
//     const endDateString = format(endDate, "yyyy-MM-dd", { timeZone: timezone });

//     console.log(
//       `Fetching appointments for RMTLocationId: ${rmtLocationId}, duration: ${duration}, date range: ${tomorrowString} to ${endDateString}`
//     );

//     const appointments = await db
//       .collection("appointments")
//       .find({
//         RMTLocationId: objectId,
//         status: "available",
//         appointmentDate: { $gte: tomorrowString, $lte: endDateString },
//       })
//       .sort({ appointmentDate: 1, appointmentStartTime: 1 })
//       .toArray();

//     console.log(`Found ${appointments.length} available appointments`);

//     // Fetch busy times from Google Calendar
//     const busyTimes = await getBusyTimes(
//       tomorrowString,
//       endDateString,
//       timezone
//     );

//     const formattedAppointments = appointments
//       .map((appointment) => {
//         const availableTimes = generateAvailableStartTimes(
//           appointment,
//           parseInt(duration),
//           busyTimes,
//           timezone
//         );
//         return {
//           date: appointment.appointmentDate,
//           times: availableTimes,
//         };
//       })
//       .filter((appointment) => appointment.times.length > 0);

//     console.log("Formatted appointments:", formattedAppointments);

//     return formattedAppointments;
//   } catch (error) {
//     console.error("Error fetching appointments:", error);
//     throw error;
//   }
// }

// export async function getAvailableAppointments(
//   rmtLocationId,
//   duration,
//   timezone = process.env.NEXT_PUBLIC_TIMEZONE
// ) {
//   console.log(
//     `getAvailableAppointments called with rmtLocationId: ${rmtLocationId}, duration: ${duration}, timezone: ${timezone}`
//   );

//   const db = await getDatabase();

//   try {
//     const objectId = new ObjectId(rmtLocationId);
//     const tomorrow = new TZDate(new Date(), timezone);
//     tomorrow.setDate(tomorrow.getDate() + 1);
//     tomorrow.setHours(0, 0, 0, 0);
//     const tomorrowString = format(tomorrow, "yyyy-MM-dd");

//     // Calculate end date (4 months from tomorrow)
//     const endDate = addMonths(tomorrow, 3);
//     const endDateString = format(endDate, "yyyy-MM-dd");

//     console.log(
//       `Fetching appointments for RMTLocationId: ${rmtLocationId}, duration: ${duration}, date range: ${tomorrowString} to ${endDateString}`
//     );

//     const appointments = await db
//       .collection("appointments")
//       .find({
//         RMTLocationId: objectId,
//         status: "available",
//         appointmentDate: { $gte: tomorrowString, $lte: endDateString },
//       })
//       .sort({ appointmentDate: 1, appointmentStartTime: 1 })
//       .toArray();

//     console.log(`Found ${appointments.length} available appointments`);

//     // Fetch busy times from Google Calendar
//     const busyTimes = await getBusyTimes(
//       tomorrowString,
//       endDateString,
//       timezone
//     );

//     const formattedAppointments = await Promise.all(
//       appointments.map(async (appointment) => {
//         const availableTimes = await generateAvailableStartTimes(
//           appointment,
//           parseInt(duration),
//           busyTimes,
//           timezone
//         );
//         return {
//           date: appointment.appointmentDate,
//           times: availableTimes,
//         };
//       })
//     );

//     const filteredAppointments = formattedAppointments.filter(
//       (appointment) => appointment.times.length > 0
//     );

//     console.log("Formatted appointments:", filteredAppointments);

//     return filteredAppointments;
//   } catch (error) {
//     console.error("Error fetching appointments:", error);
//     throw error;
//   }
// }

// async function getBusyTimes(startDate, endDate, timezone) {
//   try {
//     console.log(
//       `Fetching busy times from ${startDate} to ${endDate} in timezone ${timezone}`
//     );

//     const response = await calendar.freebusy.query({
//       requestBody: {
//         timeMin: new TZDate(startDate, timezone).toISOString(),
//         timeMax: new TZDate(endDate, timezone).toISOString(),
//         timeZone: timezone,
//         items: [{ id: GOOGLE_CALENDAR_ID }],
//       },
//     });

//     console.log(
//       "Raw response from Google Calendar:",
//       JSON.stringify(response.data, null, 2)
//     );

//     const busyTimes = response.data.calendars[GOOGLE_CALENDAR_ID].busy.map(
//       (busy) => ({
//         start: new TZDate(busy.start, timezone),
//         end: new TZDate(busy.end, timezone),
//       })
//     );

//     console.log(
//       "Parsed busy times:",
//       busyTimes.map((bt) => ({
//         start: bt.start.toISOString(),
//         end: bt.end.toISOString(),
//       }))
//     );

//     return busyTimes;
//   } catch (error) {
//     console.error("Error fetching busy times from Google Calendar:", error);
//     return [];
//   }
// }

// async function generateAvailableStartTimes(
//   appointment,
//   duration,
//   busyTimes,
//   timezone
// ) {
//   console.log(
//     `Generating available start times for ${appointment.appointmentDate} with timezone ${timezone} and duration ${duration}`
//   );

//   const availableTimes = [];
//   const now = new TZDate(new Date(), timezone);
//   const startTime = new TZDate(
//     `${appointment.appointmentDate}T${appointment.appointmentStartTime}`,
//     timezone
//   );
//   const endTime = new TZDate(
//     `${appointment.appointmentDate}T${appointment.appointmentEndTime}`,
//     timezone
//   );
//   const durationMinutes = parseInt(duration);
//   const bufferMinutes = 30; // 30 minutes buffer

//   console.log(
//     `Appointment start time: ${startTime.toISOString()}, end time: ${endTime.toISOString()}`
//   );
//   console.log(
//     `Busy times:`,
//     busyTimes.map((bt) => `${bt.start.toISOString()} - ${bt.end.toISOString()}`)
//   );

//   let currentTime = startTime;

//   while (addMinutes(currentTime, durationMinutes) <= endTime) {
//     const potentialEndTime = addMinutes(currentTime, durationMinutes);
//     console.log(
//       `Checking time slot: ${currentTime.toISOString()} - ${potentialEndTime.toISOString()}`
//     );

//     if (isAfter(currentTime, now)) {
//       const isConflicting = busyTimes.some((busy) => {
//         const busyStart = new TZDate(busy.start, timezone);
//         const busyEnd = new TZDate(busy.end, timezone);
//         const conflict =
//           (isBefore(currentTime, addMinutes(busyEnd, bufferMinutes)) &&
//             isAfter(potentialEndTime, addMinutes(busyStart, -bufferMinutes))) ||
//           isEqual(currentTime, addMinutes(busyStart, -bufferMinutes)) ||
//           isEqual(potentialEndTime, addMinutes(busyEnd, bufferMinutes));
//         if (conflict) {
//           console.log(
//             `Conflict found with busy time: ${busyStart.toISOString()} - ${busyEnd.toISOString()}`
//           );
//         }
//         return conflict;
//       });

//       if (!isConflicting) {
//         const previousBusyTime = getPreviousBusyTime(currentTime, busyTimes);
//         const nextBusyTime = getNextBusyTime(potentialEndTime, busyTimes);

//         const hasSufficientBufferBefore =
//           !previousBusyTime ||
//           differenceInMinutes(currentTime, previousBusyTime) >= bufferMinutes;
//         const hasSufficientBufferAfter =
//           !nextBusyTime ||
//           differenceInMinutes(nextBusyTime, potentialEndTime) >= bufferMinutes;

//         if (hasSufficientBufferBefore && hasSufficientBufferAfter) {
//           console.log(
//             `Available time slot found: ${format(currentTime, "HH:mm")}`
//           );
//           availableTimes.push(format(currentTime, "HH:mm"));
//         } else {
//           console.log(
//             `Insufficient buffer for time slot: ${format(currentTime, "HH:mm")}`
//           );
//         }
//       } else {
//         console.log(`Conflicting time slot: ${format(currentTime, "HH:mm")}`);
//       }
//     } else {
//       console.log(`Time slot in the past: ${format(currentTime, "HH:mm")}`);
//     }

//     currentTime = addMinutes(currentTime, 30); // Move to the next 30-minute slot
//   }

//   console.log(
//     `Generated available times for ${appointment.appointmentDate}:`,
//     availableTimes
//   );
//   return availableTimes;
// }

// function getPreviousBusyTime(currentTime, busyTimes) {
//   return busyTimes
//     .filter((busy) => isBefore(busy.end, currentTime))
//     .reduce(
//       (latest, busy) => (isAfter(busy.end, latest) ? busy.end : latest),
//       null
//     );
// }

// function getNextBusyTime(currentTime, busyTimes) {
//   return busyTimes
//     .filter((busy) => isAfter(busy.start, currentTime))
//     .reduce(
//       (earliest, busy) =>
//         isBefore(busy.start, earliest) ? busy.start : earliest,
//       null
//     );
// }

// async function getBusyTimes(startDate, endDate, timezone) {
//   const MAX_DAYS = 60;
//   const allBusyTimes = [];

//   try {
//     const utcStartDate = parseISO(startDate);
//     const utcEndDate = parseISO(endDate);
//     let currentStartDate = utcStartDate;

//     while (currentStartDate < utcEndDate) {
//       const chunkEndDate = addDays(currentStartDate, MAX_DAYS);
//       const actualEndDate =
//         chunkEndDate > utcEndDate ? utcEndDate : chunkEndDate;

//       console.log(
//         `Fetching busy times from ${format(
//           currentStartDate,
//           "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
//           { timeZone: timezone }
//         )} to ${format(actualEndDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", {
//           timeZone: timezone,
//         })}`
//       );

//       const response = await calendar.freebusy.query({
//         requestBody: {
//           timeMin: format(currentStartDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", {
//             timeZone: timezone,
//           }),
//           timeMax: format(actualEndDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", {
//             timeZone: timezone,
//           }),
//           timeZone: timezone,
//           items: [{ id: GOOGLE_CALENDAR_ID }],
//         },
//       });

//       console.log(
//         "Raw response from Google Calendar:",
//         JSON.stringify(response.data, null, 2)
//       );

//       const busyTimes = response.data.calendars[GOOGLE_CALENDAR_ID].busy.map(
//         (busy) => ({
//           start: parseISO(busy.start),
//           end: parseISO(busy.end),
//         })
//       );

//       console.log(
//         "Parsed busy times:",
//         busyTimes.map((bt) => ({
//           start: format(bt.start, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", {
//             timeZone: timezone,
//           }),
//           end: format(bt.end, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", {
//             timeZone: timezone,
//           }),
//         }))
//       );

//       allBusyTimes.push(...busyTimes);

//       currentStartDate = addDays(actualEndDate, 1);
//     }

//     return allBusyTimes;
//   } catch (error) {
//     console.error("Error fetching busy times from Google Calendar:", error);
//     return [];
//   }
// }

// function generateAvailableStartTimes(
//   appointment,
//   duration,
//   busyTimes,
//   timezone
// ) {
//   console.log(
//     `Generating available start times for ${appointment.appointmentDate} with timezone ${timezone}`
//   );

//   const availableTimes = [];
//   const now = new Date();
//   const startTime = parseISO(
//     `${appointment.appointmentDate}T${appointment.appointmentStartTime}`
//   );
//   const endTime = parseISO(
//     `${appointment.appointmentDate}T${appointment.appointmentEndTime}`
//   );
//   const durationMs = duration * 60 * 1000;
//   const bufferMs = 30 * 60 * 1000; // 30 minutes buffer

//   let currentTime = startTime;

//   while (
//     differenceInMilliseconds(endTime, currentTime) >=
//     durationMs + bufferMs
//   ) {
//     if (isAfter(currentTime, now)) {
//       const potentialEndTime = addMinutes(currentTime, duration);

//       const isConflicting = busyTimes.some((busy) => {
//         return (
//           (isBefore(currentTime, addMinutes(busy.end, 30)) &&
//             isAfter(potentialEndTime, subMinutes(busy.start, 30))) ||
//           isEqual(currentTime, subMinutes(busy.start, 30)) ||
//           isEqual(potentialEndTime, addMinutes(busy.end, 30))
//         );
//       });

//       if (!isConflicting) {
//         const previousBusyTime = getPreviousBusyTime(currentTime, busyTimes);
//         const nextBusyTime = getNextBusyTime(potentialEndTime, busyTimes);

//         const hasSufficientBufferBefore =
//           !previousBusyTime ||
//           differenceInMilliseconds(currentTime, previousBusyTime) >= bufferMs;
//         const hasSufficientBufferAfter =
//           !nextBusyTime ||
//           differenceInMilliseconds(nextBusyTime, potentialEndTime) >= bufferMs;

//         if (hasSufficientBufferBefore && hasSufficientBufferAfter) {
//           availableTimes.push(
//             format(currentTime, "HH:mm", { timeZone: timezone })
//           );
//         }
//       }
//     }
//     currentTime = addMinutes(currentTime, 30);
//   }

//   console.log(
//     `Generated available times for ${appointment.appointmentDate}:`,
//     availableTimes
//   );
//   return availableTimes;
// }

// function getPreviousBusyTime(currentTime, busyTimes) {
//   return busyTimes
//     .filter((busy) => isBefore(busy.end, currentTime))
//     .reduce(
//       (latest, busy) => (isAfter(busy.end, latest) ? busy.end : latest),
//       null
//     );
// }

// function getNextBusyTime(currentTime, busyTimes) {
//   return busyTimes
//     .filter((busy) => isAfter(busy.start, currentTime))
//     .reduce(
//       (earliest, busy) =>
//         isBefore(busy.start, earliest) ? busy.start : earliest,
//       null
//     );
// }

export async function bookAppointment({
  location,
  duration,
  appointmentTime,
  workplace,
  appointmentDate,
  RMTLocationId,
}) {
  const session = await getSession();
  if (!session) {
    return {
      message: "You must be logged in to book an appointment.",
    };
  }

  const { _id, firstName, lastName, email } = session.resultObj;

  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);

  function addDurationToTime(appointmentTime, duration) {
    const [hours, minutes] = appointmentTime.split(":").map(Number);
    const durationInMinutes = Number(duration);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + durationInMinutes);
    const updatedHours = String(date.getHours()).padStart(2, "0");
    const updatedMinutes = String(date.getMinutes()).padStart(2, "0");
    return `${updatedHours}:${updatedMinutes}`;
  }

  const formattedEndTime = addDurationToTime(appointmentTime, duration);

  try {
    const query = {
      RMTLocationId: new ObjectId(RMTLocationId),
      appointmentDate: appointmentDate,
      appointmentStartTime: { $lte: appointmentTime },
      appointmentEndTime: { $gte: formattedEndTime },
    };

    // Create Google Calendar event first
    const event = {
      summary: `[Pending Confirmation] Massage Appointment for ${firstName} ${lastName}`,
      location: location,
      description: `${duration} minute massage at ${workplace}\n\nStatus: Pending Confirmation\nClient Email: ${email}\n\nPlease confirm this appointment.`,
      start: {
        dateTime: `${appointmentDate}T${appointmentTime}:00`,
        timeZone: "America/Toronto",
      },
      end: {
        dateTime: `${appointmentDate}T${formattedEndTime}:00`,
        timeZone: "America/Toronto",
      },
      colorId: "2", // Sage color
    };

    let createdEvent;
    try {
      createdEvent = await calendar.events.insert({
        calendarId: GOOGLE_CALENDAR_ID,
        resource: event,
      });
      console.log("Event created: %s", createdEvent.data.htmlLink);
    } catch (error) {
      console.error("Error creating Google Calendar event:", error);
      return {
        message: "An error occurred while creating the Google Calendar event.",
      };
    }

    const update = {
      $set: {
        status: "booked",
        location: location,
        appointmentBeginsAt: appointmentTime,
        appointmentEndsAt: formattedEndTime,
        userId: _id,
        duration: duration,
        workplace: workplace,
        googleCalendarEventId: createdEvent.data.id,
        googleCalendarEventLink: createdEvent.data.htmlLink,
      },
    };

    const result = await db.collection("appointments").updateOne(query, update);

    if (result.matchedCount > 0) {
      console.log("Appointment updated successfully.");
    } else {
      console.log("No matching appointment found.");
      // If no matching appointment, delete the created Google Calendar event
      try {
        await calendar.events.delete({
          calendarId: GOOGLE_CALENDAR_ID,
          eventId: createdEvent.data.id,
        });
        console.log(
          "Google Calendar event deleted due to no matching appointment."
        );
      } catch (deleteError) {
        console.error("Error deleting Google Calendar event:", deleteError);
      }
      return {
        message: "No matching appointment found.",
      };
    }
  } catch (error) {
    console.error("An error occurred while updating the appointment:", error);
    return {
      message: "An error occurred while booking the appointment.",
    };
  }

  revalidatePath("/dashboard/patient");
  redirect("/dashboard/patient");
}

export const cancelAppointment = async (prevState, formData) => {
  const session = await getSession();
  if (!session) {
    return {
      message: "You must be logged in to cancel an appointment.",
      status: "error",
    };
  }

  const { _id } = session.resultObj;

  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);

  try {
    const query = {
      _id: new ObjectId(formData.get("id")),
      userId: _id,
    };

    // First, fetch the appointment to get the Google Calendar event ID
    const appointment = await db.collection("appointments").findOne(query);

    if (!appointment) {
      console.log("No matching appointment found.");
      return {
        message: "No matching appointment found.",
        status: "error",
      };
    }

    // If there's a Google Calendar event ID, delete the event
    if (appointment.googleCalendarEventId) {
      try {
        await calendar.events.delete({
          calendarId: GOOGLE_CALENDAR_ID,
          eventId: appointment.googleCalendarEventId,
        });
        console.log("Google Calendar event deleted successfully.");
      } catch (calendarError) {
        console.error("Error deleting Google Calendar event:", calendarError);
        // We'll continue with the cancellation even if the Calendar deletion fails
      }
    }

    const update = {
      $set: {
        status: "available",
        userId: null,
        duration: null,
        workplace: null,
        consentForm: null,
        consentFormSubmittedAt: null,
        googleCalendarEventId: null,
        googleCalendarEventLink: null,
      },
    };

    const result = await db.collection("appointments").updateOne(query, update);

    if (result.matchedCount > 0) {
      console.log("Appointment cancelled successfully.");
      revalidatePath("/dashboard/patient");
      return {
        status: "success",
        message: "Appointment cancelled successfully.",
      };
    } else {
      console.log("No matching appointment found.");
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

export async function getAppointmentById(id) {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);

  try {
    const appointment = await db.collection("appointments").findOne({
      _id: new ObjectId(id),
    });

    if (!appointment) {
      return null;
    }

    return serializeDocument(appointment);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    throw new Error("Failed to fetch appointment");
  }
}

export async function submitConsentForm(data) {
  try {
    const db = await getDatabase();
    const appointments = db.collection("appointments");

    const { id, ...consentData } = data;

    const result = await appointments.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          consentForm: consentData,
          consentFormSubmittedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 1) {
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
  } finally {
    await client.close();
  }
}

export async function setAppointmentStatus(appointmentId, status) {
  const db = await getDatabase();

  try {
    const appointment = await db
      .collection("appointments")
      .findOne({ _id: new ObjectId(appointmentId) });

    if (!appointment) {
      throw new Error(`Appointment not found with id: ${appointmentId}`);
    }

    if (appointment.status === status) {
      return serializeDocument({
        success: true,
        message: `Appointment is already in ${status} status`,
      });
    }

    const result = await db
      .collection("appointments")
      .updateOne(
        { _id: new ObjectId(appointmentId) },
        { $set: { status: status } }
      );

    if (result.modifiedCount === 1) {
      return serializeDocument({
        success: true,
        message: `Appointment status updated to ${status}`,
      });
    } else {
      throw new Error("Failed to update appointment status");
    }
  } catch (error) {
    console.error("Error updating appointment status:", error);
    throw error;
  }
}

export async function getAllAvailableAppointments(
  rmtLocationId,
  duration,
  currentAppointmentGoogleId
) {
  console.log(
    `getAllAvailableAppointments called with rmtLocationId: ${rmtLocationId}, duration: ${duration}, currentAppointmentGoogleId: ${currentAppointmentGoogleId}`
  );

  if (!currentAppointmentGoogleId) {
    console.warn(
      "currentAppointmentGoogleId is null or undefined. This may affect the ability to exclude the current appointment from busy times."
    );
  }

  const db = await getDatabase();

  try {
    const objectId = new ObjectId(rmtLocationId);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowString = tomorrow.toISOString().split("T")[0];

    const endDate = new Date(tomorrow);
    endDate.setMonth(endDate.getMonth() + 3);
    const endDateString = endDate.toISOString().split("T")[0];

    console.log(
      `Fetching appointments for RMTLocationId: ${rmtLocationId}, duration: ${duration}, date range: ${tomorrowString} to ${endDateString}`
    );

    let currentAppointment = null;
    const appointments = await db
      .collection("appointments")
      .find({
        RMTLocationId: objectId,
        appointmentDate: { $gte: tomorrowString, $lte: endDateString },
      })
      .sort({ appointmentDate: 1, appointmentStartTime: 1 })
      .toArray();

    if (currentAppointmentGoogleId) {
      currentAppointment = appointments.find(
        (apt) =>
          apt.googleCalendarEventId === currentAppointmentGoogleId ||
          apt.googleCalendarEventLink === currentAppointmentGoogleId
      );
      if (currentAppointment) {
        console.log("Current appointment found:", currentAppointment);
      } else {
        console.log("Current appointment not found in the database");
      }
    }

    console.log(`Found ${appointments.length} potential appointments`);

    const busyTimes = await getBusyTimesExcludingCurrent(
      tomorrowString,
      endDateString,
      currentAppointmentGoogleId
    );

    const groupedAppointments = appointments.reduce((acc, appointment) => {
      const date = appointment.appointmentDate;
      if (!acc[date]) {
        acc[date] = [];
      }

      const availableTimes = generateAvailableStartTimesForRescheduling(
        appointment,
        parseInt(duration),
        busyTimes,
        currentAppointment
      );
      acc[date].push(...availableTimes);
      return acc;
    }, {});

    const result = Object.entries(groupedAppointments).map(([date, times]) => ({
      date,
      times: times.sort(),
    }));

    return serializeDocument(result);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    throw error;
  }
}

//helper function to get busy times from Google Calendar excluding current appointment
async function getBusyTimesExcludingCurrent(
  startDate,
  endDate,
  currentAppointmentGoogleId
) {
  const MAX_DAYS = 60;
  const allBusyTimes = [];
  let currentStartDate = new Date(startDate);
  const finalEndDate = new Date(endDate);

  while (currentStartDate < finalEndDate) {
    let currentEndDate = new Date(currentStartDate);
    currentEndDate.setDate(currentEndDate.getDate() + MAX_DAYS);

    if (currentEndDate > finalEndDate) {
      currentEndDate = finalEndDate;
    }

    try {
      const response = await calendar.freebusy.query({
        resource: {
          timeMin: currentStartDate.toISOString(),
          timeMax: currentEndDate.toISOString(),
          items: [{ id: GOOGLE_CALENDAR_ID }],
        },
      });

      const busyTimes = response.data.calendars[GOOGLE_CALENDAR_ID].busy;

      const filteredBusyTimes = busyTimes.filter((busyTime) => {
        if (!currentAppointmentGoogleId) return true;
        return !busyTime.id || busyTime.id !== currentAppointmentGoogleId;
      });

      allBusyTimes.push(...filteredBusyTimes);
    } catch (error) {
      console.error("Error fetching busy times from Google Calendar:", error);
    }

    currentStartDate = new Date(currentEndDate);
    currentStartDate.setDate(currentStartDate.getDate() + 1);
  }

  return allBusyTimes;
}

//helper function to generate available start times for rescheduling
function generateAvailableStartTimesForRescheduling(
  appointment,
  duration,
  busyTimes,
  currentAppointment
) {
  const availableTimes = [];
  const now = new Date();
  const isCurrentAppointment =
    currentAppointment &&
    appointment.appointmentDate === currentAppointment.appointmentDate &&
    appointment.appointmentStartTime ===
      currentAppointment.appointmentStartTime;

  const startTime = new Date(
    `${appointment.appointmentDate}T${appointment.appointmentStartTime}`
  );
  const endTime = new Date(
    `${appointment.appointmentDate}T${appointment.appointmentEndTime}`
  );
  const durationMs = duration * 60 * 1000;
  const bufferMs = 30 * 60 * 1000;

  let currentTime = startTime;

  while (currentTime.getTime() + durationMs <= endTime.getTime()) {
    if (currentTime > now) {
      const potentialEndTime = new Date(currentTime.getTime() + durationMs);
      if (
        isCurrentAppointment ||
        !isConflictingWithBusyTimesForRescheduling(
          currentTime,
          potentialEndTime,
          busyTimes,
          bufferMs,
          currentAppointment
        )
      ) {
        availableTimes.push(currentTime.toTimeString().substr(0, 5));
      }
    }
    currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
  }

  return availableTimes;
}

//helper function to check if appointment time is conflicting with busy times for rescheduling
function isConflictingWithBusyTimesForRescheduling(
  start,
  end,
  busyTimes,
  bufferMs,
  currentAppointment
) {
  const startWithBuffer = new Date(start.getTime() - bufferMs);
  const endWithBuffer = new Date(end.getTime() + bufferMs);

  if (
    currentAppointment &&
    start >=
      new Date(
        `${currentAppointment.appointmentDate}T${currentAppointment.appointmentStartTime}`
      ) &&
    end <=
      new Date(
        `${currentAppointment.appointmentDate}T${currentAppointment.appointmentEndTime}`
      )
  ) {
    return false;
  }

  return busyTimes.some((busy) => {
    const busyStart = new Date(busy.start);
    const busyEnd = new Date(busy.end);
    return startWithBuffer < busyEnd && endWithBuffer > busyStart;
  });
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
  }
) {
  const session = await getSession();
  if (!session) {
    return serializeDocument({
      success: false,
      message: "You must be logged in to reschedule an appointment.",
    });
  }

  const { _id, firstName, lastName, email } = session.resultObj;

  const db = await getDatabase();

  function addDurationToTime(appointmentTime, duration) {
    const [hours, minutes] = appointmentTime.split(":").map(Number);
    const durationInMinutes = Number(duration);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + durationInMinutes);
    const updatedHours = String(date.getHours()).padStart(2, "0");
    const updatedMinutes = String(date.getMinutes()).padStart(2, "0");
    return `${updatedHours}:${updatedMinutes}`;
  }

  const formattedEndTime = addDurationToTime(appointmentTime, duration);

  try {
    // Fetch the current appointment to get the Google Calendar event ID
    const currentAppointment = await db
      .collection("appointments")
      .findOne({ _id: new ObjectId(currentAppointmentId) });

    if (!currentAppointment) {
      return serializeDocument({
        success: false,
        message: "Current appointment not found.",
      });
    }

    // Update the Google Calendar event
    if (currentAppointment.googleCalendarEventId) {
      const updatedEvent = {
        summary: `[Pending Confirmation] Massage Appointment for ${firstName} ${lastName}`,
        location: location,
        description: `${duration} minute massage at ${workplace}\n\nStatus: Pending Confirmation\nClient Email: ${email}\n\nPlease confirm this appointment.`,
        start: {
          dateTime: `${appointmentDate}T${appointmentTime}:00`,
          timeZone: "America/Toronto",
        },
        end: {
          dateTime: `${appointmentDate}T${formattedEndTime}:00`,
          timeZone: "America/Toronto",
        },
        colorId: "2", // Sage color
      };

      try {
        await calendar.events.update({
          calendarId: GOOGLE_CALENDAR_ID,
          eventId: currentAppointment.googleCalendarEventId,
          resource: updatedEvent,
        });
        console.log("Google Calendar event updated successfully.");
      } catch (calendarError) {
        console.error("Error updating Google Calendar event:", calendarError);
        // We'll continue with the rescheduling even if the Calendar update fails
      }
    }

    const currentAppointmentUpdate = await db
      .collection("appointments")
      .updateOne(
        { _id: new ObjectId(currentAppointmentId) },
        {
          $set: {
            status: "available",
            userId: null,
            consentForm: null,
            consentFormSubmittedAt: null,
            googleCalendarEventId: null,
            googleCalendarEventLink: null,
          },
        }
      );

    if (currentAppointmentUpdate.matchedCount === 0) {
      return serializeDocument({
        success: false,
        message: "Current appointment not found.",
      });
    }

    const query = {
      RMTLocationId: new ObjectId(RMTLocationId),
      appointmentDate: appointmentDate,
      appointmentStartTime: { $lte: appointmentTime },
      appointmentEndTime: { $gte: formattedEndTime },
      status: { $in: ["available", "rescheduling"] },
    };

    const update = {
      $set: {
        status: "booked",
        location: location,
        appointmentBeginsAt: appointmentTime,
        appointmentEndsAt: formattedEndTime,
        userId: _id,
        duration: duration,
        workplace: workplace,
        googleCalendarEventId: currentAppointment.googleCalendarEventId,
        googleCalendarEventLink: currentAppointment.googleCalendarEventLink,
      },
    };

    const result = await db.collection("appointments").updateOne(query, update);

    if (result.matchedCount > 0) {
      console.log("Appointment rescheduled successfully.");

      revalidatePath("/dashboard/patient");
      return serializeDocument({
        success: true,
        message: "Appointment rescheduled successfully.",
      });
    } else {
      console.log("No matching appointment found for rescheduling.");

      // If rescheduling fails, revert the Google Calendar event to its original state
      if (currentAppointment.googleCalendarEventId) {
        try {
          await calendar.events.update({
            calendarId: GOOGLE_CALENDAR_ID,
            eventId: currentAppointment.googleCalendarEventId,
            resource: {
              start: {
                dateTime: `${currentAppointment.appointmentDate}T${currentAppointment.appointmentBeginsAt}:00`,
                timeZone: "America/Toronto",
              },
              end: {
                dateTime: `${currentAppointment.appointmentDate}T${currentAppointment.appointmentEndsAt}:00`,
                timeZone: "America/Toronto",
              },
            },
          });
          console.log("Google Calendar event reverted successfully.");
        } catch (calendarError) {
          console.error(
            "Error reverting Google Calendar event:",
            calendarError
          );
        }
      }

      await db.collection("appointments").updateOne(
        { _id: new ObjectId(currentAppointmentId) },
        {
          $set: {
            status: "booked",
            userId: _id,
            googleCalendarEventId: currentAppointment.googleCalendarEventId,
            googleCalendarEventLink: currentAppointment.googleCalendarEventLink,
          },
        }
      );

      return serializeDocument({
        success: false,
        message: "No matching appointment found for rescheduling.",
      });
    }
  } catch (error) {
    console.error(
      "An error occurred while rescheduling the appointment:",
      error
    );
    return serializeDocument({
      success: false,
      message: "An error occurred while rescheduling the appointment.",
    });
  }
}

////////////////////////////////////////////////////////////
////////////////////HEALTH HISTORY//////////////////////////
////////////////////////////////////////////////////////////

async function checkAuth() {
  const session = await getSession();
  if (!session || !session.resultObj?._id) {
    throw new Error("Unauthorized");
  }
  return session.resultObj._id;
}

export async function addHealthHistory(data) {
  try {
    const userId = await checkAuth();
    const db = await getDatabase();
    const healthHistoryCollection = db.collection("healthhistories");

    // Validate data against Zod schema
    const validatedData = healthHistorySchema.parse(data);

    const healthHistoryData = {
      ...validatedData,
      createdAt: new Date(),
      userId: new ObjectId(userId),
    };

    const result = await healthHistoryCollection.insertOne(healthHistoryData);

    if (result.acknowledged) {
      revalidatePath("/dashboard/patient");
      return { success: true, id: result.insertedId };
    } else {
      throw new Error("Failed to insert health history");
    }
  } catch (error) {
    console.error("Error adding health history:", error);
    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
      );
    }
    throw new Error("Failed to add health history");
  }
}

export async function getClientHealthHistories(id) {
  try {
    // Validate the input id
    const validatedId = z.string().nonempty().parse(id);

    // Get the authenticated user's ID
    const authenticatedUserId = await checkAuth();

    // Compare the input id with the authenticated user's ID
    if (validatedId !== authenticatedUserId.toString()) {
      throw new Error("Unauthorized access: User ID mismatch");
    }

    const db = await getDatabase();
    const healthHistoryCollection = db.collection("healthhistories");

    const healthHistories = await healthHistoryCollection
      .find({ userId: new ObjectId(authenticatedUserId) })
      .sort({ createdAt: -1 })
      .toArray();

    // Serialize the health histories
    const serializedHealthHistories = healthHistories.map(serializeDocument);

    console.log(
      `Retrieved ${serializedHealthHistories.length} health histories for user ${authenticatedUserId}`
    );

    return serializedHealthHistories;
  } catch (error) {
    console.error("Error fetching client health histories:", error);
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid input: ${error.errors.map((e) => e.message).join(", ")}`
      );
    }
    if (error.message === "Unauthorized access: User ID mismatch") {
      throw new Error("Unauthorized access");
    }
    throw new Error("Failed to fetch client health histories");
  }
}

export async function getLatestHealthHistory() {
  try {
    const userId = await checkAuth();
    const db = await getDatabase();
    const healthHistoryCollection = db.collection("healthhistories");

    const latestHistory = await healthHistoryCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (latestHistory.length === 0) {
      return null;
    }

    return latestHistory[0];
  } catch (error) {
    console.error("Error fetching latest health history:", error);
    throw new Error("Failed to fetch latest health history");
  }
}

export async function deleteHealthHistory(id) {
  try {
    const userId = await checkAuth();
    const db = await getDatabase();
    const healthHistoryCollection = db.collection("healthhistories");

    const result = await healthHistoryCollection.deleteOne({
      _id: new ObjectId(id),
      userId: userId,
    });

    if (result.deletedCount === 1) {
      revalidatePath("/dashboard/patient");
      return { success: true, id: id };
    } else {
      throw new Error("Failed to delete health history or record not found");
    }
  } catch (error) {
    console.error("Error deleting health history:", error);
    throw new Error("Failed to delete health history");
  }
}

// //////////////////functions from v0 for online booking....trying something different///////////////////

// const locationSchema = z.object({
//   name: z.string(),
//   address: z.string(),
//   contactInfo: z.string(),
//   schedule: z.array(
//     z.object({
//       day: z.enum([
//         "Monday",
//         "Tuesday",
//         "Wednesday",
//         "Thursday",
//         "Friday",
//         "Saturday",
//         "Sunday",
//       ]),
//       slots: z.array(
//         z.object({
//           start: z.string(),
//           end: z.string(),
//         })
//       ),
//     })
//   ),
// });

// export async function addLocation(formData) {
//   const db = await getDatabase();

//   const rawData = Object.fromEntries(formData.entries());
//   const validatedData = locationSchema.parse(rawData);

//   const result = await db.collection("locations").insertOne(validatedData);

//   if (result.acknowledged) {
//     return { success: true, message: "Location added successfully" };
//   } else {
//     return { success: false, message: "Failed to add location" };
//   }
// }

// export async function getLocations() {
//   const db = await getDatabase();
//   const locations = await db.collection("locations").find().toArray();
//   return locations;
// }

// const serviceSchema = z.object({
//   locationId: z.string(),
//   name: z.string(),
//   duration: z.number(),
//   price: z.number(),
// });

// export async function addService(formData) {
//   const db = await getDatabase();

//   const rawData = Object.fromEntries(formData.entries());
//   const validatedData = serviceSchema.parse(rawData);

//   const result = await db.collection("services").insertOne(validatedData);

//   if (result.acknowledged) {
//     return { success: true, message: "Service added successfully" };
//   } else {
//     return { success: false, message: "Failed to add service" };
//   }
// }

// export async function getServices(locationId) {
//   const db = await getDatabase();
//   const services = await db
//     .collection("services")
//     .find({ locationId })
//     .toArray();
//   return services;
// }

// const appointmentSchema = z.object({
//   locationId: z.string(),
//   serviceId: z.string(),
//   slot: z.object({
//     start: z.string(),
//     end: z.string(),
//   }),
//   userInfo: z.object({
//     name: z.string(),
//     email: z.string().email(),
//     phone: z.string(),
//   }),
// });

// export async function bookAppointment2(formData) {
//   const db = await getDatabase();

//   const rawData = Object.fromEntries(formData.entries());
//   const validatedData = appointmentSchema.parse(rawData);

//   const result = await db.collection("appointments").insertOne(validatedData);

//   if (result.acknowledged) {
//     // Add event to Google Calendar
//     await addToGoogleCalendar(validatedData);
//     return { success: true, message: "Appointment booked successfully" };
//   } else {
//     return { success: false, message: "Failed to book appointment" };
//   }
// }

// async function addToGoogleCalendar(appointmentData) {
//   const auth = new google.auth.GoogleAuth({
//     keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
//     scopes: ["https://www.googleapis.com/auth/calendar"],
//   });

//   const calendar = google.calendar({ version: "v3", auth });

//   const event = {
//     summary: "Massage Appointment",
//     location: appointmentData.location.address,
//     description: `${appointmentData.service.name} - ${appointmentData.service.duration} minutes`,
//     start: {
//       dateTime: appointmentData.slot.start,
//       timeZone: "America/New_York", // Adjust this to your timezone
//     },
//     end: {
//       dateTime: appointmentData.slot.end,
//       timeZone: "America/New_York", // Adjust this to your timezone
//     },
//   };

//   try {
//     const res = await calendar.events.insert({
//       calendarId: "primary",
//       requestBody: event,
//     });
//     console.log("Event created: %s", res.data.htmlLink);
//   } catch (error) {
//     console.error("Error creating calendar event:", error);
//   }
// }
