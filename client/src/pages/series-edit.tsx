import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
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
  Plus, 
  BookOpen, 
  Edit, 
  Trash2, 
  Save, 
  Eye, 
  Users, 
  Clock,
  ArrowLeft,
  Settings,
  Upload,
  X,
  FileText,
  List
} from "lucide-react";
import { useLocation } from "wouter";

interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  order: number;
  published: boolean;
  createdAt: string;
}

interface Series {
  id: string;
  title: string;
  description: string;
  genre: string;
  tags: string[];
  isPublic: boolean;
  coverImageUrl?: string;
  chapters: Chapter[];
  status: 'draft' | 'ongoing' | 'completed';
  totalWordCount: number;
  authorId: string;
}

export default function SeriesEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [status, setStatus] = useState<'draft' | 'ongoing' | 'completed'>('draft');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  const createSeriesMutation = useMutation({
    mutationFn: async (seriesData: any) => {
      // First upload cover image if exists
      let coverImageUrl = "";
      if (coverImage) {
        try {
          const formData = new FormData();
          formData.append('coverPhoto', coverImage);
          
          const uploadResponse = await fetch('/api/upload/series-cover', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            coverImageUrl = uploadData.imageUrl;
          }
        } catch (error) {
          console.error("Cover upload error:", error);
        }
      }

      // Create series with data
      return apiRequest("POST", "/api/series", {
        title: seriesData.title,
        description: seriesData.description,
        genre: seriesData.genre,
        tags: seriesData.tags,
        isPrivate: !seriesData.isPublic,
        coverImageUrl: coverImageUrl || undefined,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Series created!",
        description: "Your new series has been created successfully.",
      });
      setLocation(`/series/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create series. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addChapter = () => {
    if (!newChapterTitle.trim()) return;

    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: newChapterTitle,
      content: "",
      wordCount: 0,
      order: chapters.length + 1,
      published: false,
      createdAt: new Date().toISOString()
    };

    setChapters([...chapters, newChapter]);
    setNewChapterTitle("");
    setShowChapterForm(false);
  };

  const deleteChapter = (chapterId: string) => {
    setChapters(chapters.filter(ch => ch.id !== chapterId));
  };

  const reorderChapters = (fromIndex: number, toIndex: number) => {
    const updatedChapters = [...chapters];
    const [movedChapter] = updatedChapters.splice(fromIndex, 1);
    updatedChapters.splice(toIndex, 0, movedChapter);

    // Update order numbers
    updatedChapters.forEach((chapter, index) => {
      chapter.order = index + 1;
    });

    setChapters(updatedChapters);
  };

  const handleCreateSeries = () => {
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in the title and description.",
        variant: "destructive",
      });
      return;
    }

    createSeriesMutation.mutate({
      title,
      description,
      genre,
      tags,
      isPublic,
      status,
      chapters
    });
  };

  const totalWordCount = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to create a series.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/series")}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Series</h1>
            <p className="text-muted-foreground">Set up your novel or story collection</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5" />
                <span>Series Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your series title..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write a compelling description of your series..."
                  className="mt-1 min-h-[120px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="romance">Romance</SelectItem>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="mystery">Mystery</SelectItem>
                      <SelectItem value="thriller">Thriller</SelectItem>
                      <SelectItem value="sci-fi">Science Fiction</SelectItem>
                      <SelectItem value="horror">Horror</SelectItem>
                      <SelectItem value="drama">Drama</SelectItem>
                      <SelectItem value="comedy">Comedy</SelectItem>
                      <SelectItem value="historical">Historical Fiction</SelectItem>
                      <SelectItem value="young-adult">Young Adult</SelectItem>
                      <SelectItem value="literary">Literary Fiction</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        if (!tags.includes(newTag.trim())) {
                          setTags([...tags, newTag.trim()]);
                        }
                        setNewTag("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (newTag.trim() && !tags.includes(newTag.trim())) {
                        setTags([...tags, newTag.trim()]);
                        setNewTag("");
                      }
                    }}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <button
                        onClick={() => setTags(tags.filter((_, i) => i !== index))}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cover Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Cover Image</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCoverImage(file);
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setCoverImagePreview(e.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                  id="cover-upload"
                />
                <Label htmlFor="cover-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                    {coverImagePreview ? (
                      <div className="space-y-2">
                        <img
                          src={coverImagePreview}
                          alt="Cover preview"
                          className="max-w-32 max-h-48 mx-auto rounded-lg object-cover"
                        />
                        <p className="text-sm text-muted-foreground">Click to change cover</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload cover image
                        </p>
                      </div>
                    )}
                  </div>
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Chapters Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <List className="w-5 h-5" />
                  <span>Chapters</span>
                </div>
                <Button
                  onClick={() => setShowChapterForm(true)}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Chapter
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showChapterForm && (
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      placeholder="Chapter title..."
                      onKeyPress={(e) => e.key === 'Enter' && addChapter()}
                    />
                    <Button onClick={addChapter} size="sm">
                      Add
                    </Button>
                    <Button 
                      onClick={() => setShowChapterForm(false)} 
                      variant="ghost" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {chapters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    <p>No chapters yet. Add your first chapter to get started!</p>
                  </div>
                ) : (
                  chapters.map((chapter, index) => (
                    <div key={chapter.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-muted-foreground w-8">
                          {chapter.order}
                        </span>
                        <div>
                          <h4 className="font-medium">{chapter.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {chapter.wordCount} words
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={chapter.published ? "default" : "secondary"}>
                          {chapter.published ? "Published" : "Draft"}
                        </Badge>
                        <Button
                          onClick={() => setEditingChapter(chapter)}
                          size="sm"
                          variant="ghost"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost">
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
                                onClick={() => deleteChapter(chapter.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Visibility</Label>
                <Select value={isPublic ? "public" : "private"} onValueChange={(value) => setIsPublic(value === "public")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>Public</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4" />
                        <span>Private</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {isPublic ? "Anyone can find and read your series" : "Only you can see this series"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Chapters</span>
                <span className="text-sm font-medium">{chapters.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Words</span>
                <span className="text-sm font-medium">{totalWordCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline" className="capitalize">{status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Published</span>
                <span className="text-sm font-medium">
                  {chapters.filter(ch => ch.published).length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  disabled={!title.trim() || !description.trim() || createSeriesMutation.isPending}
                  onClick={handleCreateSeries}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createSeriesMutation.isPending ? "Creating..." : "Create Series"}
                </Button>
                <Button variant="outline" className="w-full">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}