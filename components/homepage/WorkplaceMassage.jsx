import React from "react";
import Image from "next/image";

const WorkplaceMassage = () => {
  return (
    <div className="bg-red-200 px-6 py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col lg:flex-row justify-between items-center space-y-8 lg:space-y-0 lg:space-x-8">
          <div className="w-full lg:w-5/12">
            <Image
              src="/images/workplace-massage.jpg"
              alt="Workplace massage"
              width={350}
              height={263}
              className="w-full h-auto rounded-lg shadow-lg"
              loading="lazy"
            />
          </div>
          <div className="w-full lg:w-7/12 space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-black">
              Workplace Wellness Massage
            </h2>
            <p className="text-black text-sm sm:text-base">
              I can bring the same massage therapy services I offer in my home
              studio to your workplace.
            </p>
            <p className="text-black text-sm sm:text-base">
              If you believe your workplace would benefit from having a
              Registered Massage Therapist visit on-site, please contact me by
              email:{" "}
              <a
                href="mailto:cipdevries@ciprmt.com"
                className="underline hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                cipdevries@ciprmt.com
              </a>{" "}
              to discuss arranging a visit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkplaceMassage;
