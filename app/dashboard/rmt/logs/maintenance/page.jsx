import { MaintenanceLogForm } from "./maintenance-log-form";

const rmtMaintenanceLogPage = () => {
  return (
    <section className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-semibold">Maintenance Log</h1>
          <p className="text-sm text-gray-600 mt-2">
            check items if they are free of damage.
          </p>
        </div>
        <div className="p-6">
          <MaintenanceLogForm />
        </div>
      </div>
    </section>
  );
};

export default rmtMaintenanceLogPage;
