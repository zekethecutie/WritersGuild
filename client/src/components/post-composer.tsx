import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import RichTextEditor from "@/components/rich-text-editor";
// import { SpotifyTrackDisplay } from "@/components/spotify-track-display"; // UNFINISHED FEATURE
// import { SpotifySearch } from "@/components/spotify-search"; // UNFINISHED FEATURE
import ImageGallery from "@/components/image-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Globe,
  Lock,
  Users,
  X,
  UserPlus,
  Search,
  Star
} from "lucide-react";

export default function PostComposer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [postType, setPostType] = useState<"text" | "poetry" | "story" | "challenge">("text");
  const [genre, setGenre] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">("public");
  // const [selectedTrack, setSelectedTrack] = useState<any>(null); // UNFINISHED SPOTIFY FEATURE
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRichEditor, setIsRichEditor] = useState(false);
  // const [showSpotify, setShowSpotify] = useState(false); // UNFINISHED SPOTIFY FEATURE
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [showCollaboratorSearch, setShowCollaboratorSearch] = useState(false);
  const [collaboratorSearchQuery, setCollaboratorSearchQuery] = useState("");
  const [mentions, setMentions] = useState<Set<string>>(new Set());
  const [hashtags, setHashtags] = useState<Set<string>>(new Set());

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



  // Search for users to collaborate with
  const searchUsersQuery = useQuery({
    queryKey: ["/api/users/search", collaboratorSearchQuery],
    queryFn: async () => {
      if (!collaboratorSearchQuery.trim()) return [];
      console.log('Searching for users:', collaboratorSearchQuery);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(collaboratorSearchQuery)}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          console.error('Search failed:', response.status, response.statusText);
          return [];
        }
        const data = await response.json();
        console.log('Search results:', data);
        return data;
      } catch (error) {
        console.error('Search error:', error);
        return [];
      }
    },
    enabled: !!collaboratorSearchQuery.trim() && showCollaboratorSearch,
    retry: 1,
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      return apiRequest("POST", "/api/posts", postData);
    },
    onSuccess: () => {
      // Clear form
      setContent("");
      setTitle("");
      setPostType("text");
      setGenre("");
      setPrivacy("public");
      // setSelectedTrack(null); // UNFINISHED SPOTIFY FEATURE
      setSelectedImages([]);
      setIsRichEditor(false);
      // setShowSpotify(false); // UNFINISHED SPOTIFY FEATURE
      setCollaborators([]);
      setShowCollaboratorSearch(false);
      setCollaboratorSearchQuery("");
      setMentions(new Set());
      setHashtags(new Set());

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
      privacy,
      imageUrls: uploadedImages,
      mentions: Array.from(mentions),
      hashtags: Array.from(hashtags),
      collaborators: collaborators.length > 0 ? collaborators.map(c => c.id) : undefined,
      // spotifyTrackData: UNFINISHED FEATURE - removed for now
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

  // If user is not logged in, show a message and a sign-in button
  if (!user) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Sign in to share your writing with the community
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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

            {/* Title Input */}
            {(postType === "story" || postType === "poetry") && (
              <div className="mb-4">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`${postType === "story" ? "Story" : "Poem"} title (optional)`}
                  className="text-lg font-medium bg-transparent border-none outline-none placeholder-muted-foreground"
                  data-testid="input-post-title"
                  maxLength={255}
                />
              </div>
            )}

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

            {/* SPOTIFY FEATURE - UNFINISHED - Commented out for now */}
            {/* {selectedTrack && (
              <div className="mb-4">
                <SpotifyTrackDisplay 
                  track={selectedTrack} 
                  size="md"
                  showPreview={true}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTrack(null)}
                  className="mt-2 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove track
                </Button>
              </div>
            )} */}

            {/* SPOTIFY SEARCH - UNFINISHED - Commented out for now */}
            {/* {showSpotify && (
              <div className="mb-4">
                <SpotifySearch
                  onTrackSelect={(track) => {
                    setSelectedTrack(track);
                    setShowSpotify(false);
                  }}
                  selectedTrack={selectedTrack}
                  placeholder="Search for a song to add..."
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSpotify(false)}
                  className="mt-2"
                >
                  Cancel
                </Button>
              </div>
            )} */}

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
                  data-testid="button-rich-text"
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
                  className={`p-2 rounded-lg transition-colors ${
                    isUploadingImages ? "text-blue-400 bg-blue-400/10" : 
                    selectedImages.length >= 4 ? "text-muted-foreground/50 cursor-not-allowed" :
                    "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  }`}
                  title={isUploadingImages ? "Uploading..." : selectedImages.length >= 4 ? "Maximum 4 images" : "Add Images"}
                  data-testid="button-add-images"
                >
                  {isUploadingImages ? (
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5" />
                  )}
                </Button>

                {/* SPOTIFY FEATURE - UNFINISHED - Commented out */}
                {/* <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSpotify(!showSpotify)}
                  className={`p-2 rounded-lg transition-colors ${
                    showSpotify || selectedTrack ? "text-green-500 bg-green-500/10" : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                  }`}
                  title="Add Music (Coming Soon)"
                  data-testid="button-add-music"
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
                    data-testid="button-poetry-mode"
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