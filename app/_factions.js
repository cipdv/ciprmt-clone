export const getAvailableAppointments = async (
  rmtLocationId,
  duration,
  currentEventGoogleId
) => {
  const db = await getDatabase();
  const appointmentsCollection = db.collection("appointments");

  // Convert duration to an integer
  const durationMinutes = parseInt(duration, 10);

  // Fetch appointments with the given rmtLocationId and status 'available'
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
