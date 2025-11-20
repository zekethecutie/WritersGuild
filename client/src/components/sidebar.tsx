import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  Feather,
  Home,
  Compass,
  Search,
  Bell,
  Bookmark,
  BarChart3,
  User,
  Settings,
  MoreHorizontal,
  Cog, // Added Cog icon for settings
  BookOpen, // Added BookOpen icon for stories
  Edit, // Added Edit icon for compose button
  HelpCircle, // Added HelpCircle icon for help center
  Shield, // Added Shield icon for rules
  ExternalLink, // Added ExternalLink icon for external links
  Trophy, // Added Trophy icon for leaderboard
  TestTube // Added TestTube icon for admin test
} from "lucide-react";
import { getProfileImageUrl } from "@/lib/defaultImages";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import PostModal from "@/components/post-modal";
import { cn } from "@/lib/utils";


export default function Sidebar() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false); // State to control user dropdown visibility

  // Fetch real notification count
  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: () => fetch("/api/notifications", { credentials: "include" }).then(res => res.json()),
    enabled: isAuthenticated,
  });

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0;

  const navigationItems = [
    { icon: Home, label: "Home", path: "/", active: location === "/" },
    { icon: Search, label: "Search", path: "/search", active: location === "/search" },
    { icon: Compass, label: "Explore", path: "/explore", active: location === "/explore" },
    { icon: BookOpen, label: "Stories", path: "/series", active: location === "/series" },
    { icon: Trophy, label: "Leaderboard", path: "/leaderboard", active: location === "/leaderboard" },
    { icon: Bell, label: "Notifications", path: "/notifications", active: location === "/notifications", badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: Bookmark, label: "Bookmarks", path: "/bookmarks", active: location === "/bookmarks" },
    { icon: User, label: "Profile", path: `/profile/${user?.username || user?.id}`, active: location.startsWith("/profile") },
    { icon: Cog, label: "Settings", path: "/settings", active: location === "/settings" },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-10 hidden lg:block">
      <div className="p-6">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3 mb-8 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Feather className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Writers Guild</h1>
            <p className="text-xs text-muted-foreground">Where words find their voice</p>
          </div>
        </Link>

        {/* Navigation Menu */}
        <nav className="space-y-2 mb-8">
          {navigationItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-colors cursor-pointer ${
                  item.active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-foreground hover:text-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </nav>

        {/* Compose Button */}
        <Button
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            onClick={() => {
              if (isAuthenticated) {
                setShowPostModal(true);
              } else {
                toast({
                  title: "Sign in required",
                  description: "Please sign in to create a post",
                  variant: "destructive",
                });
              }
            }}
          >
            <Edit className="w-5 h-5 mr-2" />
            Compose
          </Button>

        {/* More Options - Settings is now in the navigation menu */}
        <div className="space-y-2 mt-2">
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-left font-normal h-12 px-3">
                  <div className="flex items-center gap-3">
                    <MoreHorizontal className="w-6 h-6" />
                    <span className="text-xl">More</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => window.location.href = "/rules"}>
                  <Shield className="w-4 h-4 mr-2" />
                  Rules & Guidelines
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = "/help"}>
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Help Center
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* Guest Button - Updated styling */}
        {!isAuthenticated && (
          <Button
            variant="outline" // Added outline variant for a button outline
            className="w-full mt-4 font-semibold border-primary text-primary hover:bg-primary/10" // Added styling for outline and hover effect
            onClick={() => {
              // Simulate guest login or redirect to guest page
              // For now, just toast a message
              toast({
                title: "Continue as Guest",
                description: "You are now continuing as a guest.",
                variant: "default"
              });
              // In a real app, you might redirect to a guest-specific page or set a guest state
              // window.location.href = "/guest";
            }}
            data-testid="button-continue-as-guest"
          >
            Continue as Guest
          </Button>
        )}
      </div>

      {/* User Profile Card */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <img
              src={getProfileImageUrl(user?.profileImageUrl)}
              alt="User profile"
              className="w-10 h-10 rounded-full object-cover"
              data-testid="img-sidebar-avatar"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{user?.username}
              </p>
            </div>
            <DropdownMenu onOpenChange={setShowUserMenu}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-muted"
                  data-testid="button-user-menu"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => window.location.href = "/settings"}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => authService.logout()}
                  className="text-red-600 focus:text-red-600"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {/* Post Modal */}
      {showPostModal && (
        <PostModal
          isOpen={showPostModal}
          onClose={() => setShowPostModal(false)}
        />
      )}
    </div>
  );
}