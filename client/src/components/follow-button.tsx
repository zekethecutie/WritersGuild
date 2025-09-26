import { useState, useEffect } from "react";
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
  const [following, setFollowing] = useState(isFollowing);

  // Check current follow status on mount
  const { data: followStatus } = useQuery({
    queryKey: ["follow-status", userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/users/${userId}/follow-status`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          return data.isFollowing || false;
        }
      } catch (error) {
        console.error("Error checking follow status:", error);
      }
      return false;
    },
    enabled: !!userId,
  });

  // Update local state when follow status is fetched
  useEffect(() => {
    if (followStatus !== undefined) {
      setFollowing(followStatus);
    }
  }, [followStatus]);

  const followMutation = useMutation({
    mutationFn: async () => {
      const endpoint = following ? `/api/users/${userId}/unfollow` : `/api/users/${userId}/follow`;
      const method = "POST";
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to ${following ? 'unfollow' : 'follow'} user`);
      }

      return response.json();
    },
    onMutate: () => {
      // Optimistic update
      setFollowing(!following);
    },
    onSuccess: (data) => {
      // Update state based on server response
      setFollowing(data.following);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["follow-status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/trending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/search"] });
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "stats"] });
      
      toast({
        title: data.following ? "Following" : "Unfollowed",
        description: data.following 
          ? "You are now following this user" 
          : "You have unfollowed this user",
      });
    },
    onError: (error) => {
      // Revert optimistic update
      setFollowing(following);
      console.error("Follow error:", error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      variant={variant || (following ? "outline" : "default")}
      size={size}
      onClick={() => followMutation.mutate()}
      disabled={followMutation.isPending}
      className="ml-2"
    >
      {followMutation.isPending ? (
        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
      ) : following ? (
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