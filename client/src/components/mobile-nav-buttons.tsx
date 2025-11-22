import { Button } from "@/components/ui/button";
import { Home, Feather, Bookmark, User, Settings, Menu } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MobileNavButtons() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border flex items-center justify-around gap-2 px-2 py-3 z-40">
      {/* Home */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleNavigation("/")}
        className="flex-1 h-10 w-10"
        title="Home"
        data-testid="button-nav-home-mobile"
      >
        <Home className="w-5 h-5" />
      </Button>

      {/* Write Article */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleNavigation("/compose")}
        className="flex-1 h-10 w-10"
        title="Write"
        data-testid="button-nav-write-mobile"
      >
        <Feather className="w-5 h-5" />
      </Button>

      {/* Bookmarks */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleNavigation("/bookmarks")}
        className="flex-1 h-10 w-10"
        title="Bookmarks"
        data-testid="button-nav-bookmarks-mobile"
      >
        <Bookmark className="w-5 h-5" />
      </Button>

      {/* Profile */}
      {user && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleNavigation(`/profile/${user.username}`)}
          className="flex-1 h-10 w-10"
          title="Profile"
          data-testid="button-nav-profile-mobile"
        >
          <User className="w-5 h-5" />
        </Button>
      )}

      {/* Menu Dropdown */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="flex-1 h-10 w-10"
            title="More"
            data-testid="button-nav-menu-mobile"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {user && (
            <>
              <DropdownMenuItem onClick={() => handleNavigation(`/profile/${user.username}`)}>
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => handleNavigation("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
