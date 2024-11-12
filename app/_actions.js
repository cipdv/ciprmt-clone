"use server";

// External libraries
import { z } from "zod";
import { ObjectId } from "mongodb";
import {
  encryptData,
  logAuditEvent,
  decryptData,
} from "@/app/lib/security/security";
import { checkRateLimit } from "@/app/lib/security/rate-limit";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { google } from "googleapis";
import { randomBytes } from "crypto";
import he from "he";

// Next.js specific imports
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

// Database connection
import { getDatabase } from "./lib/database/mongoDbConnection";

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
let GOOGLE_PRIVATE_KEY;

if (process.env.NODE_ENV === "production") {
  GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
} else {
  GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
}
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PROJECT_NUMBER = process.env.GOOGLE_PROJECT_NUMBER;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

//////////////////////////////////////////////////
////////////////AUTH//////////////////////////////
//////////////////////////////////////////////////

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
  try {
    const result = registerPatientSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!result.success) {
      return {
        errors: result.error.flatten().fieldErrors,
        message:
          "Failed to register: make sure all required fields are completed and try again",
      };
    }

    const { confirmPassword, ...patientData } = result.data;

    const db = await getDatabase();
    const patientExists = await db
      .collection("users")
      .findOne({ email: patientData.email });

    if (patientExists) {
      return { errors: { email: ["This email is already registered"] } };
    }

    const hashedPassword = await bcrypt.hash(patientData.password, 10);

    const newPatient = {
      ...patientData,
      userType: "patient",
      password: hashedPassword,
      rmtId: new ObjectId("615b37ba970196ca0d3122fe"),
      createdAt: new Date(),
    };

    await db.collection("users").insertOne(newPatient);

    const sessionData = {
      resultObj: {
        ...newPatient,
        password: undefined,
      },
    };

    const expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    const session = await encrypt({ ...sessionData, expires });

    cookies().set("session", session, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    const transporter = getEmailTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Patient Registration",
      text: `A new patient has registered: ${patientData.firstName} ${patientData.lastName} (${patientData.email})`,
      html: `
        <h1>New Patient Registration</h1>
        <p>A new patient has registered with the following details:</p>
        <ul>
          <li>Name: ${patientData.firstName} ${patientData.lastName}</li>
          <li>Email: ${patientData.email}</li>
          <li>Phone: ${patientData?.phoneNumber || "N/A"}</li>
        </ul>
      `,
    });

    revalidatePath("/");
  } catch (error) {
    console.error(error);
    return {
      message: "An unexpected error occurred. Please try again later.",
    };
  }

  // Redirect outside of try-catch
  redirect("/");
}

// working version (production) - no email sending
// export async function registerNewPatient(prevState, formData) {
//   const formDataObj = Object.fromEntries(formData.entries());
//   formDataObj.email = formDataObj.email.toLowerCase().trim();
//   formDataObj.firstName =
//     formDataObj.firstName.charAt(0).toUpperCase() +
//     formDataObj.firstName.slice(1);
//   formDataObj.preferredName =
//     formDataObj.preferredName.charAt(0).toUpperCase() +
//     formDataObj.preferredName.slice(1);
//   formDataObj.phone = formDataObj.phone.replace(/\D/g, "");

//   const result = registerPatientSchema.safeParse(formDataObj);

//   if (result.error) {
//     const passwordError = result.error.issues.find(
//       (issue) =>
//         issue.path[0] === "password" &&
//         issue.type === "string" &&
//         issue.minimum === 6
//     );

//     const confirmPasswordError = result.error.issues.find(
//       (issue) =>
//         issue.path[0] === "confirmPassword" &&
//         issue.type === "string" &&
//         issue.minimum === 6
//     );

//     if (passwordError) {
//       return { password: "^ Password must be at least 8 characters long" };
//     }

//     if (confirmPasswordError) {
//       return {
//         confirmPassword:
//           "^ Passwords must be at least 8 characters long and match",
//       };
//     }

//     const emailError = result.error.issues.find((issue) => {
//       return (
//         issue.path[0] === "email" &&
//         issue.validation === "email" &&
//         issue.code === "invalid_string"
//       );
//     });

//     if (emailError) {
//       return { email: "^ Please enter a valid email address" };
//     }

//     if (!result.success) {
//       return {
//         message:
//           "Failed to register: make sure all required fields are completed and try again",
//       };
//     }
//   }

//   const {
//     firstName,
//     lastName,
//     preferredName,
//     phone,
//     pronouns,
//     email,
//     password,
//     confirmPassword,
//   } = result.data;

//   if (password !== confirmPassword) {
//     return { confirmPassword: "^ Passwords do not match" };
//   }

//   try {
//     const db = await getDatabase();
//     const patientExists = await db
//       .collection("users")
//       .findOne({ email: email });

//     if (patientExists) {
//       return { email: "^ This email is already registered" };
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     const newPatient = {
//       firstName,
//       lastName,
//       preferredName,
//       pronouns,
//       email,
//       phone,
//       userType: "patient",
//       password: hashedPassword,
//       rmtId: "615b37ba970196ca0d3122fe",
//       createdAt: new Date(),
//     };

//     await db.collection("users").insertOne(newPatient);

//     let resultObj = { ...newPatient };
//     delete resultObj.password;

//     const expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
//     const session = await encrypt({ resultObj, expires });

//     cookies().set("session", session, {
//       expires,
//       httpOnly: true,
//       secure: true,
//     });
//   } catch (error) {
//     console.log(error);
//     return {
//       message:
//         "Failed to register: make sure all required fields are completed and try again",
//     };
//   }
//   revalidatePath("/");
//   redirect("/");
// }

export async function login(prevState, formData) {
  const formDataObj = Object.fromEntries(formData.entries());
  formDataObj.rememberMe = formDataObj.rememberMe === "on";
  formDataObj.email = formDataObj.email.toLowerCase().trim();

  const { success, data, error } = loginSchema.safeParse(formDataObj);

  if (!success) {
    return { message: error.message };
  }

  const user = data;

  const db = await getDatabase();
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

//////////////////////////////////////////////////
//////////SCHEDULING//////////////////////////////
//////////////////////////////////////////////////

export async function submitScheduleSetup(prevState, formData) {
  console.log(formData);
  return;
}

export async function getAllTreatments() {
  const db = await getDatabase();
  const treatments = await db.collection("treatments").find({}).toArray();
  return serializeDocument(treatments);
}

export async function getTreatmentById(id) {
  const db = await getDatabase();
  const treatment = await db
    .collection("appointments")
    .findOne({ _id: new ObjectId(id) });
  return serializeDocument(treatment);
}

export async function getAllUsers() {
  const db = await getDatabase();
  const users = await db.collection("users").find({}).toArray();
  return serializeDocument(users);
}

export async function getAllSurveys() {
  const db = await getDatabase();
  const surveys = await db.collection("surveys").find({}).toArray();
  return serializeDocument(surveys);
}

export async function getReceipts(id) {
  const db = await getDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day

  // Helper function to convert date string to Date object
  const convertToDate = (dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed in JavaScript Date
  };

  // Fetch from appointments collection
  const appointments = await db
    .collection("appointments")
    .find({
      userId: id,
      status: "completed",
    })
    .toArray();

  // Fetch from treatments collection
  const treatments = await db
    .collection("treatments")
    .find({
      clientId: id,
      paymentType: { $exists: true, $ne: null },
      price: { $exists: true, $ne: null },
    })
    .toArray();

  // Combine, filter, and normalize the results
  const combinedReceipts = [
    ...appointments
      .filter(
        (appointment) => convertToDate(appointment.appointmentDate) <= today
      )
      .map((appointment) => ({
        ...appointment,
        type: "appointment",
      })),
    ...treatments
      .filter((treatment) => convertToDate(treatment.date) <= today)
      .map((treatment) => ({
        ...treatment,
        userId: treatment.clientId, // Normalize the id field
        type: "treatment",
      })),
  ];

  // Sort the combined results by date, most recent first
  combinedReceipts.sort((a, b) => {
    const dateA = convertToDate(a.appointmentDate || a.date);
    const dateB = convertToDate(b.appointmentDate || b.date);
    return dateB - dateA;
  });

  return serializeDocument(combinedReceipts);
}

export async function getReceiptById(id) {
  const db = await getDatabase();

  // Check appointments collection
  let receipt = await db
    .collection("appointments")
    .findOne({ _id: new ObjectId(id) });

  if (receipt) {
    return serializeDocument({ ...receipt, type: "appointment" });
  }

  // If not found in appointments, check treatments collection
  receipt = await db
    .collection("treatments")
    .findOne({ _id: new ObjectId(id) });

  if (receipt) {
    return serializeDocument({ ...receipt, type: "treatment" });
  }

  // If not found in either collection, return null
  return null;
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
  const db = await getDatabase();

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
              RMTId: new ObjectId(session.resultObj._id),
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

export const getRMTSetup = async () => {
  const session = await getSession();

  const { rmtId } = session.resultObj;
  const db = await getDatabase();

  const setupArray = await db
    .collection("rmtLocations")
    .find({ userId: rmtId })
    .toArray();

  return serializeDocument(setupArray);
};

export async function getUsersAppointments(id) {
  const db = await getDatabase();
  const appointments = await db
    .collection("appointments")
    .find({ userId: id })
    .toArray();
  return serializeDocument(appointments);
}

//working version (production)
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
    }
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

  // Filter out dates that are not greater than today
  const today = new Date().toISOString().split("T")[0];
  const futureAvailableTimes = filteredAvailableTimes.filter(
    (available) => available.date > today
  );

  // Sort the results by date
  const sortedAvailableTimes = futureAvailableTimes.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
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
}) {
  const session = await getSession();
  if (!session || !session.resultObj) {
    return {
      success: false,
      message: "You must be logged in to book an appointment.",
    };
  }

  const { _id, firstName, lastName, email, phoneNumber } = session.resultObj;

  const db = await getDatabase();

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
  const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
  const formattedEndTime = endDateTime.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    const query = {
      RMTLocationId: new ObjectId(RMTLocationId),
      appointmentDate: formattedDate,
      appointmentStartTime: { $lte: formattedStartTime },
      appointmentEndTime: { $gte: formattedEndTime },
      status: "available",
    };

    // Create Google Calendar event
    const event = {
      summary: `[Requested] Mx ${firstName} ${lastName}`,
      location: location,
      description: `Email: ${email}\nPhone: ${phoneNumber || "N/A"}`,
      start: {
        dateTime: `${formattedDate}T${formattedStartTime}:00`,
        timeZone: "America/Toronto",
      },
      end: {
        dateTime: `${formattedDate}T${formattedEndTime}:00`,
        timeZone: "America/Toronto",
      },
      colorId: "6", // tangerine color
    };

    const createdEvent = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      resource: event,
    });

    const update = {
      $set: {
        status: "requested",
        location: location,
        appointmentBeginsAt: formattedStartTime,
        appointmentEndsAt: formattedEndTime,
        userId: _id,
        firstName: firstName,
        lastName: lastName,
        email: email,
        duration: duration,
        workplace: workplace,
        googleCalendarEventId: createdEvent.data.id,
        googleCalendarEventLink: createdEvent.data.htmlLink,
      },
    };

    const result = await db
      .collection("appointments")
      .findOneAndUpdate(query, update, { returnDocument: "after" });

    if (result.matchedCount === 0) {
      await calendar.events.delete({
        calendarId: GOOGLE_CALENDAR_ID,
        eventId: createdEvent.data.id,
      });
      return {
        success: false,
        message:
          "No matching appointment found. Please try again or contact support.",
      };
    }

    // Get the updated appointment document to retrieve its ID
    const appointmentId = result?._id.toString();

    // Send email notification
    const transporter = getEmailTransporter();
    const confirmationLink = `${BASE_URL}/dashboard/rmt/confirm-appointment/${appointmentId}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Appointment Scheduled",
      text: `A new appointment has been scheduled for ${firstName} ${lastName} on ${formattedDate} at ${formattedStartTime}. Click here to confirm: ${confirmationLink}`,
      html: `
        <h1>New Appointment Scheduled</h1>
        <p>A new appointment has been scheduled with the following details:</p>
        <ul>
          <li>Client: ${firstName} ${lastName}</li>
          <li>Date: ${formattedDate}</li>
          <li>Time: ${formattedStartTime}</li>
          <li>Duration: ${duration} minutes</li>
          <li>Location: ${location}</li>
          <li>Google Calendar Event: <a href="${createdEvent.data.htmlLink}">View Event</a></li>
        </ul>
        <p><a href="${confirmationLink}">Click here to confirm the appointment</a></p>
      `,
    });

    revalidatePath("/dashboard/patient");
  } catch (error) {
    console.error("An error occurred while booking the appointment:", error);
    return {
      success: false,
      message: "An error occurred while booking the appointment.",
    };
  }
  redirect("/dashboard/patient");
}

//working version (production)
// export async function bookAppointment({
//   location,
//   duration,
//   appointmentTime,
//   workplace,
//   appointmentDate,
//   RMTLocationId,
// }) {
//   const session = await getSession();
//   if (!session) {
//     return {
//       success: false,
//       message: "You must be logged in to book an appointment.",
//     };
//   }

//   const { _id, firstName, lastName, email } = session.resultObj;

//   const db = await getDatabase();

//   // Ensure appointmentDate is in "YYYY-MM-DD" format
//   const formattedDate = new Date(appointmentDate).toISOString().split("T")[0];

//   // Convert appointmentTime to "HH:MM" (24-hour format)
//   const formattedStartTime = new Date(
//     `${appointmentDate} ${appointmentTime}`
//   ).toLocaleTimeString("en-US", {
//     hour12: false,
//     hour: "2-digit",
//     minute: "2-digit",
//   });

//   // Calculate end time
//   const startDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
//   const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
//   const formattedEndTime = endDateTime.toLocaleTimeString("en-US", {
//     hour12: false,
//     hour: "2-digit",
//     minute: "2-digit",
//   });

//   try {
//     const query = {
//       RMTLocationId: new ObjectId(RMTLocationId),
//       appointmentDate: formattedDate,
//       appointmentStartTime: { $lte: formattedStartTime },
//       appointmentEndTime: { $gte: formattedEndTime },
//       status: "available",
//     };

//     // Create Google Calendar event
//     const event = {
//       summary: `[Pending Confirmation] Massage Appointment for ${firstName} ${lastName}`,
//       location: location,
//       description: `${duration} minute massage at ${workplace}\n\nStatus: Pending Confirmation\nClient Email: ${email}\n\nPlease confirm this appointment.`,
//       start: {
//         dateTime: `${formattedDate}T${formattedStartTime}:00`,
//         timeZone: "America/Toronto",
//       },
//       end: {
//         dateTime: `${formattedDate}T${formattedEndTime}:00`,
//         timeZone: "America/Toronto",
//       },
//       colorId: "2", // Sage color
//     };

//     let createdEvent;
//     try {
//       createdEvent = await calendar.events.insert({
//         calendarId: GOOGLE_CALENDAR_ID,
//         resource: event,
//       });
//     } catch (error) {
//       console.error("Error creating Google Calendar event:", error);
//       return {
//         success: false,
//         message: "An error occurred while creating the Google Calendar event.",
//       };
//     }

//     const update = {
//       $set: {
//         status: "booked",
//         location: location,
//         appointmentBeginsAt: formattedStartTime,
//         appointmentEndsAt: formattedEndTime,
//         userId: _id,
//         duration: duration,
//         workplace: workplace,
//         googleCalendarEventId: createdEvent.data.id,
//         googleCalendarEventLink: createdEvent.data.htmlLink,
//       },
//     };

//     const result = await db.collection("appointments").updateOne(query, update);

//     if (result.matchedCount === 0) {
//       // If no matching appointment, delete the created Google Calendar event
//       try {
//         await calendar.events.delete({
//           calendarId: GOOGLE_CALENDAR_ID,
//           eventId: createdEvent.data.id,
//         });
//       } catch (deleteError) {
//         console.error("Error deleting Google Calendar event:", deleteError);
//       }
//       return {
//         success: false,
//         message:
//           "No matching appointment found. Please try again or contact support.",
//       };
//     }

//     console.log("Appointment updated successfully.");
//     revalidatePath("/dashboard/patient");
//   } catch (error) {
//     console.error("An error occurred while updating the appointment:", error);
//     return {
//       success: false,
//       message: "An error occurred while booking the appointment.",
//     };
//   }

//   redirect("/dashboard/patient");
// }

//working version (production)
export const cancelAppointment = async (prevState, formData) => {
  const session = await getSession();
  if (!session) {
    return {
      message: "You must be logged in to cancel an appointment.",
      status: "error",
    };
  }

  const { _id } = session.resultObj;

  const db = await getDatabase();

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
        appointmentBeginsAt: null,
        appointmentEndsAt: null,
        location: null,
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
  const db = await getDatabase();

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

//this function works in both development and production
export const getAllAvailableAppointments = async (
  rmtLocationId,
  duration,
  currentEventGoogleId
) => {
  const db = await getDatabase();
  const appointmentsCollection = db.collection("appointments");

  // Convert duration to an integer
  const durationMinutes = parseInt(duration, 10);

  // Fetch appointments with the given rmtLocationId and status 'available' or 'rescheduling'
  const appointments = await appointmentsCollection
    .find({
      RMTLocationId: new ObjectId(rmtLocationId),
      status: { $in: ["available", "rescheduling"] },
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
  const event = await calendar.events.get({
    calendarId: GOOGLE_CALENDAR_ID,
    eventId: currentEventGoogleId,
  });

  // Filter out the event with the currentEventGoogleId from the busyTimes
  const filteredBusyTimes = busyTimes.data.calendars[
    GOOGLE_CALENDAR_ID
  ].busy.filter((busyTime) => {
    const busyStart = new Date(busyTime.start).toISOString();
    const busyEnd = new Date(busyTime.end).toISOString();
    const eventStart = new Date(
      event.data.start.dateTime || event.data.start.date
    ).toISOString();
    const eventEnd = new Date(
      event.data.end.dateTime || event.data.end.date
    ).toISOString();
    return !(busyStart === eventStart && busyEnd === eventEnd);
  });

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

  // Filter out dates that are not greater than today
  const today = new Date().toISOString().split("T")[0];
  const futureAvailableTimes = filteredAvailableTimes.filter(
    (available) => available.date > today
  );

  // Sort the results by date
  const sortedAvailableTimes = futureAvailableTimes.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  return sortedAvailableTimes;
};

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

  const { _id, firstName, lastName, email, phoneNumber } = session.resultObj;

  const db = await getDatabase();

  // Convert appointmentDate from "Month Day, Year" to "YYYY-MM-DD"
  const formattedDate = new Date(appointmentDate).toISOString().split("T")[0];

  // Convert appointmentTime from "HH:MM AM/PM - HH:MM AM/PM" to "HH:MM" (24-hour format)
  const [startTime, endTime] = appointmentTime.split(" - ");
  const formattedStartTime = new Date(
    `${appointmentDate} ${startTime}`
  ).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedEndTime = new Date(
    `${appointmentDate} ${endTime}`
  ).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    const currentAppointment = await db
      .collection("appointments")
      .findOne({ _id: new ObjectId(currentAppointmentId) });

    if (!currentAppointment) {
      return serializeDocument({
        success: false,
        message: "Current appointment not found.",
      });
    }

    if (currentAppointment.googleCalendarEventId) {
      const updatedEvent = {
        summary: `[Requested] Mx ${firstName} ${lastName}`,
        location: location,
        description: `Email: ${email}\nPhone: ${phoneNumber || "N/A"}`,
        start: {
          dateTime: `${formattedDate}T${formattedStartTime}:00`,
          timeZone: "America/Toronto",
        },
        end: {
          dateTime: `${formattedDate}T${formattedEndTime}:00`,
          timeZone: "America/Toronto",
        },
        colorId: "6", // tangerine color
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
      appointmentDate: formattedDate,
      appointmentStartTime: { $lte: formattedStartTime },
      appointmentEndTime: { $gte: formattedEndTime },
      status: { $in: ["available", "rescheduling"] },
    };

    const update = {
      $set: {
        status: "requested",
        location: location,
        appointmentBeginsAt: formattedStartTime,
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

      // Send email notification to EMAIL_USER
      await sendRescheduleNotificationEmail(
        currentAppointment,
        { firstName, lastName, email, phoneNumber },
        {
          appointmentDate: formattedDate,
          appointmentTime: `${formattedStartTime} - ${formattedEndTime}`,
          location,
          duration,
        }
      );

      revalidatePath("/dashboard/patient");
      return serializeDocument({
        success: true,
        message: "Appointment rescheduled successfully.",
      });
    } else {
      console.log("No matching appointment found for rescheduling.");

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

async function sendRescheduleNotificationEmail(
  currentAppointment,
  user,
  newAppointment
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
    console.log("Reschedule notification email sent successfully");
  } catch (error) {
    console.error("Error sending reschedule notification email:", error);
  }
}

//working version (production)
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
//     return serializeDocument({
//       success: false,
//       message: "You must be logged in to reschedule an appointment.",
//     });
//   }

//   const { _id, firstName, lastName, email, phone } = session.resultObj;

//   const db = await getDatabase();

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
//     const currentAppointment = await db
//       .collection("appointments")
//       .findOne({ _id: new ObjectId(currentAppointmentId) });

//     if (!currentAppointment) {
//       return serializeDocument({
//         success: false,
//         message: "Current appointment not found.",
//       });
//     }

//     if (currentAppointment.googleCalendarEventId) {
//       const updatedEvent = {
//         summary: `[Requested] Mx ${firstName} ${lastName}`,
//         location: location,
//         description: `Email: ${email}\nPhone: ${phone}`,
//         start: {
//           dateTime: `${formattedDate}T${formattedStartTime}:00`,
//           timeZone: "America/Toronto",
//         },
//         end: {
//           dateTime: `${formattedDate}T${formattedEndTime}:00`,
//           timeZone: "America/Toronto",
//         },
//         colorId: "6", // Sage color
//       };

//       try {
//         await calendar.events.update({
//           calendarId: GOOGLE_CALENDAR_ID,
//           eventId: currentAppointment.googleCalendarEventId,
//           resource: updatedEvent,
//         });
//         console.log("Google Calendar event updated successfully.");
//       } catch (calendarError) {
//         console.error("Error updating Google Calendar event:", calendarError);
//       }
//     }

//     const currentAppointmentUpdate = await db
//       .collection("appointments")
//       .updateOne(
//         { _id: new ObjectId(currentAppointmentId) },
//         {
//           $set: {
//             status: "available",
//             userId: null,
//             consentForm: null,
//             consentFormSubmittedAt: null,
//             googleCalendarEventId: null,
//             googleCalendarEventLink: null,
//           },
//         }
//       );

//     if (currentAppointmentUpdate.matchedCount === 0) {
//       return serializeDocument({
//         success: false,
//         message: "Current appointment not found.",
//       });
//     }

//     const query = {
//       RMTLocationId: new ObjectId(RMTLocationId),
//       appointmentDate: formattedDate,
//       appointmentStartTime: { $lte: formattedStartTime },
//       appointmentEndTime: { $gte: formattedEndTime },
//       status: { $in: ["available", "rescheduling"] },
//     };

//     const update = {
//       $set: {
//         status: "requested",
//         location: location,
//         appointmentBeginsAt: formattedStartTime,
//         appointmentEndsAt: formattedEndTime,
//         userId: _id,
//         duration: duration,
//         workplace: workplace,
//         googleCalendarEventId: currentAppointment.googleCalendarEventId,
//         googleCalendarEventLink: currentAppointment.googleCalendarEventLink,
//       },
//     };

//     const result = await db.collection("appointments").updateOne(query, update);

//     if (result.matchedCount > 0) {
//       console.log("Appointment rescheduled successfully.");

//       revalidatePath("/dashboard/patient");
//       return serializeDocument({
//         success: true,
//         message: "Appointment rescheduled successfully.",
//       });
//     } else {
//       console.log("No matching appointment found for rescheduling.");

//       if (currentAppointment.googleCalendarEventId) {
//         try {
//           await calendar.events.update({
//             calendarId: GOOGLE_CALENDAR_ID,
//             eventId: currentAppointment.googleCalendarEventId,
//             resource: {
//               start: {
//                 dateTime: `${currentAppointment.appointmentDate}T${currentAppointment.appointmentBeginsAt}:00`,
//                 timeZone: "America/Toronto",
//               },
//               end: {
//                 dateTime: `${currentAppointment.appointmentDate}T${currentAppointment.appointmentEndsAt}:00`,
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

//       await db.collection("appointments").updateOne(
//         { _id: new ObjectId(currentAppointmentId) },
//         {
//           $set: {
//             status: "booked",
//             userId: _id,
//             googleCalendarEventId: currentAppointment.googleCalendarEventId,
//             googleCalendarEventLink: currentAppointment.googleCalendarEventLink,
//           },
//         }
//       );

//       return serializeDocument({
//         success: false,
//         message: "No matching appointment found for rescheduling.",
//       });
//     }
//   } catch (error) {
//     console.error(
//       "An error occurred while rescheduling the appointment:",
//       error
//     );
//     return serializeDocument({
//       success: false,
//       message: "An error occurred while rescheduling the appointment.",
//     });
//   }
// }

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
    const usersCollection = db.collection("users");

    // Server-side validation
    const validatedData = healthHistorySchema.parse(data);

    // Encrypt sensitive data
    const encryptedData = encryptData(validatedData);
    if (!encryptedData) {
      throw new Error("Failed to encrypt health history data");
    }

    const healthHistoryData = {
      encryptedData,
      createdAt: new Date(),
      userId: new ObjectId(userId),
    };

    const result = await healthHistoryCollection.insertOne(healthHistoryData);

    if (result.acknowledged) {
      // Update the user's lastHealthHistoryUpdate field
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { lastHealthHistoryUpdate: new Date() } }
      );

      // Regenerate the session with updated user data
      const updatedUser = await usersCollection.findOne({
        _id: new ObjectId(userId),
      });
      const session = await getSession();
      const newSession = {
        ...session,
        resultObj: {
          ...session.resultObj,
          lastHealthHistoryUpdate: updatedUser.lastHealthHistoryUpdate,
        },
      };

      const expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
      const encryptedSession = await encrypt({ ...newSession, expires });

      cookies().set("session", encryptedSession, {
        expires,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });

      // Log the event for audit purposes
      await logAuditEvent({
        action: "add_health_history",
        userId: userId,
        timestamp: new Date(),
      });

      revalidatePath("/dashboard/patient");
      return { success: true, id: result.insertedId };
    } else {
      throw new Error("Failed to insert health history");
    }
  } catch (error) {
    console.error("Error adding health history:", error);
    if (error.name === "ZodError") {
      throw new Error(
        `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
      );
    }
    throw new Error(error.message || "Failed to add health history");
  }
}

//working version (production)
// export async function addHealthHistory(data) {
//   try {
//     const userId = await checkAuth();
//     const db = await getDatabase();
//     const healthHistoryCollection = db.collection("healthhistories");
//     const usersCollection = db.collection("users");

//     // Validate data against Zod schema
//     const validatedData = healthHistorySchema.parse(data);

//     const healthHistoryData = {
//       ...validatedData,
//       createdAt: new Date(),
//       userId: new ObjectId(userId),
//     };

//     const result = await healthHistoryCollection.insertOne(healthHistoryData);

//     if (result.acknowledged) {
//       // Update the user's lastHealthHistoryUpdate field
//       await usersCollection.updateOne(
//         { _id: new ObjectId(userId) },
//         { $set: { lastHealthHistoryUpdate: new Date() } }
//       );

//       // Regenerate the session with updated user data
//       const updatedUser = await usersCollection.findOne({
//         _id: new ObjectId(userId),
//       });
//       const session = await getSession();
//       const newSession = {
//         ...session,
//         resultObj: {
//           ...session.resultObj,
//           lastHealthHistoryUpdate: updatedUser.lastHealthHistoryUpdate,
//         },
//       };

//       const expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
//       const encryptedSession = await encrypt({ ...newSession, expires });

//       cookies().set("session", encryptedSession, {
//         expires,
//         httpOnly: true,
//         secure: true,
//       });

//       revalidatePath("/dashboard/patient");
//       return { success: true, id: result.insertedId };
//     } else {
//       throw new Error("Failed to insert health history");
//     }
//   } catch (error) {
//     console.error("Error adding health history:", error);
//     if (error instanceof z.ZodError) {
//       throw new Error(
//         `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
//       );
//     }
//     throw new Error("Failed to add health history");
//   }
// }

//working version (production)
// export async function addHealthHistory(data) {
//   try {
//     const userId = await checkAuth();
//     const db = await getDatabase();
//     const healthHistoryCollection = db.collection("healthhistories");

//     // Validate data against Zod schema
//     const validatedData = healthHistorySchema.parse(data);

//     const healthHistoryData = {
//       ...validatedData,
//       createdAt: new Date(),
//       userId: new ObjectId(userId),
//     };

//     const result = await healthHistoryCollection.insertOne(healthHistoryData);

//     if (result.acknowledged) {
//       revalidatePath("/dashboard/patient");
//       return { success: true, id: result.insertedId };
//     } else {
//       throw new Error("Failed to insert health history");
//     }
//   } catch (error) {
//     console.error("Error adding health history:", error);
//     if (error instanceof z.ZodError) {
//       throw new Error(
//         `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
//       );
//     }
//     throw new Error("Failed to add health history");
//   }
// }

export async function getClientHealthHistories(id) {
  try {
    const authenticatedUserId = await checkAuth();

    if (id !== authenticatedUserId.toString()) {
      throw new Error("Unauthorized access: User ID mismatch");
    }

    const db = await getDatabase();
    const healthHistoryCollection = db.collection("healthhistories");

    const healthHistories = await healthHistoryCollection
      .find({ userId: new ObjectId(authenticatedUserId) })
      .sort({ createdAt: -1 })
      .toArray();

    const decryptedHealthHistories = healthHistories.map((history) => {
      let decryptedData = {};
      if (history.encryptedData) {
        const decrypted = decryptData(history.encryptedData);
        if (decrypted) {
          decryptedData = decrypted;
        } else {
          console.error(`Failed to decrypt health history ${history._id}`);
        }
      } else {
        // Handle unencrypted data
        const { _id, userId, createdAt, ...unencryptedData } = history;
        decryptedData = unencryptedData;
      }

      // Serialize the data to avoid symbol properties
      return JSON.parse(
        JSON.stringify({
          _id: history._id.toString(),
          userId: history.userId.toString(),
          createdAt: history.createdAt.toISOString(),
          ...decryptedData,
        })
      );
    });

    return decryptedHealthHistories;
  } catch (error) {
    console.error("Error fetching client health histories:", error);
    throw new Error("Failed to fetch client health histories");
  }
}

//working version (production)
// export async function getClientHealthHistories(id) {
//   try {
//     // Validate the input id
//     const validatedId = z.string().nonempty().parse(id);

//     // Get the authenticated user's ID
//     const authenticatedUserId = await checkAuth();

//     // Compare the input id with the authenticated user's ID
//     if (validatedId !== authenticatedUserId.toString()) {
//       throw new Error("Unauthorized access: User ID mismatch");
//     }

//     const db = await getDatabase();
//     const healthHistoryCollection = db.collection("healthhistories");

//     const healthHistories = await healthHistoryCollection
//       .find({ userId: new ObjectId(authenticatedUserId) })
//       .sort({ createdAt: -1 })
//       .toArray();

//     // Serialize the health histories
//     const serializedHealthHistories = healthHistories.map(serializeDocument);

//     return serializedHealthHistories;
//   } catch (error) {
//     console.error("Error fetching client health histories:", error);
//     if (error instanceof z.ZodError) {
//       throw new Error(
//         `Invalid input: ${error.errors.map((e) => e.message).join(", ")}`
//       );
//     }
//     if (error.message === "Unauthorized access: User ID mismatch") {
//       throw new Error("Unauthorized access");
//     }
//     throw new Error("Failed to fetch client health histories");
//   }
// }

//working version (production)
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

//////////////////////////////////////////////////
//////////CONTACT PAGE////////////////////////////
//////////////////////////////////////////////////

export async function sendMessageToCip(prevState, formData) {
  try {
    const currentUser = await getSession();

    if (!currentUser || !currentUser.resultObj) {
      throw new Error("User not authenticated");
    }

    const db = await getDatabase();

    // Create a new collection for messages if it doesn't exist
    if (!(await db.listCollections({ name: "messages" }).hasNext())) {
      await db.createCollection("messages");
    }

    const userName = currentUser.resultObj.preferredName
      ? `${currentUser.resultObj.preferredName} ${currentUser.resultObj.lastName}`
      : `${currentUser.resultObj.firstName} ${currentUser.resultObj.lastName}`;

    // Save the message to the database
    const messageDoc = {
      status: "sent",
      email: currentUser.resultObj.email,
      firstName: currentUser.resultObj.firstName,
      lastName: currentUser.resultObj.lastName,
      phone: currentUser.resultObj.phoneNumber || "N/A",
      message: formData.get("message"),
      createdAt: new Date(),
      rmtId: new ObjectId(currentUser.resultObj.rmtId),
    };

    const result = await db.collection("messages").insertOne(messageDoc);

    if (!result.insertedId) {
      throw new Error("Failed to save message to database");
    }

    const transporter = await getEmailTransporter();

    const message = `
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
          userName
        )}:</p>
        <div style="background-color: #ffffff; border-left: 4px solid #3498db; padding: 15px; margin: 10px 0;">
          <p style="margin: 0;">${he.encode(formData.get("message"))}</p>
        </div>
        <div style="margin-top: 20px; background-color: #e8f4f8; padding: 15px; border-radius: 5px;">
          <p style="margin: 5px 0;">
            <strong>Reply by email:</strong> 
            <a href="mailto:${he.encode(
              currentUser.resultObj.email
            )}" style="color: #3498db; text-decoration: none;">${he.encode(
      currentUser.resultObj.email
    )}</a>
          </p>
          <p style="margin: 5px 0;">
            <strong>Reply by phone:</strong> 
            <a href="tel:${he.encode(
              currentUser.resultObj.phoneNumber || "N/A"
            )}" style="color: #3498db; text-decoration: none;">${he.encode(
      currentUser.resultObj.phoneNumber || "N/A"
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

${formData.get("message")}

Reply by email: ${currentUser.resultObj.email}
Reply by phone: ${currentUser.resultObj.phoneNumber || "N/A"}`,
      html: message,
    });

    return { success: true, message: "Message sent and saved successfully" };
  } catch (error) {
    console.error("Error sending message:", error);
    return {
      success: false,
      message: "Failed to send message",
    };
  }
}

//////////////////////////////////////////////////
//////////PASSWORD RESET//////////////////////////
//////////////////////////////////////////////////

async function saveResetTokenToDatabase(email, token) {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection("users");

    const result = await usersCollection.updateOne(
      { email: email },
      {
        $set: {
          resetToken: token,
          resetTokenExpires: new Date(Date.now() + 3600000), // Token expires in 1 hour
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error("No user found with that email address.");
    }

    console.log(`Reset token saved for user: ${email}`);
  } catch (error) {
    console.error("Error in saveResetTokenToDatabase:", error);
    throw error;
  }
}

export async function resetPassword(email) {
  try {
    const token = randomBytes(32).toString("hex");

    await saveResetTokenToDatabase(email, token);

    const transporter = getEmailTransporter();

    // const transporter = createTransport({
    //   host: process.env.EMAIL_HOST,
    //   port: process.env.EMAIL_PORT,
    //   secure: false, // Use TLS
    //   auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS,
    //   },
    // });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      text: `To reset your password, please click on this link: ${resetUrl}`,
      html: `
        <p>To reset your password, please click on this link: <a href="${resetUrl}">Reset Password</a></p>
        
      `,
    });

    console.log(`Reset email sent to ${email}`);
    return {
      message:
        "Password reset link sent to your email. Check your inbox (and spam folder).",
    };
  } catch (error) {
    console.error("Error in resetPassword:", error);
    throw new Error(
      "Failed to process password reset request. Please try again."
    );
  }
}

export async function resetPasswordWithToken(token, newPassword) {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection("users");

    // Find user with the given reset token and check if it's still valid
    const user = await usersCollection.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and remove reset token
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetToken: "", resetTokenExpires: "" },
      }
    );

    return { message: "Your password has been reset successfully" };
  } catch (error) {
    console.error("Error resetting password:", error);
    throw new Error("Failed to reset password. Please try again.");
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////RMT SIDE/////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////
//////////APPOINTMENTS////////////////////////////
//////////////////////////////////////////////////

export async function getAllAppointmentsByRMTId(rmtId) {
  try {
    const db = await getDatabase();
    const appointmentsCollection = db.collection("appointments");

    const appointments = await appointmentsCollection
      .find({ RMTId: new ObjectId(rmtId) })
      .toArray();

    return appointments.map(serializeDocument);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    throw new Error("Failed to fetch appointments");
  }
}

export async function updateAppointmentStatus(formData) {
  const appointmentId = formData.get("appointmentId");
  const status = formData.get("status");

  const db = await getDatabase();

  try {
    const appointment = await db
      .collection("appointments")
      .findOne({ _id: new ObjectId(appointmentId) });

    if (!appointment) {
      return { success: false, message: "Appointment not found" };
    }

    let updateFields = { status: status };

    if (status === "available") {
      // Deny request
      if (appointment.googleCalendarEventId) {
        try {
          await calendar.events.delete({
            calendarId: GOOGLE_CALENDAR_ID,
            eventId: appointment.googleCalendarEventId,
          });
          console.log("Google Calendar event deleted successfully.");
        } catch (calendarError) {
          console.error("Error deleting Google Calendar event:", calendarError);
        }
      }

      updateFields = {
        ...updateFields,
        userId: null,
        duration: null,
        workplace: null,
        consentForm: null,
        consentFormSubmittedAt: null,
        googleCalendarEventId: null,
        googleCalendarEventLink: null,
        appointmentBeginsAt: null,
        appointmentEndsAt: null,
        location: null,
        email: null,
        firstName: null,
        lastName: null,
      };

      await sendDenialEmail(appointment);
    } else if (status === "booked") {
      // Accept request
      if (appointment.googleCalendarEventId) {
        try {
          await calendar.events.patch({
            calendarId: GOOGLE_CALENDAR_ID,
            eventId: appointment.googleCalendarEventId,
            resource: {
              colorId: "2", // "2" corresponds to "sage" in Google Calendar
              summary: `[Confirmed]: Mx ${appointment.firstName} ${appointment.lastName}`,
            },
          });
          console.log("Google Calendar event updated successfully.");
        } catch (calendarError) {
          console.error("Error updating Google Calendar event:", calendarError);
        }
      }

      await sendApprovalEmail(appointment);
    }

    const result = await db
      .collection("appointments")
      .updateOne({ _id: new ObjectId(appointmentId) }, { $set: updateFields });

    if (result.modifiedCount === 1) {
      revalidatePath("/dashboard/rmt");
      return {
        success: true,
        message: `Appointment ${
          status === "booked" ? "accepted" : "denied"
        } successfully`,
      };
    } else {
      return { success: false, message: "Failed to update appointment status" };
    }
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return {
      success: false,
      message: "An error occurred while updating the appointment status",
    };
  }
}

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
    console.log("Denial email sent successfully");
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
    console.log("Approval email sent successfully");
  } catch (error) {
    console.error("Error sending approval email:", error);
  }
}

export async function getAllMessagesByRMTId(rmtId) {
  try {
    const db = await getDatabase();
    const messagesCollection = db.collection("messages");

    const messages = await messagesCollection
      .find({ rmtId: new ObjectId(rmtId) })
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order (newest first)
      .toArray();

    return messages.map(serializeDocument);
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw new Error("Failed to fetch messages");
  }
}

export async function updateMessageStatus() {
  console.log("hi");
}

export async function sendReply(messageId, replyText) {
  const db = await getDatabase();

  try {
    const message = await db
      .collection("messages")
      .findOne({ _id: new ObjectId(messageId) });

    if (!message) {
      throw new Error("Message not found");
    }

    // Update message status
    await db
      .collection("messages")
      .updateOne(
        { _id: new ObjectId(messageId) },
        { $set: { status: "replied" } }
      );

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

export async function getTreatmentPlansForUser(userId) {
  try {
    const db = await getDatabase();
    const treatmentPlansCollection = db.collection("treatmentplans");

    // Convert userId to ObjectId and create a query that checks both clientId and createdBy
    const userObjectId = new ObjectId(userId);
    const query = {
      $or: [{ clientId: userObjectId }, { createdBy: userObjectId }],
    };

    const plans = await treatmentPlansCollection.find(query).toArray();

    // Serialize and decrypt sensitive data if necessary
    const serializedPlans = plans.map((plan) => {
      const serializedPlan = {
        ...plan,
        _id: plan._id.toString(),
        clientId: plan.clientId ? plan.clientId.toString() : null,
        createdBy: plan.createdBy ? plan.createdBy.toString() : null,
        treatments: plan.treatments
          ? plan.treatments.map((t) => t.toString())
          : [],
      };
      if (plan.encryptedData) {
        try {
          serializedPlan.decryptedData = decryptData(plan.encryptedData);
        } catch (decryptError) {
          console.error(
            "Error decrypting data for plan:",
            plan._id,
            decryptError
          );
          serializedPlan.decryptedData = null;
        }
      }
      return serializedPlan;
    });

    return { success: true, data: serializedPlans };
  } catch (error) {
    console.error("Error fetching treatment plans:", error);
    return { success: false, message: "Failed to fetch treatment plans" };
  }
}

export async function saveTreatmentNotes(treatmentId, treatmentPlanId, notes) {
  try {
    const db = await getDatabase();
    const appointmentsCollection = db.collection("appointments");
    const treatmentPlansCollection = db.collection("treatmentplans");
    const incomesCollection = db.collection("incomes");

    // Encrypt the notes
    const encryptedNotes = encryptData(JSON.stringify(notes));

    // Update the appointment with the treatment notes and associated plan
    const appointmentResult = await appointmentsCollection.findOneAndUpdate(
      { _id: new ObjectId(treatmentId) },
      {
        $set: {
          treatmentNotes: encryptedNotes,
          status: "completed",
          price: notes?.price,
          paymentType: notes?.paymentType,
          treatmentPlanId: new ObjectId(treatmentPlanId),
        },
      },
      { returnDocument: "after" }
    );

    if (!appointmentResult) {
      throw new Error("Failed to update appointment with treatment notes");
    }

    const updatedAppointment = appointmentResult.value || appointmentResult;

    // Add the treatment to the treatment plan's treatments array
    const treatmentPlanResult = await treatmentPlansCollection.updateOne(
      { _id: new ObjectId(treatmentPlanId) },
      { $addToSet: { treatments: new ObjectId(treatmentId) } }
    );

    // Calculate revenue excluding HST
    const totalPrice = parseFloat(notes.price);
    const hstRate = 0.13;
    const revenueExcludingHST = totalPrice / (1 + hstRate);
    const hstAmount = totalPrice - revenueExcludingHST;

    // Create a new income document
    const appointmentDate = new Date(updatedAppointment.appointmentDate);
    const incomeDocument = {
      RMTid: updatedAppointment.RMTId.toString(),
      treatmentId: updatedAppointment._id.toString(),
      date: appointmentDate,
      year: appointmentDate.getFullYear().toString(),
      category: "revenue",
      amount: parseFloat(revenueExcludingHST.toFixed(2)),
      totalPrice: totalPrice,
      hstAmount: parseFloat(hstAmount.toFixed(2)),
      details: `${updatedAppointment.firstName} ${updatedAppointment.lastName}`,
    };

    const incomeResult = await incomesCollection.insertOne(incomeDocument);

    if (!incomeResult.insertedId) {
      throw new Error("Failed to insert income document");
    }

    // Send email to the client
    const transporter = getEmailTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: updatedAppointment.email,
      subject: "Your Receipt is Ready to Download",
      text: `Hi ${updatedAppointment.firstName},

Your receipt from ${updatedAppointment.appointmentDate} is now ready to download. You can access it by logging into your account at www.ciprmt.com.

Thank you for your visit!

Stay healthy,
Cip`,
      html: `
        <h2>Your Receipt is Ready to Download</h2>
        <p>Dear ${updatedAppointment.firstName},</p>
        <p>Your receipt from ${updatedAppointment.appointmentDate} is now ready to download. You can access it by logging into your account at <a href="https://www.ciprmt.com">www.ciprmt.com</a>.</p>
        <p>Thank you for your visit!</p>
        <p>Stay healthy,<br>Cip</p>
      `,
    });

    revalidatePath("/dashboard/rmt");
  } catch (error) {
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return { success: false, message: error.message };
  }

  redirect("/dashboard/rmt");
}

//working version (production)
// export async function saveTreatmentNotes(treatmentId, treatmentPlanId, notes) {
//   console.log("Saving treatment notes...");
//   console.log("treatmentId:", treatmentId);
//   console.log("treatmentPlanId:", treatmentPlanId);
//   console.log("notes:", notes);

//   try {
//     const db = await getDatabase();
//     const appointmentsCollection = db.collection("appointments");
//     const treatmentPlansCollection = db.collection("treatmentplans");

//     // Encrypt the notes
//     const encryptedNotes = encryptData(JSON.stringify(notes));

//     // Update the appointment with the treatment notes and associated plan
//     const appointmentResult = await appointmentsCollection.updateOne(
//       { _id: new ObjectId(treatmentId) },
//       {
//         $set: {
//           treatmentNotes: encryptedNotes,
//           status: "completed",
//           price: notes?.price,
//           paymentType: notes?.paymentType,
//           treatmentPlanId: new ObjectId(treatmentPlanId),
//         },
//       }
//     );

//     if (appointmentResult.modifiedCount === 0) {
//       throw new Error("Failed to update appointment with treatment notes");
//     }

//     // Add the treatment to the treatment plan's treatments array
//     const treatmentPlanResult = await treatmentPlansCollection.updateOne(
//       { _id: new ObjectId(treatmentPlanId) },
//       { $addToSet: { treatments: new ObjectId(treatmentId) } }
//     );

//     if (treatmentPlanResult.modifiedCount === 0) {
//       throw new Error("Failed to update treatment plan with new treatment");
//     }

//     revalidatePath("/dashboard/rmt");
//   } catch (error) {
//     console.error("Error saving treatment notes:", error);
//     console.error("Error details:", {
//       name: error.name,
//       message: error.message,
//       stack: error.stack,
//     });
//     return { success: false, message: error.message };
//   }

//   // Redirect outside of try/catch
//   redirect("/dashboard/rmt");
// }

export async function createTreatmentPlan(planData, clientId) {
  try {
    const session = await getSession();
    if (!session || !session.resultObj) {
      throw new Error("Unauthorized: User not logged in");
    }

    const db = await getDatabase();
    const treatmentPlansCollection = db.collection("treatmentplans");

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
    });

    if (!encryptedPlanData) {
      throw new Error("Failed to encrypt treatment plan data");
    }

    const newPlan = {
      encryptedData: encryptedPlanData,
      startDate: new Date(planData.startDate),
      createdAt: new Date(),
      createdBy: new ObjectId(session.resultObj._id),
      clientId: new ObjectId(clientId),
      treatments: [],
    };

    const result = await treatmentPlansCollection.insertOne(newPlan);

    if (!result.insertedId) {
      throw new Error("Failed to create new treatment plan");
    }

    // Log the action for audit purposes
    await logAuditEvent({
      action: "create_treatment_plan",
      userId: session.resultObj._id,
      treatmentPlanId: result.insertedId,
      timestamp: new Date(),
    });

    revalidatePath("/dashboard/rmt");

    // Return a safe version of the plan (without encrypted data)
    const safePlan = {
      _id: result.insertedId,
      startDate: newPlan.startDate,
      createdAt: newPlan.createdAt,
      clientId: newPlan.clientId.toString(),
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

export async function getTreatmentsForUser(userId) {
  try {
    const db = await getDatabase();
    const appointmentsCollection = db.collection("appointments");

    const appointments = await appointmentsCollection
      .find({ userId: userId })
      .toArray();

    // Decrypt treatment notes and serialize ObjectIds
    const decryptedAppointments = appointments.map((appointment) => {
      const serializedAppointment = {
        ...appointment,
        _id: appointment._id.toString(),
        RMTId: appointment.RMTId.toString(),
        RMTLocationId: appointment.RMTLocationId.toString(),
        userId: appointment.userId.toString(),
        treatmentPlanId: appointment.treatmentPlanId
          ? appointment.treatmentPlanId.toString()
          : null,
      };

      if (appointment.treatmentNotes) {
        serializedAppointment.treatmentNotes = decryptData(
          appointment.treatmentNotes
        );
      }

      return serializedAppointment;
    });

    return { success: true, data: decryptedAppointments };
  } catch (error) {
    console.error("Error fetching treatments for user:", error);
    return {
      success: false,
      message: "Failed to fetch treatments",
      error: error.message,
    };
  }
}
