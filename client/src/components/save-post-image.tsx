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