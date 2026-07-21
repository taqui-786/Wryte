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
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { useQueryState, parseAsString } from "nuqs";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight01Icon,
  CommentAdd01Icon,
  QuillWrite02Icon,
  Settings02Icon,
  PlusSignIcon,
  File02Icon,
  Loading03Icon,
  Sleep,
} from "@hugeicons/core-free-icons";
import Logo from "../../public/logo.png";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import Image from "next/image";
import { useCreateNewDoc } from "@/lib/queries/createNewDoc";
import { useGetAllDocs } from "@/lib/queries/getAllDocs";
import { Skeleton } from "./ui/skeleton";

type NavItem = {
  title: string;
  url: string;
  icon: IconSvgElement;
  isActive: boolean;
  items: { title: string; url: string; isActive: boolean }[];
};

function UserSidebar() {
  const { mutate: createNewDoc, isPending: isCreatingDoc } = useCreateNewDoc();
  const { data:allDocs, isLoading } = useGetAllDocs();
  // DB-driven query removed — static empty docs list


  const url = usePathname();

  const navItems: NavItem[] = [
    {
      title: "Write",
      url: "/write",
      icon: QuillWrite02Icon,
      isActive: !url.startsWith("/doc/"),
      items: allDocs?.map((doc) => ({
        title: doc.title,
        url: `/doc/${doc.id}`,
        isActive: url === `/doc/${doc.id}`,
      })) || [],
    },
  ];

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
                        <SidebarMenuSubItem>
                              <SidebarMenuSubButton className="bg-primary text-primary-foreground hover:bg-primary/90" >
                                <div
                                  onClick={() => !isCreatingDoc ? createNewDoc() : null}
                                  className="flex items-center gap-2"
                                  
                                >
                                 {
                                  isCreatingDoc ? (
                                    <>
                                     <HugeiconsIcon
                                    icon={Loading03Icon}
                                    size="16"
                                    className="mr-1 animate-spin"
                                  />
                                  <span className="line-clamp-1 leading-tight">
                                    Creating...
                                  </span>
                                    </>
                                  ):(
                                    <>
                                     <HugeiconsIcon
                                    icon={PlusSignIcon}
                                    size="16"
                                    className="mr-1 "
                                  />
                                  <span className="line-clamp-1 leading-tight">
                                    Create new
                                  </span>
                                    </>
                                  )
                                 }
                                </div>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        {isLoading ? (
                          <>
                          <Skeleton className="h-4 w-full"/>
                          <Skeleton className="h-4 w-full"/>
                          <Skeleton className="h-4 w-full"/>
                          </>
                        ) : (
                          <>
                            
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

// ---------------------------------------------------------------------------
// Icon helpers (kept as-is — used by AgentSidebar)
// ---------------------------------------------------------------------------
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
