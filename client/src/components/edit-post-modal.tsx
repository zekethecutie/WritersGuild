import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import RichTextEditor from "@/components/rich-text-editor";
import { SpotifyTrackDisplay } from "@/components/spotify-track-display";
import { SpotifySearch } from "@/components/spotify-search";
import ImageGallery from "@/components/image-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  X,
  UserPlus,
  Search,
  Star,
  Upload
} from "lucide-react";

interface EditPostModalProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      url: string;
      height: number | null;
      width: number | null;
    }>;
  };
  external_urls: {
    spotify: string;
  };
  preview_url: string | null;
  duration_ms: number;
  popularity: number;
}

export default function EditPostModal({ post, isOpen, onClose }: EditPostModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [content, setContent] = useState(post?.content || "");
  const [title, setTitle] = useState(post?.title || "");
  const [postType, setPostType] = useState<"text" | "poetry" | "story" | "challenge">(post?.postType || "text");
  const [genre, setGenre] = useState(post?.genre || "");
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">(post?.isPrivate ? "private" : "public");
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(post?.spotifyTrackData || null);
  const [selectedImages, setSelectedImages] = useState<string[]>(post?.imageUrls || []);
  const [isRichTextMode, setIsRichTextMode] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>(post?.collaborators || []);
  const [showCollaboratorSearch, setShowCollaboratorSearch] = useState(false);
  const [collaboratorSearchQuery, setCollaboratorSearchQuery] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showImageGeneration, setShowImageGeneration] = useState(false);
  const [mentions, setMentions] = useState<Set<string>>(new Set());
  const [hashtags, setHashtags] = useState<Set<string>>(new Set());

  // Search for users to collaborate with
  const collaboratorSearchResults = useQuery({
    queryKey: ["/api/users/search", collaboratorSearchQuery],
    queryFn: async () => {
      if (!collaboratorSearchQuery.trim()) return [];
      return apiRequest("GET", `/api/users/search?q=${encodeURIComponent(collaboratorSearchQuery)}`);
    },
    enabled: !!collaboratorSearchQuery.trim() && showCollaboratorSearch,
  });

  const generateImageMutation = useMutation({
    mutationFn: async (prompt: string) => {
      return apiRequest("POST", "/api/generate-image", { prompt });
    },
    onSuccess: (data) => {
      if (data.imageUrls && data.imageUrls.length > 0) {
        setSelectedImages(prev => [...prev, ...data.imageUrls]);
        toast({
          title: "Image generated!",
          description: "AI-generated image has been added to your post.",
        });
      }
      setImagePrompt("");
      setShowImageGeneration(false);
      setIsGeneratingImage(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
      setIsGeneratingImage(false);
    },
  });

  const handleGenerateImage = () => {
    if (!imagePrompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description for the image you want to generate.",
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingImage(true);
    generateImageMutation.mutate(imagePrompt);
  };

  const handleAddCollaborator = (user: any) => {
    if (!collaborators.find(c => c.id === user.id)) {
      setCollaborators([...collaborators, user]);
    }
    setCollaboratorSearchQuery("");
    setShowCollaboratorSearch(false);
  };

  const handleRemoveCollaborator = (userId: string) => {
    setCollaborators(collaborators.filter(c => c.id !== userId));
  };

  // Reset form when post changes
  useEffect(() => {
    if (post) {
      setContent(post.content || "");
      setTitle(post.title || "");
      setPostType(post.postType || "text");
      setGenre(post.genre || "");
      setPrivacy(post.isPrivate ? "private" : "public");
      setSelectedTrack(post.spotifyTrackData || null);
      setSelectedImages(post.imageUrls || []);
      setCollaborators(post.collaborators || []);
      setShowCollaboratorSearch(false);
      setCollaboratorSearchQuery("");
      setMentions(new Set());
      setHashtags(new Set());
    }
  }, [post]);

  // Parse mentions and hashtags from content
  useEffect(() => {
    const newMentions = new Set<string>();
    const newHashtags = new Set<string>();

    // Extract mentions (@username)
    const mentionMatches = content.match(/@(\w+)/g);
    if (mentionMatches) {
      mentionMatches.forEach((match: string) => {
        newMentions.add(match.substring(1)); // Remove @
      });
    }

    // Extract hashtags (#hashtag)
    const hashtagMatches = content.match(/#(\w+)/g);
    if (hashtagMatches) {
      hashtagMatches.forEach((match: string) => {
        newHashtags.add(match.substring(1)); // Remove #
      });
    }

    setMentions(newMentions);
    setHashtags(newHashtags);
  }, [content]);

  const updatePostMutation = useMutation({
    mutationFn: async (postData: any) => {
      return apiRequest("PUT", `/api/posts/${post.id}`, postData);
    },
    onSuccess: () => {
      onClose();

      // Invalidate queries to refresh feed
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", post.id] });

      toast({
        title: "Post updated!",
        description: "Your post has been successfully updated.",
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
        title: "Failed to update",
        description: "There was an error updating your post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (files: FileList) => {
    // Validate files
    const validFiles = Array.from(files).filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported image format.`,
          variant: "destructive",
        });
        return false;
      }

      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB.`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    const formData = new FormData();
    validFiles.forEach(file => {
      formData.append('images', file);
    });

    setIsUploadingImages(true);
    try {
      // Use fetch directly for FormData uploads
      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await response.json();
      setSelectedImages(prev => [...prev, ...data.imageUrls]);

      toast({
        title: "Images uploaded!",
        description: `${validFiles.length} image(s) added to your post.`,
      });
    } catch (error) {
      console.error("Image upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImages(false);
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

    // Validate content length
    if (content.length > 10000) {
      toast({
        title: "Post too long",
        description: "Posts must be under 10,000 characters.",
        variant: "destructive",
      });
      return;
    }

    // Don't allow posting while images are uploading
    if (isUploadingImages) {
      toast({
        title: "Images uploading",
        description: "Please wait for image uploads to complete.",
        variant: "destructive",
      });
      return;
    }

    const uploadedImages = selectedImages;

    const postData = {
      title: title.trim() || undefined,
      content: content.trim(),
      postType,
      genre: genre || undefined,
      privacy,
      imageUrls: uploadedImages,
      mentions: Array.from(mentions),
      hashtags: Array.from(hashtags),
      collaborators: collaborators.length > 0 ? collaborators.map(c => c.id) : undefined,
      spotifyTrackData: selectedTrack ? {
        id: selectedTrack.id,
        name: selectedTrack.name,
        artist: selectedTrack.artists[0]?.name,
        album: selectedTrack.album?.name,
        image: selectedTrack.album?.images[0]?.url,
        preview_url: selectedTrack.preview_url,
        external_urls: selectedTrack.external_urls
      } : undefined,
    };

    updatePostMutation.mutate(postData);
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

  if (!user || !post) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="text-sm font-medium">Title (optional)</label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title..."
              className="mt-1"
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="text-sm font-medium">Content</label>
            <div className="mt-1">
              {isRichTextMode ? (
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Share your thoughts, poetry, or stories..."
                  className="min-h-[200px]"
                  postType={postType}
                />
              ) : (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your thoughts, poetry, or stories..."
                  className="min-h-[200px]"
                  rows={8}
                />
              )}
            </div>
          </div>

          {/* Genre Selection */}
          {(postType === "poetry" || postType === "story") && (
            <div>
              <label className="text-sm font-medium">Genre</label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="mt-1 w-full">
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

          {/* Images */}
          {selectedImages.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Images ({selectedImages.length}/4)</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedImages([])}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove All
                </Button>
              </div>
              <ImageGallery
                images={selectedImages}
                onRemove={(index) => {
                  setSelectedImages(prev => prev.filter((_, i) => i !== index));
                }}
                className="rounded-lg overflow-hidden"
              />
            </div>
          )}

          {/* Collaborators */}
          {collaborators.length > 0 && (
            <div>
              <label className="text-sm font-medium">Collaborators</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {collaborators.map((collaborator, index) => (
                  <div key={collaborator.id} className="flex items-center bg-secondary rounded-full px-3 py-1.5 text-sm">
                    <img
                      src={collaborator.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${collaborator.username}`}
                      alt={collaborator.displayName}
                      className="w-5 h-5 rounded-full mr-2"
                    />
                    <span>@{collaborator.username}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                      className="ml-2 h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spotify Track */}
          {selectedTrack && (
            <div>
              <label className="text-sm font-medium">Music</label>
              <div className="mt-2">
                <SpotifyTrackDisplay
                  track={selectedTrack}
                  size="md"
                  showPreview={true}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTrack(null)}
                  className="mt-2 text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove track
                </Button>
              </div>
            </div>
          )}

          {/* Spotify Search */}
          {showSpotify && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Add Music</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSpotify(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <SpotifySearch
                  onTrackSelect={(track) => {
                    setSelectedTrack(track);
                    setShowSpotify(false);
                  }}
                  selectedTrack={selectedTrack}
                  placeholder="Search for a song to add..."
                />
              </CardContent>
            </Card>
          )}

          {/* Collaborator Search */}
          {showCollaboratorSearch && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Add Collaborators</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCollaboratorSearch(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search for collaborators..."
                      value={collaboratorSearchQuery}
                      onChange={(e) => setCollaboratorSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {collaboratorSearchResults.isLoading && (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Searching...</span>
                    </div>
                  )}

                  {collaboratorSearchResults.data && collaboratorSearchResults.data.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(collaboratorSearchResults.data as any[]).map((user: any) => {
                        const isAlreadyCollaborator = collaborators.some(c => c.id === user.id);
                        return (
                          <div
                            key={user.id}
                            className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                              isAlreadyCollaborator
                                ? 'bg-green-50 border-green-200 cursor-not-allowed'
                                : 'cursor-pointer hover:bg-accent'
                            }`}
                            onClick={() => !isAlreadyCollaborator && handleAddCollaborator(user)}
                          >
                            <div className="flex items-center space-x-3">
                              <img
                                src={user.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                alt={user.displayName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <div>
                                <p className="font-medium text-sm">{user.displayName}</p>
                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                              </div>
                            </div>
                            {isAlreadyCollaborator && (
                              <Badge variant="secondary" className="text-xs">
                                Added
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {collaboratorSearchQuery && collaboratorSearchResults.data?.length === 0 && !collaboratorSearchResults.isLoading && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No users found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Image Generation */}
          {showImageGeneration && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Generate Image</h4>
                  <Textarea
                    placeholder="A mystical forest with glowing trees under a starry sky..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowImageGeneration(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage || !imagePrompt.trim()}
                    >
                      {isGeneratingImage ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRichTextMode(!isRichTextMode)}
                className={isRichTextMode ? "text-primary bg-primary/10" : ""}
                title="Rich Text Editor"
              >
                <Type className="w-5 h-5" />
              </Button>

              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="hidden"
                id="image-upload"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={isUploadingImages || selectedImages.length >= 4}
                title={isUploadingImages ? "Uploading..." : selectedImages.length >= 4 ? "Maximum 4 images" : "Add Images"}
              >
                {isUploadingImages ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSpotify(!showSpotify)}
                className={showSpotify || selectedTrack ? "text-green-500 bg-green-500/10" : ""}
                title="Add Music"
              >
                <Music className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCollaboratorSearch(!showCollaboratorSearch)}
                className={showCollaboratorSearch || collaborators.length > 0 ? "text-blue-500 bg-blue-500/10" : ""}
                title="Add Collaborators"
              >
                <UserPlus className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImageGeneration(!showImageGeneration)}
                disabled={isGeneratingImage}
                className={showImageGeneration || isGeneratingImage ? "text-yellow-500 bg-yellow-500/10" : ""}
                title={isGeneratingImage ? "Generating..." : "Generate Image"}
              >
                {isGeneratingImage ? (
                  <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </Button>
            </div>

            <div className="flex items-center space-x-3">
              {content.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {content.length} characters
                </span>
              )}

              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={updatePostMutation.isPending || !content.trim() || isUploadingImages}
              >
                {updatePostMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                Update Post
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}