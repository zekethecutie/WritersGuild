
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import LoadingScreen from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  ArrowRight,
  BookOpen,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Home,
  Clock,
  User,
  Eye,
  Settings
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ChapterPage() {
  const [match, params] = useRoute("/chapter/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chapter data with proper error handling
  const { 
    data: chapter, 
    isLoading: chapterLoading, 
    error: chapterError 
  } = useQuery({
    queryKey: ["/api/chapters", id],
    queryFn: async () => {
      if (!id) throw new Error('No chapter ID provided');
      try {
        const response = await fetch(`/api/chapters/${id}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Chapter not found');
          }
          throw new Error('Failed to load chapter');
        }
        return response.json();
      } catch (error) {
        console.error('Chapter fetch error:', error);
        throw error;
      }
    },
    enabled: !!id,
    retry: 1,
  });

  // Fetch series data
  const { 
    data: series,
    isLoading: seriesLoading 
  } = useQuery({
    queryKey: ["/api/series", chapter?.seriesId],
    queryFn: async () => {
      const response = await fetch(`/api/series/${chapter.seriesId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Series not found');
      return response.json();
    },
    enabled: !!chapter?.seriesId,
  });

  // Fetch all chapters for navigation
  const { 
    data: allChapters = [] 
  } = useQuery({
    queryKey: ["/api/series", chapter?.seriesId, "chapters"],
    queryFn: async () => {
      const response = await fetch(`/api/series/${chapter.seriesId}/chapters`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch chapters');
      return response.json();
    },
    enabled: !!chapter?.seriesId,
  });

  // Update reading progress
  const updateProgressMutation = useMutation({
    mutationFn: async (chapterIndex: number) => {
      return apiRequest("PUT", `/api/series/${chapter.seriesId}/progress`, { chapterIndex });
    },
  });

  // Update progress when chapter loads
  useEffect(() => {
    if (chapter && series && isAuthenticated && allChapters.length > 0) {
      const chapterIndex = allChapters.findIndex((ch: any) => ch.id === chapter.id);
      if (chapterIndex >= 0) {
        updateProgressMutation.mutate(chapterIndex);
      }
    }
  }, [chapter?.id, isAuthenticated, allChapters]);

  // Calculate navigation
  const currentChapterIndex = allChapters.findIndex((ch: any) => ch.id === chapter?.id);
  const previousChapter = currentChapterIndex > 0 ? allChapters[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex < allChapters.length - 1 ? allChapters[currentChapterIndex + 1] : null;
  const isOwner = isAuthenticated && series?.author?.id === user?.id;

  // Reading progress calculation
  const readingProgress = allChapters.length > 0 ? ((currentChapterIndex + 1) / allChapters.length) * 100 : 0;

  if (chapterLoading || seriesLoading) {
    return <LoadingScreen title="Loading Chapter..." subtitle="Preparing your reading experience" />;
  }

  if (chapterError || !chapter) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 mx-auto">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Chapter Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The chapter you're looking for doesn't exist or may have been removed.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setLocation("/series")}>
                <Home className="w-4 h-4 mr-2" />
                Browse Stories
              </Button>
              <Button onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        {/* Header Navigation */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation(`/story/${chapter.seriesId}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Story</span>
              </Button>
              <div className="hidden md:block">
                <h1 className="font-semibold text-sm text-muted-foreground">
                  {series?.title}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Chapter {chapter.chapterNumber} of {allChapters.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isOwner && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation(`/story/${chapter.seriesId}/chapter/${chapter.id}/edit`)}
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Edit</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation("/series")}
              >
                <BookOpen className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Reading Progress Bar */}
          {allChapters.length > 1 && (
            <div className="px-4 pb-2">
              <Progress value={readingProgress} className="h-1" />
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {/* Chapter Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs">
                Chapter {chapter.chapterNumber}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {chapter.wordCount || 0} words
              </Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight text-foreground">
              {chapter.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>by {series?.author?.displayName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDistanceToNow(new Date(chapter.createdAt), { addSuffix: true })}</span>
              </div>
              {chapter.wordCount && (
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{Math.ceil(chapter.wordCount / 200)} min read</span>
                </div>
              )}
            </div>
          </div>

          {/* Chapter Content */}
          <Card className="mb-8">
            <CardContent className="p-8 md:p-12">
              <div className="prose prose-lg max-w-none dark:prose-invert">
                {chapter.content && chapter.content.trim() ? (
                  <div 
                    className="leading-relaxed text-base md:text-lg whitespace-pre-wrap text-foreground"
                    style={{ 
                      lineHeight: '1.8',
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                  >
                    {chapter.content}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 mx-auto">
                      <BookOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Chapter Content Not Available</h3>
                    <p className="text-muted-foreground mb-4">
                      This chapter appears to be empty or still being written.
                    </p>
                    {isOwner && (
                      <Button 
                        variant="outline"
                        onClick={() => setLocation(`/story/${chapter.seriesId}/chapter/${chapter.id}/edit`)}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Add Content
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chapter Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Previous Chapter */}
            <div className="flex justify-start">
              {previousChapter ? (
                <Button 
                  variant="outline"
                  className="flex items-center gap-2 h-auto p-4 text-left"
                  onClick={() => setLocation(`/chapter/${previousChapter.id}`)}
                >
                  <ChevronLeft className="w-5 h-5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Previous</div>
                    <div className="font-medium truncate">
                      Chapter {previousChapter.chapterNumber}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {previousChapter.title}
                    </div>
                  </div>
                </Button>
              ) : (
                <div />
              )}
            </div>

            {/* Chapter Info */}
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">
                Chapter {currentChapterIndex + 1} of {allChapters.length}
              </div>
              <div className="text-lg font-semibold">
                {Math.round(readingProgress)}% Complete
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation(`/story/${chapter.seriesId}`)}
                className="mt-2"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Story Details
              </Button>
            </div>

            {/* Next Chapter */}
            <div className="flex justify-end">
              {nextChapter ? (
                <Button 
                  variant="outline"
                  className="flex items-center gap-2 h-auto p-4 text-right"
                  onClick={() => setLocation(`/chapter/${nextChapter.id}`)}
                >
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Next</div>
                    <div className="font-medium truncate">
                      Chapter {nextChapter.chapterNumber}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {nextChapter.title}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 flex-shrink-0" />
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  className="flex items-center gap-2 h-auto p-4"
                  onClick={() => setLocation(`/story/${chapter.seriesId}`)}
                >
                  <div>
                    <div className="text-xs text-muted-foreground">Finished</div>
                    <div className="font-medium">Back to Story</div>
                  </div>
                  <BookOpen className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Enjoying this story?
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation(`/story/${chapter.seriesId}`)}
                  >
                    View Story
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation(`/profile/${series?.author?.username}`)}
                  >
                    Author Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
