import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home,
  Compass,
  Bell,
  User,
  PlusCircle,
  Feather
} from "lucide-react";
import { Link, useLocation } from "wouter";

export default function MobileNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  const navigationItems = [
    { 
      icon: Home, 
      label: "Home", 
      path: "/", 
      active: location === "/" 
    },
    { 
      icon: Compass, 
      label: "Explore", 
      path: "/explore", 
      active: location === "/explore" 
    },
    { 
      icon: PlusCircle, 
      label: "Write", 
      path: "/compose", 
      active: false,
      isCompose: true 
    },
    { 
      icon: Bell, 
      label: "Alerts", 
      path: "/notifications", 
      active: location === "/notifications",
      badge: 3 
    },
    { 
      icon: User, 
      label: "Profile", 
      path: `/profile/${user?.username || user?.id}`, 
      active: location.startsWith("/profile") 
    },
  ];

  return (
    <>
      {/* Mobile Navigation Bar */}
      <div className="mobile-nav fixed bottom-0 left-0 right-0 bg-card/95 border-t border-border lg:hidden z-20">
        <div className="grid grid-cols-5 py-2">
          {navigationItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <button 
                className={`flex flex-col items-center py-2 px-1 transition-colors ${
                  item.active 
                    ? "text-primary" 
                    : item.isCompose 
                      ? "text-primary" 
                      : "text-muted-foreground"
                }`}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              >
                {item.isCompose ? (
                  <div className="bg-primary w-8 h-8 rounded-full flex items-center justify-center mb-1">
                    <Feather className="w-4 h-4 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="relative">
                    <item.icon className="w-6 h-6 mb-1" />
                    {item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 w-5 h-5 text-xs flex items-center justify-center p-0"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                )}
                <span className="text-xs truncate">{item.label}</span>
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Floating Compose Button (Alternative) */}
      <Link href="/compose">
        <Button 
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg lg:hidden z-10 p-0"
          data-testid="floating-compose-button"
          style={{ display: "none" }} // Hidden by default, can be shown as alternative
        >
          <Feather className="w-6 h-6" />
        </Button>
      </Link>
    </>
  );
}
