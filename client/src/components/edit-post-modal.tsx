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
  Globe,
  Lock,
  Users,
  X,
  UserPlus,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditPostModalProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: { id: string; name: string; images: Array<{ url: string; height: number | null; width: number | null }> };
  external_urls: { spotify: string };
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

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [excerpt, setExcerpt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string>("");
  const [privacy, setPrivacy] = useState<"public" | "followers" | "private">("public");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRichEditor, setIsRichEditor] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showCollaboratorSearch, setShowCollaboratorSearch] = useState(false);
  const [collaboratorSearchQuery, setCollaboratorSearchQuery] = useState("");
  const [selectedCollaborators, setSelectedCollaborators] = useState<any[]>([]);
  const [mentions, setMentions] = useState<Set<string>>(new Set());
  const [hashtags, setHashtags] = useState<Set<string>>(new Set());
  const [mentionDropdownVisible, setMentionDropdownVisible] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState("");
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [spotifyTrack, setSpotifyTrack] = useState<any>(null);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);

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
  }, [post, isOpen]);

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

  const mentionSearchQuery = useQuery({
    queryKey: ["/api/users/search", "mention", mentionSearchText],
    queryFn: async () => {
      if (!mentionSearchText.trim()) return [];
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(mentionSearchText)}`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return await response.json();
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
        description: "Your article has been successfully updated.",
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

  const handleCoverImageUpload = async (files: FileList) => {
    const file = files[0];
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
          <DialogDescription>Modify your article content, settings, and attachments</DialogDescription>
        </DialogHeader>

        <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
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
                  onChange={(e) => e.target.files && handleCoverImageUpload(e.target.files)}
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
                  placeholder="Write your article..."
                  className="resize-none min-h-[300px] border-border font-mono text-sm"
                />
                {mentionDropdownVisible && mentionSearchQuery && (
                  <ScrollArea className="absolute top-full left-0 right-0 border rounded-md bg-card shadow-lg z-50 max-h-40">
                    <div className="p-2">
                      {mentionSearchQuery.data?.map((user: any) => (
                        <div
                          key={user.id}
                          className="p-2 hover:bg-muted rounded cursor-pointer"
                          onClick={() => handleMentionSelect(user)}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={user.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                              alt={user.displayName}
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="text-sm font-medium">@{user.username}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>

          {spotifyTrack && (
            <div className="space-y-2">
              <label className="text-sm font-semibold">Attached Track</label>
              <div className="relative">
                <SpotifyTrackDisplay track={spotifyTrack} size="md" />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpotifyTrack(null);
                  }}
                  className="absolute top-2 right-2"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          )}

          {showSpotifySearch && (
            <div className="space-y-2">
              <label className="text-sm font-semibold">Search Spotify Track</label>
              <SpotifySearch
                onTrackSelect={(track) => {
                  setSpotifyTrack(track);
                  setShowSpotifySearch(false);
                }}
                selectedTrack={spotifyTrack}
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSpotifySearch(!showSpotifySearch)}
              className={`${showSpotifySearch || spotifyTrack ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400" : ""} transition-all`}
              title="Attach Spotify Track"
            >
              <Music className={`w-4 h-4 mr-2 ${spotifyTrack ? 'text-green-500' : ''}`} />
              Spotify Track
              {spotifyTrack && <span className="ml-1">✓</span>}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCollaboratorSearch(!showCollaboratorSearch)}
              className={`${selectedCollaborators.length > 0 ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400" : ""} transition-all`}
              title="Add Collaborators"
            >
              <UserPlus className={`w-4 h-4 mr-2 ${selectedCollaborators.length > 0 ? 'text-blue-500' : ''}`} />
              Collaborators {selectedCollaborators.length > 0 && `(${selectedCollaborators.length})`}
              {selectedCollaborators.length > 0 && <span className="ml-1">✓</span>}
            </Button>
          </div>

          {showCollaboratorSearch && (
            <div className="space-y-2">
              <label className="text-sm font-semibold">Search Users</label>
              <Input
                value={collaboratorSearchQuery}
                onChange={(e) => setCollaboratorSearchQuery(e.target.value)}
                placeholder="Search for users..."
                onClick={(e) => e.stopPropagation()}
              />
              {searchUsersQuery.data && searchUsersQuery.data.length > 0 && (
                <ScrollArea className="border rounded-md bg-card p-2 max-h-40">
                  {searchUsersQuery.data.map((user: any) => (
                    <div
                      key={user.id}
                      className="p-2 hover:bg-muted rounded flex items-center justify-between cursor-pointer"
                      onClick={() => handleAddCollaborator(user)}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={user.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                          alt={user.displayName}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-sm">@{user.username}</span>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </div>
          )}

          {selectedCollaborators.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-semibold">Selected Collaborators</label>
              <div className="flex flex-wrap gap-2">
                {selectedCollaborators.map((c: any) => (
                  <Badge
                    key={c.id}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {c.displayName}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => handleRemoveCollaborator(c.id)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            {content.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {content.length}/10,000 characters
              </span>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={updatePostMutation.isPending || !title.trim() || !content.trim() || isUploadingImages || isUploadingCover}
                className="px-6 font-medium"
              >
                {updatePostMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
