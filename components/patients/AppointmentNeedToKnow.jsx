const AppointmentNeedToKnow = ({ location }) => {
  if (!location) {
    return (
      <div className="text-center">
        <h3 className="text-3xl mb-6">What to know for your appointment:</h3>
        <p className="text-lg">
          This location has not provided any information for your appointment.
        </p>
      </div>
    );
  }

  if (location.id !== "ea5fbe60-7d3c-44ff-9307-b97ea3bc10f9") {
    return (
      <div className="mb-4 space-y-4 mt-2">
        <h3 className="text-3xl mb-6">What to know for your appointment:</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Location:</h3>
            <p>
              {(location.formattedFormData.address.locationName &&
                location.formattedFormData.address.locationName) ||
                location.formattedFormData.address.streetAddress}
              , {location.formattedFormData.address.streetAddress}
            </p>
            <p>{location.formattedFormData.locationDetails.description}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">What to wear:</h3>
            {location.formattedFormData.locationDetails?.whatToWear ? (
              <p>{location.formattedFormData.locationDetails?.whatToWear}</p>
            ) : (
              <>
                <p>
                  Thai massage is practiced over clothing, so please bring
                  <strong> comfortable, loose fitting clothing</strong> that you
                  will be able to stretch in, including shorts or pants, and a
                  short sleeved t-shirt made from soft natural fabric like
                  cotton, bamboo, or hemp.
                </p>
                <p>You may change clothing here, or come fully dressed.</p>
              </>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">What NOT to wear:</h3>
            <ul className="list-disc ml-4">
              <li>
                Strong scents.{" "}
                <strong>Please do not wear perfume or cologne</strong> - strong
                scents can linger and be uncomfortable for some people.
              </li>
              <li>Clothing with zippers.</li>
              <li>Slippery fabrics like polyester, lycra, spandex.</li>
              <li>Shirts without sleeves (For example: tank tops).</li>
              <li>Extremely short shorts - aim for knee length or lower.</li>

              <li>Jewellery - rings, necklaces, bracelets, watches, etc.</li>
              <li>Lotions or creams.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Medications:</h3>
            <p>
              It is important that you can fully feel what is happening during
              the massage, so please refrain from taking any pain medications at
              least 2 hours before your appointment start-time.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Payment:</h3>
            {location.formattedFormData.locationDetails?.payment ? (
              <p>{location.formattedFormData.locationDetails?.payment}</p>
            ) : (
              <>
                <p>
                  <strong>
                    Preferred payment methods are debit, email money transfer,
                    and cash, {""}
                  </strong>
                  but I can take credit card payments as well. Your receipt will
                  be available on your profile within 24 hours of your
                  appointment.
                </p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Cancellation:</h3>

            <p>
              If you are feeling unwell or need to cancel for any reason, please
              notify Cip to cancel your appointment as soon as possible.
              Cancellation of appointments may be done at any time before the
              appointment without any charges or cancellation fees.To cancel an
              appointment before its scheduled start time, login at
              www.ciprmt.com/auth/sign-in and click the "cancel appointment"
              button. As a courtesy, please also notify Cip via text at
              416-258-1230.{" "}
            </p>
            <p>
              <strong>If you do not show up for your appointment,</strong> and
              you have not notified Cip de Vries, RMT, you will be required to
              pay the full cost of the treatment as booked. This fee will be due
              prior to your next treatment. A request for an
              email-money-transfer will be sent to your email address on file.{" "}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-4 mt-2">
      <h3 className="text-3xl mb-6">What to know for your appointment:</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Location:</h3>
          <p>268 Shuter Street</p>
          <p>
            The entrance is at the rear of the buildling. Open the wooden gate,
            and ring the doorbell at the first door on your right.
          </p>
          <p>
            Please plan to arrive no earlier than 10 minutes before your
            appointment as I may still need time to clean and disinfect after
            the previous appointment.
          </p>
          <p>
            There is free parking for up to 1 hour available at the side of the
            building, on Berkeley Street and free street parking available on
            Shuter Street and Berkeley Street.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">What to wear:</h3>
          <p>
            Thai massage is practiced over clothing, so please bring
            <strong> comfortable, loose fitting clothing</strong> that you will
            be able to stretch in, including shorts or pants, and a short
            sleeved t-shirt made from soft natural fabric like cotton, bamboo,
            or hemp.
          </p>
          <p>You may change clothing here, or come fully dressed.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">What NOT to wear:</h3>
          <ul className="list-disc ml-4">
            <li>
              Strong scents.{" "}
              <strong>Please do not wear perfume or cologne</strong> - strong
              scents can linger and be uncomfortable for some people.
            </li>
            <li>Clothing with zippers.</li>
            <li>Slippery fabrics like polyester, lycra, spandex.</li>
            <li>Shirts without sleeves (For example: tank tops).</li>
            <li>Extremely short shorts - aim for knee length or lower.</li>

            <li>Jewellery - rings, necklaces, bracelets, watches, etc.</li>
            <li>Lotions or creams.</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Medications:</h3>
          <p>
            It is important that you can fully feel what is happening during the
            massage, so please refrain from taking any pain medications at least
            2 hours before your appointment start-time.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Payment:</h3>
          <p>
            <strong>
              Preferred payment methods are debit, email money transfer, and
              cash, {""}
            </strong>
            but I can take credit card payments as well. Your receipt will be
            available on your profile within 24 hours of your appointment.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Cancellation:</h3>

          <p>
            If you are feeling unwell or need to cancel for any reason, please
            notify Cip to cancel your appointment as soon as possible.
            Cancellation of appointments may be done at any time before the
            appointment without any charges or cancellation fees.To cancel an
            appointment before its scheduled start time, login at
            www.ciprmt.com/auth/sign-in and click the "cancel appointment"
            button. As a courtesy, please also notify Cip via text at
            416-258-1230.{" "}
          </p>
          <p>
            <strong>If you do not show up for your appointment,</strong> and you
            have not notified Cip de Vries, RMT, you will be required to pay the
            full cost of the treatment as booked. This fee will be due prior to
            your next treatment. A request for an email-money-transfer will be
            sent to your email address on file.{" "}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppointmentNeedToKnow;
