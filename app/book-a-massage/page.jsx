import BookMassageForm from "@/components/patients/BookMassageForm";
import { getPublicDataForBookAppointmentsForm } from "@/app/_actions";

const page = async () => {
  const { user, rmtSetup } = await getPublicDataForBookAppointmentsForm();
  const plainRmtSetup = JSON.parse(JSON.stringify(rmtSetup));

  const dnsCount = user?.resultObj?.dnsCount || 0;
  const hasTooManyDNS = dnsCount >= 2;

  return (
    <section className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="max-w-4xl mx-auto px-4 space-y-2">
        <h1 className="text-3xl font-bold">Book a Massage</h1>
      </div>

      {hasTooManyDNS ? (
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">
            To schedule a massage appointment, please contact Cip directly:
          </h2>
          <p>
            <span className="font-medium">Text:</span> 416-258-1230
          </p>
          <p>
            <span className="font-medium">Email:</span>{" "}
            <a
              href="mailto:cipdevries@ciprmt.com"
              className="text-blue-600 hover:underline"
            >
              cipdevries@ciprmt.com
            </a>
          </p>
        </div>
      ) : (
        <BookMassageForm
          rmtSetup={plainRmtSetup}
          user={user}
          requireAuthOnBook
        />
      )}
    </section>
  );
};

export default page;
