import React from "react";
import Image from "next/image";
import Link from "next/link";

const ServicesAndRates = () => {
  return (
    <div className="bg-gray-700 ">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mx-auto max-w-7xl px-4 py-10">
        <div className="lg:w-1/2 px-4">
          <h2 className="text-3xl text-white">Services and Rates</h2>
          <p className="mt-4 text-white">
            I offer a style of massage strongly influenced by Thai massage, as
            well as incorporating myofascial release, trigger point therapy, and
            deep tissue techniques.
          </p>
          <p className="mt-4 text-white">
            60 minutes - $115 +hst
            <br />
            75 minutes - $135 +hst
            <br />
            90 minutes - $155 +hst
          </p>
        </div>
        <div className="flex flex-col lg:flex-row lg:w-1/2 mt-10 lg:mt-0">
          <div className="px-4 lg:pr-2">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2041.1059380687564!2d-79.36814617403721!3d43.6573282117439!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89d4cb38873a2897%3A0xcc99cf3a3c62ca42!2s268%20Shuter%20St%2C%20Toronto%2C%20ON%20M5A%201W3!5e0!3m2!1sen!2sca!4v1720976663394!5m2!1sen!2sca"
              width="400"
              height="300"
              loading="lazy"
            ></iframe>
          </div>
          <div className="px-4 lg:pl-2 mt-8">
            <h3 className="text-xl text-white mb-2">Location:</h3>
            <p className="text-white">268 Shuter Street</p>
            <p className="text-white">Toronto ON</p>
            <h3 className="text-xl text-white mb-2 mt-6">Contact:</h3>
            <p className="text-white">Phone: 416-258-1230</p>
            <p className="text-white">Email: cipdevries@ciprmt.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesAndRates;
