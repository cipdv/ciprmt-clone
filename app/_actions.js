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

const secretKey = process.env.JWT_SECRET_KEY;
const key = new TextEncoder().encode(secretKey);

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

export async function getAvailableAppointments(rmtLocationId, duration) {
  console.log(
    `getAvailableAppointments called with rmtLocationId: ${rmtLocationId}, duration: ${duration}`
  );

  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);

  try {
    const objectId = new ObjectId(rmtLocationId);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowString = tomorrow.toISOString().split("T")[0];

    console.log(
      `Fetching appointments for RMTLocationId: ${rmtLocationId}, duration: ${duration}, date >= ${tomorrowString}`
    );

    const appointments = await db
      .collection("appointments")
      .find({
        RMTLocationId: objectId,
        status: "available",
        appointmentDate: { $gte: tomorrowString },
      })
      .sort({ appointmentDate: 1, appointmentStartTime: 1 })
      .toArray();

    console.log(`Found ${appointments.length} available appointments`);

    const groupedAppointments = appointments.reduce((acc, appointment) => {
      const date = appointment.appointmentDate;
      if (!acc[date]) {
        acc[date] = [];
      }

      const availableTimes = generateAvailableStartTimes(
        appointment,
        parseInt(duration)
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

function generateAvailableStartTimes(appointment, duration) {
  const availableTimes = [];
  const now = new Date();
  const startTime = new Date(
    `${appointment.appointmentDate}T${appointment.appointmentStartTime}`
  );
  const endTime = new Date(
    `${appointment.appointmentDate}T${appointment.appointmentEndTime}`
  );
  const durationMs = duration * 60 * 1000;

  let currentTime = startTime;

  while (currentTime.getTime() + durationMs <= endTime.getTime()) {
    if (currentTime > now) {
      availableTimes.push(currentTime.toTimeString().substr(0, 5));
    }
    currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
  }

  return availableTimes;
}

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

  const { _id } = session.resultObj;

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

    const update = {
      $set: {
        status: "booked",
        location: location,
        appointmentBeginsAt: appointmentTime,
        appointmentEndsAt: formattedEndTime,
        userId: _id,
        duration: duration,
        workplace: workplace,
      },
    };

    const result = await db.collection("appointments").updateOne(query, update);

    if (result.matchedCount > 0) {
      console.log("Appointment updated successfully.");
    } else {
      console.log("No matching appointment found.");
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

    const update = {
      $set: {
        status: "available",
        userId: null,
        duration: null,
        workplace: null,
        consentForm: null,
        consentFormSubmittedAt: null,
      },
    };

    const result = await db.collection("appointments").updateOne(query, update);

    if (result.matchedCount > 0) {
      console.log("Appointment updated successfully.");
      revalidatePath("/dashboard/patient");
      return {
        status: "success",
      };
    } else {
      console.log("No matching appointment found.");
      return {
        message: "No matching appointment found.",
        status: "error",
      };
    }
  } catch (error) {
    console.error("An error occurred while updating the appointment:", error);
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

export async function getAllAvailableAppointments(rmtLocationId, duration) {
  console.log(
    `getAllAvailableAppointments called with rmtLocationId: ${rmtLocationId}, duration: ${duration}`
  );

  const db = await getDatabase();

  try {
    const objectId = new ObjectId(rmtLocationId);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowString = tomorrow.toISOString().split("T")[0];

    console.log(
      `Fetching appointments for RMTLocationId: ${rmtLocationId}, duration: ${duration}, date >= ${tomorrowString}`
    );

    const appointments = await db
      .collection("appointments")
      .find({
        RMTLocationId: objectId,
        status: { $in: ["available", "rescheduling"] },
        appointmentDate: { $gte: tomorrowString },
      })
      .sort({ appointmentDate: 1, appointmentStartTime: 1 })
      .toArray();

    console.log(`Found ${appointments.length} available appointments`);

    const groupedAppointments = appointments.reduce((acc, appointment) => {
      const date = appointment.appointmentDate;
      if (!acc[date]) {
        acc[date] = [];
      }

      const availableTimes = generateAvailableStartTimes(
        appointment,
        parseInt(duration)
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

  const { _id } = session.resultObj;

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

      await db
        .collection("appointments")
        .updateOne(
          { _id: new ObjectId(currentAppointmentId) },
          { $set: { status: "booked", userId: _id } }
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
