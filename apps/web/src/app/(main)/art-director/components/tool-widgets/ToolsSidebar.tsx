"use client";

import { useCallback, type KeyboardEvent } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import { ToolItem } from "./ToolItem";

import type { ToolsSidebarProps } from "./types";

export function ToolsSidebar({
  plugins,
  selectedTool,
  onToolSelect,
}: ToolsSidebarProps) {
  const focusTool = useCallback((toolId: string) => {
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(`[data-tool-id="${toolId}"]`)
        ?.focus();
    });
  }, []);

  const handleToolListKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }

      if (plugins.length === 0) return;

      event.preventDefault();
      const activeToolId =
        document.activeElement instanceof HTMLElement
          ? document.activeElement.dataset["toolId"]
          : undefined;
      const currentIndex = Math.max(
        0,
        plugins.findIndex(
          (plugin) => plugin.id === (activeToolId ?? selectedTool)
        )
      );
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? plugins.length - 1
            : event.key === "ArrowDown"
              ? (currentIndex + 1) % plugins.length
              : (currentIndex - 1 + plugins.length) % plugins.length;
      const nextTool = plugins[nextIndex];

      if (!nextTool) return;

      onToolSelect(nextTool.id);
      focusTool(nextTool.id);
    },
    [focusTool, onToolSelect, plugins, selectedTool]
  );

  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <aside
        className="art-tools-sidebar"
        style={{ background: "transparent", border: "none", padding: 0 }}
      >
        <h3>الأدوات المتاحة ({plugins.length})</h3>
        <div
          className="art-tools-list"
          role="toolbar"
          aria-label="قائمة الأدوات"
          onKeyDown={handleToolListKeyDown}
        >
          {plugins.map((plugin) => (
            <ToolItem
              key={plugin.id}
              plugin={plugin}
              isActive={selectedTool === plugin.id}
              onClick={() => onToolSelect(plugin.id)}
            />
          ))}
        </div>
      </aside>
    </CardSpotlight>
  );
}
