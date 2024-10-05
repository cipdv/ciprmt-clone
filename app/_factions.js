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
