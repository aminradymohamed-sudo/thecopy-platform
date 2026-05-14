import { Card, CardContent } from "@/components/ui/card";

export function PromptStudioEmptyPanel({ text }: { text: string }) {
  return (
    <Card className="border-dashed border-purple-500/20 bg-black/10">
      <CardContent className="p-6 text-center text-sm text-white/60">
        {text}
      </CardContent>
    </Card>
  );
}
