"use client";

import * as React from "react";

/**
 * View Transition Wrapper Component
 * Based on UI_DESIGN_SUGGESTIONS.md - View Transitions API
 *
 * Provides smooth page transitions using the native View Transitions API
 * with fallback for browsers that don't support it.
 *
 * @example
 * ```tsx
 * <ViewTransition>
 *   <YourContent />
 * </ViewTransition>
 * ```
 */

interface ViewTransitionProps {
  children: React.ReactNode;
  className?: string;
}

type ViewTransitionCallback = () => void | Promise<void>;

export function ViewTransition({ children, className }: ViewTransitionProps) {
  const [displayChildren, setDisplayChildren] = React.useState(children);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  type ViewTransitionDocument = Document & {
    startViewTransition?: (callback: () => Promise<void>) => {
      finished: Promise<void>;
    };
  };

  React.useEffect(() => {
    // Check if View Transitions API is supported
    const supportsViewTransitions = "startViewTransition" in document;

    if (supportsViewTransitions && children !== displayChildren) {
      const doc = document as ViewTransitionDocument;
      if (doc.startViewTransition) {
        let cancelled = false;
        queueMicrotask(() => {
          if (!cancelled) setIsTransitioning(true);
        });
        const updateChildren = (): Promise<void> => {
          setDisplayChildren(children);
          return Promise.resolve();
        };
        const transition = doc.startViewTransition(updateChildren);
        transition.finished
          .finally(() => {
            setIsTransitioning(false);
          })
          .catch(() => {
            setIsTransitioning(false);
          });
        return () => {
          cancelled = true;
        };
      }
      return undefined;
    } else {
      queueMicrotask(() => {
        setDisplayChildren(children);
      });
      return undefined;
    }
  }, [children, displayChildren]);

  return (
    <div className={className} data-transitioning={isTransitioning}>
      {displayChildren}
    </div>
  );
}

/**
 * Hook to trigger view transitions programmatically
 *
 * @example
 * ```tsx
 * const transition = useViewTransition();
 *
 * const handleClick = () => {
 *   transition(() => {
 *     // Update state or navigate
 *     setContent(newContent);
 *   });
 * };
 * ```
 */
export function useViewTransition() {
  type ViewTransitionDocument = Document & {
    startViewTransition?: (callback: () => Promise<void>) => {
      finished: Promise<void>;
    };
  };

  return React.useCallback((callback: ViewTransitionCallback) => {
    const doc = document as ViewTransitionDocument;
    const runUpdate = async (): Promise<void> => {
      await callback();
    };

    if ("startViewTransition" in document && doc.startViewTransition) {
      const transition = doc.startViewTransition(runUpdate);
      void transition.finished.catch(() => {
        // الانتقال البصري اختياري ولا يجب أن يعطل التحديث الأصلي.
      });
    } else {
      void runUpdate().catch(() => {
        // الانتقال البصري اختياري ولا يجب أن يعطل التحديث الأصلي.
      });
    }
  }, []);
}

/**
 * Link component with view transitions
 * Wraps Next.js Link with automatic view transitions
 */
interface ViewTransitionLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ViewTransitionLink({
  href,
  children,
  className,
  onClick,
}: ViewTransitionLinkProps) {
  const transition = useViewTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    transition(() => {
      onClick?.();
      window.location.href = href;
    });
  };

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
