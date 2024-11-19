const AppointmentNeedToKnow = () => {
  return (
    <div className="mb-4 space-y-4 mt-2">
      <h3 className="text-3xl mb-6">What to know for your appointment:</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Location:</h3>
          <p>268 Shuter Street, Toronto ON.</p>
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
            There is free parking available at the side of the building, on
            Berkeley Street and free street parking available on Shuter Street
            and Berkeley Street.
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
          <h3 className="text-xl font-semibold">Medications:</h3>
          <p>
            It is important that you can fully feel what is happening during the
            massage, so please refrain from taking any pain medications at least
            2 hours before your appointment start-time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppointmentNeedToKnow;
