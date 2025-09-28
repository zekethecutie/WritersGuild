import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";

interface MessageButtonProps {
  userId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
}

export default function MessageButton({ 
  userId, 
  variant = "outline",
  size = "sm" 
}: MessageButtonProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ participantId: userId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create conversation');
      }

      return response.json();
    },
    onSuccess: (conversation) => {
      // Navigate to messages page with the conversation
      setLocation(`/messages?conversation=${conversation.id}`);
      
      // Show success message
      toast({
        title: "Conversation created",
        description: "You can now start messaging!",
      });
    },
    onError: (error: Error) => {
      console.error("Message error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => createConversationMutation.mutate()}
      disabled={createConversationMutation.isPending}
      className="bg-background/80 backdrop-blur-sm"
      data-testid="button-message"
    >
      {createConversationMutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4" />
      )}
    </Button>
  );
}