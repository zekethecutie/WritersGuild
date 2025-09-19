import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import RichTextEditor from "@/components/rich-text-editor";
import SpotifyPlayer from "@/components/spotify-player";
import ImageGallery from "@/components/image-gallery";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Separator 
} from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Image as ImageIcon,
  Music,
  Type,
  Quote,
  Sparkles,
  Globe,
  Lock,
  Users,
  X
} from "lucide-react";

export default function PostComposer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"text" | "poetry" | "story" | "challenge">("text");
  const [genre, setGenre] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">("public");
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRichEditor, setIsRichEditor] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      return apiRequest("POST", "/api/posts", postData);
    },
    onSuccess: () => {
      // Clear form
      setContent("");
      setPostType("text");
      setGenre("");
      setPrivacy("public");
      setSelectedTrack(null);
      setSelectedImages([]);
      setIsRichEditor(false);
      setShowSpotify(false);

      // Invalidate queries to refresh feed
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      
      toast({
        title: "Post published!",
        description: "Your post has been shared with the community.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Failed to publish",
        description: "There was an error publishing your post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('images', file);
    });

    try {
      const response = await apiRequest("POST", "/api/upload/images", formData);
      const data = await response.json();
      setSelectedImages(prev => [...prev, ...data.imageUrls]);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Empty post",
        description: "Please write something before publishing.",
        variant: "destructive",
      });
      return;
    }

    const postData = {
      content: content.trim(),
      postType,
      genre: genre || undefined,
      imageUrls: selectedImages.length > 0 ? selectedImages : undefined,
      spotifyTrackId: selectedTrack?.id,
      spotifyTrackData: selectedTrack ? {
        name: selectedTrack.name,
        artist: selectedTrack.artists[0]?.name,
        album: selectedTrack.album?.name,
        image: selectedTrack.album?.images[0]?.url,
        preview_url: selectedTrack.preview_url,
        external_urls: selectedTrack.external_urls
      } : undefined,
      isPrivate: privacy === "private",
    };

    createPostMutation.mutate(postData);
  };

  const getPostTypeColor = () => {
    switch (postType) {
      case "poetry": return "text-purple-400 border-purple-400/30 bg-purple-400/10";
      case "story": return "text-blue-400 border-blue-400/30 bg-blue-400/10";
      case "challenge": return "text-green-400 border-green-400/30 bg-green-400/10";
      default: return "text-muted-foreground border-border bg-muted/50";
    }
  };

  const getPrivacyIcon = () => {
    switch (privacy) {
      case "private": return Lock;
      case "followers": return Users;
      default: return Globe;
    }
  };

  const PrivacyIcon = getPrivacyIcon();

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex space-x-3">
          <img
            src={user?.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
            alt="Your profile"
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            data-testid="img-composer-avatar"
          />
          <div className="flex-1">
            {/* Post Type and Privacy */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Select value={postType} onValueChange={(value: any) => setPostType(value)}>
                  <SelectTrigger className="w-32 h-8 text-xs border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="poetry">Poetry</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="challenge">Challenge</SelectItem>
                  </SelectContent>
                </Select>

                {postType !== "text" && (
                  <Badge variant="outline" className={`text-xs ${getPostTypeColor()}`}>
                    {postType.charAt(0).toUpperCase() + postType.slice(1)}
                  </Badge>
                )}
              </div>

              <Select value={privacy} onValueChange={(value: any) => setPrivacy(value)}>
                <SelectTrigger className="w-28 h-8 text-xs border-border">
                  <div className="flex items-center space-x-1">
                    <PrivacyIcon className="w-3 h-3" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="followers">Followers</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Editor */}
            {isRichEditor ? (
              <div className="mb-4">
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Share your thoughts, poetry, or stories..."
                  className="min-h-[120px]"
                  postType={postType}
                />
              </div>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts, poetry, or stories..."
                className="resize-none border-none outline-none bg-transparent text-lg placeholder-muted-foreground min-h-[120px] p-0"
                data-testid="textarea-post-content"
              />
            )}

            {/* Genre Selection */}
            {(postType === "poetry" || postType === "story") && (
              <div className="mb-4">
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="w-48 border-border">
                    <SelectValue placeholder={`Select ${postType} genre`} />
                  </SelectTrigger>
                  <SelectContent>
                    {postType === "poetry" && (
                      <>
                        <SelectItem value="free-verse">Free Verse</SelectItem>
                        <SelectItem value="sonnet">Sonnet</SelectItem>
                        <SelectItem value="haiku">Haiku</SelectItem>
                        <SelectItem value="spoken-word">Spoken Word</SelectItem>
                        <SelectItem value="limerick">Limerick</SelectItem>
                        <SelectItem value="ballad">Ballad</SelectItem>
                      </>
                    )}
                    {postType === "story" && (
                      <>
                        <SelectItem value="flash-fiction">Flash Fiction</SelectItem>
                        <SelectItem value="short-story">Short Story</SelectItem>
                        <SelectItem value="fantasy">Fantasy</SelectItem>
                        <SelectItem value="sci-fi">Science Fiction</SelectItem>
                        <SelectItem value="romance">Romance</SelectItem>
                        <SelectItem value="mystery">Mystery</SelectItem>
                        <SelectItem value="horror">Horror</SelectItem>
                        <SelectItem value="literary">Literary</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Media Attachments */}
            {selectedImages.length > 0 && (
              <div className="mb-4">
                <ImageGallery
                  images={selectedImages}
                  onRemove={(index) => {
                    setSelectedImages(prev => prev.filter((_, i) => i !== index));
                  }}
                  className="rounded-xl overflow-hidden"
                />
              </div>
            )}

            {selectedTrack && (
              <div className="mb-4">
                <SpotifyPlayer
                  track={selectedTrack}
                  onRemove={() => setSelectedTrack(null)}
                  compact
                />
              </div>
            )}

            {showSpotify && (
              <div className="mb-4">
                <SpotifyPlayer
                  onTrackSelect={(track) => {
                    setSelectedTrack(track);
                    setShowSpotify(false);
                  }}
                  onClose={() => setShowSpotify(false)}
                  searchMode
                />
              </div>
            )}

            <Separator className="my-4" />

            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRichEditor(!isRichEditor)}
                  className={`p-2 rounded-lg transition-colors ${
                    isRichEditor ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  }`}
                  title="Rich Text Formatting"
                  data-testid="button-rich-text"
                >
                  <Type className="w-5 h-5" />
                </Button>

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Add Images"
                  data-testid="button-add-images"
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSpotify(!showSpotify)}
                  className={`p-2 rounded-lg transition-colors ${
                    showSpotify || selectedTrack ? "text-green-500 bg-green-500/10" : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                  }`}
                  title="Add Music"
                  data-testid="button-add-music"
                >
                  <Music className="w-5 h-5" />
                </Button>

                {postType === "poetry" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-lg text-muted-foreground hover:text-purple-400 hover:bg-purple-400/10 transition-colors"
                    title="Poetry Formatting"
                    data-testid="button-poetry-mode"
                  >
                    <Quote className="w-5 h-5" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                  title="Generate Image"
                  data-testid="button-generate-image"
                >
                  <Sparkles className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                {content.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {content.length} characters
                  </span>
                )}
                
                <Button
                  onClick={handleSubmit}
                  disabled={createPostMutation.isPending || !content.trim()}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  data-testid="button-publish"
                >
                  {createPostMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  ) : null}
                  Publish
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
