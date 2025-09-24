
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { AlertTriangle, Flag } from "lucide-react";

interface ReportPostButtonProps {
  postId: string;
  disabled?: boolean;
  onReport: (reason: string) => void;
}

const reportReasons = [
  { id: "spam", label: "Spam or unwanted content", description: "Repetitive or irrelevant posts" },
  { id: "harassment", label: "Harassment or bullying", description: "Targeting individuals with harmful content" },
  { id: "hate-speech", label: "Hate speech", description: "Content that attacks people based on identity" },
  { id: "inappropriate", label: "Inappropriate content", description: "NSFW or offensive material" },
  { id: "copyright", label: "Copyright violation", description: "Unauthorized use of protected content" },
  { id: "misinformation", label: "False information", description: "Deliberately misleading content" },
  { id: "violence", label: "Violence or threats", description: "Content promoting or threatening violence" },
  { id: "other", label: "Other", description: "Violates community guidelines" }
];

export default function ReportPostButton({ postId, disabled, onReport }: ReportPostButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReport = (reason: string) => {
    onReport(reason);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="engagement-btn hover:text-orange-400 group"
          data-testid="button-report-post"
        >
          <div className="p-2 rounded-full group-hover:bg-orange-400/10 transition-colors">
            <Flag className="w-5 h-5" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-1.5 text-sm font-medium text-foreground border-b border-border mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Report this post
        </div>
        
        {reportReasons.map((reason, index) => (
          <div key={reason.id}>
            <DropdownMenuItem 
              onClick={() => handleReport(reason.id)}
              className="cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10"
            >
              <div>
                <div className="font-medium">{reason.label}</div>
                <div className="text-xs text-muted-foreground">{reason.description}</div>
              </div>
            </DropdownMenuItem>
            {index < reportReasons.length - 1 && <DropdownMenuSeparator />}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
