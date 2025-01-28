import React from "react";
import Image from "next/image";
import Link from "next/link";

const Intro = () => {
  return (
    <div className="px-6 py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col md:flex-row items-center md:space-x-8 space-y-8 md:space-y-0">
          <div className="w-full md:w-1/3 flex-shrink-0">
            <Image
              src="/images/cip-oct24.jpg"
              width={300}
              height={300}
              alt="Cip de Vries"
              className="w-full h-auto rounded-lg shadow-lg"
            />
          </div>
          <div className="w-full md:w-2/3 space-y-4 md:space-y-6">
            <div className="mb-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">
                Hi I'm Cip,
                <br />
                I'm a Massage Therapist.
              </h1>
            </div>
            <div className="space-y-4">
              <p className="text-sm sm:text-base">
                I'm very passionate about health and well-being. I love taking
                care of myself with exercise, good foods, and spending time with
                friends and family. My favourite activities include volleyball,
                rock climbing, swimming, skating, and just being outdoors with
                nature.
              </p>
              <p className="text-sm sm:text-base">
                As your <strong>Registered Massage Therapist</strong>, I promise
                to give you 100% of my attention while focusing on your needs to
                give you the best treatment possible. Your health and well-being
                are just as important to me as my own.
              </p>
              <p className="text-sm sm:text-base">
                All are welcome and I promise to treat everyone equally with
                respect and kindness.
              </p>
              <div>
                <Link href="/auth/sign-in">
                  <button className="mt-2 px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2">
                    Book a Massage
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intro;
