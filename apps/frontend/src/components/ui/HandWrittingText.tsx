"use client";

import { motion } from "framer-motion";
interface HandWrittenTitleProps {
  title?: string;
}

function HandWrittenTitle({ title = "Hand Written" }: HandWrittenTitleProps) {
  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1 },
  };

  return (
    <div className="text-7xl  flex items-center justify-center font-semibold text-black/70 dark:text-white leading-tight z-50">
      <motion.h1
        className=""
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.8 }}
      >
        Make Your Writing
      </motion.h1>

      <div className="relative   w-fit  max-w-4xl px-14 py-8  ">
        <div className="absolute inset-0 pointer-events-none">
          <motion.svg
            width="100%"
            height="100%"
            viewBox="0 0 1200 600"
            initial="hidden"
            animate="visible"
            className="w-full h-full"
          >
            <title>bold</title>
            <motion.path
              d="M 950 90 
                           C 1250 300, 1050 480, 600 520
                           C 250 520, 150 480, 150 300
                           C 150 120, 350 80, 600 80
                           C 850 80, 950 180, 950 180"
              fill="none"
              strokeWidth="12"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              variants={draw}
              className="text-yellow-400 dark:text-white opacity-90"
            />
          </motion.svg>
        </div>
        <div className="relative text-center z-10 flex flex-col items-center justify-center">
          <motion.h1
            className="text-4xl md:text-7xl text-primary dark:text-white tracking-tighter flex items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.8 }}
          >
            {title}
          </motion.h1>
        </div>
      </div>
    </div>
  );
}

export { HandWrittenTitle };
