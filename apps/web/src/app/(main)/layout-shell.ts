const SHELLLESS_PATH_PREFIXES = [
  "/BREAKAPP",
  "/actorai-arabic",
  "/editor",
] as const;

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function shouldRenderMainShell(pathname: string | null): boolean {
  if (!pathname) {
    return true;
  }

  const [pathOnly = "/"] = pathname.split(/[?#]/, 1);
  const normalizedPathname = pathOnly.length > 0 ? pathOnly : "/";

  return !SHELLLESS_PATH_PREFIXES.some((prefix) =>
    matchesPathPrefix(normalizedPathname, prefix)
  );
}
