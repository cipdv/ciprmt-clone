export function getStandardReminderEmail(appointment) {
  return {
    text: `
      Hi ${appointment.firstName},

      This is a friendly reminder that you have a massage appointment scheduled for ${appointment.appointmentDate}, at ${appointment.appointmentBeginsAt}.

      Location: ${appointment.location}
      Duration: ${appointment.duration} minutes

      If you need to make any changes, please contact me as soon as possible:
      - Email: ${process.env.EMAIL_USER}
      - Phone: 416-258-1230

      Best regards,
      Cip
    `,
    html: `
      <h2>Reminder: Your Upcoming Massage Appointment</h2>
      <p>Hi ${appointment.firstName},</p>
      <p>This is a friendly reminder that you have a massage appointment scheduled for ${appointment.appointmentDate}, at ${appointment.appointmentBeginsAt}.</p>
      <ul>
        <li><strong>Location:</strong> ${appointment.location}</li>
        <li><strong>Duration:</strong> ${appointment.duration} minutes</li>
      </ul>
      <p>If you need to make any changes, please contact me as soon as possible:</p>
      <ul>
        <li>Email: <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></li>
        <li>Phone: 416-258-1230</li>
      </ul>
      <p>Best regards,<br>Cip</p>
    `,
  };
}

export function getConsentFormReminderEmail(appointment) {
  const consentFormUrl = `https://www.ciprmt.com/dashboard/patient`;
  return {
    text: `
      Hi ${appointment.firstName},

      This is a friendly reminder that you have a massage appointment scheduled for ${appointment.appointmentDate}, at ${appointment.appointmentBeginsAt}.

      Location: ${appointment.location}
      Duration: ${appointment.duration} minutes

      IMPORTANT: Please take a moment to fill out the consent form before your appointment: ${consentFormUrl}

      Completing the consent form in advance will save time during your visit and ensure I have all the necessary information to provide you with the best possible care.

      If you need to make any changes, please contact me as soon as possible:
      - Email: ${process.env.EMAIL_USER}
      - Phone: 416-258-1230

      Best regards,
      Cip
    `,
    html: `
      <h2>Reminder: Your Upcoming Massage Appointment</h2>
      <p>Hi ${appointment.firstName},</p>
      <p>This is a friendly reminder that you have a massage appointment scheduled for ${appointment.appointmentDate}, at ${appointment.appointmentBeginsAt}.</p>
      <ul>
        <li><strong>Location:</strong> ${appointment.location}</li>
        <li><strong>Duration:</strong> ${appointment.duration} minutes</li>
      </ul>
      <p><strong>IMPORTANT:</strong> Please take a moment to fill out the consent form before your appointment:</p>
      <p><a href="${consentFormUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block;">Complete Consent Form</a></p>
      <p>Completing the consent form in advance will save time during your visit and ensure I have all the necessary information to provide you with the best possible care.</p>
      <p>If you need to make any changes, please contact me as soon as possible:</p>
      <ul>
        <li>Email: <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></li>
        <li>Phone: 416-258-1230</li>
      </ul>
      <p>Best regards,<br>Cip</p>
    `,
  };
}
