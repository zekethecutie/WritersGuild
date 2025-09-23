import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { 
  Feather,
  Home,
  Compass,
  Search,
  MessageSquare,
  Bell,
  Bookmark,
  BarChart3,
  User,
  Settings,
  MoreHorizontal,
  Cog, // Added Cog icon for settings
  BookOpen // Added BookOpen icon for stories
} from "lucide-react";
import { getProfileImageUrl } from "@/lib/defaultImages";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


export default function Sidebar() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

  // Fetch real notification count
  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: () => fetch("/api/notifications", { credentials: "include" }).then(res => res.json()),
    enabled: isAuthenticated,
  });

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0; 

  const navigationItems = [
    { icon: Home, label: "Home", path: "/", active: location === "/" },
    { icon: Compass, label: "Explore", path: "/explore", active: location === "/explore" },
    // Add Stories navigation item
    { icon: BookOpen, label: "Stories", path: "/series", active: location === "/series" },
    { icon: MessageSquare, label: "Messages", path: "/messages", active: location === "/messages" },
    { icon: Bell, label: "Notifications", path: "/notifications", active: location === "/notifications", badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: Bookmark, label: "Bookmarks", path: "/bookmarks", active: location === "/bookmarks" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", active: location === "/analytics" },
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
            <h1 className="text-xl font-bold gradient-text">Writers Guild</h1>
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
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors mb-8"
          data-testid="button-compose"
        >
          <Feather className="w-5 h-5 mr-2" />
          Compose
        </Button>

        {/* More Options - Settings is now in the navigation menu */}
        <div className="space-y-2">
          {/* Removed the standalone Settings button as it's now in the navigation */}
          <Button 
            variant="ghost" 
            className="w-full justify-start px-4 py-3 rounded-xl"
            data-testid="button-more"
          >
            <MoreHorizontal className="w-5 h-5 mr-3" />
            More
          </Button>
        </div>
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
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-muted"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-user-menu"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}