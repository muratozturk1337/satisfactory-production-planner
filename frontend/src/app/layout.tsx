import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/app-sidebar";
import TopBar from "@/components/top-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Satisfactory Production Planner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-screen overflow-hidden antialiased">
      <body className="h-full flex flex-col">
        <TooltipProvider>
          <SidebarProvider className="h-full">
            <AppSidebar />
            <div className="flex flex-1 flex-col min-h-0">
              <TopBar />
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
