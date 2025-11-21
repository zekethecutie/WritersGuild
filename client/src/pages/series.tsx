import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Plus,
  Heart,
  Users,
  Eye,
  Calendar,
  User as UserIcon,
  Filter,
  Search,
  Edit3,
  X,
  MessageSquare
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getProfileImageUrl } from "@/lib/defaultImages";
import LoadingScreen from "@/components/loading-screen";

// Helper component for expandable description with line break support
function SeriesDescription({ description }: { description: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasLineBreaks = description.includes('\n');

  // Split description by newline and render paragraphs
  const paragraphs = description.split('\n').map((paragraph, index) => (
    <p key={index} className="mb-2 last:mb-0">
      {paragraph}
    </p>
  ));

  const toggleExpand = () => setIsExpanded(!isExpanded);

  // Determine if "See More" should be shown
  const shouldShowSeeMore = !isExpanded && (paragraphs.length > 2 || description.length > 150); // Heuristic for showing "See More"

  return (
    <div>
      {isExpanded ? (
        <div>
          {paragraphs}
        </div>
      ) : (
        <div>
          {paragraphs.slice(0, 2)} {/* Show first two paragraphs */}
          {shouldShowSeeMore && (
            <span
              className="text-primary cursor-pointer font-semibold"
              onClick={toggleExpand}
            >
              ... See More
            </span>
          )}
        </div>
      )}
      {!shouldShowSeeMore && paragraphs.length > 2 && (
        <span
          className="text-primary cursor-pointer font-semibold"
          onClick={toggleExpand}
        >
          {isExpanded ? "See Less" : "See More"}
        </span>
      )}
    </div>
  );
}


interface Series {
  id: string;
  title: string;
  description: string;
  genre: string;
  tags: string[];
  coverImageUrl?: string;
  isCompleted: boolean;
  chaptersCount: number;
  followersCount: number;
  likesCount: number;
  viewsCount: number;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    profileImageUrl?: string;
  };
}

// My Stories Section Component
function MyStoriesSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myStories = [], isLoading } = useQuery({
    queryKey: ["/api/my-posts"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/my-posts");
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching my posts:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest("DELETE", `/api/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-posts"] });
      toast({ title: "Success", description: "Post deleted successfully" });
    },
  });

  if (isLoading) {
    return <LoadingScreen title="Loading Stories..." subtitle="Discovering amazing tales" />;
  }

  if (!Array.isArray(myStories)) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Unable to load stories. Please try again.</p>
      </div>
    );
  }

  if (myStories.length === 0) {
    return (
      <Card className="p-8 text-center border-2 border-dashed">
        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No stories yet</h3>
        <p className="text-muted-foreground mb-4">Start your writing journey by publishing your first article</p>
        <Button asChild>
          <a href="/">
            <Plus className="w-4 h-4 mr-2" />
            Write Your First Story
          </a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {Array.isArray(myStories) && myStories.length > 0 && myStories.map((post: any) => (
        <Card key={post.id} className="group hover:shadow-lg transition-shadow p-4">
          <div className="flex gap-4">
            {post.coverImageUrl && (
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2 gap-2">
                <h3 className="font-semibold text-base line-clamp-2">{post.title}</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deletePostMutation.mutate(post.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  data-testid="button-delete-post"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {post.excerpt || post.content?.substring(0, 100)}
              </p>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {post.likesCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {post.commentsCount || 0}
                  </span>
                  <span className="text-xs">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={`/post/${post.id}`}>Read</a>
                </Button>
                <Button size="sm" asChild>
                  <a href={`/post/${post.id}/edit`}>Edit</a>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function SeriesPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSeries, setNewSeries] = useState({
    title: "",
    description: "",
    genre: "",
    tags: "",
    coverImageUrl: ""
  });
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Fetch series
  const {
    data: seriesList = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ["/api/series", { genre: selectedGenre !== "all" ? selectedGenre : undefined }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedGenre !== "all") params.append("genre", selectedGenre);
      return fetch(`/api/series?${params}`).then(res => res.json());
    },
  });

  // Create series mutation
  const createSeriesMutation = useMutation({
    mutationFn: async (seriesData: any) => {
      return apiRequest("POST", "/api/series", seriesData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
      setShowCreateDialog(false);
      setNewSeries({ title: "", description: "", genre: "", tags: "", coverImageUrl: "" });
      toast({
        title: "Success",
        description: "Series created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create series. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Follow series mutation
  const followMutation = useMutation({
    mutationFn: async (seriesId: string) => {
      return apiRequest("POST", `/api/series/${seriesId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update follow status.",
        variant: "destructive",
      });
    },
  });

  const handleCoverUpload = async (file: File) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('coverPhoto', file);

    setIsUploadingCover(true);
    try {
      const response = await fetch("/api/upload/series-cover", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setNewSeries(prev => ({ ...prev, coverImageUrl: data.imageUrl }));

      toast({
        title: "Cover uploaded!",
        description: "Cover image has been added to your series.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload cover image.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleCreateSeries = () => {
    if (!newSeries.title.trim() || !newSeries.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createSeriesMutation.mutate({
      ...newSeries,
      tags: newSeries.tags.split(",").map(tag => tag.trim()).filter(Boolean)
    });
  };

  const filteredSeries = seriesList.filter((series: Series) =>
    series.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    series.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    series.author.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const genres = ["Romance", "Fantasy", "Mystery", "Sci-Fi", "Drama", "Comedy", "Horror", "Adventure"];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <BookOpen className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Writers Guild Stories</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover captivating novels, series, and short stories from our talented community of writers
            </p>
          </div>

          {/* My Stories Section for authenticated users */}
          {isAuthenticated && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">My Stories</h2>
              <MyStoriesSection />
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Discover Stories</h2>
            {isAuthenticated && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Series
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Create New Series</DialogTitle>
                    <DialogDescription>
                      Start your writing journey! Create a captivating story series with chapters, cover art, and rich details.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Title *</label>
                          <Input
                            value={newSeries.title}
                            onChange={(e) => setNewSeries(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Enter your story title..."
                            className="text-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Genre</label>
                          <Select value={newSeries.genre} onValueChange={(value) => setNewSeries(prev => ({ ...prev, genre: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select genre" />
                            </SelectTrigger>
                            <SelectContent>
                              {genres.map(genre => (
                                <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Tags</label>
                          <Input
                            value={newSeries.tags}
                            onChange={(e) => setNewSeries(prev => ({ ...prev, tags: e.target.value }))}
                            placeholder="romance, fantasy, magic (comma separated)"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Help readers discover your story with relevant tags
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Cover Image (9:16 ratio recommended)</label>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
                            className="hidden"
                            id="cover-upload"
                          />
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                            {newSeries.coverImageUrl ? (
                              <div className="space-y-3">
                                <div className="w-24 h-32 mx-auto rounded border overflow-hidden">
                                  <img
                                    src={newSeries.coverImageUrl}
                                    alt="Cover preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById('cover-upload')?.click()}
                                  disabled={isUploadingCover}
                                >
                                  Change Cover
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" />
                                <div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('cover-upload')?.click()}
                                    disabled={isUploadingCover}
                                    className="mb-2"
                                  >
                                    {isUploadingCover ? "Uploading..." : "Upload Cover"}
                                  </Button>
                                  <p className="text-xs text-muted-foreground">
                                    JPG, PNG or WebP (max 10MB)
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Description *</label>
                      <Textarea
                        value={newSeries.description}
                        onChange={(e) => setNewSeries(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Write a compelling description of your story..."
                        rows={4}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This will be shown to readers on your story page
                      </p>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button onClick={() => setShowCreateDialog(false)} variant="outline" className="flex-1">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateSeries}
                        disabled={createSeriesMutation.isPending}
                        className="flex-1"
                      >
                        {createSeriesMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search series, authors, or descriptions..."
                className="pl-10"
              />
            </div>
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {genres.map(genre => (
                  <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Series Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-muted rounded-t-lg" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSeries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSeries.map((series: Series) => (
                <Card
                  key={series.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => window.location.href = `/story/${series.id}`}
                >
                  <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-accent/20 rounded-t-lg flex items-center justify-center">
                    {series.coverImageUrl ? (
                      <img
                        src={series.coverImageUrl}
                        alt={series.title}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                    ) : (
                      <BookOpen className="w-16 h-16 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {series.title}
                      </h3>
                      {series.isCompleted && (
                        <Badge variant="secondary" className="text-xs">Complete</Badge>
                      )}
                    </div>

                    <div className="text-muted-foreground text-sm leading-relaxed">
                      <SeriesDescription description={series.description} />
                    </div>

                    {series.genre && (
                      <Badge variant="outline" className="mb-3 text-xs">
                        {series.genre}
                      </Badge>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <img
                        src={getProfileImageUrl(series.author.profileImageUrl)}
                        alt={series.author.displayName}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm text-muted-foreground">
                        by {series.author.displayName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {series.chaptersCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {series.followersCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {series.likesCount}
                        </span>
                      </div>
                      <span>
                        {formatDistanceToNow(new Date(series.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    {series.tags && series.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {series.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {series.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{series.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => window.location.href = `/story/${series.id}`}
                      >
                        Read Now
                      </Button>
                      {isAuthenticated && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            followMutation.mutate(series.id);
                          }}
                          disabled={followMutation.isPending}
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No series found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedGenre !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Be the first to create a series!"
                }
              </p>
            </div>
          )}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}