import React from "react";
import { HandWrittenTitle } from "../ui/HandWrittingText";
import HeroPahragraph from "./HeroPahragraph";
import { StripedPattern } from "../ui/striped-pattern";

function Hero() {
  return (
    <div className="relative w-full  ">
      <StripedPattern className="[mask-image:radial-gradient(300px_circle_at_center,white,transparent)]" />
      <section className=" max-w-5xl mx-auto text-center py-32 relative z-50 ">
        <HandWrittenTitle title="Bold" />

        <HeroPahragraph />
      </section>
    </div>
  );
}

export default Hero;
