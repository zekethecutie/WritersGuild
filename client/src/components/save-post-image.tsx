import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';

interface SavePostImageProps {
  postRef: React.RefObject<HTMLElement>;
  postId: string;
  disabled?: boolean;
}

export default function SavePostImage({ postRef, postId, disabled }: SavePostImageProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleSaveAsImage = async () => {
    if (!postRef.current) {
      toast({
        title: "Error",
        description: "Unable to capture post content",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Create a clone of the post element for styling
      const element = postRef.current;
      const originalStyle = element.style.cssText;
      
      // Temporarily style the element for better image capture
      element.style.cssText += `
        background: white;
        color: black;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        max-width: 600px;
        font-family: 'Inter', sans-serif;
      `;

      // Generate the canvas
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        onclone: (clonedDoc) => {
          // Apply additional styling to the cloned document for better appearance
          const clonedElement = clonedDoc.querySelector(`[data-post-id="${postId}"]`) as HTMLElement;
          if (clonedElement) {
            // Hide action buttons in the image
            const actionButtons = clonedElement.querySelectorAll('[data-hide-in-image="true"]');
            actionButtons.forEach(button => {
              (button as HTMLElement).style.display = 'none';
            });
            
            // Style text elements for better readability
            const textElements = clonedElement.querySelectorAll('p, span, div');
            textElements.forEach(el => {
              (el as HTMLElement).style.color = '#1f2937';
            });
          }
        }
      });

      // Restore original style
      element.style.cssText = originalStyle;

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `writers-guild-post-${postId}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);

          toast({
            title: "Success!",
            description: "Post saved as image",
          });
        } else {
          throw new Error('Failed to generate image');
        }
      }, 'image/png');

    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Error",
        description: "Failed to save post as image",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSaveAsImage}
      disabled={disabled || isGenerating}
      className="text-muted-foreground hover:text-foreground"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span className="ml-2">Save as Image</span>
    </Button>
  );
}
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Heart, MessageCircle, Repeat2, Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { getProfileImageUrl } from "@/lib/defaultImages";
import { formatDistanceToNow } from "date-fns";

interface SavePostImageProps {
  post: any;
  trigger: React.ReactNode;
}

export function SavePostImage({ post, trigger }: SavePostImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const downloadAsImage = async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    toast({
      title: "Converting image...",
      description: "Please wait for a moment, image converting...",
    });

    try {
      const element = document.getElementById('post-capture');
      if (!element) {
        throw new Error('Post element not found');
      }

      // Ensure element is visible and properly rendered
      element.style.display = 'block';
      element.style.visibility = 'visible';
      element.style.opacity = '1';

      // Wait for fonts and rendering
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Force a reflow to ensure everything is rendered
      element.offsetHeight;

      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: true,
        width: element.offsetWidth,
        height: element.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        onclone: (clonedDoc, clonedElement) => {
          const targetElement = clonedDoc.getElementById('post-capture');
          if (targetElement) {
            targetElement.style.display = 'block';
            targetElement.style.visibility = 'visible';
            targetElement.style.opacity = '1';
            targetElement.style.position = 'relative';

            // Copy all styles from original document
            const originalStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
            originalStyles.forEach(styleEl => {
              const newStyle = clonedDoc.createElement(styleEl.tagName.toLowerCase());
              if (styleEl.tagName === 'STYLE') {
                newStyle.textContent = styleEl.textContent;
              } else if (styleEl.tagName === 'LINK') {
                const linkEl = styleEl as HTMLLinkElement;
                (newStyle as HTMLLinkElement).rel = linkEl.rel;
                (newStyle as HTMLLinkElement).href = linkEl.href;
              }
              clonedDoc.head.appendChild(newStyle);
            });

            const spotifyFixStyle = clonedDoc.createElement('style');
            spotifyFixStyle.textContent = `
              .spotify-section p,
              .spotify-section span {
                line-height: 1.4 !important;
                padding: 2px 0 !important;
                margin: 1px 0 !important;
                overflow: visible !important;
                display: block !important;
                box-sizing: content-box !important;
              }

              .post-text {
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                white-space: pre-wrap !important;
                max-width: 100% !important;
                overflow: visible !important;
                text-overflow: clip !important;
                line-height: 1.4 !important;
                padding: 2px 0 !important;
                margin: 2px 0 !important;
              }
            `;
            clonedDoc.head.appendChild(spotifyFixStyle);
          }
        },
      });

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has zero dimensions');
      }

      // Create download link
      const link = document.createElement('a');
      link.download = `post-${post.id}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Image saved successfully!",
        description: "Post saved to your downloads.",
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: `Error: ${(error as Error).message}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-950 text-white border-gray-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Post Preview</DialogTitle>
            <Button 
              onClick={downloadAsImage}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
              disabled={isDownloading}
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Converting...' : 'Save as Image'}
            </Button>
          </div>
        </DialogHeader>

        {/* Capture Container */}
        <div 
          id="post-capture" 
          className="p-16 bg-transparent"
        >
          <div 
            className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-black rounded-3xl p-8 mx-auto max-w-2xl"
            style={{
              background: `linear-gradient(135deg, 
                rgba(17, 24, 39, 1) 0%, 
                rgba(31, 41, 55, 1) 25%,
                rgba(55, 65, 81, 1) 50%,
                rgba(31, 41, 55, 1) 75%,
                rgba(17, 24, 39, 1) 100%)`
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 ring-4 ring-white/20 shadow-lg">
                    <AvatarImage 
                      src={getProfileImageUrl(post.author?.profileImageUrl)} 
                      alt={post.author?.displayName} 
                    />
                    <AvatarFallback className="bg-gray-100 dark:bg-gray-800">
                      {post.author?.displayName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {post.author?.isVerified && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full border-4 border-gray-900 flex items-center justify-center shadow-lg">
                      <span className="text-white text-lg">✓</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white text-2xl">
                      {post.author?.displayName}
                    </h3>
                    {post.author?.isAdmin && (
                      <Badge className="bg-purple-600/90 text-white text-sm px-3 py-1 rounded-full">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-300 text-base mt-1">
                    @{post.author?.username} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>

            {/* Title */}
            {post.title && (
              <div className="mb-4">
                <h2 className="text-white text-xl font-bold">{post.title}</h2>
              </div>
            )}

            {/* Content */}
            <div className="mb-8">
              <p 
                className="text-gray-100 text-xl leading-relaxed font-light tracking-wide post-text"
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'clip'
                }}
              >
                {post.content}
              </p>
            </div>

            {/* Spotify Integration */}
            {post.spotifyTrackData && (
              <div className="spotify-section mb-8 p-6 bg-gradient-to-r from-green-600/30 to-green-400/30 rounded-2xl border-2 border-green-500/40 shadow-xl">
                <div className="flex items-center gap-6">
                  {post.spotifyTrackData.image && (
                    <img 
                      src={post.spotifyTrackData.image} 
                      alt="Album cover" 
                      className="w-20 h-20 rounded-xl object-cover shadow-xl ring-4 ring-green-400/40"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-xl mb-1" style={{ lineHeight: '1.4', padding: '2px 0', overflow: 'visible' }}>
                      {post.spotifyTrackData.name}
                    </p>
                    <p className="text-green-300 text-base" style={{ lineHeight: '1.4', padding: '1px 0', overflow: 'visible' }}>
                      by {post.spotifyTrackData.artist}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="bg-green-500 p-2 rounded-lg shadow-lg">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.301.421-1.02.599-1.559.3z"/>
                        </svg>
                      </div>
                      <span className="text-green-300 text-sm font-medium">Listen on Spotify</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Engagement Stats */}
            <div className="pt-6 border-t-2 border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-gray-400">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    <span>{post.likesCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    <span>{post.commentsCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Repeat2 className="w-5 h-5" />
                    <span>{post.repostsCount || 0}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-sm font-mono">Writers Guild</p>
                  <p className="text-gray-600 text-xs">Social Writing Platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
