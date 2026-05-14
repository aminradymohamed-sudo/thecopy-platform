"use client";

import { usePathname } from "next/navigation";

import { Logo } from "@/components/logo";
import { MainNav } from "@/components/main-nav";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { DESKTOP_WEB_APP_FRAME_CLASS } from "@/lib/desktop-shell";
import { cn } from "@/lib/utils";

import { shouldRenderMainShell } from "./layout-shell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (!shouldRenderMainShell(pathname)) {
    return <>{children}</>;
  }

  const isResponsivePath =
    pathname.startsWith("/directors-studio") ||
    pathname === "/development" ||
    pathname.startsWith("/arabic-prompt-engineering-studio") ||
    pathname.startsWith("/brain-storm-ai") ||
    pathname.startsWith("/styleIST");

  return (
    <SidebarProvider
      className={cn(
        isResponsivePath
          ? "min-w-0 max-w-full overflow-x-hidden"
          : DESKTOP_WEB_APP_FRAME_CLASS
      )}
      data-layout-mode={isResponsivePath ? "responsive-page" : "desktop-locked"}
    >
      {/* Skip-to-content link — للوصولية بالكيبورد (WCAG 2.4.1).
          مخفي بصرياً لكن يظهر عند Tab focus، يقفز مباشرة للـ main landmark. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
        تخطّي إلى المحتوى الرئيسي
      </a>
      <Sidebar collapsible="none" role="navigation" aria-label="التنقل الرئيسي">
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
        <SidebarFooter>
          <p className="px-2 text-xs text-muted-foreground">
            &copy; 2025 النسخة
          </p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className={isResponsivePath ? "min-w-0" : undefined}>
        <header
          role="banner"
          aria-label="شريط رأس التطبيق"
          className="flex h-[60px] items-center justify-between gap-4 border-b bg-card px-6"
        >
          <div className="flex-1">
            {/* Can add breadcrumbs or page title here */}
          </div>
        </header>
        <main
          id="main-content"
          role="main"
          aria-label="المحتوى الرئيسي"
          tabIndex={-1}
          className={cn(
            "flex-1 outline-none",
            isResponsivePath ? "min-w-0 overflow-x-clip p-0" : "p-6"
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
