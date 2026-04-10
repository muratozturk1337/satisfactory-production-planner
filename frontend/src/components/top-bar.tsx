"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const labels: Record<string, string> = {
  "/": "Planner",
  "/recipes": "Recipes",
};

export default function TopBar() {
  const pathname = usePathname();
  const label = labels[pathname] ?? pathname;

  return (
    <header className="flex items-center gap-3 border-b px-4 py-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <nav className="text-sm text-muted-foreground">
        <span className="text-foreground font-medium">{label}</span>
      </nav>
    </header>
  );
}
