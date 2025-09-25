import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import LoadingScreen from "@/components/loading-screen";
import RichTextEditor from "@/components/rich-text-editor";
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
        title: "Success",
        description: "Series updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update series",
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
        title: "Success",
        description: "Chapter created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create chapter",
        variant: "destructive",
      });
    },
  });

  // Update chapter mutation
  const updateChapterMutation = useMutation({
    mutationFn: async (chapterData: any) => {
      return apiRequest("PUT", `/api/chapters/${editingChapter.id}`, chapterData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", id, "chapters"] });
      setEditingChapter(null);
      setChapterTitle("");
      setChapterContent("");
      toast({
        title: "Success",
        description: "Chapter updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update chapter",
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
        title: "Success",
        description: "Chapter deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete chapter",
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
        title: "Success",
        description: "Series deleted successfully",
      });
      setLocation("/series");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete series",
        variant: "destructive",
      });
    },
  });

  // Handle cover image upload
  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);

    try {
      const formData = new FormData();
      formData.append('images', file);
      formData.append('type', 'cover');

      const response = await fetch('/api/upload/images', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCoverImageUrl(data.imageUrls[0]);
        toast({
          title: "Success",
          description: "Cover image uploaded successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to upload cover image",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload cover image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Handle form submissions
  const handleSeriesUpdate = () => {
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Error",
        description: "Title and description are required",
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

  const handleChapterSubmit = () => {
    if (!chapterTitle.trim() || !chapterContent.trim()) {
      toast({
        title: "Error",
        description: "Chapter title and content are required",
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
      updateChapterMutation.mutate(chapterData);
    } else {
      createChapterMutation.mutate(chapterData);
    }
  };

  // Tag management
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Chapter management
  const startNewChapter = () => {
    setEditingChapter(null);
    setChapterTitle("");
    setChapterContent("");
    setChapterNumber(chapters.length + 1);
    setShowNewChapter(true);
  };

  const startEditChapter = (chapter: any) => {
    setEditingChapter(chapter);
    setShowNewChapter(true);
    setChapterTitle(chapter.title);
    setChapterContent(chapter.content);
    const sortedChapters = chapters.sort((a: any, b: any) => a.chapterNumber - b.chapterNumber);
    const chapterIndex = sortedChapters.findIndex((ch: any) => ch.id === chapter.id);
    setChapterNumber(chapterIndex + 1);
  };

  // Authentication check
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Sign in to edit series</h2>
            <p className="text-muted-foreground">You need to be logged in to edit a series.</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (seriesLoading || chaptersLoading) {
    return <LoadingScreen />;
  }

  // Error state
  if (seriesError || !series) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Series not found</h2>
            <p className="text-muted-foreground">The series you're looking for doesn't exist or you don't have permission to edit it.</p>
            <Button className="mt-4" onClick={() => setLocation("/series")}>
              Back to Series
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Permission check
  if (series.authorId !== user?.id) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Access denied</h2>
            <p className="text-muted-foreground">You don't have permission to edit this series.</p>
            <Button className="mt-4" onClick={() => setLocation(`/story/${id}`)}>
              View Series
            </Button>
          </div>
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
          <div className="flex items-center gap-4 p-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation(`/story/${id}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Series
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <BookOpen className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Edit Series</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSeriesUpdate}
                disabled={updateSeriesMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Series Info</TabsTrigger>
              <TabsTrigger value="chapters">Chapters</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Series Information Tab */}
            <TabsContent value="info" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter series title"
                      data-testid="input-series-title"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your series"
                      className="min-h-[120px]"
                      data-testid="textarea-series-description"
                    />
                  </div>

                  {/* Genre */}
                  <div className="space-y-2">
                    <Label htmlFor="genre">Genre</Label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger data-testid="select-series-genre">
                        <SelectValue placeholder="Select a genre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fiction">Fiction</SelectItem>
                        <SelectItem value="non-fiction">Non-Fiction</SelectItem>
                        <SelectItem value="poetry">Poetry</SelectItem>
                        <SelectItem value="romance">Romance</SelectItem>
                        <SelectItem value="mystery">Mystery</SelectItem>
                        <SelectItem value="fantasy">Fantasy</SelectItem>
                        <SelectItem value="science-fiction">Science Fiction</SelectItem>
                        <SelectItem value="thriller">Thriller</SelectItem>
                        <SelectItem value="horror">Horror</SelectItem>
                        <SelectItem value="historical">Historical</SelectItem>
                        <SelectItem value="young-adult">Young Adult</SelectItem>
                        <SelectItem value="children">Children's</SelectItem>
                        <SelectItem value="memoir">Memoir</SelectItem>
                        <SelectItem value="biography">Biography</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag"
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        data-testid="input-new-tag"
                      />
                      <Button type="button" onClick={addTag} variant="outline">
                        Add
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((tag) => (
                          <Badge 
                            key={tag} 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => removeTag(tag)}
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cover Image */}
                  <div className="space-y-2">
                    <Label>Cover Image</Label>
                    <div className="flex items-center gap-4">
                      {coverImageUrl && (
                        <img 
                          src={coverImageUrl} 
                          alt="Series cover" 
                          className="w-20 h-28 object-cover rounded"
                        />
                      )}
                      <div>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          disabled={isUploadingCover}
                          className="mb-2"
                          data-testid="input-cover-upload"
                        />
                        <p className="text-sm text-muted-foreground">
                          Upload a cover image for your series
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Chapters Tab */}
            <TabsContent value="chapters" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Chapters ({chapters.length})</h3>
                <Button onClick={startNewChapter} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Chapter
                </Button>
              </div>

              {/* New/Edit Chapter Form */}
              {showNewChapter && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {editingChapter ? "Edit Chapter" : "New Chapter"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="chapterTitle">Chapter Title</Label>
                      <Input
                        id="chapterTitle"
                        value={chapterTitle}
                        onChange={(e) => setChapterTitle(e.target.value)}
                        placeholder="Enter chapter title"
                        data-testid="input-chapter-title"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="chapterContent">Chapter Content</Label>
                      <RichTextEditor
                        content={chapterContent}
                        onChange={setChapterContent}
                        placeholder="Write your chapter content here..."
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleChapterSubmit}
                        disabled={createChapterMutation.isPending || updateChapterMutation.isPending}
                        data-testid="button-save-chapter"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {editingChapter ? "Update Chapter" : "Create Chapter"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowNewChapter(false);
                          setEditingChapter(null);
                          setChapterTitle("");
                          setChapterContent("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Chapters List */}
              <div className="space-y-4">
                {chapters.map((chapter: any, index: number) => (
                  <Card key={chapter.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">
                            Chapter {index + 1}: {chapter.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {chapter.wordCount || 0} words • 
                            {chapter.isPublished ? " Published" : " Draft"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditChapter(chapter)}
                            data-testid={`button-edit-chapter-${chapter.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              >
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
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {chapters.length === 0 && !showNewChapter && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-semibold mb-2">No chapters yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start writing your story by adding your first chapter
                      </p>
                      <Button onClick={startNewChapter}>
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
              <Card>
                <CardHeader>
                  <CardTitle>Series Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Completion Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="completed">Mark as Completed</Label>
                      <p className="text-sm text-muted-foreground">
                        Mark this series as completed if you've finished writing it
                      </p>
                    </div>
                    <Switch
                      id="completed"
                      checked={isCompleted}
                      onCheckedChange={setIsCompleted}
                      data-testid="switch-series-completed"
                    />
                  </div>

                  {/* Privacy */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="private">Private Series</Label>
                      <p className="text-sm text-muted-foreground">
                        Only you can view private series
                      </p>
                    </div>
                    <Switch
                      id="private"
                      checked={isPrivate}
                      onCheckedChange={setIsPrivate}
                      data-testid="switch-series-private"
                    />
                  </div>

                  {/* Danger Zone */}
                  <div className="border-t pt-6">
                    <h4 className="font-semibold text-destructive mb-4">Danger Zone</h4>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="flex items-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          Delete Series
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Series</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this series? This will permanently delete 
                            the series and all its chapters. This action cannot be undone.
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}