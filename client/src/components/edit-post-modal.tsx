
import { useState, useEffect, useRef } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Globe,
  Lock,
  Users,
  X,
  UserPlus,
  Search,
  Star
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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState(post?.content || "");
  const [title, setTitle] = useState(post?.title || "");
  const [category, setCategory] = useState<string>(post?.category || "general");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [coverImageUrl, setCoverImageUrl] = useState<string>(post?.coverImageUrl || "");
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">(post?.isPrivate ? "private" : "public");
  const [selectedImages, setSelectedImages] = useState<string[]>(post?.imageUrls || []);
  const [isRichEditor, setIsRichEditor] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showCollaboratorSearch, setShowCollaboratorSearch] = useState(false);
  const [collaboratorSearchQuery, setCollaboratorSearchQuery] = useState("");
  const [selectedCollaborators, setSelectedCollaborators] = useState<any[]>(post?.collaborators || []);
  const [mentions, setMentions] = useState<Set<string>>(new Set());
  const [hashtags, setHashtags] = useState<Set<string>>(new Set());
  const [mentionDropdownVisible, setMentionDropdownVisible] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState("");
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [spotifyTrack, setSpotifyTrack] = useState<any>(post?.spotifyTrackData || null);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);

  // Parse mentions and hashtags from content
  useEffect(() => {
    const newMentions = new Set<string>();
    const newHashtags = new Set<string>();

    const mentionMatches = content.match(/@(\w+)/g);
    if (mentionMatches) {
      mentionMatches.forEach((match: string) => {
        newMentions.add(match.substring(1));
      });
    }

    const hashtagMatches = content.match(/#(\w+)/g);
    if (hashtagMatches) {
      hashtagMatches.forEach((match: string) => {
        newHashtags.add(match.substring(1));
      });
    }

    setMentions(newMentions);
    setHashtags(newHashtags);
  }, [content]);

  // Reset form when post changes
  useEffect(() => {
    if (post) {
      setContent(post.content || "");
      setTitle(post.title || "");
      setCategory(post.category || "general");
      setExcerpt(post.excerpt || "");
      setCoverImageUrl(post.coverImageUrl || "");
      setPrivacy(post.isPrivate ? "private" : "public");
      setSelectedImages(post.imageUrls || []);
      setSelectedCollaborators(post.collaborators || []);
      setSpotifyTrack(post.spotifyTrackData || null);
      setShowCollaboratorSearch(false);
      setCollaboratorSearchQuery("");
      setMentions(new Set());
      setHashtags(new Set());
    }
  }, [post]);

  // Search for users to collaborate with
  const searchUsersQuery = useQuery({
    queryKey: ["/api/users/search", collaboratorSearchQuery],
    queryFn: async () => {
      if (!collaboratorSearchQuery.trim()) return [];
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(collaboratorSearchQuery)}`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!collaboratorSearchQuery.trim() && showCollaboratorSearch,
    retry: 1,
  });

  // Search for users to mention
  const mentionSearchQuery = useQuery({
    queryKey: ["/api/users/search", "mention", mentionSearchText],
    queryFn: async () => {
      if (!mentionSearchText.trim()) return [];
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(mentionSearchText)}`, {
          credentials: 'include'
        });
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        console.error('Mention search error:', error);
        return [];
      }
    },
    enabled: !!mentionSearchText.trim() && mentionDropdownVisible,
    retry: 1,
  });

  const handleContentChange = (newContent: string) => {
    setContent(newContent);

    const cursorPos = contentTextareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newContent.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearchText(textAfterAt);
        setMentionCursorPos(lastAtIndex);
        setMentionDropdownVisible(true);
        return;
      }
    }

    setMentionDropdownVisible(false);
    setMentionSearchText("");
  };

  const handleMentionSelect = (user: any) => {
    const beforeMention = content.substring(0, mentionCursorPos);
    const afterMention = content.substring(mentionCursorPos + 1 + mentionSearchText.length);
    const newContent = `${beforeMention}@${user.username} ${afterMention}`;
    setContent(newContent);
    setMentionDropdownVisible(false);
    setMentionSearchText("");

    setTimeout(() => {
      contentTextareaRef.current?.focus();
      const newCursorPos = mentionCursorPos + user.username.length + 2;
      contentTextareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const updatePostMutation = useMutation({
    mutationFn: async (postData: any) => {
      return apiRequest("PUT", `/api/posts/${post.id}`, postData);
    },
    onSuccess: () => {
      onClose();
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

  const handleCoverImageUpload = async (file: File) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `${file.name} is not a supported image format.`,
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `${file.name} is larger than 10MB.`,
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('images', file);

    setIsUploadingCover(true);
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
      setCoverImageUrl(data.imageUrls[0]);

      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }

      toast({
        title: "Cover image uploaded!",
        description: "Your article cover image has been set.",
      });
    } catch (error) {
      console.error("Cover image upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload cover image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleImageUpload = async (files: FileList) => {
    const validFiles = Array.from(files).filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const maxSize = 10 * 1024 * 1024;

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
        description: `${validFiles.length} image(s) added to your article body.`,
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
    if (!selectedCollaborators.find(c => c.id === user.id)) {
      setSelectedCollaborators([...selectedCollaborators, user]);
    }
    setCollaboratorSearchQuery("");
  };

  const handleRemoveCollaborator = (userId: string) => {
    setSelectedCollaborators(selectedCollaborators.filter(c => c.id !== userId));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please add a title for your article.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Empty article",
        description: "Please write some content before publishing.",
        variant: "destructive",
      });
      return;
    }

    if (content.length > 10000) {
      toast({
        title: "Article too long",
        description: "Articles must be under 10,000 characters.",
        variant: "destructive",
      });
      return;
    }

    if (excerpt.length > 500) {
      toast({
        title: "Excerpt too long",
        description: "Excerpt must be under 500 characters.",
        variant: "destructive",
      });
      return;
    }

    if (isUploadingImages || isUploadingCover) {
      toast({
        title: "Images uploading",
        description: "Please wait for image uploads to complete.",
        variant: "destructive",
      });
      return;
    }

    const postData = {
      title: title.trim(),
      content: content.trim(),
      category: category,
      excerpt: excerpt.trim() || undefined,
      coverImageUrl: coverImageUrl || undefined,
      privacy,
      imageUrls: selectedImages,
      mentions: Array.from(mentions),
      hashtags: Array.from(hashtags),
      collaboratorIds: selectedCollaborators.map(c => c.id),
      spotifyTrackData: spotifyTrack ? {
        id: spotifyTrack.id,
        name: spotifyTrack.name,
        artist: spotifyTrack.artists?.[0]?.name || 'Unknown Artist',
        album: spotifyTrack.album?.name,
        image: spotifyTrack.album?.images?.[0]?.url,
        preview_url: spotifyTrack.preview_url,
        external_urls: spotifyTrack.external_urls
      } : undefined,
    };

    updatePostMutation.mutate(postData);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit Article</DialogTitle>
          <DialogDescription>
            Modify your article content, settings, and attachments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
          {/* Header: Privacy */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={user?.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                alt="Your profile"
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-sm">Edit Article</p>
                <p className="text-xs text-muted-foreground">Update your published article</p>
              </div>
            </div>

            <Select value={privacy} onValueChange={(value: any) => setPrivacy(value)}>
              <SelectTrigger className="w-32 h-9 border-border" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center space-x-2">
                  <PrivacyIcon className="w-4 h-4" />
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

          <Separator />

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-1">
              Article Title <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your article title..."
              className="text-xl font-bold border-border"
              maxLength={255}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full border-border" onClick={(e) => e.stopPropagation()}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="literary">Literary</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="opinion">Opinion</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="culture">Culture</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Cover Image</label>
            {coverImageUrl ? (
              <div className="relative">
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="w-full h-64 object-cover rounded-md"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCoverImageUrl("");
                    if (coverInputRef.current) {
                      coverInputRef.current.value = "";
                    }
                  }}
                  className="absolute top-2 right-2"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => e.target.files && handleCoverImageUpload(e.target.files[0])}
                  className="hidden"
                  id="cover-upload-edit"
                />
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById('cover-upload-edit')?.click();
                  }}
                  disabled={isUploadingCover}
                  className="w-full h-32 border-dashed border-2"
                >
                  {isUploadingCover ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                      Uploading...
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                      <span className="text-sm">Click to upload cover image</span>
                      <span className="text-xs text-muted-foreground mt-1">Recommended: 1200x630px</span>
                    </div>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Excerpt (Optional)</label>
              <span className="text-xs text-muted-foreground">{excerpt.length}/500</span>
            </div>
            <Textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Write a brief summary of your article..."
              className="resize-none min-h-[80px] border-border"
              maxLength={500}
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-xs text-muted-foreground">
              This will be displayed as a preview for your article
            </p>
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold flex items-center gap-1">
                Article Body <span className="text-destructive">*</span>
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRichEditor(!isRichEditor);
                }}
                className={`h-8 px-3 ${isRichEditor ? "bg-primary/10 text-primary" : ""}`}
                title="Toggle Rich Text Editor"
              >
                <Type className="w-4 h-4 mr-2" />
                {isRichEditor ? "Plain Text" : "Rich Text"}
              </Button>
            </div>

            {isRichEditor ? (
              <div className="border rounded-md" onClick={(e) => e.stopPropagation()}>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Write your article content..."
                  className="min-h-[300px]"
                />
              </div>
            ) : (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <Textarea
                  ref={contentTextareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Write your article content..."
                  className="resize-none min-h-[300px] border-border"
                  onClick={(e) => e.stopPropagation()}
                />
                {mentionDropdownVisible && mentionSearchQuery.data && Array.isArray(mentionSearchQuery.data) && mentionSearchQuery.data.length > 0 && (
                  <Card className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto border-border shadow-lg">
                    <CardContent className="p-2">
                      <div className="space-y-1">
                        {mentionSearchQuery.data.map((searchUser: any) => (
                          <div
                            key={searchUser.id}
                            className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMentionSelect(searchUser);
                            }}
                          >
                            <img
                              src={searchUser.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${searchUser.username}`}
                              alt={searchUser.displayName}
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{searchUser.displayName}</p>
                              <p className="text-xs text-muted-foreground truncate">@{searchUser.username}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Body Images */}
          {selectedImages.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-semibold">Body Images</label>
              <ImageGallery
                images={selectedImages}
                onRemove={(index) => {
                  setSelectedImages(prev => prev.filter((_, i) => i !== index));
                }}
                className="rounded-md"
              />
            </div>
          )}

          {/* Collaborators */}
          {selectedCollaborators.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold">
                  Collaborators ({selectedCollaborators.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCollaborators.map((collaborator) => (
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCollaborator(collaborator.id);
                      }}
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
          {spotifyTrack && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold">Selected Track</span>
              </div>
              <div className="flex items-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {spotifyTrack.album?.images?.[0]?.url && (
                    <img
                      src={spotifyTrack.album.images[0].url}
                      alt={spotifyTrack.name}
                      className="w-12 h-12 rounded border border-green-300"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{spotifyTrack.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {spotifyTrack.artists?.[0]?.name}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpotifyTrack(null);
                  }}
                  className="ml-2 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Collaborator Search */}
          {showCollaboratorSearch && (
            <Card className="mb-4 border-blue-200 dark:border-blue-800 bg-card" onClick={(e) => e.stopPropagation()}>
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
                      onClick={(e) => {
                        e.stopPropagation();
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
                      className="pl-10 bg-card border-border"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {searchUsersQuery.isLoading && (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Searching...</span>
                    </div>
                  )}

                  {searchUsersQuery.data && Array.isArray(searchUsersQuery.data) && searchUsersQuery.data.length > 0 && (
                    <ScrollArea className="h-64 pr-2">
                      <div className="space-y-2 pr-2">
                        {searchUsersQuery.data.map((searchUser: any) => {
                          const isAlreadyCollaborator = selectedCollaborators.some(c => c.id === searchUser.id);
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
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isAlreadyCollaborator && !isCurrentUser) {
                                  handleAddCollaborator(searchUser);
                                }
                              }}
                            >
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={searchUser.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${searchUser.username}`} alt={searchUser.displayName} />
                                  <AvatarFallback>{searchUser.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
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
                    </ScrollArea>
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
                </div>
              </CardContent>
            </Card>
          )}

          {/* Spotify Search */}
          {showSpotifySearch && (
            <Card className="mb-4 border-green-200 dark:border-green-800 bg-card" onClick={(e) => e.stopPropagation()}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Music className="w-4 h-4 text-green-500" />
                      Search Spotify Tracks
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSpotifySearch(false);
                      }}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <SpotifySearch
                    onTrackSelect={(track) => {
                      setSpotifyTrack(track);
                      setShowSpotifySearch(false);
                    }}
                    selectedTrack={spotifyTrack}
                    placeholder="Search for a song to attach to your article..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Toolbar and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="hidden"
                id="body-images-upload-edit"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('body-images-upload-edit')?.click();
                }}
                disabled={isUploadingImages || selectedImages.length >= 4}
                title={isUploadingImages ? "Uploading..." : selectedImages.length >= 4 ? "Maximum 4 images" : "Add body images"}
              >
                {isUploadingImages ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <ImageIcon className="w-4 h-4 mr-2" />
                )}
                Add Images {selectedImages.length > 0 && `(${selectedImages.length}/4)`}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCollaboratorSearch(!showCollaboratorSearch);
                }}
                className={`${showCollaboratorSearch || selectedCollaborators.length > 0 ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400" : ""} transition-all`}
                title={selectedCollaborators.length > 0 ? `${selectedCollaborators.length} collaborator${selectedCollaborators.length !== 1 ? 's' : ''} added` : "Add collaborators"}
              >
                <UserPlus className={`w-4 h-4 mr-2 ${selectedCollaborators.length > 0 ? 'text-blue-500' : ''}`} />
                Collaborators {selectedCollaborators.length > 0 && `(${selectedCollaborators.length})`}
                {selectedCollaborators.length > 0 && (
                  <span className="ml-1">✓</span>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpotifySearch(!showSpotifySearch);
                }}
                className={`${showSpotifySearch || spotifyTrack ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400" : ""} transition-all`}
                title="Attach Spotify Track"
              >
                <Music className={`w-4 h-4 mr-2 ${spotifyTrack ? 'text-green-500' : ''}`} />
                Spotify Track
                {spotifyTrack && (
                  <span className="ml-1">✓</span>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {content.length}/10,000 characters
                </span>
              )}

              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubmit();
                }}
                disabled={updatePostMutation.isPending || !title.trim() || !content.trim() || isUploadingImages || isUploadingCover}
                className="px-6 font-medium"
              >
                {updatePostMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  "Update Article"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
