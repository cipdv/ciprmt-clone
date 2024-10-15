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
          Thai massage is a type of massage that involves full body stretching
          and deep pressure to relax your mind and body by relieving muscle
          tightness and tension.{" "}
          <strong>Your body will feel rejuvenated and restored.</strong>
          This form of bodywork is usually performed on the floor, and the
          client wears comfortable clothes that allow for movement. For the most
          part, no oils are used in Thai massage other than for massaging the
          neck area.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900  ">
          Why do I have to wear clothing for Thai massage?
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Thai massage is very dynamic and involves a lot of passive movement.
          Wearing clothing allows for ease of movement and flexibility. It also
          allows for the therapist to provide a deeper, more firm pressure into
          your muscles without the use of oils.{" "}
        </p>
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900  ">
          Will I receive a RMT receipt for my insurance?
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Yes, once you have paid for your treatment you will receive a RMT
          receipt for your insurance. Preferred payment methods are cash or
          e-transfer to save on transaction fees, but I am able to accept debit
          and credit card as well.{" "}
        </p>
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900  ">
          Do you do direct billing?
        </h2>
        <p className="text-gray-700 leading-relaxed">
          No, I do not do direct billing. You will need to pay for your
          treatment upfront and then submit your receipt to your insurance
          company for reimbursement.{" "}
        </p>
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900  ">
          How do I book an appointment?
        </h2>
        <p className="text-gray-700 leading-relaxed">
          You can book an appointment online by creating an account and clicking
          the "book a massage" button. My availability varies, so if the time
          you are looking for is not available, please send me a text at
          416-258-1230 and I will do my best to accommodate you.{" "}
        </p>
      </div>
    </section>
  );
};

export default FAQ;
