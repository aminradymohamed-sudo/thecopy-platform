import * as React from "react";

import { isDesktopWebAppLocked } from "@/lib/desktop-shell";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const desktopLocked = isDesktopWebAppLocked();
  const [isMobile, setIsMobile] = React.useState(
    () =>
      !desktopLocked &&
      typeof window !== "undefined" &&
      window.innerWidth < MOBILE_BREAKPOINT
  );

  React.useEffect(() => {
    if (desktopLocked) {
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [desktopLocked]);

  return desktopLocked ? false : isMobile;
}
