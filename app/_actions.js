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
import {
  addMinutes,
  format,
  isWithinInterval,
  parseISO,
  subMinutes,
  set,
  areIntervalsOverlapping,
} from "date-fns";

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
      rmtId: "615b37ba970196ca0d3122fe",
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

//////////////////////////////////////////////////
//////////SCHEDULING//////////////////////////////
//////////////////////////////////////////////////

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

  console.log("Available times:", sortedAvailableTimes);
  return sortedAvailableTimes;
};

//working version (production)
export async function bookAppointment({
  location,
  duration,
  appointmentTime,
  workplace,
  appointmentDate,
  RMTLocationId,
}) {
  console.log("appointmentTime", appointmentTime, appointmentDate);
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: "You must be logged in to book an appointment.",
    };
  }

  const { _id, firstName, lastName, email } = session.resultObj;

  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);

  // Ensure appointmentDate is in "YYYY-MM-DD" format
  const formattedDate = new Date(appointmentDate).toISOString().split("T")[0];

  // Convert appointmentTime to "HH:MM" (24-hour format)
  const formattedStartTime = new Date(
    `${appointmentDate} ${appointmentTime}`
  ).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate end time
  const startDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
  const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
  const formattedEndTime = endDateTime.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  console.log("formattedDate", formattedDate);
  console.log("formattedStartTime", formattedStartTime);
  console.log("formattedEndTime", formattedEndTime);

  try {
    const query = {
      RMTLocationId: new ObjectId(RMTLocationId),
      appointmentDate: formattedDate,
      appointmentStartTime: { $lte: formattedStartTime },
      appointmentEndTime: { $gte: formattedEndTime },
      status: "available",
    };

    console.log("Database query:", query);

    // Create Google Calendar event
    const event = {
      summary: `[Pending Confirmation] Massage Appointment for ${firstName} ${lastName}`,
      location: location,
      description: `${duration} minute massage at ${workplace}\n\nStatus: Pending Confirmation\nClient Email: ${email}\n\nPlease confirm this appointment.`,
      start: {
        dateTime: `${formattedDate}T${formattedStartTime}:00`,
        timeZone: "America/Toronto",
      },
      end: {
        dateTime: `${formattedDate}T${formattedEndTime}:00`,
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
        success: false,
        message: "An error occurred while creating the Google Calendar event.",
      };
    }

    const update = {
      $set: {
        status: "booked",
        location: location,
        appointmentBeginsAt: formattedStartTime,
        appointmentEndsAt: formattedEndTime,
        userId: _id,
        duration: duration,
        workplace: workplace,
        googleCalendarEventId: createdEvent.data.id,
        googleCalendarEventLink: createdEvent.data.htmlLink,
      },
    };

    const result = await db.collection("appointments").updateOne(query, update);

    if (result.matchedCount === 0) {
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
        success: false,
        message:
          "No matching appointment found. Please try again or contact support.",
      };
    }

    console.log("Appointment updated successfully.");
    revalidatePath("/dashboard/patient");
  } catch (error) {
    console.error("An error occurred while updating the appointment:", error);
    return {
      success: false,
      message: "An error occurred while booking the appointment.",
    };
  }

  // Redirect is placed at the end of the function, outside of any try-catch blocks
  redirect("/dashboard/patient");
}

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

//working version...not in production
// export const getAllAvailableAppointments = async (
//   rmtLocationId,
//   duration,
//   currentEventGoogleId
// ) => {
//   const db = await getDatabase();
//   const appointmentsCollection = db.collection("appointments");

//   // Convert duration to an integer
//   const durationMinutes = parseInt(duration, 10);

//   // Fetch appointments with the given rmtLocationId and status 'available' or 'rescheduling'
//   const appointments = await appointmentsCollection
//     .find({
//       RMTLocationId: new ObjectId(rmtLocationId),
//       status: { $in: ["available", "rescheduling"] },
//     })
//     .toArray();

//   const availableTimes = [];

//   console.log("appointments", appointments);

//   appointments.forEach((appointment) => {
//     const startTime = new Date(
//       `${appointment.appointmentDate}T${appointment.appointmentStartTime}`
//     );
//     const endTime = new Date(
//       `${appointment.appointmentDate}T${appointment.appointmentEndTime}`
//     );

//     let currentTime = new Date(startTime);

//     while (currentTime <= endTime) {
//       const nextTime = new Date(currentTime);
//       nextTime.setMinutes(currentTime.getMinutes() + durationMinutes);

//       if (nextTime <= endTime) {
//         availableTimes.push({
//           date: appointment.appointmentDate,
//           startTime: currentTime.toTimeString().slice(0, 5), // Format as HH:MM
//           endTime: nextTime.toTimeString().slice(0, 5), // Format as HH:MM
//         });
//       }

//       currentTime.setMinutes(currentTime.getMinutes() + 30); // Increment by 30 minutes
//     }
//   });

//   console.log("availableTimes", availableTimes);

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

//   // Fetch the current event details
//   let currentEvent = null;
//   if (currentEventGoogleId) {
//     try {
//       const event = await calendar.events.get({
//         calendarId: GOOGLE_CALENDAR_ID,
//         eventId: currentEventGoogleId,
//       });
//       currentEvent = event.data;
//     } catch (error) {
//       console.error("Error fetching current event:", error);
//     }
//   }

//   let busyPeriods = busyTimes.data.calendars[GOOGLE_CALENDAR_ID].busy.map(
//     (period) => {
//       const start = period.start;
//       const end = period.end;

//       // Function to add or subtract minutes from a date-time string
//       const addMinutes = (dateTimeStr, minutes) => {
//         const [date, time] = dateTimeStr.split("T");
//         const [hours, minutesStr] = time.split(":");
//         const totalMinutes =
//           parseInt(hours) * 60 + parseInt(minutesStr) + minutes;
//         const newHours = Math.floor(totalMinutes / 60)
//           .toString()
//           .padStart(2, "0");
//         const newMinutes = (totalMinutes % 60).toString().padStart(2, "0");
//         return `${date}T${newHours}:${newMinutes}:00Z`;
//       };

//       // Function to convert date-time string to desired format
//       const formatDateTime = (dateTimeStr) => {
//         const [date, time] = dateTimeStr.split("T");
//         const [hours, minutes] = time.split(":");
//         return {
//           date,
//           time: `${hours}:${minutes}`,
//         };
//       };

//       const bufferedStart = addMinutes(start, -30); // Subtract 30 minutes from start
//       const bufferedEnd = addMinutes(end, 30); // Add 30 minutes to end

//       return {
//         date: formatDateTime(bufferedStart).date,
//         startTime: formatDateTime(bufferedStart).time,
//         endTime: formatDateTime(bufferedEnd).time,
//       };
//     }
//   );

//   console.log("busyPeriods", busyPeriods);

//   // Remove the current event from busyPeriods if it exists
//   if (currentEvent) {
//     const currentEventStart = new Date(
//       currentEvent.start.dateTime || currentEvent.start.date
//     );
//     const currentEventEnd = new Date(
//       currentEvent.end.dateTime || currentEvent.end.date
//     );

//     const currentEventDate = currentEventStart.toISOString().split("T")[0];
//     const currentEventStartTime = currentEventStart.toTimeString().slice(0, 5);
//     const currentEventEndTime = currentEventEnd.toTimeString().slice(0, 5);

//     busyPeriods = busyPeriods.filter(
//       (period) =>
//         !(
//           period.date === currentEventDate &&
//           period.startTime <= currentEventStartTime &&
//           period.endTime >= currentEventEndTime
//         )
//     );
//   }

//   // Filter out conflicting times
//   // const filteredAvailableTimes = availableTimes.filter((available) => {
//   //   return !busyPeriods.some((busy) => {
//   //     return (
//   //       available.date === busy.date &&
//   //       ((available.startTime >= busy.startTime &&
//   //         available.startTime < busy.endTime) ||
//   //         (available.endTime > busy.startTime &&
//   //           available.endTime <= busy.endTime) ||
//   //         (available.startTime <= busy.startTime &&
//   //           available.endTime >= busy.endTime))
//   //     );
//   //   });
//   // });

//   // Filter out conflicting times
//   const filteredAvailableTimes = availableTimes.filter((available) => {
//     const availableStart = new Date(
//       `${available.date}T${available.startTime}:00`
//     );
//     const availableEnd = new Date(`${available.date}T${available.endTime}:00`);

//     return !busyPeriods.some((busy) => {
//       const busyStart = new Date(`${busy.date}T${busy.startTime}:00`);
//       const busyEnd = new Date(`${busy.date}T${busy.endTime}:00`);

//       return (
//         (availableStart >= busyStart && availableStart < busyEnd) ||
//         (availableEnd > busyStart && availableEnd <= busyEnd) ||
//         (availableStart <= busyStart && availableEnd >= busyEnd)
//       );
//     });
//   });

//   // Filter out dates that are not greater than today
//   const today = new Date().toISOString().split("T")[0];
//   const futureAvailableTimes = filteredAvailableTimes.filter(
//     (available) => available.date > today
//   );

//   // Sort the results by date
//   const sortedAvailableTimes = futureAvailableTimes.sort(
//     (a, b) => new Date(a.date) - new Date(b.date)
//   );

//   // If the current event exists and is in the future, add it to the sorted available times
//   // if (currentEvent) {
//   //   const currentEventStart = new Date(
//   //     currentEvent.start.dateTime || currentEvent.start.date
//   //   );
//   //   const currentEventEnd = new Date(
//   //     currentEvent.end.dateTime || currentEvent.end.date
//   //   );

//   //   if (currentEventStart >= now) {
//   //     sortedAvailableTimes.push({
//   //       date: currentEventStart.toISOString().split("T")[0],
//   //       startTime: currentEventStart.toTimeString().slice(0, 5),
//   //       endTime: currentEventEnd.toTimeString().slice(0, 5),
//   //       isCurrentAppointment: true,
//   //     });

//   //     // Re-sort the array to ensure the current appointment is in the correct position
//   //     sortedAvailableTimes.sort((a, b) => new Date(a.date) - new Date(b.date));
//   //   }
//   // }

//   console.log("Available times:", sortedAvailableTimes);
//   return sortedAvailableTimes;
// };

//this function works in both development and production, but needs to add current appointment time to the available times

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

  console.log("Available times:", sortedAvailableTimes);
  return sortedAvailableTimes;
};

//working version (production)
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
  console.log("appointmentTime", appointmentTime, appointmentDate);

  const session = await getSession();
  if (!session) {
    return serializeDocument({
      success: false,
      message: "You must be logged in to reschedule an appointment.",
    });
  }

  const { _id, firstName, lastName, email } = session.resultObj;

  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);

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

  console.log("formattedStartTime", formattedStartTime);
  console.log("formattedEndTime", formattedEndTime);

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
        summary: `[Pending Confirmation] Massage Appointment for ${firstName} ${lastName}`,
        location: location,
        description: `${duration} minute massage at ${workplace}\n\nStatus: Pending Confirmation\nClient Email: ${email}\n\nPlease confirm this appointment.`,
        start: {
          dateTime: `${formattedDate}T${formattedStartTime}:00`,
          timeZone: "America/Toronto",
        },
        end: {
          dateTime: `${formattedDate}T${formattedEndTime}:00`,
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
        status: "booked",
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
