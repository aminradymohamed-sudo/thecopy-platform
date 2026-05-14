"use client";

import { QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";

import { ProjectProvider } from "./lib/ProjectContext";

export default function DirectorsStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectProvider>
        <div className="mx-auto w-full min-w-0 max-w-full px-0 py-0">
          {children}
        </div>
        <Toaster />
      </ProjectProvider>
    </QueryClientProvider>
  );
}
