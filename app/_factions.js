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
