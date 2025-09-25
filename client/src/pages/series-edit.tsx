
```tsx
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import LoadingScreen from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  ArrowLeft,
  Upload,
  Settings,
  FileText,
  Image as ImageIcon
} from "lucide-react";

export default function SeriesEditPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Series form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Chapter form state
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [chapterNumber, setChapterNumber] = useState(1);
  const [editingChapter, setEditingChapter] = useState<any>(null);

  // Fetch series data
  const { 
    data: series, 
    isLoading: seriesLoading, 
    error: seriesError 
  } = useQuery({
    queryKey: ["/api/series", id],
    queryFn: () => apiRequest("GET", `/api/series/${id}`),
    enabled: !!id,
  });

  // Fetch chapters
  const { 
    data: chapters = [], 
    isLoading: chaptersLoading 
  } = useQuery({
    queryKey: ["/api/series", id, "chapters"],
    queryFn: () => apiRequest("GET", `/api/series/${id}/chapters`),
    enabled: !!id,
  });

  // Initialize form with series data
  useEffect(() => {
    if (series) {
      setTitle(series.title || "");
      setDescription(series.description || "");
      setGenre(series.genre || "");
      setTags(series.tags || []);
      setCoverImageUrl(series.coverImageUrl || "");
      setIsCompleted(series.isCompleted || false);
      setIsPrivate(series.isPrivate || false);
    }
  }, [series]);

  // Set next chapter number
  useEffect(() => {
    if (chapters.length > 0 && !editingChapter) {
      const maxChapter = Math.max(...chapters.map((ch: any) => ch.chapterNumber || 0));
      setChapterNumber(maxChapter + 1);
    }
  }, [chapters, editingChapter]);

  // Update series mutation
  const updateSeriesMutation = useMutation({
    mutationFn: async (seriesData: any) => {
      return apiRequest("PUT", `/api/series/${id}`, seriesData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", id] });
      toast({
        title: "Series updated!",
        description: "Your series has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "There was an error updating your series.",
        variant: "destructive",
      });
    },
  });

  // Create chapter mutation
  const createChapterMutation = useMutation({
    mutationFn: async (chapterData: any) => {
      return apiRequest("POST", `/api/series/${id}/chapters`, chapterData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", id, "chapters"] });
      setShowNewChapter(false);
      setChapterTitle("");
      setChapterContent("");
      toast({
        title: "Chapter added!",
        description: "New chapter has been added to your series.",
      });
    },
    onError: () => {
      toast({
        title: "Chapter creation failed",
        description: "There was an error adding the chapter.",
        variant: "destructive",
      });
    },
  });

  // Update chapter mutation
  const updateChapterMutation = useMutation({
    mutationFn: async ({ chapterId, chapterData }: { chapterId: string; chapterData: any }) => {
      return apiRequest("PUT", `/api/chapters/${chapterId}`, chapterData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", id, "chapters"] });
      setEditingChapter(null);
      setChapterTitle("");
      setChapterContent("");
      toast({
        title: "Chapter updated!",
        description: "Chapter has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "There was an error updating the chapter.",
        variant: "destructive",
      });
    },
  });

  // Delete chapter mutation
  const deleteChapterMutation = useMutation({
    mutationFn: async (chapterId: string) => {
      return apiRequest("DELETE", `/api/chapters/${chapterId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", id, "chapters"] });
      toast({
        title: "Chapter deleted",
        description: "Chapter has been removed from your series.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the chapter.",
        variant: "destructive",
      });
    },
  });

  // Delete series mutation
  const deleteSeriesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/series/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Series deleted",
        description: "Your series has been permanently deleted.",
      });
      setLocation("/series");
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "There was an error deleting your series.",
        variant: "destructive",
      });
    },
  });

  // Cover image upload
  const handleCoverUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('coverPhoto', file);

    setIsUploadingCover(true);
    try {
      const response = await fetch("/api/upload/series-cover", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setCoverImageUrl(data.imageUrl);
      
      toast({
        title: "Cover uploaded!",
        description: "Series cover image has been updated.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading the cover image.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Handle series form submission
  const handleSeriesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in title and description.",
        variant: "destructive",
      });
      return;
    }

    updateSeriesMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      genre,
      tags,
      coverImageUrl,
      isCompleted,
      isPrivate,
    });
  };

  // Handle chapter form submission
  const handleChapterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chapterTitle.trim() || !chapterContent.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in chapter title and content.",
        variant: "destructive",
      });
      return;
    }

    const chapterData = {
      title: chapterTitle.trim(),
      content: chapterContent.trim(),
      chapterNumber,
    };

    if (editingChapter) {
      updateChapterMutation.mutate({
        chapterId: editingChapter.id,
        chapterData,
      });
    } else {
      createChapterMutation.mutate(chapterData);
    }
  };

  // Handle tag addition
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  // Handle tag removal
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Start editing chapter
  const startEditingChapter = (chapter: any) => {
    setEditingChapter(chapter);
    setChapterTitle(chapter.title);
    setChapterContent(chapter.content);
    setChapterNumber(chapter.chapterNumber);
    setShowNewChapter(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingChapter(null);
    setShowNewChapter(false);
    setChapterTitle("");
    setChapterContent("");
    if (chapters.length > 0) {
      const maxChapter = Math.max(...chapters.map((ch: any) => ch.chapterNumber || 0));
      setChapterNumber(maxChapter + 1);
    } else {
      setChapterNumber(1);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to edit your series.</p>
          <Button onClick={() => setLocation("/")}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (seriesLoading || chaptersLoading) {
    return <LoadingScreen title="Loading Series..." subtitle="Fetching series details and chapters" />;
  }

  if (seriesError || !series) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Series not found</h2>
          <p className="text-muted-foreground mb-4">
            The series you're looking for doesn't exist or you don't have permission to edit it.
          </p>
          <Button onClick={() => setLocation("/series")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Series
          </Button>
        </div>
      </div>
    );
  }

  // Check if user owns the series
  if (series.authorId !== user?.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You can only edit your own series.</p>
          <Button onClick={() => setLocation("/series")}>Back to Series</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation(`/story/${id}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Story
              </Button>
              <div>
                <h1 className="text-xl font-bold">Edit Series</h1>
                <p className="text-sm text-muted-foreground">{series.title}</p>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 border-red-200">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Series
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Series</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this series? This action cannot be undone and will permanently remove all chapters and associated data.
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

        <div className="max-w-6xl mx-auto p-6">
          <Tabs defaultValue="chapters" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chapters" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Chapters ({chapters.length})
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Chapters Tab */}
            <TabsContent value="chapters" className="space-y-6">
              {/* Add Chapter Button */}
              <Card>
                <CardContent className="p-4">
                  <Button
                    onClick={() => setShowNewChapter(!showNewChapter)}
                    className="w-full"
                    variant={showNewChapter ? "secondary" : "default"}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {showNewChapter ? "Cancel" : "Add New Chapter"}
                  </Button>
                </CardContent>
              </Card>

              {/* New/Edit Chapter Form */}
              {showNewChapter && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {editingChapter ? "Edit Chapter" : "New Chapter"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleChapterSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="chapterNumber">Chapter Number</Label>
                          <Input
                            id="chapterNumber"
                            type="number"
                            value={chapterNumber}
                            onChange={(e) => setChapterNumber(parseInt(e.target.value) || 1)}
                            min={1}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="chapterTitle">Chapter Title</Label>
                          <Input
                            id="chapterTitle"
                            value={chapterTitle}
                            onChange={(e) => setChapterTitle(e.target.value)}
                            placeholder="Enter chapter title..."
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="chapterContent">Chapter Content</Label>
                        <Textarea
                          id="chapterContent"
                          value={chapterContent}
                          onChange={(e) => setChapterContent(e.target.value)}
                          placeholder="Write your chapter content here..."
                          rows={15}
                          className="resize-none"
                          required
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          type="submit" 
                          disabled={createChapterMutation.isPending || updateChapterMutation.isPending}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {editingChapter ? "Update Chapter" : "Save Chapter"}
                        </Button>
                        <Button type="button" variant="outline" onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Chapters List */}
              <div className="space-y-4">
                {chapters.length > 0 ? (
                  chapters.map((chapter: any) => (
                    <Card key={chapter.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              Chapter {chapter.chapterNumber}: {chapter.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {chapter.wordCount} words • Created {new Date(chapter.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditingChapter(chapter)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600">
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
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No chapters yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start writing your story by adding your first chapter.
                      </p>
                      <Button onClick={() => setShowNewChapter(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Chapter
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <form onSubmit={handleSeriesSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Series Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter series title..."
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your series..."
                        rows={4}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="genre">Genre</Label>
                      <Select value={genre} onValueChange={setGenre}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a genre" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fantasy">Fantasy</SelectItem>
                          <SelectItem value="sci-fi">Science Fiction</SelectItem>
                          <SelectItem value="romance">Romance</SelectItem>
                          <SelectItem value="mystery">Mystery</SelectItem>
                          <SelectItem value="horror">Horror</SelectItem>
                          <SelectItem value="thriller">Thriller</SelectItem>
                          <SelectItem value="literary">Literary Fiction</SelectItem>
                          <SelectItem value="historical">Historical Fiction</SelectItem>
                          <SelectItem value="contemporary">Contemporary</SelectItem>
                          <SelectItem value="young-adult">Young Adult</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tags</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add a tag..."
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" variant="outline" onClick={addTag}>
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="cursor-pointer">
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-2 text-xs"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cover Image</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {coverImageUrl && (
                      <div className="w-32 h-40 bg-muted rounded-lg overflow-hidden">
                        <img 
                          src={coverImageUrl} 
                          alt="Series cover"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files && handleCoverUpload(e.target.files)}
                        className="hidden"
                        id="cover-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('cover-upload')?.click()}
                        disabled={isUploadingCover}
                      >
                        {isUploadingCover ? (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          <ImageIcon className="w-4 h-4 mr-2" />
                        )}
                        {coverImageUrl ? "Change Cover" : "Upload Cover"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Publication Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="completed">Mark as Completed</Label>
                        <p className="text-sm text-muted-foreground">
                          Mark this series as finished
                        </p>
                      </div>
                      <Switch
                        id="completed"
                        checked={isCompleted}
                        onCheckedChange={setIsCompleted}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="private">Private Series</Label>
                        <p className="text-sm text-muted-foreground">
                          Only you can see this series
                        </p>
                      </div>
                      <Switch
                        id="private"
                        checked={isPrivate}
                        onCheckedChange={setIsPrivate}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={updateSeriesMutation.isPending}
                >
                  {updateSeriesMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
```
