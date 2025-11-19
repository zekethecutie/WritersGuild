import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";

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
    const finalExcerpt = excerpt.trim() || content.replace(/<[^>]*>/g, '').slice(0, 200);

    const postData = {
      title: title.trim(),
      content: content.trim(),
      excerpt: finalExcerpt,
      category: category !== "general" ? category : undefined,
      coverImageUrl: coverImageUrl || undefined,
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
              disabled={createPostMutation.isPending || isUploadingCover}
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
