import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Heart, Pin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import type { DashboardMessage } from "@shared/schema";
import avatarFallback from "@/assets/avatar-fallback.png";

interface UserBoardMessageViewerProps {
  message: DashboardMessage & {
    user?: any;
    admin?: any;
  };
  boardUser: any;
  boardName: string;
  trigger: React.ReactNode;
}

const categories = [
  { name: "Anything", color: "#6b7280" },
  { name: "Love", color: "#ef4444" },
  { name: "Advice", color: "#3b82f6" },
  { name: "Confession", color: "#8b5cf6" },
  { name: "Rant", color: "#f59e0b" },
  { name: "Reflection", color: "#10b981" },
  { name: "Writing", color: "#f97316" },
];

export function UserBoardMessageViewer({ message, boardUser, boardName, trigger }: UserBoardMessageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const isBoardOwnerPost = (message.senderUserId && message.senderUserId === boardUser.id) || 
                          (message.senderAdminId && message.senderAdminId === boardUser.id);

  let senderProfile = null;
  let displayName = message.senderName;

  if (isBoardOwnerPost) {
    senderProfile = boardUser;
    displayName = boardUser.displayName || boardUser.username;
  }

  const downloadAsImage = async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    toast({
      title: "Converting image...",
      description: "Please wait for a moment, image converting...",
    });

    try {
      const element = document.getElementById('userboard-message-capture');
      if (!element) {
        throw new Error('Message element not found');
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

      console.log('Element dimensions:', element.offsetWidth, element.offsetHeight);
      console.log('Element visible:', element.offsetWidth > 0 && element.offsetHeight > 0);

      const canvas = await html2canvas(element, {
        backgroundColor: null, // Use null instead of transparent
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: true, // Enable logging for debugging
        width: element.offsetWidth,
        height: element.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        onclone: (clonedDoc, clonedElement) => {
          // Ensure the cloned element is visible
          const targetElement = clonedDoc.getElementById('userboard-message-capture');
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

            // Add specific CSS to fix Spotify text clipping
            const spotifyFixStyle = clonedDoc.createElement('style');
            spotifyFixStyle.textContent = `
              /* Fix text clipping in Spotify section */
              .spotify-section p,
              .spotify-section span {
                line-height: 1.4 !important;
                padding: 2px 0 !important;
                margin: 1px 0 !important;
                overflow: visible !important;
                display: block !important;
                box-sizing: content-box !important;
              }

              /* Specific fixes for song title and artist */
              .spotify-track-title {
                line-height: 1.4 !important;
                padding: 2px 0 !important;
                margin: 1px 0 !important;
                font-size: 20px !important;
                height: auto !important;
                min-height: 28px !important;
              }

              .spotify-artist-name {
                line-height: 1.4 !important;
                padding: 1px 0 !important;
                margin: 1px 0 !important;
                font-size: 16px !important;
                height: auto !important;
                min-height: 20px !important;
              }

              /* Fix any truncated text */
              .truncate {
                overflow: visible !important;
                text-overflow: clip !important;
                white-space: normal !important;
              }

              /* Fix message content text overflow */
              .message-text {
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

      console.log('Canvas dimensions:', canvas.width, canvas.height);

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has zero dimensions');
      }

      // Create download link
      const link = document.createElement('a');
      link.download = `board-message-${message.id}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Image saved successfully!",
        description: "Board message saved to your downloads.",
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
            <DialogTitle className="text-white">Board Post Preview</DialogTitle>
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
          id="userboard-message-capture" 
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
          {/* Pinned Badge */}
          {message.isPinned && (
            <div className="absolute -top-4 left-8 bg-yellow-500 text-black px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl">
              <Pin className="w-4 h-4" />
              PINNED POST
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16 ring-4 ring-white/20 shadow-lg">
                  <AvatarImage 
                    src={senderProfile?.profilePicture || ""} 
                    alt={displayName} 
                  />
                  <AvatarFallback className="bg-gray-100 dark:bg-gray-800" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <img src={avatarFallback} alt="Avatar" className="w-full h-full object-cover" />
                  </AvatarFallback>
                </Avatar>
                {isBoardOwnerPost && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-900 flex items-center justify-center shadow-lg">
                    <span className="text-white text-lg">👑</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-white text-2xl">
                    {displayName}
                  </h3>
                  {message.senderAdminId && (
                    <Badge className="bg-purple-600/90 text-white text-sm px-3 py-1 rounded-full">
                      🎧 Listener
                    </Badge>
                  )}
                </div>
                <p className="text-gray-300 text-base mt-1">
                  @{isBoardOwnerPost ? boardUser.username : (message.senderName || 'anonymous')} • {new Date(message.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Category Badge */}
          <div className="mb-6">
            <span
              className="inline-flex items-center justify-center text-sm px-4 py-2 rounded-full font-medium"
              style={{
                backgroundColor: `${categories.find(c => c.name === message.category)?.color}20`,
                color: categories.find(c => c.name === message.category)?.color,
                border: `2px solid ${categories.find(c => c.name === message.category)?.color}30`,
                minHeight: '32px',
                lineHeight: '1.2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ transform: 'translateY(0.5px)' }}>
                {message.category}
              </span>
            </span>
          </div>

          {/* Message Content */}
          <div className="mb-8">
            <p 
              className="text-gray-100 text-xl leading-relaxed font-light tracking-wide message-text"
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'clip'
              }}
            >
              {message.content}
            </p>
          </div>

          {/* Spotify Integration */}
          {message.spotifyTrackId && (
            <div className="spotify-section mb-8 p-6 bg-gradient-to-r from-green-600/30 to-green-400/30 rounded-2xl border-2 border-green-500/40 shadow-xl">
              <div className="flex items-center gap-6">
                {message.spotifyAlbumCover && (
                  <img 
                    src={message.spotifyAlbumCover} 
                    alt="Album cover" 
                    className="w-20 h-20 rounded-xl object-cover shadow-xl ring-4 ring-green-400/40"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="spotify-track-title font-bold text-white text-xl mb-1" style={{ lineHeight: '1.4', padding: '2px 0', overflow: 'visible' }}>
                    {message.spotifyTrackName}
                  </p>
                  <p className="spotify-artist-name text-green-300 text-base" style={{ lineHeight: '1.4', padding: '1px 0', overflow: 'visible' }}>
                    by {message.spotifyArtistName}
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

          {/* Board Info Footer */}
          <div className="pt-6 border-t-2 border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 ring-2 ring-white/20">
                  <AvatarImage src={boardUser.profilePicture || ""} alt={boardUser.displayName || boardUser.username} />
                  <AvatarFallback className="bg-gray-100 dark:bg-gray-800" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <img src={avatarFallback} alt="Avatar" className="w-full h-full object-cover" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white text-lg font-bold">{boardName}</p>
                  <p className="text-gray-400 text-sm">by {boardUser.displayName || boardUser.username}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-sm font-mono">Whisper Network</p>
                <p className="text-gray-600 text-xs">Board Message</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}