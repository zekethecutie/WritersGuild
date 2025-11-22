import { useState, useCallback } from "react";
import ReactEasyCrop, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onClose: () => void;
}

export default function ImageCropModal({ isOpen, imageSrc, onCropComplete, onClose }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "21:9">("21:9");
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropAreaChange = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const image = new Image();
      image.src = imageSrc;

      await new Promise((resolve) => {
        image.onload = resolve;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // Set canvas dimensions based on cropped area
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      // Draw the cropped image
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      // Convert to blob and then to data URL
      canvas.toBlob((blob) => {
        if (!blob) throw new Error("Could not convert canvas to blob");

        const reader = new FileReader();
        reader.onloadend = () => {
          onCropComplete(reader.result as string);
          onClose();
        };
        reader.readAsDataURL(blob);
      }, "image/jpeg", 0.95);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const aspectRatioValues = {
    "1:1": 1,
    "21:9": 21 / 9,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Cover Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Aspect Ratio:</label>
            <Select value={aspectRatio} onValueChange={(value) => setAspectRatio(value as "1:1" | "21:9")}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">Square (1:1)</SelectItem>
                <SelectItem value="21:9">Wide (21:9)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Crop Container */}
          <div className="relative w-full bg-black rounded-md overflow-hidden" style={{ height: "400px" }}>
            <ReactEasyCrop
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatioValues[aspectRatio]}
              onCropChange={setCrop}
              onCropAreaChange={onCropAreaChange}
              onZoomChange={setZoom}
            />
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium min-w-fit">Zoom:</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-muted-foreground min-w-fit">{zoom.toFixed(1)}x</span>
          </div>

          {/* Auto Crop Option */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCrop({ x: 0, y: 0 });
              setZoom(1);
            }}
            className="w-full"
          >
            Auto Crop
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={isProcessing}>
            {isProcessing ? "Cropping..." : "Apply Crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
