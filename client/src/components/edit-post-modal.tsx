
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import RichTextEditor from "@/components/rich-text-editor";
import SpotifyPlayer from "@/components/spotify-player";
import ImageGallery from "@/components/image-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  Save,
  UserPlus,
  Search
} from "lucide-react";
import { getProfileImageUrl } from "@/lib/defaultImages";

interface EditPostModalProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditPostModal({ post, isOpen, onClose }: EditPostModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [postType, setPostType] = useState<"text" | "poetry" | "story" | "challenge">(post?.postType || "text");
  const [genre, setGenre] = useState(post?.genre || "");
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">(post?.isPrivate ? "private" : "public");
  const [selectedTrack, setSelectedTrack] = useState<any>(post?.spotifyTrackData || null);
  const [selectedImages, setSelectedImages] = useState<string[]>(post?.imageUrls || []);
  const [isRichEditor, setIsRichEditor] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [showCollaboratorSearch, setShowCollaboratorSearch] = useState(false);
  const [collaboratorSearchQuery, setCollaboratorSearchQuery] = useState("");
  const [mentions, setMentions] = useState<Set<string>>(new Set());
  const [hashtags, setHashtags] = useState<Set<string>>(new Set());

  // Search for users to collaborate with
  const searchUsersQuery = useQuery({
    queryKey: ["/api/users/search", collaboratorSearchQuery],
    queryFn: async () => {
      if (!collaboratorSearchQuery.trim()) return [];
      return apiRequest("GET", `/api/users/search?q=${encodeURIComponent(collaboratorSearchQuery)}`);
    },
    enabled: !!collaboratorSearchQuery.trim(),
  });

  // Reset form when post changes
  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setContent(post.content || "");
      setPostType(post.postType || "text");
      setGenre(post.genre || "");
      setPrivacy(post.isPrivate ? "private" : "public");
      setSelectedTrack(post.spotifyTrackData || null);
      setSelectedImages(post.imageUrls || []);
      setCollaborators([]);
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
      mentionMatches.forEach(match => {
        newMentions.add(match.substring(1)); // Remove @
      });
    }
    
    // Extract hashtags (#hashtag)
    const hashtagMatches = content.match(/#(\w+)/g);
    if (hashtagMatches) {
      hashtagMatches.forEach(match => {
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

  const handleAddCollaborator = (user: any) => {
    if (!collaborators.find(c => c.id === user.id)) {
      setCollaborators(prev => [...prev, user]);
    }
    setCollaboratorSearchQuery("");
    setShowCollaboratorSearch(false);
  };

  const handleRemoveCollaborator = (userId: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== userId));
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Empty post",
        description: "Please write something before saving.",
        variant: "destructive",
      });
      return;
    }

    if (content.length > 10000) {
      toast({
        title: "Post too long",
        description: "Posts must be under 10,000 characters.",
        variant: "destructive",
      });
      return;
    }

    if (isUploadingImages) {
      toast({
        title: "Images uploading",
        description: "Please wait for image uploads to complete.",
        variant: "destructive",
      });
      return;
    }

    const postData = {
      title: title.trim() || undefined,
      content: content.trim(),
      postType,
      genre: genre || undefined,
      imageUrls: selectedImages,
      mentions: Array.from(mentions),
      hashtags: Array.from(hashtags),
      collaborators: collaborators.length > 0 ? collaborators : undefined,
      spotifyTrackData: selectedTrack ? {
        id: selectedTrack.id,
        name: selectedTrack.name,
        artist: selectedTrack.artists?.[0]?.name || selectedTrack.artist,
        album: selectedTrack.album?.name || selectedTrack.album,
        image: selectedTrack.album?.images?.[0]?.url || selectedTrack.image,
        preview_url: selectedTrack.preview_url,
        external_urls: selectedTrack.external_urls
      } : undefined,
      isPrivate: privacy === "private",
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>
            Make changes to your post and save when you're ready.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex space-x-3">
            <img
              src={getProfileImageUrl(user.profileImageUrl)}
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

              {/* Title Field */}
              <div className="mb-4">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="text-lg font-semibold border-none outline-none bg-transparent placeholder-muted-foreground"
                  data-testid="input-post-title"
                  maxLength={100}
                />
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
                  className="resize-none border-none outline-none bg-transparent text-base placeholder-muted-foreground min-h-[120px] p-0"
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

              {/* Collaborators */}
              {collaborators.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {collaborators.map((collaborator) => (
                      <Badge key={collaborator.id} variant="secondary" className="flex items-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        {collaborator.displayName}
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-destructive" 
                          onClick={() => handleRemoveCollaborator(collaborator.id)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Collaborator Search */}
              {showCollaboratorSearch && (
                <div className="mb-4 p-3 border border-border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search for collaborators..."
                      value={collaboratorSearchQuery}
                      onChange={(e) => setCollaboratorSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowCollaboratorSearch(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {searchUsersQuery.data && searchUsersQuery.data.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {searchUsersQuery.data.map((user: any) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                          onClick={() => handleAddCollaborator(user)}
                        >
                          <img
                            src={getProfileImageUrl(user.profileImageUrl)}
                            alt={user.displayName}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm">{user.displayName}</span>
                          <span className="text-xs text-muted-foreground">@{user.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
                  >
                    <Type className="w-5 h-5" />
                  </Button>

                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                    className="hidden"
                    id="edit-modal-image-upload"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => document.getElementById('edit-modal-image-upload')?.click()}
                    disabled={isUploadingImages || selectedImages.length >= 4}
                    className={`p-2 rounded-lg transition-colors ${
                      isUploadingImages ? "text-blue-400 bg-blue-400/10" :
                      selectedImages.length >= 4 ? "text-muted-foreground/50 cursor-not-allowed" :
                      "text-muted-foreground hover:text-primary hover:bg-primary/10"
                    }`}
                    title={isUploadingImages ? "Uploading..." : selectedImages.length >= 4 ? "Maximum 4 images" : "Add Images"}
                  >
                    {isUploadingImages ? (
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSpotify(!showSpotify)}
                    className={`p-2 rounded-lg transition-colors ${
                      showSpotify || selectedTrack ? "text-green-500 bg-green-500/10" : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                    }`}
                    title="Add Music"
                  >
                    <Music className="w-5 h-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCollaboratorSearch(!showCollaboratorSearch)}
                    className={`p-2 rounded-lg transition-colors ${
                      showCollaboratorSearch || collaborators.length > 0 ? "text-blue-500 bg-blue-500/10" : "text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                    }`}
                    title="Add Collaborators"
                  >
                    <UserPlus className="w-5 h-5" />
                  </Button>

                  {postType === "poetry" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 rounded-lg text-muted-foreground hover:text-purple-400 hover:bg-purple-400/10 transition-colors"
                      title="Poetry Formatting"
                    >
                      <Quote className="w-5 h-5" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                    title="Generate Image"
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
                    variant="outline"
                    onClick={onClose}
                    className="px-4 py-2 rounded-full"
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={handleSubmit}
                    disabled={updatePostMutation.isPending || !content.trim() || isUploadingImages}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {updatePostMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
