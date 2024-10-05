import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";

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

  // Create a Date object in the America/Toronto time zone
  const torontoTime = (dateString, timeString) => {
    const date = new Date(`${dateString}T${timeString}`);
    return new Date(
      date.toLocaleString("en-US", { timeZone: "America/Toronto" })
    );
  };

  const startDateTime = torontoTime(appointmentDate, appointmentTime);
  const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

  const formatTimeForDB = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Toronto",
    });
  };

  const formattedStartTime = formatTimeForDB(startDateTime);
  const formattedEndTime = formatTimeForDB(endDateTime);

  console.log("startDateTime", startDateTime);
  console.log("endDateTime", endDateTime);
  console.log("formattedStartTime", formattedStartTime);
  console.log("formattedEndTime", formattedEndTime);

  try {
    const query = {
      RMTLocationId: new ObjectId(RMTLocationId),
      appointmentDate: appointmentDate,
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
        dateTime: startDateTime.toISOString(),
        timeZone: "America/Toronto",
      },
      end: {
        dateTime: endDateTime.toISOString(),
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

    if (result.matchedCount > 0) {
      console.log("Appointment updated successfully.");
      revalidatePath("/dashboard/patient");
      return {
        success: true,
        message: "Appointment booked successfully.",
      };
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
        success: false,
        message:
          "No matching appointment found. Please try again or contact support.",
      };
    }
  } catch (error) {
    console.error("An error occurred while updating the appointment:", error);
    return {
      success: false,
      message: "An error occurred while booking the appointment.",
    };
  }
}
