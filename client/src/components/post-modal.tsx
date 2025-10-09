import { useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
  Globe,
  Lock,
  Users,
  X,
  Feather,
  UserPlus,
  Search,
  Star
} from "lucide-react";
import { getProfileImageUrl } from "@/lib/defaultImages";

interface PostModalProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function PostModal({ trigger, isOpen, onClose }: PostModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(isOpen || false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"text" | "poetry" | "story" | "challenge">("text");
  const [genre, setGenre] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">("public");
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRichEditor, setIsRichEditor] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [showCollaboratorSearch, setShowCollaboratorSearch] = useState(false);
  const [collaboratorSearchQuery, setCollaboratorSearchQuery] = useState("");

  // Search for users to collaborate with
  const searchUsersQuery = useQuery({
    queryKey: ["/api/users/search", collaboratorSearchQuery],
    queryFn: async () => {
      if (!collaboratorSearchQuery.trim()) return [];
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(collaboratorSearchQuery)}`, {
          credentials: 'include'
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Search error:', error);
        return [];
      }
    },
    enabled: !!collaboratorSearchQuery.trim() && showCollaboratorSearch,
    retry: 1,
  });

  const handleAddCollaborator = (searchUser: any) => {
    if (!collaborators.find(c => c.id === searchUser.id)) {
      setCollaborators(prev => [...prev, searchUser]);
    }
    setCollaboratorSearchQuery("");
  };

  const handleRemoveCollaborator = (userId: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== userId));
  };

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      return apiRequest("POST", "/api/posts", postData);
    },
    onSuccess: () => {
      // Clear form
      setTitle("");
      setContent("");
      setPostType("text");
      setGenre("");
      setPrivacy("public");
      setSelectedTrack(null);
      setSelectedImages([]);
      setIsRichEditor(false);
      setShowSpotify(false);
      setCollaborators([]);
      setShowCollaboratorSearch(false);
      setCollaboratorSearchQuery("");
      setOpen(false);
      onClose?.();

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

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Empty post",
        description: "Please write something before publishing.",
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
      imageUrls: selectedImages.length > 0 ? selectedImages : undefined,
      spotifyTrackId: selectedTrack?.id,
      spotifyTrackData: selectedTrack ? {
        id: selectedTrack.id,
        name: selectedTrack.name,
        artist: selectedTrack.artists[0]?.name,
        album: selectedTrack.album.name,
        image: selectedTrack.album.images[0]?.url,
        preview_url: selectedTrack.preview_url,
        external_urls: selectedTrack.external_urls
      } : undefined,
      privacy,
      collaborators: collaborators.length > 0 ? collaborators.map(c => c.id) : undefined,
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

  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen !== undefined ? isOpen : open} onOpenChange={isOpen !== undefined ? onClose : setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Feather className="w-5 h-5 mr-2" />
            Make a post?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a Post</DialogTitle>
          <DialogDescription>
            Share your thoughts, poetry, or stories with the Writers Guild community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex space-x-3">
            <img
              src={getProfileImageUrl(user.profileImageUrl)}
              alt="Your profile"
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
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

              {/* Collaborators Display */}
              {collaborators.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Collaborators ({collaborators.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {collaborators.map((collaborator, index) => (
                      <div key={collaborator.id} className="flex items-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full px-3 py-1.5 text-sm">
                        <img
                          src={collaborator.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${collaborator.username}`}
                          alt={collaborator.displayName}
                          className="w-5 h-5 rounded-full mr-2 border border-blue-300 dark:border-blue-700"
                        />
                        <span className="font-medium">@{collaborator.username}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCollaborator(collaborator.id)}
                          className="ml-2 h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
                          data-testid={`button-remove-collaborator-${index}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collaborator Search */}
              {showCollaboratorSearch && (
                <Card className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-blue-500" />
                          Add Collaborators
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowCollaboratorSearch(false);
                            setCollaboratorSearchQuery("");
                          }}
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search users by name or username..."
                          value={collaboratorSearchQuery}
                          onChange={(e) => setCollaboratorSearchQuery(e.target.value)}
                          className="pl-10 bg-background"
                          data-testid="input-collaborator-search"
                          autoFocus
                        />
                      </div>

                      {searchUsersQuery.isLoading && (
                        <div className="flex items-center justify-center py-6">
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">Searching...</span>
                        </div>
                      )}

                      {searchUsersQuery.data && Array.isArray(searchUsersQuery.data) && searchUsersQuery.data.length > 0 && (
                        <div className="space-y-2 max-h-64 overflow-y-auto bg-background border rounded-lg p-2">
                          {searchUsersQuery.data.map((searchUser: any) => {
                            const isAlreadyCollaborator = collaborators.some(c => c.id === searchUser.id);
                            const isCurrentUser = searchUser.id === user?.id;
                            
                            return (
                              <div
                                key={searchUser.id}
                                className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                                  isAlreadyCollaborator 
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 cursor-not-allowed'
                                    : isCurrentUser
                                    ? 'bg-muted border-muted-foreground/20 cursor-not-allowed opacity-60'
                                    : 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700'
                                }`}
                                onClick={() => !isAlreadyCollaborator && !isCurrentUser && handleAddCollaborator(searchUser)}
                                data-testid={`option-collaborator-${searchUser.username}`}
                              >
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <img
                                    src={searchUser.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${searchUser.username}`}
                                    alt={searchUser.displayName}
                                    className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-border object-cover"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{searchUser.displayName}</p>
                                    <p className="text-xs text-muted-foreground truncate">@{searchUser.username}</p>
                                    {searchUser.bio && (
                                      <p className="text-xs text-muted-foreground truncate mt-0.5">{searchUser.bio}</p>
                                    )}
                                  </div>
                                </div>
                                {isAlreadyCollaborator ? (
                                  <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-current" />
                                    Added
                                  </Badge>
                                ) : isCurrentUser ? (
                                  <Badge variant="outline" className="text-xs">
                                    You
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs bg-blue-500 text-white border-blue-500 hover:bg-blue-600 hover:border-blue-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddCollaborator(searchUser);
                                    }}
                                  >
                                    Add
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {collaboratorSearchQuery && searchUsersQuery.data && Array.isArray(searchUsersQuery.data) && searchUsersQuery.data.length === 0 && !searchUsersQuery.isLoading && (
                        <div className="text-center py-8 border rounded-lg bg-background">
                          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground font-medium">No users found</p>
                          <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
                        </div>
                      )}

                      {!collaboratorSearchQuery && (
                        <div className="text-center py-8 border rounded-lg bg-background">
                          <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground font-medium">Search for collaborators</p>
                          <p className="text-xs text-muted-foreground mt-1">Start typing to find users</p>
                        </div>
                      )}

                      {collaborators.length > 0 && (
                        <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                              <Star className="w-4 h-4 text-blue-500" />
                              Selected ({collaborators.length})
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCollaborators([])}
                              className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              Clear all
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {collaborators.map((collaborator) => (
                              <Badge 
                                key={collaborator.id} 
                                variant="secondary" 
                                className="text-xs px-3 py-1.5 flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                              >
                                <img
                                  src={collaborator.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${collaborator.username}`}
                                  alt={collaborator.displayName}
                                  className="w-4 h-4 rounded-full border border-blue-400"
                                />
                                <span className="font-medium">{collaborator.displayName}</span>
                                <button
                                  onClick={() => handleRemoveCollaborator(collaborator.id)}
                                  className="ml-1 hover:text-destructive transition-colors"
                                  aria-label="Remove collaborator"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
                    id="modal-image-upload"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => document.getElementById('modal-image-upload')?.click()}
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

                  {/* SPOTIFY FEATURE - UNFINISHED */}
                  {/* <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSpotify(!showSpotify)}
                    className={`p-2 rounded-lg transition-colors ${
                      showSpotify || selectedTrack ? "text-green-500 bg-green-500/10" : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                    }`}
                    title="Add Music (Coming Soon)"
                    disabled
                  >
                    <Music className="w-5 h-5" />
                  </Button> */}

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
                    onClick={() => setShowCollaboratorSearch(!showCollaboratorSearch)}
                    className={`p-2 rounded-lg transition-colors ${
                      showCollaboratorSearch || collaborators.length > 0 ? "text-blue-500 bg-blue-500/10" : "text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                    }`}
                    title="Add Collaborators"
                    data-testid="button-add-collaborators"
                  >
                    <UserPlus className="w-5 h-5" />
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
                    disabled={createPostMutation.isPending || !content.trim() || isUploadingImages}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}