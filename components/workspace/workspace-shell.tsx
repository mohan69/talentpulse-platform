"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLogo } from "@/components/brand-logo";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  KanbanSquare,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  UserRound,
  Menu,
  X,
  Sparkles,
  FileText,
  Send,
  FileBarChart,
  Bot,
  Radar,
} from "lucide-react";
import { initials } from "@/lib/format";
import { GlobalSearch } from "@/components/workspace/global-search";

type NavItem = { href: string; label: string; icon: any };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/jobs", label: "Requisitions", icon: Briefcase },
    { href: "/admin/candidates", label: "Talent Repository", icon: Users },
    { href: "/admin/sourcing-intelligence", label: "Sourcing Intelligence", icon: Radar },
    { href: "/admin/pipeline", label: "Pipeline", icon: KanbanSquare },
    { href: "/admin/interviews", label: "Interviews", icon: Calendar },
    { href: "/admin/outreach", label: "Outreach", icon: Send },
    { href: "/admin/closures", label: "Closures", icon: Sparkles },
    { href: "/admin/copilot", label: "Copilot", icon: Bot },
    { href: "/admin/reports", label: "Reports", icon: FileBarChart },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
  RECRUITER: [
    { href: "/recruiter", label: "Dashboard", icon: LayoutDashboard },
    { href: "/recruiter/jobs", label: "Requisitions", icon: Briefcase },
    { href: "/recruiter/candidates", label: "Talent Repository", icon: Users },
    { href: "/recruiter/sourcing-intelligence", label: "Sourcing Intelligence", icon: Radar },
    { href: "/recruiter/pipeline", label: "Pipeline", icon: KanbanSquare },
    { href: "/recruiter/interviews", label: "Interviews", icon: Calendar },
    { href: "/recruiter/outreach", label: "Outreach", icon: Send },
    { href: "/recruiter/copilot", label: "Copilot", icon: Bot },
  ],
  CLIENT: [
    { href: "/client-portal", label: "Dashboard", icon: LayoutDashboard },
    { href: "/client-portal/jobs", label: "My Jobs", icon: Briefcase },
    { href: "/client-portal/pipeline", label: "Candidates", icon: Users },
    { href: "/client-portal/interviews", label: "Interviews", icon: Calendar },
    { href: "/client-portal/analytics", label: "Analytics", icon: BarChart3 },
  ],
  CANDIDATE: [
    { href: "/candidate-portal", label: "My Applications", icon: FileText },
    { href: "/candidate-portal/profile", label: "My Profile", icon: UserRound },
    { href: "/candidate-portal/interviews", label: "Interviews", icon: Calendar },
  ],
};

export function WorkspaceShell({
  role,
  userName,
  userEmail,
  children,
}: {
  role: string;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = NAV_BY_ROLE[role] ?? [];

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border/40 transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-border/40">
          <Link href="/" className="flex items-center">
            <BrandLogo size={34} priority />
          </Link>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-3 space-y-0.5 text-sm overflow-y-auto max-h-[calc(100vh-4rem)]">
          {nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/40 h-16 flex items-center px-4 lg:px-8 gap-4">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <GlobalSearch role={role} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-medium">{userName}</div>
                  <div className="text-xs text-muted-foreground capitalize">{role.toLowerCase()}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>{userName}</div>
                <div className="text-xs font-normal text-muted-foreground">{userEmail}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="p-4 lg:p-8 max-w-[1400px] mx-auto">{children}</main>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
