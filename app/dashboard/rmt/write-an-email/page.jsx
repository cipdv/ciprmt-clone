import EmailBlastForm from "./EmailBlastForm";

export default function WriteEmailPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">
          Send Email Campaign
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Send emails to your subscribers with rich formatting and automatic
          batching to avoid spam filters.
        </p>
      </div>
      <EmailBlastForm />
    </div>
  );
}
