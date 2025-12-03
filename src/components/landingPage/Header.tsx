"use client";
import Link from "next/link";

import { Button } from "../ui/button";
import { motion } from "framer-motion";
function Header() {
  return (
    <motion.div
      layoutId="header"
      animate={{ y: 0 }}
      initial={{ y: -100 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      className="w-full  border-b flex items-center justify-between px-12 py-2 "
    >
      <div className="flex gap-2 items-center justify-center">
        <span className="text-2xl font-funnel font-semibold text-primary dark:text-primary">
          Wryte.
        </span>
      </div>
      <div className="flex w-fit justify-center items-center gap-6 text-sm font-medium">
        <Link href={"/"}>Features</Link>
        <a href={"https://x.com/Taquiimam14"} target="_blank" rel="noreferrer">
          Twitter
        </a>
        <a
          href={"https://github.com/taqui-786"}
          target="_blank"
          rel="noreferrer"
        >
          Github
        </a>
      </div>
      <div className="">
        <Link href={"/signin"}>
          <Button>Sign-in</Button>
        </Link>
      </div>
    </motion.div>
  );
}

export default Header;
