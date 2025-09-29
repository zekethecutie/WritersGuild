
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Settings, 
  User, 
  Lock, 
  Bell, 
  Eye, 
  Shield, 
  Download, 
  Trash2, 
  Camera,
  Globe,
  Mail,
  MapPin,
  Link as LinkIcon,
  Palette,
  Moon,
  Sun,
  Monitor,
  Smartphone,
  Save,
  X,
  PenTool,
  BookOpen,
  Upload
} from "lucide-react";

const WRITING_GENRES = [
  'Poetry', 'Fiction', 'Non-Fiction', 'Fantasy', 'Romance', 'Mystery', 
  'Science Fiction', 'Horror', 'Young Adult', 'Literary Fiction', 
  'Memoir', 'Creative Writing', 'Short Stories', 'Flash Fiction',
  'Historical Fiction', 'Thriller', 'Adventure', 'Drama'
];

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    genres: user?.genres || [],
    userRole: (user as any)?.userRole || 'reader',
    preferredGenres: (user as any)?.preferredGenres || []
  });

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showLocation: true,
    allowMessages: true,
    allowFollows: true,
    showActivity: true
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    likeNotifications: true,
    commentNotifications: true,
    followNotifications: true,
    messageNotifications: true,
    weeklyDigest: true,
    marketingEmails: false
  });

  // Account settings state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Sign in to access settings</h2>
            <p className="text-muted-foreground">You need to be logged in to view your settings.</p>
          </div>
        </div>
      </div>
    );
  }

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to change password');
      }

      return response.json();
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Password change failed",
        description: "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      window.location.href = '/';
    },
    onError: () => {
      toast({
        title: "Deletion failed",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const profilePictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch('/api/upload/profile-picture', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
    },
  });

  const coverPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('coverPhoto', file);

      const response = await fetch('/api/upload/user-cover', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload cover photo');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Cover photo updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload cover photo",
        variant: "destructive",
      });
    },
  });

  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "Error",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      setIsUploadingProfile(true);
      profilePictureMutation.mutate(file);
    }
  };

  const handleCoverPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "Error",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      setIsUploadingCover(true);
      coverPhotoMutation.mutate(file);
    }
    // Reset input value
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(passwordForm);
  };

  const handleGenreToggle = (genre: string) => {
    setProfileForm(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g: string) => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const handlePreferredGenreToggle = (genre: string) => {
    setProfileForm(prev => ({
      ...prev,
      preferredGenres: prev.preferredGenres.includes(genre)
        ? prev.preferredGenres.filter((g: string) => g !== genre)
        : [...prev.preferredGenres, genre]
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 min-h-screen">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings className="w-8 h-8" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-8">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Privacy
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Data
              </TabsTrigger>
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Update your public profile information
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    {/* Profile Picture */}
                    <div className="flex items-center space-x-6">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={user?.profileImageUrl} />
                        <AvatarFallback>
                          <User className="w-8 h-8" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <label htmlFor="profile-picture-upload">
                            <Button variant="outline" className="flex items-center gap-2" asChild>
                              <span>
                                <Camera className="w-4 h-4" />
                                Change Photo
                              </span>
                            </Button>
                          </label>
                          <input
                            id="profile-picture-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureUpload}
                            className="hidden"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG or GIF. Max size 10MB.
                        </p>
                      </div>
                    </div>

                    {/* Cover Photo */}
                    <div>
                      <Label className="text-sm font-medium">Cover Photo</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <label htmlFor="cover-photo-upload">
                          <Button variant="outline" className="flex items-center gap-2" asChild>
                            <span>
                              <Upload className="w-4 h-4" />
                              Upload Cover Photo
                            </span>
                          </Button>
                        </label>
                        <input
                          id="cover-photo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleCoverPhotoUpload}
                          className="hidden"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended size: 1920x1080px. Max size 10MB.
                      </p>
                    </div>

                    <Separator />

                    {/* User Role */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">I am primarily a...</Label>
                      <RadioGroup
                        value={profileForm.userRole}
                        onValueChange={(value) => setProfileForm(prev => ({ ...prev, userRole: value }))}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="writer" id="role-writer" />
                          <Label htmlFor="role-writer" className="flex items-center gap-2 cursor-pointer">
                            <PenTool className="w-4 h-4" />
                            Writer
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="reader" id="role-reader" />
                          <Label htmlFor="role-reader" className="flex items-center gap-2 cursor-pointer">
                            <BookOpen className="w-4 h-4" />
                            Reader
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          value={profileForm.displayName}
                          onChange={(e) => setProfileForm(prev => ({...prev, displayName: e.target.value}))}
                          placeholder="Your display name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={user?.username}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Username cannot be changed
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm(prev => ({...prev, bio: e.target.value}))}
                        placeholder="Tell the community about yourself..."
                        className="h-24"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {profileForm.bio.length}/500 characters
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location" className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Location
                        </Label>
                        <Input
                          id="location"
                          value={profileForm.location}
                          onChange={(e) => setProfileForm(prev => ({...prev, location: e.target.value}))}
                          placeholder="City, Country"
                        />
                      </div>

                      <div>
                        <Label htmlFor="website" className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" />
                          Website
                        </Label>
                        <Input
                          id="website"
                          value={profileForm.website}
                          onChange={(e) => setProfileForm(prev => ({...prev, website: e.target.value}))}
                          placeholder="https://your-website.com"
                        />
                      </div>
                    </div>

                    {/* Writing Genres - only for writers */}
                    {profileForm.userRole === 'writer' && (
                      <div>
                        <Label>Writing Genres</Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          Select the genres you write in
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {WRITING_GENRES.map((genre) => (
                            <Button
                              key={genre}
                              type="button"
                              variant={profileForm.genres.includes(genre) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleGenreToggle(genre)}
                            >
                              {genre}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Preferences */}
                    <div>
                      <Label>Content Preferences</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Select the types of content you'd like to see in your feed
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {WRITING_GENRES.map((genre) => (
                          <Button
                            key={genre}
                            type="button"
                            variant={profileForm.preferredGenres.includes(genre) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePreferredGenreToggle(genre)}
                          >
                            {genre}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Settings */}
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Control who can see your content and interact with you
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Profile Visibility</Label>
                      <p className="text-sm text-muted-foreground">
                        Who can see your profile
                      </p>
                    </div>
                    <Select value={privacySettings.profileVisibility} onValueChange={(value) => setPrivacySettings(prev => ({...prev, profileVisibility: value}))}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Everyone</SelectItem>
                        <SelectItem value="followers">Followers Only</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {[
                    { key: 'showEmail', label: 'Show Email Address', desc: 'Display your email on your profile' },
                    { key: 'showLocation', label: 'Show Location', desc: 'Display your location on your profile' },
                    { key: 'allowMessages', label: 'Allow Direct Messages', desc: 'Let others send you private messages' },
                    { key: 'allowFollows', label: 'Allow New Followers', desc: 'Let others follow your account' },
                    { key: 'showActivity', label: 'Show Activity Status', desc: 'Show when you were last active' },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div>
                        <Label>{setting.label}</Label>
                        <p className="text-sm text-muted-foreground">
                          {setting.desc}
                        </p>
                      </div>
                      <Switch
                        checked={privacySettings[setting.key as keyof typeof privacySettings] as boolean}
                        onCheckedChange={(checked) => setPrivacySettings(prev => ({...prev, [setting.key]: checked}))}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose what notifications you want to receive
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                    { key: 'pushNotifications', label: 'Push Notifications', desc: 'Receive browser push notifications' },
                    { key: 'likeNotifications', label: 'Like Notifications', desc: 'When someone likes your posts' },
                    { key: 'commentNotifications', label: 'Comment Notifications', desc: 'When someone comments on your posts' },
                    { key: 'followNotifications', label: 'Follow Notifications', desc: 'When someone follows you' },
                    { key: 'messageNotifications', label: 'Message Notifications', desc: 'When you receive new messages' },
                    { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Weekly summary of your activity' },
                    { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Updates about new features and tips' },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div>
                        <Label>{setting.label}</Label>
                        <p className="text-sm text-muted-foreground">
                          {setting.desc}
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings[setting.key as keyof typeof notificationSettings]}
                        onCheckedChange={(checked) => setNotificationSettings(prev => ({...prev, [setting.key]: checked}))}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Settings */}
            <TabsContent value="account">
              <div className="space-y-6">
                {/* Change Password */}
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Update your password to keep your account secure
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({...prev, currentPassword: e.target.value}))}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({...prev, confirmPassword: e.target.value}))}
                          required
                        />
                      </div>

                      <Button type="submit" disabled={changePasswordMutation.isPending}>
                        {changePasswordMutation.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                            Changing...
                          </>
                        ) : (
                          'Change Password'
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Account Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Account Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Account Type</span>
                      <div className="flex gap-2">
                        {user?.isSuperAdmin && <Badge variant="destructive">Super Admin</Badge>}
                        {user?.isAdmin && !user?.isSuperAdmin && <Badge variant="secondary">Admin</Badge>}
                        {user?.isVerified && <Badge variant="default">Verified</Badge>}
                        <Badge variant="outline">{profileForm.userRole === 'writer' ? 'Writer' : 'Reader'}</Badge>
                        {!user?.isVerified && !user?.isAdmin && <Badge variant="outline">Standard</Badge>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Member Since</span>
                      <span className="text-muted-foreground">
                        {new Date(user?.createdAt || '').toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Posts Written</span>
                      <span className="text-muted-foreground">{user?.postsCount || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Irreversible actions for your account
                    </p>
                  </CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="flex items-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            account and remove all your data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteAccountMutation.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Data Export */}
            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle>Data & Privacy</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Download your data or learn about our privacy practices
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Export Your Data</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Download a copy of all your data including posts, comments, and profile information.
                      </p>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Request Data Export
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-2">Privacy Policy</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Learn about how we collect, use, and protect your personal information.
                      </p>
                      <Button variant="outline">
                        View Privacy Policy
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-2">Terms of Service</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Review our terms of service and community guidelines.
                      </p>
                      <Button variant="outline">
                        View Terms of Service
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
