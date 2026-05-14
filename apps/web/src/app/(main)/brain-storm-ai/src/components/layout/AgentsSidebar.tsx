"use client";

/**
 * الصفحة: brain-storm-ai / AgentsSidebar
 * الهوية: شريط وكلاء داخلي بطابع شبكي/تحليلي متسق مع القشرة الداكنة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات الصفحة المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { Users } from "lucide-react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import { CATEGORY_NAMES } from "../../constants";
import AgentCard from "../features/AgentCard";

import type {
  BrainstormAgentDefinition,
  AgentState,
  BrainstormPhase,
  AgentCategory,
} from "../../types";

interface AgentsSidebarProps {
  displayedAgents: readonly BrainstormAgentDefinition[];
  allAgents: readonly BrainstormAgentDefinition[];
  showAllAgents: boolean;
  setShowAllAgents: (value: boolean) => void;
  totalAgentCount: number;
  phaseAgentCount: number;
  activePhase: BrainstormPhase;
  availableCategories: readonly AgentCategory[];
  categoryFilter: AgentCategory | "all";
  setCategoryFilter: (value: AgentCategory | "all") => void;
  getAgentState: (agentId: string) => AgentState;
  expandedAgents: Set<string>;
  toggleAgentExpand: (agentId: string) => void;
}

export default function AgentsSidebar({
  displayedAgents,
  allAgents,
  showAllAgents,
  setShowAllAgents,
  totalAgentCount,
  phaseAgentCount,
  activePhase,
  availableCategories,
  categoryFilter,
  setCategoryFilter,
  getAgentState,
  expandedAgents,
  toggleAgentExpand,
}: AgentsSidebarProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/24 backdrop-blur-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white">
          <Users className="w-6 h-6 text-[var(--page-accent,#3b5bdb)]" />
          الوكلاء
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span className="text-white/58">
            {showAllAgents
              ? `${totalAgentCount} وكيل`
              : `${phaseAgentCount} للمرحلة ${activePhase}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllAgents(!showAllAgents)}
          >
            {showAllAgents ? "المرحلة" : "الكل"}
          </Button>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="group"
          aria-label="فلترة الوكلاء حسب الفئة"
          className="flex flex-wrap gap-2"
        >
          <Button
            type="button"
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
          >
            الكل
          </Button>
          {availableCategories.map((category) => (
            <Button
              key={category}
              type="button"
              variant={categoryFilter === category ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(category)}
            >
              {CATEGORY_NAMES[category]}
            </Button>
          ))}
        </div>
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {displayedAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                allAgents={allAgents}
                state={getAgentState(agent.id)}
                isExpanded={expandedAgents.has(agent.id)}
                onToggleExpand={() => toggleAgentExpand(agent.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </CardSpotlight>
  );
}
