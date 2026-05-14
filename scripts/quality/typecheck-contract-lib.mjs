export function resolveTypecheckExitCode({ fatal, parsedErrors }) {
  return fatal || parsedErrors > 0 ? 1 : 0;
}
