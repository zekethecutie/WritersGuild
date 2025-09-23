
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Download, Share } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: string[];
  className?: string;
}

export default function ImageGallery({ images, className }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const openLightbox = (image: string, index: number) => {
    setSelectedImage(image);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    const nextIndex = (currentIndex + 1) % images.length;
    setCurrentIndex(nextIndex);
    setSelectedImage(images[nextIndex]);
  };

  const prevImage = () => {
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    setSelectedImage(images[prevIndex]);
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareImage = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this image',
          url: url
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
      } catch (error) {
        console.log('Error copying to clipboard:', error);
      }
    }
  };

  // Render single image
  if (images.length === 1) {
    return (
      <div className={cn("relative overflow-hidden rounded-lg", className)}>
        <img
          src={images[0]}
          alt="Post image"
          className="w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => openLightbox(images[0], 0)}
          style={{ maxHeight: '500px' }}
        />
        
        {/* Lightbox */}
        <Dialog open={!!selectedImage} onOpenChange={() => closeLightbox()}>
          <DialogContent className="max-w-4xl p-0 bg-black/90">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                onClick={closeLightbox}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={() => downloadImage(selectedImage!)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={() => shareImage(selectedImage!)}
                >
                  <Share className="h-4 w-4" />
                </Button>
              </div>
              
              <img
                src={selectedImage!}
                alt="Full size image"
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render image grid for multiple images
  const gridClass = images.length === 2 ? 'grid-cols-2' : 
                   images.length === 3 ? 'grid-cols-2' : 
                   'grid-cols-2';

  return (
    <div className={cn("relative", className)}>
      <div className={`grid gap-1 ${gridClass}`}>
        {images.slice(0, 4).map((image, index) => (
          <div 
            key={index} 
            className={cn(
              "relative overflow-hidden rounded-lg cursor-pointer",
              images.length === 3 && index === 0 ? "row-span-2" : "",
              "aspect-square"
            )}
            onClick={() => openLightbox(image, index)}
          >
            <img
              src={image}
              alt={`Post image ${index + 1}`}
              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
            />
            
            {/* Show +N more overlay for 4+ images */}
            {index === 3 && images.length > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-lg font-semibold">
                  +{images.length - 4} more
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => closeLightbox()}>
        <DialogContent className="max-w-4xl p-0 bg-black/90">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={closeLightbox}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => downloadImage(selectedImage!)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => shareImage(selectedImage!)}
              >
                <Share className="h-4 w-4" />
              </Button>
            </div>
            
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            
            <img
              src={selectedImage!}
              alt="Full size image"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
            
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white text-sm bg-black/50 px-2 py-1 rounded">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
