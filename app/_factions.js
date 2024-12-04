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

    // Log the audit event
    await logAuditEvent({
      typeOfInfo: "appointment booking",
      actionPerformed: "appointment booked",
      accessedBy: `${firstName} ${lastName}`,
      whoseInfo: `${firstName} ${lastName}`,
      additionalDetails: {
        userId: _id.toString(),
        appointmentId: appointmentId,
        appointmentDate: formattedDate,
        appointmentTime: formattedStartTime,
        duration: duration,
        location: location,
        workplace: workplace,
      },
    });

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
