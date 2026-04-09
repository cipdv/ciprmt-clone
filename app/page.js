import Intro from "@/components/homepage/Intro";
import ServicesAndRates from "@/components/homepage/ServicesAndRates";
import WorkplaceMassage from "@/components/homepage/WorkplaceMassage";
import { getHomepageSettings } from "@/app/lib/homepage-settings";

export default async function Home() {
  const homepageSettingsResult = await getHomepageSettings();
  const homepageSettings = homepageSettingsResult.success
    ? homepageSettingsResult.data
    : null;

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <Intro />
        <ServicesAndRates settings={homepageSettings} />
        <WorkplaceMassage contactEmail={homepageSettings?.location?.email || ""} />
      </main>
    </div>
  );
}
