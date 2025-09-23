import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

  const followMutation = useMutation({
    mutationFn: async () => {
      const endpoint = following ? `/api/follows/${userId}` : "/api/follows";
      const method = following ? "DELETE" : "POST";
      const body = following ? undefined : { followingId: userId };
      
      return apiRequest(method, endpoint, body);
    },
    onMutate: () => {
      // Optimistic update
      setFollowing(!following);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/users/recommended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/trending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/search"] });
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
      
      toast({
        title: following ? "Unfollowed" : "Following",
        description: following 
          ? "You have unfollowed this user" 
          : "You are now following this user",
      });
    },
    onError: () => {
      // Revert optimistic update
      setFollowing(following);
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