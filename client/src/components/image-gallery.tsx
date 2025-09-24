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

  if (!images || images.length === 0) return null;

  const getGridClass = () => {
    switch (images.length) {
      case 1:
        return "image-gallery single";
      case 2:
        return "image-gallery double";
      case 3:
        return "image-gallery triple";
      default:
        return "image-gallery quad";
    }
  };

  const handleImageClick = (image: string) => {
    setSelectedImage(image);
  };

  return (
    <>
      <div className={`${getGridClass()} ${className} w-full`} data-testid="image-gallery"
           style={{
             display: 'grid',
             gap: '0.5rem',
             gridTemplateColumns: images.length === 1 ? '1fr' :
                                 images.length === 2 ? '1fr 1fr' :
                                 images.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr',
             gridTemplateRows: images.length <= 2 ? '1fr' :
                              images.length === 3 ? '1fr' : '1fr 1fr',
             maxHeight: images.length === 1 ? '500px' : '400px',
             width: '100%'
           }}>
        {images.slice(0, 4).map((image, index) => (
          <div key={index} className="relative group">
            <img
              src={image}
              alt={`Gallery image ${index + 1}`}
              className={`w-full cursor-pointer transition-opacity hover:opacity-90 ${
                images.length === 1 ? 'h-auto object-cover' : 'h-full object-cover'
              }`}
              style={{
                maxHeight: images.length === 1 ? '500px' : '200px',
                width: '100%',
                borderRadius: '0.75rem'
              }}
              onClick={() => handleImageClick(image)}
              data-testid={`gallery-image-${index}`}
            />

            {/* Show count overlay for 4+ images on last image */}
            {index === 3 && images.length > 4 && (
              <div
                className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer"
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
              className="w-full h-auto object-contain"
              style={{ maxHeight: '90vh' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}