import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Logo } from "./logo";
import { MainNav } from "./main-nav";
import { SidebarProvider } from "./ui/sidebar";

import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/BUDGET",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
    ...props
  }: {
    href: string;
    prefetch?: boolean;
    children: ReactNode;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

describe("navigation prefetch controls", () => {
  it("disables next link prefetch for sidebar navigation", () => {
    render(
      <SidebarProvider>
        <MainNav />
      </SidebarProvider>
    );

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("data-prefetch", "false");
    }
  });

  it("disables next link prefetch for the logo home link", () => {
    render(<Logo />);

    expect(screen.getByRole("link")).toHaveAttribute("data-prefetch", "false");
  });
});
