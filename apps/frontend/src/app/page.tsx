import BottomCard from "@/components/landingPage/BottomCard";
import Header from "@/components/landingPage/Header";
import Hero from "@/components/landingPage/Hero";


export default function Home() {
  return (
    <main className="min-h-dvh w-full">
      <Header/>
      <Hero/>
      <BottomCard/>
    </main>
  );
}