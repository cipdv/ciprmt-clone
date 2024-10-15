import Intro from "@/components/homepage/Intro";
import ServicesAndRates from "@/components/homepage/ServicesAndRates";
import WorkplaceMassage from "@/components/homepage/WorkplaceMassage";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <Intro />
        <ServicesAndRates />
        <WorkplaceMassage />
      </main>
    </div>
  );
}
