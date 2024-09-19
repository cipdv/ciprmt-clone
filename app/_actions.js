"use server";

//database
import dbConnection from "./lib/database/dbconnection";
import { ObjectId } from "mongodb";
import { getDatabase } from "./lib/database/dbconnection";
//dependencies
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
//auth
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
//schemas
import { registerPatientSchema, loginSchema } from "./lib/zod/zodSchemas";

import client from "./lib/database/db";

////////////////////////////////////////////////////////////////
////////////////////AUTH////////////////////////////////////////
////////////////////////////////////////////////////////////////

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
    return currentUser;
  }
  return null;
};

export async function registerNewPatient(prevState, formData) {
  // Convert the form data to an object
  const formDataObj = Object.fromEntries(formData.entries());

  // Normalize the email address
  formDataObj.email = formDataObj.email.toLowerCase().trim();

  // Capitalize the first letter of the first name and preferred name
  formDataObj.firstName =
    formDataObj.firstName.charAt(0).toUpperCase() +
    formDataObj.firstName.slice(1);
  formDataObj.preferredName =
    formDataObj.preferredName.charAt(0).toUpperCase() +
    formDataObj.preferredName.slice(1);
  formDataObj.phone = formDataObj.phone.replace(/\D/g, "");

  // Validate the form data
  const result = registerPatientSchema.safeParse(formDataObj);

  if (result.error) {
    // Find the error related to the password length
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

    // If the error exists, return a custom message
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

  //check if passwords match
  if (password !== confirmPassword) {
    return { confirmPassword: "^ Passwords do not match" };
  }

  try {
    const db = await getDatabase();

    //check if user already exists
    const patientExists = await db
      .collection("users")
      .findOne({ email: email });

    if (patientExists) {
      return { email: "^ This email is already registered" };
    }

    //hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //create new user
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

    //remove password from the object
    let resultObj = { ...newPatient };
    delete resultObj.password;

    // Create the session
    const expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    const session = await encrypt({ resultObj, expires });

    // Save the session in a cookie
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
  // Convert the form data to an object
  const formDataObj = Object.fromEntries(formData.entries());
  formDataObj.rememberMe = formDataObj.rememberMe === "on";

  // Normalize the email address
  formDataObj.email = formDataObj.email.toLowerCase().trim();

  // Validate the form data
  const { success, data, error } = loginSchema.safeParse(formDataObj);

  if (!success) {
    return { message: error.message };
  }

  const user = data;

  // const dbClient = await dbConnection;
  // const db = await dbClient.db(process.env.DB_NAME);
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

  //remove password from the object
  let resultObj = { ...result };
  delete resultObj.password;

  // Create a session token
  const expires = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ resultObj, expires });

  // Save the session in a cookie
  //   cookies().set("session", session, { expires, httpOnly: true });
  cookies().set("session", session, { expires, httpOnly: true, secure: true });

  revalidatePath("/");
  redirect("/");
}

export async function logout() {
  // Destroy the session
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

  // Refresh the session so it doesn't expire
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

////////////////////////////////////////////////////////////////
////////////////SCHEDULE SETUP//////////////////////////////////
////////////////////////////////////////////////////////////////

export async function submitScheduleSetup(prevState, formData) {
  console.log(formData);
  return;
}

////////////////////////////////////////////////////////////////
//////////////////////TREATMENTS////////////////////////////////
////////////////////////////////////////////////////////////////

export async function getAllTreatments() {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const treatments = await db.collection("treatments").find({}).toArray();
  return treatments;
}

export async function getTreatmentById(id) {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const treatment = await db
    .collection("treatments")
    .findOne({ _id: new ObjectId(id) }); // use 'new' keyword
  return treatment;
}

export async function getAllUsers() {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const users = await db.collection("users").find({}).toArray();
  return users;
}

export async function getAllSurveys() {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const surveys = await db.collection("surveys").find({}).toArray();
  return surveys;
}

////////////////////////////////////////////////////////////////
//////////////////////RECEIPTS//////////////////////////////////
////////////////////////////////////////////////////////////////

//get all receipts/treatments for a specific user
export async function getReceipts(id) {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const receipts = await db
    .collection("treatments")
    .find({ clientId: id })
    .toArray();
  return receipts;
}

////////////////////////////////////////////////////////////////
//////////////////////RMT SETUP/////////////////////////////////
////////////////////////////////////////////////////////////////

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
    return phone; // Return the original phone if it doesn't match the expected format
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

      // Generate appointment dates for the next 8 weeks
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
            // Calculate the expiry date as 1 week after the appointmentDate
            const expiryDate = new Date(appointmentDate);
            expiryDate.setDate(expiryDate.getDate() + 7);

            appointments.push({
              RMTLocationId: result.insertedId,
              appointmentDate: appointmentDate.toISOString().split("T")[0],
              appointmentStartTime: timeSlot.start, // Use the start time from the appointmentTimes array
              appointmentEndTime: timeSlot.end, // Use the end time from the appointmentTimes array
              status: "available",
              expiryDate: expiryDate, // Add the expiry date
            });
          }
        }
      }

      // Insert appointments into the appointments collection
      const appointmentResult = await db
        .collection("appointments")
        .insertMany(appointments);
      if (appointmentResult.acknowledged) {
        console.log("Appointments inserted:", appointmentResult.insertedCount);

        // Create a TTL index on the expiryDate field
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

  return setupArray;
};

////////////////////////////////////////////////////
////////// GOOGLE CALENDAR API /////////////////////
////////////////////////////////////////////////////

////////////////////////////////////////////////////
////////// MASSAGE APPOINTMENTS ////////////////////
////////////////////////////////////////////////////

//get all appointments for a specific user
export async function getUsersAppointments(id) {
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const appointments = await db
    .collection("appointments")
    .find({ userId: id })
    .toArray();
  return appointments;
}

//get all available appointments for a specific RMT

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

    return result;
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

//book an appointment - user
export async function bookAppointment({
  location,
  duration,
  appointmentTime,
  workplace,
  appointmentDate,
  RMTLocationId,
}) {
  //send email to RMT to notify of appt booking, ask to confirm
  //add to google calendar as "pending"? or wait until rmt confirms
  //send email to patient to confirm - can I delay this to 48 hours before the appointment?
  //send email to patient to remind them of the appointment 24 hours before

  // Check if the user is logged in
  const session = await getSession();
  if (!session) {
    return {
      message: "You must be logged in to book an appointment.",
    };
  }

  // Extract the user ID from the session
  const { _id } = session.resultObj;

  // Connect to the database
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);

  function addDurationToTime(appointmentTime, duration) {
    // Split the appointmentTime into hours and minutes
    const [hours, minutes] = appointmentTime.split(":").map(Number);

    // Convert duration to a number
    const durationInMinutes = Number(duration);

    // Create a new Date object with today's date and the specified time
    const date = new Date();
    date.setHours(hours, minutes, 0, 0); // Set hours, minutes, and zero out seconds and milliseconds

    // Add the duration in minutes
    date.setMinutes(date.getMinutes() + durationInMinutes);

    // Get the updated hours and minutes
    const updatedHours = String(date.getHours()).padStart(2, "0");
    const updatedMinutes = String(date.getMinutes()).padStart(2, "0");

    // Return the result in hh:mm format
    return `${updatedHours}:${updatedMinutes}`;
  }

  // Example usage:
  const apttime = "15:30";
  const dur = "60"; // Duration as a string
  const formattedEndTime = addDurationToTime(appointmentTime, duration);

  try {
    // Find the document with the same location, appointmentDate, and where appointmentTime fits within appointmentStartTime and appointmentEndTime
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

//cancel an appointment - user
export const cancelAppointment = async (prevState, formData) => {
  // Check if the user is logged in
  const session = await getSession();
  if (!session) {
    return {
      message: "You must be logged in to cancel an appointment.",
    };
  }

  // Extract the user ID from the session
  const { _id } = session.resultObj;

  // Connect to the database
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
  // redirect("/dashboard/patient");
};

//cancel an appointment - RMT
//change an appointment - user

//change an appointment - RMT

export async function getAppointmentById(id) {
  // Connect to the database
  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);

  try {
    const appointment = await db.collection("appointments").findOne({
      _id: new ObjectId(id),
    });

    if (!appointment) {
      return null;
    }

    // Convert ObjectId to string for serialization
    return {
      ...appointment,
      _id: appointment._id.toString(),
      userId: appointment.userId.toString(),
      RMTLocationId: appointment.RMTLocationId.toString(),
    };
  } catch (error) {
    console.error("Error fetching appointment:", error);
    throw new Error("Failed to fetch appointment");
  }
}
//confirm an appointment - RMT

//confirm an appointment - user
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
      // Revalidate the patient dashboard page
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

//reschedule an appointment - user - set to rescheduling
export async function setAppointmentStatus(appointmentId, status) {
  const db = await getDatabase();

  try {
    const appointment = await db
      .collection("appointments")
      .findOne({ _id: new ObjectId(appointmentId) });

    if (!appointment) {
      throw new Error(`Appointment not found with id: ${appointmentId}`);
    }

    // If the appointment is already in the desired status, return success without updating
    if (appointment.status === status) {
      return {
        success: true,
        message: `Appointment is already in ${status} status`,
      };
    }

    const result = await db
      .collection("appointments")
      .updateOne(
        { _id: new ObjectId(appointmentId) },
        { $set: { status: status } }
      );

    if (result.modifiedCount === 1) {
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

//get all available and rescheduling status appointments for user
export async function getAllAvailableAppointments(rmtLocationId, duration) {
  console.log(
    `getAllAvailableAppointments called with rmtLocationId: ${rmtLocationId}, duration: ${duration}`
  );

  const db = await getDatabase();

  try {
    const objectId = new ObjectId(rmtLocationId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split("T")[0];

    console.log(
      `Fetching appointments for RMTLocationId: ${rmtLocationId}, duration: ${duration}, date >= ${todayString}`
    );

    const appointments = await db
      .collection("appointments")
      .find({
        RMTLocationId: objectId,
        status: { $in: ["available", "rescheduling"] },
        appointmentDate: { $gte: todayString },
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

    return result;
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
  // Check if the user is logged in
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: "You must be logged in to reschedule an appointment.",
    };
  }

  // Extract the user ID from the session
  const { _id } = session.resultObj;

  // Connect to the database
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
    // Step 1: Change the status of the current appointment to "available" and clear consent info
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
      return {
        success: false,
        message: "Current appointment not found.",
      };
    }

    // Step 2: Book the new appointment
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

      // TODO: Implement these additional steps
      // Send email to RMT to notify of appointment rescheduling
      // Update Google Calendar event
      // Send email to patient to confirm rescheduling
      // Update reminder email for the new appointment time

      revalidatePath("/dashboard/patient");
      return {
        success: true,
        message: "Appointment rescheduled successfully.",
      };
    } else {
      console.log("No matching appointment found for rescheduling.");

      // If no new appointment was found, revert the status of the original appointment
      await db
        .collection("appointments")
        .updateOne(
          { _id: new ObjectId(currentAppointmentId) },
          { $set: { status: "booked", userId: _id } }
        );

      return {
        success: false,
        message: "No matching appointment found for rescheduling.",
      };
    }
  } catch (error) {
    console.error(
      "An error occurred while rescheduling the appointment:",
      error
    );
    return {
      success: false,
      message: "An error occurred while rescheduling the appointment.",
    };
  }
}
//get all appointments for a specific RMT - view their schedule
//block off time in the RMT's schedule
