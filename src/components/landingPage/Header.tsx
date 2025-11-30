import Link from "next/link";

import { Button } from "../ui/button";

function Header() {
  return (
    <div className="w-full border-b flex items-center justify-between px-12 py-2 ">
      <span className="text-2xl font-funnel font-semibold text-primary dark:text-primary">
        Wryte.
      </span>
      <div className="flex w-fit justify-center items-center gap-6 text-sm font-medium">
        <Link href={"/"}>Features</Link>
        <Link href={"/"}>Twitter</Link>
        <Link href={"/"}>Github</Link>
      </div>
      <div className="">
        <Link href={"/signin"}>
          <Button>Sign-in</Button>
        </Link>
      </div>
    </div>
  );
}

export default Header;
