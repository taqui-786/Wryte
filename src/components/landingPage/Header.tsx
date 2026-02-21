"use client";
import Link from "next/link";

import { Button } from "../ui/button";
import { motion } from "framer-motion";
import Image from "next/image";
import Logo from "../../../public/logo.png";
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
        <Image
            src={Logo}
            alt="logo"
            width={120}
            height={36}
            className="h-10 w-auto object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
      </div>
      <div className="flex w-fit justify-center items-center gap-6 text-sm font-medium">
        <Link href={"/"}>Features</Link>
        <a href={"https://x.com/md_taqui_imam"} target="_blank" rel="noreferrer">
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
