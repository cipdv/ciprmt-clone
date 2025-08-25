export function getStandardReminderEmail(appointment) {
  return {
    text: `
      Hi ${appointment.firstName},

      This is a friendly reminder that you have a massage appointment scheduled for ${appointment.appointmentDate}, at ${appointment.appointmentBeginsAt}.

      Location: ${appointment.location}
      Duration: ${appointment.duration} minutes

      APPOINTMENT DETAILS:

      Location Instructions:
      The entrance is at the rear of the building. Open the wooden gate, and ring the doorbell at the first door on your right.

      Please plan to arrive no earlier than 10 minutes before your appointment as I may still need time to clean and disinfect after the previous appointment.

      Parking:
      There is free parking for up to 1 hour available at the side of the building, on Berkeley Street and free street parking available on Shuter Street and Berkeley Street.

      What to wear:
      Thai massage is practiced over clothing, so please bring comfortable, loose fitting clothing that you will be able to stretch in, including shorts or pants, and a short sleeved t-shirt made from soft natural fabric like cotton, bamboo, or hemp. You may change clothing here, or come fully dressed.

      What NOT to wear:
      - Strong scents. Please do not wear perfume or cologne - strong scents can linger and be uncomfortable for some people.
      - Clothing with zippers
      - Slippery fabrics like polyester, lycra, spandex
      - Shirts without sleeves (For example: tank tops)
      - Extremely short shorts - aim for knee length or lower
      - Jewellery - rings, necklaces, bracelets, watches, etc.
      - Lotions or creams

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
      
      <h3>Appointment Details:</h3>
      
      <h4>Location Instructions:</h4>
      <p>The entrance is at the rear of the building. Open the wooden gate, and ring the doorbell at the first door on your right.</p>
      <p>Please plan to arrive no earlier than 10 minutes before your appointment as I may still need time to clean and disinfect after the previous appointment.</p>
      
      <h4>Parking:</h4>
      <p>There is free parking for up to 1 hour available at the side of the building, on Berkeley Street and free street parking available on Shuter Street and Berkeley Street.</p>
      
      <h4>What to wear:</h4>
      <p>Thai massage is practiced over clothing, so please bring <strong>comfortable, loose fitting clothing</strong> that you will be able to stretch in, including shorts or pants, and a short sleeved t-shirt made from soft natural fabric like cotton, bamboo, or hemp.</p>
      <p>You may change clothing here, or come fully dressed.</p>
      
      <h4>What NOT to wear:</h4>
      <ul>
        <li>Strong scents. <strong>Please do not wear perfume or cologne</strong> - strong scents can linger and be uncomfortable for some people.</li>
        <li>Clothing with zippers</li>
        <li>Slippery fabrics like polyester, lycra, spandex</li>
        <li>Shirts without sleeves (For example: tank tops)</li>
        <li>Extremely short shorts - aim for knee length or lower</li>
        <li>Jewellery - rings, necklaces, bracelets, watches, etc.</li>
        <li>Lotions or creams</li>
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

      APPOINTMENT DETAILS:

      Location Instructions:
      The entrance is at the rear of the building. Open the wooden gate, and ring the doorbell at the first door on your right.

      Please plan to arrive no earlier than 10 minutes before your appointment as I may still need time to clean and disinfect after the previous appointment.

      Parking:
      There is free parking for up to 1 hour available at the side of the building, on Berkeley Street and free street parking available on Shuter Street and Berkeley Street.

      What to wear:
      Thai massage is practiced over clothing, so please bring comfortable, loose fitting clothing that you will be able to stretch in, including shorts or pants, and a short sleeved t-shirt made from soft natural fabric like cotton, bamboo, or hemp. You may change clothing here, or come fully dressed.

      What NOT to wear:
      - Strong scents. Please do not wear perfume or cologne - strong scents can linger and be uncomfortable for some people.
      - Clothing with zippers
      - Slippery fabrics like polyester, lycra, spandex
      - Shirts without sleeves (For example: tank tops)
      - Extremely short shorts - aim for knee length or lower
      - Jewellery - rings, necklaces, bracelets, watches, etc.
      - Lotions or creams

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
      
      <h3>Appointment Details:</h3>
      
      <h4>Location Instructions:</h4>
      <p>The entrance is at the rear of the building. Open the wooden gate, and ring the doorbell at the first door on your right.</p>
      <p>Please plan to arrive no earlier than 10 minutes before your appointment as I may still need time to clean and disinfect after the previous appointment.</p>
      
      <h4>Parking:</h4>
      <p>There is free parking for up to 1 hour available at the side of the building, on Berkeley Street and free street parking available on Shuter Street and Berkeley Street.</p>
      
      <h4>What to wear:</h4>
      <p>Thai massage is practiced over clothing, so please bring <strong>comfortable, loose fitting clothing</strong> that you will be able to stretch in, including shorts or pants, and a short sleeved t-shirt made from soft natural fabric like cotton, bamboo, or hemp.</p>
      <p>You may change clothing here, or come fully dressed.</p>
      
      <h4>What NOT to wear:</h4>
      <ul>
        <li>Strong scents. <strong>Please do not wear perfume or cologne</strong> - strong scents can linger and be uncomfortable for some people.</li>
        <li>Clothing with zippers</li>
        <li>Slippery fabrics like polyester, lycra, spandex</li>
        <li>Shirts without sleeves (For example: tank tops)</li>
        <li>Extremely short shorts - aim for knee length or lower</li>
        <li>Jewellery - rings, necklaces, bracelets, watches, etc.</li>
        <li>Lotions or creams</li>
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

// export function getStandardReminderEmail(appointment) {
//   return {
//     text: `
//       Hi ${appointment.firstName},

//       This is a friendly reminder that you have a massage appointment scheduled for ${appointment.appointmentDate}, at ${appointment.appointmentBeginsAt}.

//       Location: ${appointment.location}
//       Duration: ${appointment.duration} minutes

//       If you need to make any changes, please contact me as soon as possible:
//       - Email: ${process.env.EMAIL_USER}
//       - Phone: 416-258-1230

//       Best regards,
//       Cip
//     `,
//     html: `
//       <h2>Reminder: Your Upcoming Massage Appointment</h2>
//       <p>Hi ${appointment.firstName},</p>
//       <p>This is a friendly reminder that you have a massage appointment scheduled for ${appointment.appointmentDate}, at ${appointment.appointmentBeginsAt}.</p>
//       <ul>
//         <li><strong>Location:</strong> ${appointment.location}</li>
//         <li><strong>Duration:</strong> ${appointment.duration} minutes</li>
//       </ul>
//       <p>If you need to make any changes, please contact me as soon as possible:</p>
//       <ul>
//         <li>Email: <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></li>
//         <li>Phone: 416-258-1230</li>
//       </ul>

//       <p>

//       <p>Best regards,<br>Cip</p>
//     `,
//   };
// }

// export function getConsentFormReminderEmail(appointment) {
//   const consentFormUrl = `https://www.ciprmt.com/dashboard/patient`;
//   return {
//     text: `
//       Hi ${appointment.firstName},

//       This is a friendly reminder that you have a massage appointment scheduled for ${appointment.appointmentDate}, at ${appointment.appointmentBeginsAt}.

//       Location: ${appointment.location}
//       Duration: ${appointment.duration} minutes

//       IMPORTANT: Please take a moment to fill out the consent form before your appointment: ${consentFormUrl}

//       Completing the consent form in advance will save time during your visit and ensure I have all the necessary information to provide you with the best possible care.

//       If you need to make any changes, please contact me as soon as possible:
//       - Email: ${process.env.EMAIL_USER}
//       - Phone: 416-258-1230

//       Best regards,
//       Cip
//     `,
//     html: `
//       <h2>Reminder: Your Upcoming Massage Appointment</h2>
//       <p>Hi ${appointment.firstName},</p>
//       <p>This is a friendly reminder that you have a massage appointment scheduled for ${appointment.appointmentDate}, at ${appointment.appointmentBeginsAt}.</p>
//       <ul>
//         <li><strong>Location:</strong> ${appointment.location}</li>
//         <li><strong>Duration:</strong> ${appointment.duration} minutes</li>
//       </ul>
//       <p><strong>IMPORTANT:</strong> Please take a moment to fill out the consent form before your appointment:</p>
//       <p><a href="${consentFormUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block;">Complete Consent Form</a></p>
//       <p>Completing the consent form in advance will save time during your visit and ensure I have all the necessary information to provide you with the best possible care.</p>
//       <p>If you need to make any changes, please contact me as soon as possible:</p>
//       <ul>
//         <li>Email: <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></li>
//         <li>Phone: 416-258-1230</li>
//       </ul>
//       <p>Best regards,<br>Cip</p>
//     `,
//   };
// }
