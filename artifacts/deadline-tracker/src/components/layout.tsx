import React, { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, Home, Plus } from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <Link href="/" className="font-bold text-xl tracking-tight text-foreground hover:opacity-80 transition-opacity">
              DeadlineZone
            </Link>
          </div>
          
          <nav className="flex items-center gap-2">
            <Link href="/" className={location === "/" ? "pointer-events-none" : ""}>
              <Button variant={location === "/" ? "secondary" : "ghost"} size="sm" className="font-medium">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/assignments/new" className={location === "/assignments/new" ? "pointer-events-none" : ""}>
              <Button variant={location === "/assignments/new" ? "secondary" : "default"} size="sm" className="font-medium shadow-sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Assignment
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-border py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground font-medium">
          Built with pride by a level 2 CS student.
        </div>
      </footer>
    </div>
  );
}
