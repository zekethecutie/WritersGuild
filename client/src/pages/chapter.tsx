
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
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  ArrowRight,
  BookOpen,
  Edit,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ChapterPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chapter data
  const { 
    data: chapter, 
    isLoading: chapterLoading, 
    error: chapterError 
  } = useQuery({
    queryKey: ["/api/chapters", id],
    queryFn: async () => {
      if (!id) throw new Error('No chapter ID provided');
      const response = await fetch(`/api/chapters/${id}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chapter fetch error:', response.status, errorText);
        throw new Error('Chapter not found');
      }
      const data = await response.json();
      console.log('Chapter data:', data);
      return data;
    },
    enabled: !!id,
    retry: 1,
  });

  // Fetch series data
  const { 
    data: series 
  } = useQuery({
    queryKey: ["/api/series", chapter?.seriesId],
    queryFn: async () => {
      const response = await fetch(`/api/series/${chapter.seriesId}`);
      if (!response.ok) {
        throw new Error('Series not found');
      }
      return response.json();
    },
    enabled: !!chapter?.seriesId,
  });

  // Fetch all chapters to get navigation
  const { 
    data: allChapters = [] 
  } = useQuery({
    queryKey: ["/api/series", chapter?.seriesId, "chapters"],
    queryFn: async () => {
      const response = await fetch(`/api/series/${chapter.seriesId}/chapters`);
      if (!response.ok) {
        throw new Error('Failed to fetch chapters');
      }
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

  useEffect(() => {
    if (chapter && series && isAuthenticated) {
      const chapterIndex = allChapters.findIndex((ch: any) => ch.id === chapter.id);
      if (chapterIndex >= 0) {
        updateProgressMutation.mutate(chapterIndex);
      }
    }
  }, [chapter?.id, isAuthenticated]);

  if (chapterLoading) {
    return <LoadingScreen title="Loading Chapter..." subtitle="Fetching chapter content" />;
  }

  if (chapterError || !chapter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4 mx-auto">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Chapter not found</h2>
          <p className="text-muted-foreground mb-4">
            The chapter you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => setLocation("/series")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stories
          </Button>
        </div>
      </div>
    );
  }

  const currentChapterIndex = allChapters.findIndex((ch: any) => ch.id === chapter.id);
  const previousChapter = currentChapterIndex > 0 ? allChapters[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex < allChapters.length - 1 ? allChapters[currentChapterIndex + 1] : null;
  const isOwner = isAuthenticated && series?.author?.id === user?.id;

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
                onClick={() => setLocation(`/story/${chapter.seriesId}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Story
              </Button>
              <div>
                <h1 className="text-lg font-bold truncate">
                  Chapter {chapter.chapterNumber}: {chapter.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {series?.title}
                </p>
              </div>
            </div>
            {isOwner && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation(`/story/${chapter.seriesId}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {/* Chapter Content */}
          <Card className="mb-6">
            <CardContent className="p-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">
                  Chapter {chapter.chapterNumber}: {chapter.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{chapter.wordCount} words</span>
                  <span>•</span>
                  <span>Published {formatDistanceToNow(new Date(chapter.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <div 
                  className="leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: chapter.content.replace(/\n/g, '<br>') }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div>
              {previousChapter ? (
                <Button 
                  variant="outline"
                  onClick={() => setLocation(`/chapter/${previousChapter.id}`)}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous Chapter
                </Button>
              ) : (
                <div />
              )}
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Chapter {currentChapterIndex + 1} of {allChapters.length}
              </p>
            </div>

            <div>
              {nextChapter ? (
                <Button 
                  variant="outline"
                  onClick={() => setLocation(`/chapter/${nextChapter.id}`)}
                  className="flex items-center gap-2"
                >
                  Next Chapter
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => setLocation(`/story/${chapter.seriesId}`)}
                  className="flex items-center gap-2"
                >
                  Back to Story
                  <BookOpen className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
