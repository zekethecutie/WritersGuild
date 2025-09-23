import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  isFollowing?: boolean;
  className?: string;
}

export default function FollowButton({ userId, isFollowing = false, className = "" }: FollowButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [following, setFollowing] = useState(isFollowing);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (following) {
        return apiRequest("DELETE", `/api/users/${userId}/follow`);
      } else {
        return apiRequest("POST", `/api/users/${userId}/follow`);
      }
    },
    onSuccess: () => {
      setFollowing(!following);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suggested/users"] });

      toast({
        title: following ? "Unfollowed" : "Following!",
        description: following ? "You unfollowed this writer" : "You're now following this writer",
      });
    },
    onError: () => {
      toast({
        title: "Action failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  if (!user || user.id === userId) {
    return null;
  }

  return (
    <Button
      onClick={() => followMutation.mutate()}
      disabled={followMutation.isPending}
      variant={following ? "outline" : "default"}
      size="sm"
      className={className}
    >
      {following ? (
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