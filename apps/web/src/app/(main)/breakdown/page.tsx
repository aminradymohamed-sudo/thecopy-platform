import BreakdownPageRuntime from "./breakdown-page-runtime";

export const dynamic = "force-static";
export const revalidate = 86400;

export default function BreakdownPage() {
  return <BreakdownPageRuntime />;
}
