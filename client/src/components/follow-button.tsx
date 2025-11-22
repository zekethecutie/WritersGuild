import React from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  isFollowing?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
}

export default function FollowButton({
  userId,
  isFollowing = false,
  variant,
  size = "sm"
}: FollowButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State to manage optimistic updates
  const [optimisticFollowing, setOptimisticFollowing] = React.useState(isFollowing);

  // Check current follow status on mount
  const { data: following, isLoading } = useQuery({
    queryKey: ["follow-status", userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/users/${userId}/follow-status`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setOptimisticFollowing(data.isFollowing || false);
          return data.isFollowing || false;
        }
      } catch (error) {
        console.error("Error checking follow status:", error);
      }
      return false;
    },
    enabled: !!userId,
    initialData: isFollowing,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const isCurrentlyFollowing = following || false;
      const response = isCurrentlyFollowing
        ? await fetch(`/api/follows/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        : await fetch('/api/follows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ followingId: userId }),
          });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: 'Failed to update follow status' };
        }
        throw new Error(errorData.message || 'Failed to update follow status');
      }

      return response.json();
    },
    onMutate: () => {
      // Optimistic update based on current server state
      const newFollowingState = !(following || false);
      setOptimisticFollowing(newFollowingState);
      return { previousFollowing: following || false };
    },
    onSuccess: (data, variables, context) => {
      // Update based on the action that was performed
      const wasFollowing = context?.previousFollowing || false;
      const newState = !wasFollowing;
      setOptimisticFollowing(newState);

      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["follow-status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/trending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/search"] });
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });

      toast({
        title: newState ? "Following!" : "Unfollowed",
        description: newState ? "You are now following this user" : "You are no longer following this user",
      });
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic update to the previous server state
      setOptimisticFollowing(context?.previousFollowing || following || false);

      console.error('Follow error:', error);

      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        toast({
          title: "Sign in required",
          description: "Please sign in to follow users",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update follow status. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  return (
    <Button
      variant={variant || (optimisticFollowing ? "outline" : "default")}
      size={size}
      onClick={() => followMutation.mutate()}
      disabled={followMutation.isPending || isLoading}
      className="ml-2"
    >
      {followMutation.isPending || isLoading ? (
        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
      ) : optimisticFollowing ? (
        <>
          <UserCheck className="w-4 h-4 mr-1" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-1" />
          Follow
        </>
      )}
    </Button>
  );
}