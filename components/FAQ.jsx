import React from "react";
import Image from "next/image";

const FAQ = () => {
  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 pb-2">
          Frequently Asked Questions:
        </h1>
        <h2 className="text-2xl font-bold text-gray-900  ">
          What is Thai massage?
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Thai massage is a type of massage that involves stretching and deep...
        </p>
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900  ">
          Will I receive a RMT receipt for my insurance?
        </h2>
        <p className="text-gray-700 leading-relaxed">
          DO you direct bill? What types of payment are accepted?
        </p>
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900  ">
          Why do I have to wear clothing for Thai massage?
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Giving consent to treat these areas is completely voluntary.
          Alternatives can be made if you do not feel comfortable with any or
          all of these areas being touched or stretched for the purposes of
          assessing and treating these areas, including performing
          self-stretching or self-massage without direct contact from a Massage
          Therapist.
        </p>
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900  ">
          How do I book an appointment?
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Giving your consent now does not mean that you cannot change your mind
          any time before or even during the massage. If you feel uncomfortable
          with any parts of the assessing or treating of any part of your body,
          please feel welcome to express this in writing via text (416-258-1230)
          or email (cip.devries@gmail.com) or verbally to Cip de Vries, RMT.
          Your comfort is extremely important to receiving the best treatment
          possible for you, and I will check in with you throughout the massage
          to ensure that you are still comfortable with the proposed assessment
          and treatment. If you do change your mind, alternatives can be given
          to assessing and treating these areas, and other areas in your body
          that you consider to be sensitive.
        </p>
      </div>
    </section>
  );
};

export default FAQ;
