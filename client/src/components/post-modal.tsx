import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import RichTextEditor from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Image as ImageIcon,
  FileText,
  X,
  UserPlus,
  Music,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import ImageGallery from "@/components/image-gallery";
import { SpotifySearch } from "@/components/spotify-search";
import { SpotifyTrackDisplay } from "@/components/spotify-track-display";

interface PostModalProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function PostModal({ trigger, isOpen, onClose }: PostModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const coverUploadRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(isOpen || false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("general");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRichEditor, setIsRichEditor] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [showCollaboratorSearch, setShowCollaboratorSearch] = useState(false);
  const [collaboratorSearchQuery, setCollaboratorSearchQuery] = useState("");
  const [spotifyTrack, setSpotifyTrack] = useState<any>(null);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);


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

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      return apiRequest("POST", "/api/posts", postData);
    },
    onSuccess: () => {
      // Clear form
      setTitle("");
      setContent("");
      setExcerpt("");
      setCategory("general");
      setCoverImageUrl("");
      setSelectedImages([]);
      setCollaborators([]);
      setSpotifyTrack(null);
      setOpen(false);
      onClose?.();

      // Invalidate queries to refresh feed
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });

      toast({
        title: "Article published!",
        description: "Your article has been shared with the community.",
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
        description: "There was an error publishing your article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Cover image must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('images', file);

      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setCoverImageUrl(data.imageUrls[0]);

      toast({
        title: "Cover uploaded!",
        description: "Cover image has been added to your article.",
      });
    } catch (error) {
      console.error("Image upload error:", error);
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
    if (files.length === 0) return;

    setIsUploadingImages(true);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const imageFiles = Array.from(files).filter(file => validTypes.includes(file.type));

    if (imageFiles.length === 0 && files.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload JPG, PNG, WebP, or GIF images.",
        variant: "destructive",
      });
      setIsUploadingImages(false);
      return;
    }

    if (selectedImages.length + imageFiles.length > 4) {
      toast({
        title: "Too many images",
        description: "You can only upload a maximum of 4 images.",
        variant: "destructive",
      });
      setIsUploadingImages(false);
      return;
    }

    try {
      const formData = new FormData();
      imageFiles.forEach(file => formData.append('images', file));

      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setSelectedImages(prevImages => [...prevImages, ...data.imageUrls]);

      toast({
        title: "Images uploaded!",
        description: "Your images have been added to the article.",
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
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please add a title to your article.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please write some content for your article.",
        variant: "destructive",
      });
      return;
    }

    if (content.length > 50000) {
      toast({
        title: "Article too long",
        description: "Articles must be under 50,000 characters.",
        variant: "destructive",
      });
      return;
    }

    // Auto-generate excerpt if not provided
    const plainContent = content.replace(/<[^>]*>/g, '');
    const finalExcerpt = excerpt.trim() || plainContent.slice(0, 200);

    const postData = {
      title: title.trim(),
      content: content.trim(),
      category: category !== "general" ? category : undefined,
      excerpt: finalExcerpt.trim(),
      coverImageUrl: coverImageUrl || undefined,
      imageUrls: selectedImages,
      collaborators: collaborators.length > 0 ? collaborators.map(c => c.id) : undefined,
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

    createPostMutation.mutate(postData);
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen !== undefined ? isOpen : open} onOpenChange={isOpen !== undefined ? onClose : setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create an Article</DialogTitle>
          <DialogDescription>
            Share your writing with the Writers Guild community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your article title..."
              className="text-lg font-semibold"
              maxLength={255}
              data-testid="input-article-title"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="literary">Literary</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="opinion">Opinion</SelectItem>
                <SelectItem value="personal column">Personal Column</SelectItem>
                <SelectItem value="culture">Culture</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label htmlFor="cover" className="text-sm font-medium">
              Cover Image (Optional)
            </Label>
            {coverImageUrl ? (
              <div className="relative">
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className="w-full h-48 object-cover rounded-lg border"
                  data-testid="img-cover-preview"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setCoverImageUrl("")}
                  data-testid="button-remove-cover"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => coverUploadRef.current?.click()}
                  disabled={isUploadingCover}
                  data-testid="button-upload-cover"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {isUploadingCover ? "Uploading..." : "Upload Cover"}
                </Button>
                <input
                  ref={coverUploadRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Toolbar and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="hidden"
                id="modal-images-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('modal-images-upload')?.click()}
                disabled={isUploadingImages || selectedImages.length >= 4}
                title={isUploadingImages ? "Uploading..." : selectedImages.length >= 4 ? "Maximum 4 images" : "Add images"}
              >
                {isUploadingImages ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <ImageIcon className="w-4 h-4 mr-2" />
                )}
                Images {selectedImages.length > 0 && `(${selectedImages.length}/4)`}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCollaboratorSearch(!showCollaboratorSearch)}
                className={`${showCollaboratorSearch || collaborators.length > 0 ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400" : ""} transition-all`}
                title={collaborators.length > 0 ? `${collaborators.length} collaborator${collaborators.length !== 1 ? 's' : ''} added` : "Add collaborators"}
              >
                <UserPlus className={`w-4 h-4 mr-2 ${collaborators.length > 0 ? 'text-blue-500' : ''}`} />
                Collaborators {collaborators.length > 0 && `(${collaborators.length})`}
                {collaborators.length > 0 && (
                  <span className="ml-1">✓</span>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSpotifySearch(!showSpotifySearch)}
                className={`${showSpotifySearch || spotifyTrack ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400" : ""} transition-all`}
                title="Attach Spotify Track"
              >
                <Music className={`w-4 h-4 mr-2 ${spotifyTrack ? 'text-green-500' : ''}`} />
                Spotify {spotifyTrack && "✓"}
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm font-medium">
              Content <span className="text-destructive">*</span>
            </Label>
            <div className="border rounded-lg">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write your article here..."
                className="min-h-[300px]"
                postType="text"
              />
            </div>
          </div>

          {/* Body Images Gallery */}
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

          {/* Collaborators Display */}
          {collaborators.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold">
                  Collaborators ({collaborators.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {collaborators.map((collaborator) => (
                  <Badge key={collaborator.id} variant="secondary" className="text-xs px-3 py-1.5 flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30">
                    <img
                      src={collaborator.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${collaborator.username}`}
                      alt={collaborator.displayName}
                      className="w-4 h-4 rounded-full"
                    />
                    <span>{collaborator.displayName}</span>
                    <button
                      onClick={() => setCollaborators(prev => prev.filter(c => c.id !== collaborator.id))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Collaborator Search */}
          {showCollaboratorSearch && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
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
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search users..."
                      value={collaboratorSearchQuery}
                      onChange={(e) => setCollaboratorSearchQuery(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                  {searchUsersQuery.data && searchUsersQuery.data.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchUsersQuery.data.map((searchUser: any) => {
                        const isAlreadyCollaborator = collaborators.some(c => c.id === searchUser.id);
                        const isCurrentUser = searchUser.id === user?.id;

                        return (
                          <div
                            key={searchUser.id}
                            className={`flex items-center justify-between p-2 border rounded ${
                              isAlreadyCollaborator || isCurrentUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20'
                            }`}
                            onClick={() => {
                              if (!isAlreadyCollaborator && !isCurrentUser) {
                                setCollaborators(prev => [...prev, searchUser]);
                                setCollaboratorSearchQuery("");
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={searchUser.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${searchUser.username}`}
                                alt={searchUser.displayName}
                                className="w-8 h-8 rounded-full"
                              />
                              <div>
                                <p className="text-sm font-medium">{searchUser.displayName}</p>
                                <p className="text-xs text-muted-foreground">@{searchUser.username}</p>
                              </div>
                            </div>
                            {isAlreadyCollaborator && <Badge variant="outline">Added</Badge>}
                            {isCurrentUser && <Badge variant="outline">You</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Spotify Track Display */}
          {spotifyTrack && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold">Selected Track</span>
              </div>
              <div className="flex items-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {spotifyTrack.imageUrl && (
                    <img src={spotifyTrack.imageUrl} alt={spotifyTrack.name} className="w-12 h-12 rounded" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{spotifyTrack.name}</p>
                    <p className="text-xs text-muted-foreground">{spotifyTrack.artist}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSpotifyTrack(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Spotify Search */}
          {showSpotifySearch && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
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
                      onClick={() => setShowSpotifySearch(false)}
                      className="h-8 w-8 p-0"
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
                    placeholder="Search for a song..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="excerpt" className="text-sm font-medium">
              Excerpt (Optional)
            </Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Write a brief summary of your article (auto-generated if left blank)"
              className="resize-none"
              rows={3}
              maxLength={500}
              data-testid="textarea-excerpt"
            />
            <p className="text-xs text-muted-foreground">
              {excerpt.length}/500 characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <FileText className="w-4 h-4 inline mr-1" />
            {content.replace(/<[^>]*>/g, '').trim().split(/\s+/).length} words
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                onClose?.();
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createPostMutation.isPending || isUploadingCover || isUploadingImages}
              data-testid="button-publish"
            >
              {createPostMutation.isPending ? "Publishing..." : "Publish Article"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}