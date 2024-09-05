import React from "react";
import Image from "next/image";
import Link from "next/link";

const WorkplaceMassage = () => {
  return (
    <div className="bg-red-200 ">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col lg:flex-row lg:w-1/2 mt-10 lg:mt-0">
          <Image
            src="/images/workplace-massage.jpg"
            alt="map"
            width={400}
            height={300}
            loading="lazy"
          />
        </div>
        <div className="lg:w-1/2 px-4">
          <h2 className="text-3xl text-black">Workplace Wellness Massage</h2>
          <p className="mt-4 text-black">
            I can bring the same massage therapy services I offer in my clinic
            to your workplace.
          </p>
          <br />
          <p>
            If you believe your workplace would benefit from having a Registered
            Massage Therapist visit on-site, please contact me to discuss
            arranging a visit.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkplaceMassage;
