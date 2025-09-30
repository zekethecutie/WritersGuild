
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface MessageButtonProps {
  userId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export default function MessageButton({
  userId,
  variant = "outline",
  size = "sm",
  className = ""
}: MessageButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ participantId: userId }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to create conversation');
      }

      return response.json();
    },
    onSuccess: (conversation) => {
      // Navigate to messages page with the conversation
      window.location.href = `/messages?conversation=${conversation.id}`;
    },
    onError: (error: Error) => {
      console.error('Failed to create conversation:', error);
      
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        toast({
          title: "Sign in required",
          description: "Please sign in to send messages",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to start conversation. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleMessageClick = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to send messages",
        variant: "destructive",
      });
      return;
    }

    if (user.id === userId) {
      toast({
        title: "Invalid action",
        description: "You cannot message yourself",
        variant: "destructive",
      });
      return;
    }

    createConversationMutation.mutate();
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleMessageClick}
      disabled={createConversationMutation.isPending}
      className={className}
    >
      {createConversationMutation.isPending ? (
        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4 mr-1" />
      )}
      Message
    </Button>
  );
}
