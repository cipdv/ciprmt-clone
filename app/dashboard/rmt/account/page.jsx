import WorkScheduleDisplay from "@/components/WeeklyScheduleEditor";

export default async function AccountPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold text-foreground">
            Manage Schedule
          </h1>
        </div>

        <WorkScheduleDisplay />
      </div>
    </div>
  );
}
