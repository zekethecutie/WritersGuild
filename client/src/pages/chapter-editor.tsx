
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
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Save, 
  Plus, 
  ArrowLeft,
  FileText,
  Eye,
  Edit3
} from "lucide-react";

export default function ChapterEditorPage() {
  const [match, params] = useRoute("/story/:id/edit");
  const [match2, params2] = useRoute("/story/:id/chapter/:chapterId/edit");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const storyId = params?.id || params2?.id;
  const chapterId = params2?.chapterId;
  const isEditingChapter = !!chapterId;

  const [chapterData, setChapterData] = useState({
    title: "",
    content: "",
    chapterNumber: 1
  });

  // Fetch story details
  const { data: story, isLoading: storyLoading } = useQuery({
    queryKey: ["/api/series", storyId],
    queryFn: () => apiRequest("GET", `/api/series/${storyId}`),
    enabled: !!storyId,
  });

  // Fetch existing chapters
  const { data: chapters = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ["/api/series", storyId, "chapters"],
    queryFn: () => apiRequest("GET", `/api/series/${storyId}/chapters`),
    enabled: !!storyId,
  });

  // Fetch chapter for editing
  const { data: existingChapter } = useQuery({
    queryKey: ["/api/chapters", chapterId],
    queryFn: () => apiRequest("GET", `/api/chapters/${chapterId}`),
    enabled: !!chapterId,
  });

  // Create/update chapter mutation
  const saveChapterMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditingChapter) {
        return apiRequest("PUT", `/api/chapters/${chapterId}`, data);
      } else {
        return apiRequest("POST", `/api/series/${storyId}/chapters`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series", storyId, "chapters"] });
      toast({ 
        title: "Success", 
        description: isEditingChapter ? "Chapter updated!" : "Chapter created!" 
      });
      window.history.back();
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to save chapter", 
        variant: "destructive" 
      });
    }
  });

  // Set chapter data for editing
  useEffect(() => {
    if (existingChapter) {
      setChapterData({
        title: existingChapter.title,
        content: existingChapter.content,
        chapterNumber: existingChapter.chapterNumber
      });
    } else if (!isEditingChapter) {
      setChapterData(prev => ({
        ...prev,
        chapterNumber: chapters.length + 1
      }));
    }
  }, [existingChapter, chapters.length, isEditingChapter]);

  const handleSave = () => {
    if (!chapterData.title.trim() || !chapterData.content.trim()) {
      toast({ 
        title: "Error", 
        description: "Please fill in both title and content", 
        variant: "destructive" 
      });
      return;
    }

    saveChapterMutation.mutate({
      ...chapterData,
      wordCount: chapterData.content.split(/\s+/).length
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
          <p className="text-muted-foreground">Please login to edit chapters.</p>
        </div>
      </div>
    );
  }

  if (storyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!story || story.authorId !== user?.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You can only edit your own stories.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditingChapter ? "Edit Chapter" : "New Chapter"}
              </h1>
              <p className="text-muted-foreground">
                {story.title}
              </p>
            </div>
          </div>

          {/* Editor */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Chapter Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Chapter Number</label>
                  <Input
                    type="number"
                    value={chapterData.chapterNumber}
                    onChange={(e) => setChapterData(prev => ({ 
                      ...prev, 
                      chapterNumber: parseInt(e.target.value) || 1 
                    }))}
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Word Count</label>
                  <Input
                    value={chapterData.content.split(/\s+/).length}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Chapter Title</label>
                <Input
                  value={chapterData.title}
                  onChange={(e) => setChapterData(prev => ({ 
                    ...prev, 
                    title: e.target.value 
                  }))}
                  placeholder="Enter chapter title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <Textarea
                  value={chapterData.content}
                  onChange={(e) => setChapterData(prev => ({ 
                    ...prev, 
                    content: e.target.value 
                  }))}
                  placeholder="Write your chapter content here..."
                  className="min-h-[400px] font-mono text-sm leading-relaxed"
                />
              </div>

              <div className="flex justify-between items-center pt-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Chapter {chapterData.chapterNumber}
                  </Badge>
                  <Badge variant="secondary">
                    {chapterData.content.split(/\s+/).length} words
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => window.history.back()}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={saveChapterMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveChapterMutation.isPending ? "Saving..." : "Save Chapter"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chapter List */}
          {!isEditingChapter && chapters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Existing Chapters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {chapters.map((chapter: any, index: number) => (
                    <div 
                      key={chapter.id} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">
                          Chapter {chapter.chapterNumber}: {chapter.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {chapter.wordCount} words
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.location.href = `/story/${storyId}/chapter/${chapter.id}/edit`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
