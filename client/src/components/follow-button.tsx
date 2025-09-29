// No React hooks needed for this component
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
      const response = optimisticFollowing
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
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to update follow status');
      }

      return response.json();
    },
    onMutate: () => {
      // Optimistic update
      setOptimisticFollowing(!optimisticFollowing);
    },
    onSuccess: (data) => {
      // Update the actual following state based on server response
      if (data && typeof data.following === 'boolean') {
        setOptimisticFollowing(data.following);
      }

      queryClient.invalidateQueries({ queryKey: ["follow-status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/trending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/search"] });
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });

      toast({
        title: data?.following ? "Following!" : "Unfollowed",
        description: data?.following ? "You are now following this user" : "You are no longer following this user",
      });
    },
    onError: (error: Error) => {
      // Revert optimistic update
      setOptimisticFollowing(isFollowing);

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