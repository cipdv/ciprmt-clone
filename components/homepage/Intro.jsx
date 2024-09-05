import React from "react";
import Image from "next/image";
import Link from "next/link";

const Intro = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 mt-28 mb-28">
      <div className="flex items-center space-x-8">
        <div className="flex-shrink-0 min-w-[300px]">
          {" "}
          {/* Prevent image container from shrinking and ensure a minimum width */}
          <Image
            src="/images/cip-profile-pic.jpg"
            width={300}
            height={300}
            alt="Cip de Vries"
          />
        </div>
        <div className="space-y-2 flex-grow">
          {" "}
          {/* Allow text container to grow as needed */}
          <div className="mb-4">
            <h1 className="text-3xl">Hi I'm Cip,</h1>
            <h1 className="text-3xl">I'm a Massage Therapist.</h1>
          </div>
          <div className="space-y-5">
            <p>
              I'm very passionate about health and well-being. I love taking
              care of my body with exercise, healthy foods, and spending time
              with friends and family. My favourite activities include
              volleyball, rock climbing, swimming, skating, and just being
              outdoors with nature.
            </p>
            <p>
              As your Registered Massage Therapist, I promise to give you 100%
              of my attention while focusing on your needs to give you the best
              treatment possible. Your health and well-being are just as
              important to me as my own.
            </p>
            <div>
              <Link href="/auth/sign-in">
                <button className="btn">Book a Massage</button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intro;
