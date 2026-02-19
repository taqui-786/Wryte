"use client";

import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { getUserDocs } from "@/lib/serverAction";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryState, parseAsString } from "nuqs";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight01Icon,
  CommentAdd01Icon,
  File02Icon,
  PlusSignIcon,
  QuillWrite02Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons";
import Logo from "../../public/logo.png";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import Image from "next/image";
type NavItem = {
  title: string;
  url: string;
  icon: IconSvgElement;
  isActive: boolean;
  items: { title: string; url: string; isActive: boolean }[];
};

function UserSidebar() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["users-docs"],
    queryFn: getUserDocs, // ← clean now
  });
  const [page] = useQueryState("page", parseAsString);
  const url = usePathname();

  const [navItems, setNavItems] = useState<NavItem[]>([
    {
      title: "Write",
      url: "/write",
      icon: QuillWrite02Icon,
      isActive: true,
      items: [],
    },
  ]);
  useEffect(() => {
    if (data && Array.isArray(data)) {
      setNavItems((prev) => [
        {
          ...prev[0],
          isActive: !page,
          items: data.map((doc) => ({
            title: doc.title,
            url: `/write?page=${doc.id}`,
            isActive: page === doc.id.toString(),
          })),
        },
      ]);
    }
  }, [data, page]);
  return (
    <Sidebar className="h-dvh">
      <SidebarHeader>
        <div className="flex items-center  gap-2 px-4 py-2">
       
          <Image
            src={Logo}
            alt="logo"
            width={120}
            height={36}
            className="h-10 w-auto object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={item.isActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        {item.icon && (
                          <HugeiconsIcon icon={item.icon} size="18" />
                        )}
                        <span className="font-medium">{item.title}</span>
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          size="18"
                          className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {isLoading ? (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton>
                              <Skeleton className="h-4 w-20 mr-1" />
                              <Skeleton className="h-4 w-32" />
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ) : (
                          <>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton className="bg-primary text-primary-foreground hover:bg-primary/90">
                                <Link
                                  href={"/write"}
                                  className="flex items-center gap-2"
                                >
                                  <HugeiconsIcon
                                    icon={PlusSignIcon}
                                    size="16"
                                    className="mr-1 "
                                  />
                                  <span className="line-clamp-1 leading-tight">
                                    Create new
                                  </span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            {item.items?.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  className={
                                    subItem.isActive
                                      ? "text-primary bg-accent"
                                      : ""
                                  }
                                >
                                  <Link href={subItem.url}>
                                    <div>
                                      <HugeiconsIcon
                                        icon={File02Icon}
                                        size="18"
                                        className="mr-1"
                                      />
                                    </div>
                                    <span className="line-clamp-1 leading-tight">
                                      {subItem.title}
                                    </span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </>
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Settings"
                  isActive={url === "/settings"}
                >
                  <Link href="/settings" className="flex gap-2">
                    <HugeiconsIcon icon={Settings02Icon} size="18" />
                    <span className="line-clamp-1 leading-tight font-medium">
                      Settings
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Feedback"
                  isActive={url === "/feedback"}
                >
                  <Link href="/feedback" className="flex gap-2">
                    <HugeiconsIcon icon={CommentAdd01Icon} size="18" />
                    <span className="line-clamp-1 leading-tight font-medium">
                      Feedback
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default UserSidebar;
type QuillWrite02Props = {
  size: string;
  className?: string;
};

const QuillWrite02 = ({ size, className }: QuillWrite02Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <title>write</title>
    <g
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      color="currentColor"
    >
      <path d="M10.55 3c-3.852.007-5.87.102-7.159 1.39C2 5.783 2 8.022 2 12.5s0 6.717 1.391 8.109C4.783 22 7.021 22 11.501 22c4.478 0 6.717 0 8.108-1.391c1.29-1.29 1.384-3.307 1.391-7.16" />
      <path d="M11.056 13C10.332 3.866 16.802 1.276 21.98 2.164c.209 3.027-1.273 4.16-4.093 4.684c.545.57 1.507 1.286 1.403 2.18c-.074.638-.506.95-1.372 1.576c-1.896 1.37-4.093 2.234-6.863 2.396" />
      <path d="M9 17c2-5.5 3.96-7.364 6-9" />
    </g>
  </svg>
);
type ArrowRight01Props = {
  size: string;
  className?: string;
};

const ArrowRightIcon = ({ size, className }: ArrowRight01Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
  >
    <title>right</title>
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M9 6s6 4.419 6 6s-6 6-6 6"
      color="currentColor"
    />
  </svg>
);
type GoogleDocProps = {
  size: string;
  className?: string;
};

const PageIcon = ({ size, className }: GoogleDocProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <title>document</title>
    <g
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      color="currentColor"
    >
      <path d="M15 2.5V4c0 1.414 0 2.121.44 2.56C15.878 7 16.585 7 18 7h1.5" />
      <path d="M4 16V8c0-2.828 0-4.243.879-5.121C5.757 2 7.172 2 10 2h4.172c.408 0 .613 0 .797.076c.183.076.328.22.617.51l3.828 3.828c.29.29.434.434.51.618c.076.183.076.388.076.796V16c0 2.828 0 4.243-.879 5.121C18.243 22 16.828 22 14 22h-4c-2.828 0-4.243 0-5.121-.879C4 20.243 4 18.828 4 16m4-5h8m-8 3h8m-8 3h4.17" />
    </g>
  </svg>
);

type PlusSignProps = {
  size: string;
  className?: string;
};
export const PlusIcon = ({ size, className = "", ...props }: PlusSignProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    {...props}
  >
    <title>add</title>
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M12 4v16m8-8H4"
      color="currentColor"
    />
  </svg>
);
type Settings01Props = {
  size: string;
  className?: string;
};

const SettingIcon = ({ size, className }: Settings01Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <title>settign</title>
    <g
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      color="currentColor"
    >
      <path d="M15.5 12a3.5 3.5 0 1 1-7 0a3.5 3.5 0 0 1 7 0" />
      <path d="M21.011 14.097c.522-.141.783-.212.886-.346c.103-.135.103-.351.103-.784v-1.934c0-.433 0-.65-.103-.784s-.364-.205-.886-.345c-1.95-.526-3.171-2.565-2.668-4.503c.139-.533.208-.8.142-.956s-.256-.264-.635-.479l-1.725-.98c-.372-.21-.558-.316-.725-.294s-.356.21-.733.587c-1.459 1.455-3.873 1.455-5.333 0c-.377-.376-.565-.564-.732-.587c-.167-.022-.353.083-.725.295l-1.725.979c-.38.215-.57.323-.635.48c-.066.155.003.422.141.955c.503 1.938-.718 3.977-2.669 4.503c-.522.14-.783.21-.886.345S2 10.6 2 11.033v1.934c0 .433 0 .65.103.784s.364.205.886.346c1.95.526 3.171 2.565 2.668 4.502c-.139.533-.208.8-.142.956s.256.264.635.48l1.725.978c.372.212.558.317.725.295s.356-.21.733-.587c1.46-1.457 3.876-1.457 5.336 0c.377.376.565.564.732.587c.167.022.353-.083.726-.295l1.724-.979c.38-.215.57-.323.635-.48s-.003-.422-.141-.955c-.504-1.937.716-3.976 2.666-4.502" />
    </g>
  </svg>
);
type ChatFeedback01Props = {
  size: string;
  className?: string;
};

const FeedbackIcon = ({ size, className }: ChatFeedback01Props) => (
  <svg
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
  >
    <title>feedback</title>
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M7.5 8.5h9m-9 4H13m9-2c0-.77-.014-1.523-.04-2.25c-.083-2.373-.125-3.56-1.09-4.533c-.965-.972-2.186-1.024-4.626-1.129A100 100 0 0 0 12 2.5c-1.48 0-2.905.03-4.244.088c-2.44.105-3.66.157-4.626 1.13c-.965.972-1.007 2.159-1.09 4.532a64 64 0 0 0 0 4.5c.083 2.373.125 3.56 1.09 4.533c.965.972 2.186 1.024 4.626 1.129q1.102.047 2.275.07c.74.014 1.111.02 1.437.145s.6.358 1.148.828l2.179 1.87A.73.73 0 0 0 16 20.77v-2.348l.244-.01c2.44-.105 3.66-.157 4.626-1.13c.965-.972 1.007-2.159 1.09-4.532c.026-.727.04-1.48.04-2.25"
    />
  </svg>
);
