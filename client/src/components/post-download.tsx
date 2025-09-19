
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Download, Image, FileImage, Smartphone, Monitor } from "lucide-react";
import html2canvas from "html2canvas";
import type { Post, User } from "@shared/schema";

interface PostDownloadProps {
  post: Post & {
    author?: User;
  };
  postRef: React.RefObject<HTMLDivElement>;
}

export default function PostDownload({ post, postRef }: PostDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadAsImage = async (format: 'png' | 'jpg' | 'webp', size: 'mobile' | 'desktop' | 'square') => {
    if (!postRef.current) return;
    
    setIsDownloading(true);
    
    try {
      // Get dimensions based on format
      const dimensions = {
        mobile: { width: 375, height: 667 },
        desktop: { width: 1200, height: 630 },
        square: { width: 1080, height: 1080 }
      };
      
      const { width, height } = dimensions[size];
      
      // Create canvas with proper styling
      const canvas = await html2canvas(postRef.current, {
        backgroundColor: '#0a0a0b', // Dark theme background
        width: width,
        height: height,
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        removeContainer: true,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Style the cloned document for better appearance
          const clonedElement = clonedDoc.querySelector('[data-post-download]') as HTMLElement;
          if (clonedElement) {
            clonedElement.style.background = 'linear-gradient(135deg, #0a0a0b 0%, #1a1a1b 100%)';
            clonedElement.style.border = '2px solid #8b5cf6';
            clonedElement.style.borderRadius = '16px';
            clonedElement.style.padding = '24px';
            clonedElement.style.fontFamily = 'Inter, system-ui, sans-serif';
            clonedElement.style.color = '#f8fafc';
            clonedElement.style.maxWidth = `${width}px`;
            clonedElement.style.maxHeight = `${height}px`;
            clonedElement.style.overflow = 'hidden';
            
            // Add watermark
            const watermark = clonedDoc.createElement('div');
            watermark.innerHTML = '✨ Writers Guild';
            watermark.style.position = 'absolute';
            watermark.style.bottom = '12px';
            watermark.style.right = '16px';
            watermark.style.fontSize = '12px';
            watermark.style.color = '#8b5cf6';
            watermark.style.fontWeight = '600';
            watermark.style.opacity = '0.7';
            clonedElement.appendChild(watermark);
          }
        }
      });

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(resolve as BlobCallback, `image/${format}`, format === 'jpg' ? 0.9 : 1);
      });

      if (blob) {
        // Download the file
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `writers-guild-post-${post.id.slice(-8)}-${size}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading post:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isDownloading}
          className="engagement-btn hover:text-accent group"
          data-testid="button-download-post"
        >
          <div className="p-2 rounded-full group-hover:bg-accent/10 transition-colors">
            <Download className={`w-5 h-5 ${isDownloading ? 'animate-bounce' : ''}`} />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium text-foreground border-b border-border mb-1">
          Download as Image
        </div>
        
        {/* Mobile Format */}
        <div className="px-2 py-1 text-xs text-muted-foreground">Mobile (375×667)</div>
        <DropdownMenuItem onClick={() => downloadAsImage('png', 'mobile')}>
          <Smartphone className="w-4 h-4 mr-2" />
          PNG - Mobile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadAsImage('jpg', 'mobile')}>
          <Smartphone className="w-4 h-4 mr-2" />
          JPG - Mobile
        </DropdownMenuItem>
        
        {/* Desktop Format */}
        <div className="px-2 py-1 text-xs text-muted-foreground mt-2">Desktop (1200×630)</div>
        <DropdownMenuItem onClick={() => downloadAsImage('png', 'desktop')}>
          <Monitor className="w-4 h-4 mr-2" />
          PNG - Desktop
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadAsImage('jpg', 'desktop')}>
          <Monitor className="w-4 h-4 mr-2" />
          JPG - Desktop
        </DropdownMenuItem>
        
        {/* Square Format */}
        <div className="px-2 py-1 text-xs text-muted-foreground mt-2">Square (1080×1080)</div>
        <DropdownMenuItem onClick={() => downloadAsImage('png', 'square')}>
          <Image className="w-4 h-4 mr-2" />
          PNG - Square
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadAsImage('webp', 'square')}>
          <FileImage className="w-4 h-4 mr-2" />
          WebP - Square
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
