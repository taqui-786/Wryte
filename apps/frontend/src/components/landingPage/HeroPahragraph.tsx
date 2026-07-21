"use client";
import { motion } from "framer-motion";
import { Highlighter } from "../ui/highlighter";
import Link from "next/link";
import { Button } from "../ui/button";

function HeroPahragraph() {
  return (
    <>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="mt-2 relative text-lg text-muted-foreground max-w-4xl px-4 mx-auto leading-relaxed "
      >
        Work with an{" "}
        <b>
          <Highlighter action="underline" color="#FF9800">
            AI writing partner
          </Highlighter>{" "}
        </b>
        that helps you find the words you need-to write; a tricky email, a clear
        instruction, a complex explanation of a problem in an essay. Be
        perfectly professional, clear, and convincing{" "}
        <Highlighter action="highlight" color="#87CEFA">
          <b>in a few clicks with April</b>
        </Highlighter>
        , not a few hours.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
      >
        <Link href={"/signin"} className="inline-block mt-12">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size={"lg"}
              className="group cursor-pointer shadow-[0_0_20px_rgba(255,152,0,0.3)] hover:shadow-[0_0_30px_rgba(255,152,0,0.6)] transition-shadow duration-300"
            >
              Let's Start Writting{" "}
              <ArrowRightIcon
                size="20"
                className="group-hover:-rotate-45 transition-transform"
              />
            </Button>
          </motion.div>
        </Link>
      </motion.div>
    </>
  );
}

export default HeroPahragraph;
type ArrowRight02Props = {
  size: string;
  className?: string;
};

const ArrowRightIcon = ({ size, className }: ArrowRight02Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
  >
    <title>arrow</title>
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M20 12H4m11 5s5-3.682 5-5s-5-5-5-5"
      color="currentColor"
    />
  </svg>
);
