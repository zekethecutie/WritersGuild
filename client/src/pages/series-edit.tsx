
import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  BookOpen, 
  Save, 
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Image as ImageIcon
} from "lucide-react";

export default function SeriesEditPage() {
  const [match, params] = useRoute("/story/:id/edit");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const storyId = params?.id;

  const [seriesData, setSeriesData] = useState({
    title: "",
    description: "",
    genre: "",
    tags: "",
    coverImageUrl: "",
    isCompleted: false,
    isPrivate: false
  });
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Fetch story details
  const { data: story, isLoading: storyLoading } = useQuery({
    queryKey: ["/api/series", storyId],
    queryFn: () => apiRequest("GET", `/api/series/${storyId}`),
    enabled: !!storyId,
  });

  // Fetch chapters
  const { data: chapters = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ["/api/series", storyId, "chapters"],
    queryFn: () => apiRequest("GET", `/api/series/${storyId}/chapters`),
    enabled: !!storyId,
  });

  // Update series mutation
  const updateSeriesMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/series/${storyId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", storyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/series/my-stories"] });
      toast({ title: "Success", description: "Series updated successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update series", variant: "destructive" });
    }
  });

  // Delete series mutation
  const deleteSeriesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/series/${storyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series"] });
      queryClient.invalidateQueries({ queryKey: ["/api/series/my-stories"] });
      toast({ title: "Success", description: "Series deleted successfully" });
      window.location.href = "/series";
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete series", variant: "destructive" });
    }
  });

  // Delete chapter mutation
  const deleteChapterMutation = useMutation({
    mutationFn: async (chapterId: string) => {
      return apiRequest("DELETE", `/api/chapters/${chapterId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", storyId, "chapters"] });
      toast({ title: "Success", description: "Chapter deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete chapter", variant: "destructive" });
    }
  });

  // Set series data when loaded
  useEffect(() => {
    if (story) {
      setSeriesData({
        title: story.title || "",
        description: story.description || "",
        genre: story.genre || "",
        tags: Array.isArray(story.tags) ? story.tags.join(", ") : "",
        coverImageUrl: story.coverImageUrl || "",
        isCompleted: story.isCompleted || false,
        isPrivate: story.isPrivate || false
      });
    }
  }, [story]);

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
      setSeriesData(prev => ({ ...prev, coverImageUrl: data.imageUrl }));
      
      toast({
        title: "Cover uploaded!",
        description: "Cover image has been updated.",
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

  const handleSave = () => {
    if (!seriesData.title.trim() || !seriesData.description.trim()) {
      toast({
        title: "Error",
        description: "Title and description are required.",
        variant: "destructive",
      });
      return;
    }

    updateSeriesMutation.mutate({
      ...seriesData,
      tags: seriesData.tags.split(",").map(tag => tag.trim()).filter(Boolean)
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
          <p className="text-muted-foreground">Please login to edit series.</p>
        </div>
      </div>
    );
  }

  if (storyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading series...</p>
        </div>
      </div>
    );
  }

  if (!story || story.authorId !== user?.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You can only edit your own series.</p>
        </div>
      </div>
    );
  }

  const genres = ["Romance", "Fantasy", "Mystery", "Sci-Fi", "Drama", "Comedy", "Horror", "Adventure"];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Edit Series</h1>
                <p className="text-muted-foreground">{story.title}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Series
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Series</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this series? This will permanently delete the series and all its chapters. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteSeriesMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Series
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Series Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Series Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title *</label>
                    <Input
                      value={seriesData.title}
                      onChange={(e) => setSeriesData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Series title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Genre</label>
                    <Select 
                      value={seriesData.genre} 
                      onValueChange={(value) => setSeriesData(prev => ({ ...prev, genre: value }))}
                    >
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
                      value={seriesData.tags}
                      onChange={(e) => setSeriesData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="romance, fantasy, magic (comma separated)"
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={seriesData.isCompleted}
                        onChange={(e) => setSeriesData(prev => ({ ...prev, isCompleted: e.target.checked }))}
                        className="rounded border-border"
                      />
                      <span className="text-sm">Mark as completed</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={seriesData.isPrivate}
                        onChange={(e) => setSeriesData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                        className="rounded border-border"
                      />
                      <span className="text-sm">Private series</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Cover Image</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
                      className="hidden"
                      id="cover-upload"
                    />
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      {seriesData.coverImageUrl ? (
                        <div className="space-y-3">
                          <div className="w-32 h-42 mx-auto rounded border overflow-hidden">
                            <img 
                              src={seriesData.coverImageUrl} 
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
                            <ImageIcon className="w-4 h-4 mr-2" />
                            {isUploadingCover ? "Uploading..." : "Change Cover"}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" />
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('cover-upload')?.click()}
                            disabled={isUploadingCover}
                          >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            {isUploadingCover ? "Uploading..." : "Upload Cover"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <Textarea
                  value={seriesData.description}
                  onChange={(e) => setSeriesData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your series..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSave}
                  disabled={updateSeriesMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateSeriesMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Chapters Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Chapters ({chapters.length})</CardTitle>
                <Button onClick={() => window.location.href = `/story/${storyId}/chapter/new`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Chapter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {chaptersLoading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : chapters.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No chapters yet</p>
                  <Button onClick={() => window.location.href = `/story/${storyId}/chapter/new`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Chapter
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {chapters.map((chapter: any) => (
                    <div 
                      key={chapter.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">
                          Chapter {chapter.chapterNumber}: {chapter.title}
                        </h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{chapter.wordCount} words</span>
                          <Badge variant={chapter.isPublished ? "default" : "secondary"}>
                            {chapter.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.location.href = `/story/${storyId}/chapter/${chapter.id}/edit`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{chapter.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteChapterMutation.mutate(chapter.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Chapter
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
