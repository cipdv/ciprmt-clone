import Intro from "@/components/homepage/Intro";
import ServicesAndRates from "@/components/homepage/ServicesAndRates";
import WorkplaceMassage from "@/components/homepage/WorkplaceMassage";

export default async function Home() {
  return (
    <div>
      <Intro />
      <ServicesAndRates />
      <WorkplaceMassage />
    </div>
  );
}
