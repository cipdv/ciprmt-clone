import React from "react";
import Image from "next/image";

const SpecialConsentAreas = () => {
  return (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-12">
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900 border-b pb-2">
          What are these areas and why are they considered sensitive?
        </h2>
        <p className="text-gray-700 leading-relaxed">
          <a
            href="https://www.cmto.com/rules/consent/"
            className="text-blue-600 hover:underline"
          >
            The CMTO
          </a>{" "}
          considers the following areas sensitive and requires that informed
          written consent be obtained before assessing or treating these areas
          to ensure that you as a patient understand why these areas might be
          touched, and to offer alternatives if you are uncomfortable with these
          areas being touched at this time. I have also included a section to
          add any other areas that you personally feel are sensitive to you and
          would not like to have assessed and treated at this time.
        </p>
        <div className="space-y-8">
          {[
            {
              title: "Glutes",
              image: "/images/glutes.jpg",
              alt: "glutes",
              description:
                "The gluteal muscles, more commonly referred to as your buttocks, are involved in movement of your hips and stabilization of your hips and pelvis. If you are experiencing lower back pain, hip pain, knee pain, or pain referring down your leg, it may be caused by issues involving your gluteal musculature. Assessing and treating these areas could include touching and stretching these areas to feel for excessive tension in the musculature, and feeling for specific points that may be referring pain to other areas in your body.",
            },
            {
              title: "Chest wall muscles",
              image: "/images/chestwall.jpg",
              alt: "chest wall",
              description:
                "The chest wall musculature can include the pectoralis muscles, serratus muscles, and abdominis muscles. These muscles are involved in the movement and stability of your shoulders and upper torso, and they can often cause postural imbalances which can lead to pain and aching muscles in other areas such are your chest, upper back and lower back, neck and shoulders, and between your shoulder blades. Assessing these areas could include touching and stretching of these muscles to feel for tightness or specific points that may be causing pain in any of these areas. Note: this does not include breast tissue. If you do require breast tissue massage for a medical reason, please text Cip de Vries at 416-258-1230 directly to discuss this further.",
            },
            {
              title: "Abdomen",
              image: "/images/abdomen.jpg",
              alt: "abdomen",
              description:
                "The muscles in your abdomen are extremely important for the maintenance of healthy posture and movement of the torso, hips and shoulders. Often from prolonged periods of sitting, these muscles can become shortened and tight which can lead to imbalances in the musculature of the back side which can lead to pain or sore, aching muscles in the back, as well as decreased athletic performance. Assessing and treating these areas often involves stretching and massaging of the musculature of the abdomen to relieve this excessive tightness and lengthen the musculature to a more relaxed resting state.",
            },
            {
              title: "Inner thighs",
              image: "/images/innerthighs.jpg",
              alt: "inner thighs",
              description:
                "The musculature of the inner thighs can be very sensitive for a lot of people. These muscles provide stability to our hips and pelvis and are involved in almost every movement we make involving the lower half our of bodies, and because of this they can become extremely overworked causing them to become tight and stiff. Assessing and treating the inner thighs can include stretching and touching of the musculature to locate and relieve the source of excessive tightness and tension within the muscles that may be causing pain in these areas or within the hips or knees.",
            },
          ].map((area, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3">
                <Image
                  src={area.image}
                  width={300}
                  height={300}
                  alt={area.alt}
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              </div>
              <div className="md:w-2/3">
                <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                  {area.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {area.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900 border-b pb-2">
          What are the risks and benefits of having these areas assessed and/or
          treated?
        </h2>
        <p className="text-gray-700 leading-relaxed">
          When our muscles are overworked, overstretched, strained or damaged in
          some way, they can ache and cause pain in the area and throughout the
          body. Assessing these areas helps RMTs discover what may be causing
          you pain or discomfort and provide proper treatment to help get rid of
          this pain, and rule out other possibilities that may require treatment
          from other health care professionals. The goal of the
          assessment/treatment is not to hurt you, but some of the assessments
          and treatment techniques may cause pain or discomfort as the tissues
          are being stretched or compressed, and may have lingering effects.
          There is also the risk that the tissues can be further damaged,
          causing more pain or loss of function. You can ask to stop or modify
          the assessment/treatment anytime, so please be vocal if you feel that
          your body is not responding well.
        </p>
      </div>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900 border-b pb-2">
          What if I don't consent to these areas being assessed and treated?
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
        <h2 className="text-3xl font-bold text-gray-900 border-b pb-2">
          What if I change my mind to these areas being assessed and treated?
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

export default SpecialConsentAreas;
