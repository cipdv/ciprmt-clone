import BookMassageForm from "@/components/patients/BookMassageForm";
import { getDataForBookAppointmentsForm } from "@/app/_actions";

const page = async () => {
  // Use the consolidated function to get both user and RMT setup data
  const { user, rmtSetup } = await getDataForBookAppointmentsForm();

  console.log(rmtSetup);
  console.log("user", user);

  // Ensure rmtSetup is a plain object
  const plainRmtSetup = JSON.parse(JSON.stringify(rmtSetup));

  // Check if user has too many DNS occurrences
  const dnsCount = user?.resultObj?.dnsCount || 0;
  const hasTooManyDNS = dnsCount >= 2;

  return (
    <section>
      {hasTooManyDNS ? (
        <div className="space-y-4 flex-grow w-full">
          <h1 className="text-3xl mb-6">
            To schedule a massage appointment, please contact Cip directly:
          </h1>

          <p className="mb-2">
            <span className="font-medium">Text:</span> 416-258-1230
          </p>
          <p className="mb-4">
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
        <BookMassageForm rmtSetup={plainRmtSetup} user={user} />
      )}
    </section>
  );
};

export default page;
