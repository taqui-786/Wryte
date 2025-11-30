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

type NavItem = {
  title: string;
  url: string;
  icon: (props: QuillWrite02Props) => React.ReactElement;
  isActive: boolean;
  items: { title: string; url: string; isActive: boolean }[];
};

function UserSidebar() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["users-docs"],
    queryFn: getUserDocs, // ← clean now
  });
  const [page] = useQueryState("page", parseAsString);
  const [navItems, setNavItems] = useState<NavItem[]>([
    {
      title: "Write",
      url: "/write",
      icon: QuillWrite02,
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
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-2xl font-funnel font-semibold text-primary dark:text-primary">
            Wryte.
          </span>
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
                        {item.icon && <item.icon size="18" />}
                        <span className="font-medium">{item.title}</span>
                        <ArrowRightIcon
                          size="18"
                          className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            asChild
                          >
                            <a href={"/write"}>
                              <div className="text-primary-foreground flex">
                                <PlusIcon size="18" className="mr-1 " />
                              </div>
                              <span className="line-clamp-1 leading-tight">
                                Create new
                              </span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {isLoading ? (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton>
                              <Skeleton className="h-4 w-20 mr-1" />
                              <Skeleton className="h-4 w-32" />
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ) : (
                          item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                className={
                                  subItem.isActive
                                    ? "bg-accent text-accent-foreground"
                                    : ""
                                }
                              >
                                <a href={subItem.url}>
                                  <PageIcon size="18" className="mr-1" />
                                  <span className="line-clamp-1 leading-tight">
                                    {subItem.title}
                                  </span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
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
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
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
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
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
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
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
const PlusIcon = ({ size, className = "", ...props }: PlusSignProps) => (
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
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
      d="M12 4v16m8-8H4"
      color="currentColor"
    />
  </svg>
);
