export async function bookAppointment({
  location,
  duration,
  appointmentTime,
  workplace,
  appointmentDate,
  RMTLocationId,
}) {
  console.log("bookAppointment called with params:", {
    location,
    duration,
    appointmentTime,
    workplace,
    appointmentDate,
    RMTLocationId,
  });

  const session = await getSession();
  console.log("Session:", session);

  if (!session || !session.resultObj) {
    console.error("No session or resultObj found");
    return {
      success: false,
      message: "You must be logged in to book an appointment.",
    };
  }

  const { id, firstName, lastName, email, phoneNumber } = session.resultObj;
  console.log("User data:", { id, firstName, lastName, email, phoneNumber });

  // Ensure appointmentDate is in "YYYY-MM-DD" format
  const formattedDate = new Date(appointmentDate).toISOString().split("T")[0];
  console.log("Formatted date:", formattedDate);

  // Convert appointmentTime to "HH:MM" (24-hour format)
  const startDateTime = new Date(`${appointmentDate} ${appointmentTime}`);
  const formattedStartTime = startDateTime.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  console.log("Formatted start time:", formattedStartTime);

  // Calculate end time
  const endDateTime = new Date(
    startDateTime.getTime() + parseInt(duration) * 60000
  );
  const formattedEndTime = endDateTime.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  console.log("Formatted end time:", formattedEndTime);

  try {
    console.log("Searching for available appointment with criteria:", {
      rmt_location_id: RMTLocationId,
      date: formattedDate,
      start_time: formattedStartTime,
      end_time: formattedEndTime,
    });

    // Find an available appointment that matches the criteria
    const { rows: availableAppointments } = await sql`
      SELECT id
      FROM treatments
      WHERE rmt_location_id = ${RMTLocationId}
      AND date = ${formattedDate}::date
      AND appointment_begins_at <= ${formattedStartTime}::time
      AND appointment_ends_at >= ${formattedEndTime}::time
      AND status = 'available'
      LIMIT 1
    `;

    console.log("Available appointments found:", availableAppointments);

    if (availableAppointments.length === 0) {
      console.error("No matching appointment found");
      return {
        success: false,
        message:
          "No matching appointment found. Please try again or contact support.",
      };
    }

    const appointmentId = availableAppointments[0].id;
    console.log("Selected appointment ID:", appointmentId);

    // Create Google Calendar event
    console.log("Creating Google Calendar event");
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

    console.log("Google Calendar event data:", event);

    const createdEvent = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      resource: event,
    });

    console.log("Google Calendar event created:", {
      id: createdEvent.data.id,
      link: createdEvent.data.htmlLink,
    });

    // Update the appointment
    console.log("Updating appointment with ID:", appointmentId);
    const updateResult = await sql`
      UPDATE treatments
      SET 
        status = 'requested',
        location = ${location},
        appointment_begins_at = ${formattedStartTime}::time,
        appointment_ends_at = ${formattedEndTime}::time,
        client_id = ${id},
        duration = ${parseInt(duration)},
        workplace = ${workplace},
        google_calendar_event_id = ${createdEvent.data.id},
        google_calendar_event_link = ${createdEvent.data.htmlLink}
      WHERE id = ${appointmentId}
      RETURNING id, status, client_id
    `;

    console.log("Update result:", updateResult);

    if (updateResult.rowCount === 0) {
      console.error("Failed to update appointment");

      // If update failed, delete the Google Calendar event
      console.log("Deleting Google Calendar event due to failed update");
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
    console.log("Logging audit event");
    await logAuditEvent({
      typeOfInfo: "appointment booking",
      actionPerformed: "appointment booked",
      accessedBy: `${firstName} ${lastName}`,
      whoseInfo: `${firstName} ${lastName}`,
      additionalDetails: {
        userId: id,
        appointmentId: appointmentId,
        appointmentDate: formattedDate,
        appointmentTime: formattedStartTime,
        duration: duration,
        location: location,
        workplace: workplace,
      },
    });

    // Send email notification
    console.log("Sending email notification");
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

    console.log("Email sent successfully");
    console.log("Appointment booking completed successfully");

    revalidatePath("/dashboard/patient");
    redirect("/dashboard/patient");
  } catch (error) {
    console.error("Error in bookAppointment:", error);
    console.error("Error stack:", error.stack);

    // Log more details about the error
    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
    }

    return {
      success: false,
      message: "An error occurred while booking the appointment.",
    };
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
      appointment_ends_at
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
        `${appointmentDate}T${appointment.appointment_begins_at}`
      );
      const endTime = new Date(
        `${appointmentDate}T${appointment.appointment_ends_at}`
      );

      // Check if the appointment duration fits within the available time slot
      if (endTime.getTime() - startTime.getTime() >= durationMinutes * 60000) {
        availableTimes.push({
          date: appointmentDate,
          startTime: appointment.appointment_begins_at.slice(0, 5), // Format as HH:MM
          endTime: appointment.appointment_ends_at.slice(0, 5), // Format as HH:MM
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
        `${appointmentDate}T${appointment.appointment_begins_at}`
      );
      const endTime = new Date(
        `${appointmentDate}T${appointment.appointment_ends_at}`
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
