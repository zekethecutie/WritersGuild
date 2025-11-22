import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Home,
  Compass,
  Bell,
  User,
  Feather,
  BookOpen,
  Bookmark,
  TrendingUp,
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MobileNav() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [page, setPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const allNavItems = [
    // First 5
    { icon: Home, label: "Home", path: "/", testid: "button-nav-home" },
    { icon: Compass, label: "Explore", path: "/explore", testid: "button-nav-explore" },
    { icon: BookOpen, label: "Stories", path: "/series", testid: "button-nav-stories" },
    { icon: Feather, label: "Write", path: "/compose", testid: "button-nav-write" },
    { icon: Bookmark, label: "Bookmarks", path: "/bookmarks", testid: "button-nav-bookmarks" },
    
    // Next 5
    { icon: Bell, label: "Alerts", path: "/notifications", testid: "button-nav-alerts" },
    { icon: User, label: "Profile", path: `/profile/${user?.username || user?.id}`, testid: "button-nav-profile" },
    { icon: TrendingUp, label: "Trending", path: "/trending", testid: "button-nav-trending" },
  ];

  const currentPageItems = allNavItems.slice(page * 5, (page + 1) * 5);
  const totalPages = Math.ceil(allNavItems.length / 5);

  const handleNextPage = () => {
    if (page < totalPages - 1) setPage(page + 1);
  };

  const handlePrevPage = () => {
    if (page > 0) setPage(page - 1);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
      <div className="flex items-center justify-between px-2 py-3 gap-1">
        {/* Left Arrow */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevPage}
          disabled={page === 0}
          className="h-9 w-9 flex-shrink-0"
          title="Previous"
          data-testid="button-nav-prev"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Navigation Items - 5 visible */}
        <div className="flex items-center gap-1 flex-1">
          {currentPageItems.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path);
            const Icon = item.icon;

            // Special handling for Profile and Menu items
            if (item.label === "Menu") {
              return (
                <DropdownMenu key={item.path}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      title={item.label}
                      data-testid={item.testid}
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => window.location.href = "/settings"}>
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.location.href = "/api/logout"}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            return (
              <Button
                key={item.path}
                variant="ghost"
                size="icon"
                onClick={() => window.location.href = item.path}
                className={`h-9 w-9 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                title={item.label}
                data-testid={item.testid}
              >
                <Icon className="w-4 h-4" />
              </Button>
            );
          })}
        </div>

        {/* Right Arrow */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextPage}
          disabled={page === totalPages - 1}
          className="h-9 w-9 flex-shrink-0"
          title="Next"
          data-testid="button-nav-next"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
