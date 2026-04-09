const defaultServices = [
  { service: "Massage Therapy", duration: 60, price: 115, plusHst: true },
  { service: "Massage Therapy", duration: 75, price: 135, plusHst: true },
  { service: "Massage Therapy", duration: 90, price: 155, plusHst: true },
];

const defaultScheduleLines = [
  "Sunday - Tuesday: 11:00am - 6:30pm",
  "Friday: 11:00am - 4:30pm",
];

const fallbackLocation = {
  streetAddress: "268 Shuter Street",
  city: "Toronto",
  province: "ON",
  phone: "416-258-1230",
  email: "cipdevries@ciprmt.com",
};

const formatPrice = (value) =>
  `$${(Number(value) || 0).toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPhoneForDisplay = (phoneValue) => {
  const digits = String(phoneValue || "").replace(/\D/g, "");
  if (digits.length !== 10) return phoneValue || "";
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const ServicesAndRates = ({ settings }) => {
  const services = settings?.services?.length ? settings.services : defaultServices;
  const scheduleLines = settings?.scheduleLines?.length
    ? settings.scheduleLines
    : defaultScheduleLines;
  const location = settings?.location || fallbackLocation;
  const mapEmbedSrc =
    settings?.mapEmbedSrc ||
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2041.1059380687564!2d-79.36814617403721!3d43.6573282117439!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89d4cb38873a2897%3A0xcc99cf3a3c62ca42!2s268%20Shuter%20St%2C%20Toronto%2C%20ON%20M5A%201W3!5e0!3m2!1sen!2sca!4v1720976663394!5m2!1sen!2sca";

  return (
    <div className="bg-gray-700 py-12 px-6 sm:py-16 md:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-8 lg:space-y-0 lg:space-x-8">
          <div className="w-full lg:w-1/2 space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white">
              Services and Rates
            </h2>
            <p className="text-white text-sm sm:text-base">
              I offer a style of massage strongly influenced by Thai massage, as
              well as incorporating myofascial release, trigger point therapy,
              and deep tissue techniques.
            </p>
            <div className="text-white text-sm sm:text-base">
              {services.map((service, index) => (
                <p key={`${service.service}-${service.duration}-${index}`}>
                  {service.duration} minutes - {formatPrice(service.price)}{" "}
                  {service.plusHst ? "+hst" : ""}
                </p>
              ))}
            </div>
          </div>
          <div className="w-full lg:w-1/2 space-y-8">
            <div className="w-full">
              <iframe
                src={mapEmbedSrc}
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl text-white font-semibold mb-2">
                  Location:
                </h3>
                {location.locationName ? (
                  <p className="text-white text-sm sm:text-base">
                    {location.locationName}
                  </p>
                ) : null}
                <p className="text-white text-sm sm:text-base">
                  {location.streetAddress}
                </p>
                <p className="text-white text-sm sm:text-base">
                  {[location.city, location.province, location.postalCode]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              </div>
              <div>
                <h3 className="text-xl text-white font-semibold mb-2">
                  Hours:
                </h3>
                {scheduleLines.map((line) => (
                  <p key={line} className="text-white text-sm sm:text-base">
                    {line}
                  </p>
                ))}
              </div>
              <div>
                <h3 className="text-xl text-white font-semibold mb-2">
                  Contact:
                </h3>
                <p className="text-white text-sm sm:text-base">
                  Phone: {formatPhoneForDisplay(location.phone || fallbackLocation.phone)}
                </p>
                <p className="text-white text-sm sm:text-base">
                  Email:{" "}
                  <a
                    href={`mailto:${location.email || fallbackLocation.email}`}
                    className="underline hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                  >
                    {location.email || fallbackLocation.email}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesAndRates;

// import React from "react";

// const ServicesAndRates = () => {
//   return (
//     <div className="bg-gray-700 py-12 px-6 sm:py-16 md:py-20 lg:py-24">
//       <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
//         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-8 lg:space-y-0 lg:space-x-8">
//           <div className="w-full lg:w-1/2 space-y-4">
//             <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white">
//               Services and Rates
//             </h2>
//             <p className="text-white text-sm sm:text-base">
//               I offer a style of massage strongly influenced by Thai massage, as
//               well as incorporating myofascial release, trigger point therapy,
//               and deep tissue techniques.
//             </p>
//             <div className="text-white text-sm sm:text-base">
//               <p>60 minutes - $115 +hst</p>
//               <p>75 minutes - $135 +hst</p>
//               <p>90 minutes - $155 +hst</p>
//             </div>
//           </div>
//           <div className="w-full lg:w-1/2 space-y-8">
//             <div className="w-full">
//               <iframe
//                 src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2041.1059380687564!2d-79.36814617403721!3d43.6573282117439!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89d4cb38873a2897%3A0xcc99cf3a3c62ca42!2s268%20Shuter%20St%2C%20Toronto%2C%20ON%20M5A%201W3!5e0!3m2!1sen!2sca!4v1720976663394!5m2!1sen!2sca"
//                 width="100%"
//                 height="300"
//                 style={{ border: 0 }}
//                 allowFullScreen=""
//                 loading="lazy"
//                 referrerPolicy="no-referrer-when-downgrade"
//               ></iframe>
//             </div>
//             <div className="space-y-4">
//               <div>
//                 <h3 className="text-xl text-white font-semibold mb-2">
//                   Location:
//                 </h3>
//                 <p className="text-white text-sm sm:text-base">
//                   268 Shuter Street
//                 </p>
//                 <p className="text-white text-sm sm:text-base">Toronto ON</p>
//               </div>
//               <div>
//                 <h3 className="text-xl text-white font-semibold mb-2">
//                   Contact:
//                 </h3>
//                 <p className="text-white text-sm sm:text-base">
//                   Phone: 416-258-1230
//                 </p>
//                 <p className="text-white text-sm sm:text-base">
//                   <a
//                     href="mailto:cipdevries@ciprmt.com"
//                     className="underline hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
//                   >
//                     cipdevries@ciprmt.com
//                   </a>
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ServicesAndRates;
