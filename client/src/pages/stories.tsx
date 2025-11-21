// Fetch user's stories
  const { data: myStories, isLoading: myStoriesLoading } = useQuery({
    queryKey: ["/api/series", "my-series", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch(`/api/series/my-series`, {
        credentials: 'include'
      });
      if (!response.ok) {
        console.error('Failed to fetch my stories:', response.status);
        return [];
      }
      const data = await response.json();
      console.log('My stories loaded:', data);
      return data;
    },
    enabled: !!user,
  });