import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { CATEGORY_LABELS } from "../constants";

import type { PromptTemplate } from "@the-copy/prompt-engineering/types";

interface PromptStudioTemplatesTabProps {
  templates: PromptTemplate[];
  selectedTemplate: PromptTemplate | null;
  setSelectedTemplate: (template: PromptTemplate | null) => void;
  templateVariables: Record<string, string>;
  setTemplateVariables: (variables: Record<string, string>) => void;
  handleApplyTemplate: () => void;
}

export function PromptStudioTemplatesTab({
  templates,
  selectedTemplate,
  setSelectedTemplate,
  templateVariables,
  setTemplateVariables,
  handleApplyTemplate,
}: PromptStudioTemplatesTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id} className="border-purple-500/20 bg-black/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{template.name}</CardTitle>
              <p className="text-sm leading-6 text-white/60">
                {template.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {CATEGORY_LABELS[template.category]}
                </Badge>
                {template.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedTemplate(template);
                  setTemplateVariables({});
                }}
                aria-label={`استخدام قالب ${template.name}`}
              >
                استخدام قالب {template.name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-purple-500/20 bg-black/10">
        <CardHeader>
          <CardTitle className="text-lg">إعداد القالب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTemplate ? (
            <>
              <p className="text-sm leading-6 text-white/65">
                {selectedTemplate.description}
              </p>
              {selectedTemplate.variables.map((variable) => {
                const inputId = `template-${variable.name}`;
                return (
                  <div key={variable.name} className="space-y-2">
                    <Label htmlFor={inputId}>{variable.description}</Label>
                    <Input
                      id={inputId}
                      value={
                        templateVariables[variable.name] ??
                        variable.defaultValue ??
                        ""
                      }
                      onChange={(event) =>
                        setTemplateVariables({
                          ...templateVariables,
                          [variable.name]: event.target.value,
                        })
                      }
                    />
                  </div>
                );
              })}
              <Button type="button" onClick={handleApplyTemplate}>
                تطبيق القالب
              </Button>
            </>
          ) : (
            <p className="text-sm leading-6 text-white/60">
              اختر قالبًا من القائمة لتظهر متغيراته هنا.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
