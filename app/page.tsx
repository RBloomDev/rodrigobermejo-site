import Hero from "@/components/Hero";
import Problems from "@/components/Problems";
import HowItWorks from "@/components/HowItWorks";
import Offers from "@/components/Offers";
import About from "@/components/About";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";

export default function Home() {
  return (
    <main className="flex flex-col">
      <Hero />
      <Problems />
      <HowItWorks />
      <Offers />
      <About />
      <FAQ />
      <FinalCTA />
    </main>
  );
}
