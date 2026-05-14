"use client";

import {
  BrainCircuit,
  Layers,
  Pen,
  PenSquare,
  Sparkles,
  Film,
  Camera,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    href: "/editor",
    label: "كتابة",
    icon: PenSquare,
  },
  {
    href: "/arabic-creative-writing-studio",
    label: "استوديو الكتابة",
    icon: Pen,
  },
  {
    href: "/directors-studio",
    label: "استوديو الإخراج",
    icon: Film,
  },
  {
    href: "/cinematography-studio",
    label: "استوديو السينما",
    icon: Camera,
  },
  {
    href: "/analysis",
    label: "المحطات",
    icon: Layers,
  },
  {
    href: "/development",
    label: "المختبر",
    icon: Sparkles,
  },
  {
    href: "/brain-storm-ai",
    label: "الورشة",
    icon: BrainCircuit,
  },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {menuItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href)}
            tooltip={item.label}
          >
            <Link href={item.href} prefetch={false}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
