import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  onRemove?: (index: number) => void;
  className?: string;
  maxHeight?: number;
}

export default function ImageGallery({ 
  images, 
  onRemove, 
  className = "", 
  maxHeight = 300 
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{[key: string]: {width: number, height: number}}>({});

  if (!images || images.length === 0) return null;

  const handleImageLoad = (src: string, img: HTMLImageElement) => {
    setImageDimensions(prev => ({
      ...prev,
      [src]: { width: img.naturalWidth, height: img.naturalHeight }
    }));
  };

  const getGridClass = () => {
    switch (images.length) {
      case 1:
        return "grid grid-cols-1 gap-2 rounded-xl overflow-hidden";
      case 2:
        return "grid grid-cols-2 gap-2 rounded-xl overflow-hidden";
      case 3:
        return "grid grid-cols-2 gap-2 rounded-xl overflow-hidden";
      default:
        return "grid grid-cols-2 gap-2 rounded-xl overflow-hidden";
    }
  };

  const getImageStyle = (index: number, src: string) => {
    const dimensions = imageDimensions[src];
    if (!dimensions) return {};

    if (images.length === 1) {
      // Single image: maintain aspect ratio with max constraints
      const aspectRatio = dimensions.width / dimensions.height;
      if (aspectRatio > 1.5) {
        return { maxHeight: '400px', width: '100%', objectFit: 'contain' as const };
      } else {
        return { maxHeight: '600px', width: '100%', objectFit: 'contain' as const };
      }
    }

    if (images.length === 3 && index === 0) {
      return { gridRowSpan: 2, height: '300px', objectFit: 'cover' as const };
    }

    return { height: images.length > 2 ? '145px' : '200px', objectFit: 'cover' as const };
  };

  const handleImageClick = (image: string) => {
    setSelectedImage(image);
  };

  return (
    <>
      <div className={`${getGridClass()} ${className}`} data-testid="image-gallery">
        {images.slice(0, 4).map((image, index) => (
          <div 
            key={index} 
            className={`relative group ${images.length === 3 && index === 0 ? 'row-span-2' : ''}`}
          >
            <img
              src={image}
              alt={`Gallery image ${index + 1}`}
              className="w-full cursor-pointer transition-opacity hover:opacity-90 rounded-lg"
              style={getImageStyle(index, image)}
              onClick={() => handleImageClick(image)}
              onLoad={(e) => handleImageLoad(image, e.currentTarget)}
              data-testid={`gallery-image-${index}`}
            />
            
            {/* Show count overlay for 4+ images on last image */}
            {index === 3 && images.length > 4 && (
              <div 
                className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer rounded-lg"
                onClick={() => handleImageClick(image)}
              >
                <span className="text-white text-xl font-bold">
                  +{images.length - 4}
                </span>
              </div>
            )}
            
            {/* Remove button for editing mode */}
            {onRemove && (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="absolute top-2 right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`button-remove-image-${index}`}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
          data-testid="image-lightbox"
        >
          <div className="relative max-w-4xl max-h-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 bg-black/50 border-white/20 text-white hover:bg-black/70"
              data-testid="button-close-lightbox"
            >
              <X className="w-4 h-4" />
            </Button>
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
