import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { MobileNavButtons } from "@/components/mobile-nav-buttons";
import PostCard from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Bookmark, 
  Search, 
  Calendar,
  User as UserIcon,
  Filter,
  SortAsc,
  SortDesc,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Post, User } from "@shared/schema";

interface BookmarkedPost extends Post {
  bookmarkedAt?: string;
  user?: User;
}

export default function Bookmarks() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Fetch bookmarked posts
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/bookmarks"],
    queryFn: () => apiRequest("GET", "/api/bookmarks"),
    enabled: isAuthenticated,
  });

  // Ensure bookmarks is always an array
  const bookmarks = Array.isArray(data) ? data : [];

  // Remove bookmark
  const removeBookmarkMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest("DELETE", `/api/posts/${postId}/bookmark`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({
        title: "Success",
        description: "Bookmark removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive",
      });
    },
  });

  // Clear all bookmarks
  const clearAllBookmarksMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/bookmarks/clear");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({
        title: "Success",
        description: "All bookmarks cleared",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear bookmarks",
        variant: "destructive",
      });
    },
  });

  // Filter and sort bookmarks
  const filteredAndSortedBookmarks = bookmarks
    .filter((bookmark) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return (
          bookmark.content?.toLowerCase().includes(searchLower) ||
          bookmark.user?.displayName?.toLowerCase().includes(searchLower) ||
          bookmark.user?.username?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .filter((bookmark) => {
      // Tab filter
      if (activeTab === "all") return true;
      if (activeTab === "images") return bookmark.imageUrls && bookmark.imageUrls.length > 0;
      if (activeTab === "recent") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const bookmarkDate = new Date(bookmark.bookmarkedAt || bookmark.createdAt || new Date());
        return bookmarkDate > oneWeekAgo;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.bookmarkedAt || a.createdAt || new Date());
      const dateB = new Date(b.bookmarkedAt || b.createdAt || new Date());
      return sortOrder === "newest" 
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Sign in to view bookmarks</h2>
            <p className="text-muted-foreground">You need to be logged in to see your saved posts.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:ml-64 min-h-screen">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Bookmark className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Bookmarks</h1>
                  <p className="text-muted-foreground">Posts you've saved for later</p>
                </div>
                <Badge variant="secondary">
                  {bookmarks.length} saved
                </Badge>
              </div>
              
              {bookmarks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearAllBookmarksMutation.mutate()}
                  disabled={clearAllBookmarksMutation.isPending}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Search and Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookmarked posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
              >
                {sortOrder === "newest" ? (
                  <><SortDesc className="w-4 h-4 mr-1" /> Newest</>
                ) : (
                  <><SortAsc className="w-4 h-4 mr-1" /> Oldest</>
                )}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                All Posts
                <Badge variant="secondary" className="ml-1 h-5 text-xs">
                  {bookmarks.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="images">
                With Images
                <Badge variant="secondary" className="ml-1 h-5 text-xs">
                  {bookmarks.filter(b => b.imageUrls && b.imageUrls.length > 0).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="recent">
                Recent
                <Badge variant="secondary" className="ml-1 h-5 text-xs">
                  {bookmarks.filter(b => {
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    const bookmarkDate = new Date(b.bookmarkedAt || b.createdAt || new Date());
                    return bookmarkDate > oneWeekAgo;
                  }).length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Bookmarks Content */}
            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="space-y-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-lg p-6 animate-pulse">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-full" />
                        <div className="flex-1 space-y-3">
                          <div className="h-4 bg-muted rounded w-1/4" />
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-4 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredAndSortedBookmarks.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchQuery ? "No matching bookmarks" : "No bookmarks yet"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? `No bookmarks match "${searchQuery}". Try a different search term.`
                      : "Save posts to read later by clicking the bookmark icon on any post."
                    }
                  </p>
                  {searchQuery && (
                    <Button variant="outline" onClick={() => setSearchQuery("")}>
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-400px)]">
                  <div className="space-y-6">
                    {filteredAndSortedBookmarks.map((bookmark) => (
                      <div key={bookmark.id} className="relative">
                        <PostCard 
                          post={bookmark} 
                        />
                        
                        {/* Bookmark timestamp */}
                        {bookmark.bookmarkedAt && (
                          <div className="absolute top-2 right-2 z-10">
                            <Badge variant="secondary" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              Saved {formatDistanceToNow(new Date(bookmark.bookmarkedAt || new Date()), { addSuffix: true })}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <MobileNav />
      <MobileNavButtons />
    </div>
  );
}