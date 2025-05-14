// Format a date string (YYYY-MM-DD) to a more readable format
export function formatDateForDisplay(dateString) {
  if (!dateString) return "Not specified";

  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format a time string (HH:MM:SS) to a more readable format
export function formatTimeForDisplay(timeString) {
  if (!timeString) return "Not specified";

  // Parse the time string (HH:MM:SS)
  const [hours, minutes] = timeString.split(":");

  // Create a date object to use the built-in formatting
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
