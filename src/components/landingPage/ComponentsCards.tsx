'use client'
import React from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import {
  AiBeautifyIcon,
  AiContentGeneratorIcon,
  BoldSolid,
  BulletListSolid,
  CodeSolid,
  DeleteIcon,
  Heading1Solid,
  Heading2Solid,
  Heading3Solid,
  ItalicsSolid,
  LinkSolid,
  ExpandIcon,
  StrikeThroughSolid,
  UnderlineSolid,
} from "../my-editor/editorIcons";
import { Textarea } from "../ui/textarea";
import { ChevronDown, Zap } from "lucide-react";

export function ScoreCard() {
   return (
     <motion.div
       className="flex flex-col w-fit items-center justify-center gap-2 p-2 bg-card rounded-lg border absolute -top-8 left-0 -rotate-12 z-10"
       initial={{ opacity: 0, x: -50 }}
       animate={{ opacity: 1, x: 0 }}
       transition={{ duration: 0.6, ease: "easeOut" }}
     >
       <h2 className="font-medium text-muted-foreground text-base ">
         OVERALL SCORE
       </h2>
       <span className="font-semibold text-xl">32%</span>
       <Warning size="75" />
       <h2 className="font-semibold text-xl text-black/80 ">CAREFULL</h2>
     </motion.div>
   );
 }
export function TickCard() {
   return (
     <motion.div
       className="flex flex-col w-fit items-center justify-center gap-2 p-2 bg-card rounded-lg border absolute -top-12 right-0 rotate-12 z-40"
       initial={{ opacity: 0, x: 50 }}
       animate={{ opacity: 1, x: 0 }}
       transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
     >
       <h2 className="font-medium text-muted-foreground text-base ">
         OVERALL SCORE
       </h2>
       <span className="font-semibold text-xl">92%</span>
       <CheckBadge size="75" />
       <h2 className="font-semibold text-xl text-black/80 ">Amazing</h2>
     </motion.div>
   );
 }

export function SummarizeCard() {
   return (
     <motion.div
       className="space-y-2 p-2 bg-card rounded-lg border w-1/6 absolute top-0 left-40  rotate-12 h-fit z-20"
       initial={{ opacity: 0, y: -50 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
     >
       <Button className="w-full justify-start" variant={"outline"}>
         <BulletListSolid size="16" />
         Shorten
       </Button>
       <Button className="w-full justify-start" variant={"outline"}>
         <ExpandIcon size="16" />
         Expand
       </Button>
       <Button className="w-full justify-start" variant={"outline"}>
         <AiContentGeneratorIcon size="16" />
         Summarize
       </Button>
     </motion.div>
   );
 }

export function PromptGenerateCard() {
   return (
     <motion.div
       className=" p-2 bg-card rounded-lg border w-1/5 absolute top-0 left-[324px]  -rotate-12 h-fit z-30"
       initial={{ opacity: 0, y: 50 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
     >
       <h2 className="font-medium text-muted-foreground text-sm text-start ">
         YOUR PROMPT HERE
       </h2>

       <Textarea
         className="w-full resize-none bg-muted border mt-2 min-h-24 "
         placeholder="Please re-write this part..."
       />
       <Button
         size={"icon-sm"}
         variant="outline"
         className="absolute bottom-4 right-4"
       >
         <AiBeautifyIcon size="18" />
       </Button>
     </motion.div>
   );
 }
export function ToolsCard() {
   return (
     <motion.div
       className="p-2 bg-card rounded-lg border w-fit  flex flex-wrap gap-2 absolute mx-auto top-[135px] left-48 right-0  rotate-6 h-fit z-10"
       initial={{ opacity: 0, scale: 0.8 }}
       animate={{ opacity: 1, scale: 1 }}
       transition={{ duration: 0.6, ease: "easeOut", delay: 1.2 }}
     >
       <div className="flex gap-1 border-r border-x-primary px-2">
         <Button
           size={"icon-sm"}
           variant={"ghost"}
           type="button"
           className={"tool-strong"}
           title="Bold (Ctrl+B)"
         >
           <BoldSolid size="18" />
         </Button>
         <Button
           size={"icon-sm"}
           variant={"ghost"}
           type="button"
           className={"tool-em"}
           title="Italic (Ctrl+I)"
         >
           <ItalicsSolid size={"18"} />
         </Button>

         <Button
           size={"icon-sm"}
           variant={"ghost"}
           type="button"
           className={"tool-underline"}
           title="underline (Ctrl+`)"
         >
           <UnderlineSolid size={"18"} />
         </Button>
         <Button
           size={"icon-sm"}
           variant={"ghost"}
           type="button"
           className={"tool-strike"}
           title="strike (Ctrl+`)"
         >
           <StrikeThroughSolid size={"18"} />
         </Button>
         <Button
           size={"icon-sm"}
           variant={"ghost"}
           type="button"
           className={"tool-strike"}
           title="strike (Ctrl+`)"
         >
           <LinkSolid size={"18"} />
         </Button>
         <Button
           size={"icon-sm"}
           variant={"ghost"}
           type="button"
           className={"tool-code"}
           title="Inline Code (Ctrl+`)"
         >
           <CodeSolid size={"18"} />
         </Button>
       </div>

       <div className="flex gap-1  pr-2">
         <Button
           size={"icon-sm"}
           variant={"ghost"}
           type="button"
           className={"tool-heading1"}
           title="Heading 1"
         >
           <Heading1Solid size={"18"} />
         </Button>
         <Button
           size={"icon-sm"}
           variant={"ghost"}
           type="button"
           className={"tool-heading2"}
           title="Heading 2"
         >
           <Heading2Solid size={"18"} />
         </Button>
         <Button
           size={"icon-sm"}
           variant={"ghost"}
           type="button"
           className={"tool-heading3"}
           title="Heading 2"
         >
           <Heading3Solid size={"18"} />
         </Button>
       </div>
     </motion.div>
   );
 }
export function UseAiCard() {
   return (
     <motion.div
       className="space-y-2 p-2 bg-card rounded-lg border w-1/5 absolute  top-[45px]  right-[115px] -rotate-12 h-fit z-20"
       initial={{ opacity: 0, x: 50 }}
       animate={{ opacity: 1, x: 0 }}
       transition={{ duration: 0.6, ease: "easeOut", delay: 1.0 }}
     >
       <Button className="w-full justify-start" variant={"outline"}>
         <Zap />
         Use Ai
         <ChevronDown className="ml-2" />
       </Button>
     </motion.div>
   );
 }
export function FixGrammerCard() {
   return (
     <motion.div
       className="space-y-2 p-2 bg-card rounded-lg border w-1/5 absolute top-0  right-[282px]   rotate-12 h-fit z-20"
       initial={{ opacity: 0, y: -50 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.6, ease: "easeOut", delay: 0.8 }}
     >
       <div className="p-2 bg-muted rounded-lg">
         <h2 className="font-medium text-muted-foreground text-sm text-start ">
           CORRECT YOUR GRAMMER
         </h2>
         <h2 className="font-semibold mt-1 text-black/80 text-sm text-start ">
           Comprehend
         </h2>
       </div>
       <div className="w-full flex items-center justify-between mt-4">
         <Button size={"icon-sm"} variant={"ghost"}>
           <DeleteIcon size="18" />
         </Button>
         <Button size="sm" variant={"outline"}>
           Fix
         </Button>
       </div>
     </motion.div>
   );
 }
type CheckBadgeProps = {
  size: string;
};

const CheckBadge = ({ size }: CheckBadgeProps) => (
  <svg
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <title>checked</title>
    <g fill="none">
      <path
        fill="#ffef5e"
        d="M10.814 2.074a1.52 1.52 0 0 1 2.372 0l1.41 1.755a1.52 1.52 0 0 0 1.35.558l2.237-.243a1.52 1.52 0 0 1 1.674 1.676l-.244 2.236a1.52 1.52 0 0 0 .56 1.35l1.753 1.409a1.52 1.52 0 0 1 0 2.372l-1.754 1.41a1.52 1.52 0 0 0-.56 1.349l.245 2.237a1.522 1.522 0 0 1-1.676 1.675l-2.237-.243a1.52 1.52 0 0 0-1.35.559l-1.408 1.752a1.518 1.518 0 0 1-2.372 0l-1.408-1.754a1.52 1.52 0 0 0-1.35-.56l-2.237.244a1.52 1.52 0 0 1-1.675-1.675l.243-2.237a1.52 1.52 0 0 0-.559-1.349l-1.754-1.408a1.52 1.52 0 0 1 0-2.372l1.754-1.409a1.52 1.52 0 0 0 .56-1.35L4.143 5.82a1.52 1.52 0 0 1 1.675-1.676l2.237.243a1.52 1.52 0 0 0 1.35-.558z"
      />
      <path
        fill="#fff9bf"
        d="M4.58 19.42a1.52 1.52 0 0 1-.436-1.239l.243-2.237a1.52 1.52 0 0 0-.559-1.349l-1.754-1.408a1.52 1.52 0 0 1 0-2.372l1.754-1.409a1.52 1.52 0 0 0 .56-1.35L4.143 5.82a1.52 1.52 0 0 1 1.675-1.676l2.237.243a1.52 1.52 0 0 0 1.35-.558l1.408-1.755a1.52 1.52 0 0 1 2.372 0l1.41 1.755a1.52 1.52 0 0 0 1.35.558l2.237-.243a1.52 1.52 0 0 1 1.24.437z"
      />
      <path
        stroke="#191919"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.814 2.074a1.52 1.52 0 0 1 2.372 0l1.41 1.755a1.52 1.52 0 0 0 1.35.558l2.237-.243a1.52 1.52 0 0 1 1.674 1.676l-.244 2.236a1.52 1.52 0 0 0 .56 1.35l1.753 1.409a1.52 1.52 0 0 1 0 2.372l-1.754 1.41a1.52 1.52 0 0 0-.56 1.349l.245 2.237a1.522 1.522 0 0 1-1.676 1.675l-2.237-.243a1.52 1.52 0 0 0-1.35.559l-1.408 1.752a1.518 1.518 0 0 1-2.372 0l-1.408-1.754a1.52 1.52 0 0 0-1.35-.56l-2.237.244a1.52 1.52 0 0 1-1.675-1.675l.243-2.237a1.52 1.52 0 0 0-.559-1.349l-1.754-1.408a1.52 1.52 0 0 1 0-2.372l1.754-1.409a1.52 1.52 0 0 0 .56-1.35L4.143 5.82a1.52 1.52 0 0 1 1.675-1.676l2.237.243a1.52 1.52 0 0 0 1.35-.558z"
      />
      <path
        stroke="#191919"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15.65 9.72l-3.714 4.95a.7.7 0 0 1-1.054.077l-2.228-2.23"
      />
    </g>
  </svg>
);

type WarningProps = {
  size: string;
};

const Warning = ({ size }: WarningProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 72 72"
  >
    <title>warning</title>
    <g
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit="10"
      strokeWidth="2"
    >
      <path
        fill="#fcea2b"
        d="M32.522 13.005c.698-1.205 1.986-2.024 3.478-2.024c1.492 0 2.78.82 3.478 2.024L60.446 54.94A4 4 0 0 1 61 56.948a4.032 4.032 0 0 1-4.032 4.033l-41.936.017A4.033 4.033 0 0 1 11 56.966c0-.736.211-1.415.554-2.009l20.968-41.952"
      />
      <path
        fill="#FFF"
        d="M37.613 47.27a1.613 1.613 0 0 1-3.226 0V23.893a1.613 1.613 0 0 1 3.226 0v23.379z"
      />
      <circle cx="36" cy="54.529" r="1.613" fill="#FFF" />
    </g>
    <g
      fill="none"
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit="10"
      strokeWidth="2"
    >
      <path d="M32.522 13.005c.698-1.205 1.986-2.024 3.478-2.024c1.492 0 2.78.82 3.478 2.024L60.446 54.94A4 4 0 0 1 61 56.948a4.032 4.032 0 0 1-4.032 4.033l-41.936.017A4.033 4.033 0 0 1 11 56.966c0-.736.211-1.415.554-2.009l20.968-41.952" />
      <path d="M37.613 47.27a1.613 1.613 0 0 1-3.226 0V23.893a1.613 1.613 0 0 1 3.226 0v23.379z" />
      <circle cx="36" cy="54.529" r="1.613" />
    </g>
  </svg>
);
type GenerateProps = {
  size: string;
};

const Generate = ({ size }: GenerateProps) => (
  <svg
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
  >
    <title>generate</title>
    <path
      fill="#000000"
      d="m7.187 13.528l-.034.056a.2.2 0 0 1-.306 0l-.034-.056l-.069-.175l.256.101l.255-.1zM6.813 2.472a.2.2 0 0 1 .374 0L8.219 5.09a3 3 0 0 0 1.69 1.69l2.444.963l.101.256l-.1.255l-2.445.964l-.143.06a3 3 0 0 0-1.547 1.63l-.964 2.444l-.255.101l-.256-.1l-.963-2.445a3 3 0 0 0-1.547-1.63l-.143-.06l-2.62-1.032a.2.2 0 0 1 0-.374l.175-.069l2.445-.963a3 3 0 0 0 1.63-1.547l.06-.143zm-.102 2.986A4 4 0 0 1 4.648 7.63l-.19.08l-.733.29l.733.289a4 4 0 0 1 2.253 2.253l.289.732l.29-.732a4 4 0 0 1 2.252-2.253L10.274 8l-.732-.29A4 4 0 0 1 7.37 5.649l-.08-.19L7 4.725zm5.817 2.355a.2.2 0 0 1 0 .374l-.175.068l.101-.255l-.1-.256zm-.165-4.947c.224.401.579.716 1.011.887l.39.154a.1.1 0 0 1 0 .186l-.087.034l-.303.12l-.188.086a2 2 0 0 0-.939 1.041l-.12.303l-.034.087l-.016.028a.1.1 0 0 1-.154 0l-.016-.028l-.035-.087l-.12-.303a2 2 0 0 0-.937-1.041l-.189-.086l-.39-.154a.1.1 0 0 1 0-.186l.086-.035l.304-.12c.432-.17.786-.485 1.01-.886L12 2.723zm-.456-.63a.1.1 0 0 1 .186 0l.154.39q.05.124.116.24L12 2.723l-.364.143l.031-.052l.086-.188zm.519 6.951a.08.08 0 0 1 .148 0a3.97 3.97 0 0 0 2.239 2.239a.08.08 0 0 1 0 .148l-.07.03a3.97 3.97 0 0 0-2.169 2.209l-.012.022a.08.08 0 0 1-.123 0l-.013-.023a3.97 3.97 0 0 0-2.049-2.158l-.19-.08a.08.08 0 0 1 0-.148a3.97 3.97 0 0 0 2.239-2.239m.074 1.784q-.245.285-.53.529q.285.245.53.528q.245-.284.528-.528a5 5 0 0 1-.528-.53"
    />
  </svg>
);
