
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { getProfileImageUrl } from "@/lib/defaultImages";
import { Heart, Reply, MoreHorizontal, User as UserIcon } from "lucide-react";

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isRead?: boolean;
  sender: {
    id: string;
    username: string;
    displayName: string;
    profileImageUrl?: string;
  };
}

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  isLastInGroup?: boolean;
  onReact?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
}

export default function ChatBubble({ 
  message, 
  isOwn, 
  isLastInGroup = false,
  onReact,
  onReply 
}: ChatBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleTouchStart = () => {
    timeoutRef.current = setTimeout(() => {
      setIsLongPressed(true);
      setShowActions(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setTimeout(() => setIsLongPressed(false), 100);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1 group relative`}>
      <div className="flex items-end gap-2 max-w-[70%]">
        {!isOwn && isLastInGroup && (
          <Avatar className="w-6 h-6 flex-shrink-0">
            <AvatarImage 
              src={getProfileImageUrl(message.sender.profileImageUrl)} 
              alt={message.sender.displayName}
            />
            <AvatarFallback className="text-xs">
              <UserIcon className="w-3 h-3" />
            </AvatarFallback>
          </Avatar>
        )}
        
        {!isOwn && !isLastInGroup && (
          <div className="w-6 h-6 flex-shrink-0" />
        )}

        <div
          className={`relative px-4 py-2 rounded-2xl break-words ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          } ${isLongPressed ? "scale-95" : ""} transition-transform duration-200`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>
          
          {/* Message timestamp */}
          <div className={`text-xs mt-1 ${
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}>
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            {isOwn && (
              <span className="ml-2">
                {message.isRead ? "Read" : "Delivered"}
              </span>
            )}
          </div>

          {/* Quick actions */}
          {showActions && (
            <div className={`absolute top-0 ${
              isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"
            } flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-lg`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-red-500/20"
                onClick={() => onReact?.(message.id)}
              >
                <Heart className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onReply?.(message.id)}
              >
                <Reply className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
