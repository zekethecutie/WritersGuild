import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  Palette,
  Globe,
  Lock,
  Users,
  Eye,
  EyeOff
} from "lucide-react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    location: "",
    website: "",
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: "public",
    showEmail: false,
    showFollowers: true,
    showFollowing: true,
    allowMessages: true,
    allowCollaborations: true,
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    commentNotifications: true,
    followNotifications: true,
    collaborationNotifications: true,
    weeklyDigest: true,
  });

  const [theme, setTheme] = useState({
    colorScheme: "dark",
    fontSize: "medium",
    compactMode: false,
  });

  const handleProfileUpdate = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        toast({
          title: "Profile updated",
          description: "Your profile has been saved successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrivacyUpdate = async () => {
    try {
      const response = await fetch('/api/user/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(privacy),
      });

      if (response.ok) {
        toast({
          title: "Privacy settings updated",
          description: "Your privacy preferences have been saved.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update privacy settings.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please sign in to access settings</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64">
        <div className="container max-w-4xl mx-auto p-6">
          <div className="flex items-center space-x-2 mb-6">
            <SettingsIcon className="w-6 h-6" />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Privacy
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Appearance
              </TabsTrigger>
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={profile.displayName}
                        onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                        placeholder="Your display name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={user.username}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        placeholder="Your location"
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>

                  <Button onClick={handleProfileUpdate}>
                    Save Profile Changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Settings */}
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Profile Visibility</Label>
                    <Select value={privacy.profileVisibility} onValueChange={(value) => setPrivacy({ ...privacy, profileVisibility: value })}>
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Public - Anyone can view your profile
                          </div>
                        </SelectItem>
                        <SelectItem value="followers">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Followers Only - Only your followers can view
                          </div>
                        </SelectItem>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            Private - Only you can view your profile
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Profile Information</h3>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Email Address</Label>
                        <p className="text-sm text-muted-foreground">Allow others to see your email</p>
                      </div>
                      <Switch
                        checked={privacy.showEmail}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, showEmail: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Followers</Label>
                        <p className="text-sm text-muted-foreground">Display your followers list</p>
                      </div>
                      <Switch
                        checked={privacy.showFollowers}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, showFollowers: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Following</Label>
                        <p className="text-sm text-muted-foreground">Display who you follow</p>
                      </div>
                      <Switch
                        checked={privacy.showFollowing}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, showFollowing: checked })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Communication</h3>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Allow Direct Messages</Label>
                        <p className="text-sm text-muted-foreground">Let others send you messages</p>
                      </div>
                      <Switch
                        checked={privacy.allowMessages}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, allowMessages: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Allow Collaboration Invites</Label>
                        <p className="text-sm text-muted-foreground">Let others invite you to collaborate</p>
                      </div>
                      <Switch
                        checked={privacy.allowCollaborations}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, allowCollaborations: checked })}
                      />
                    </div>
                  </div>

                  <Button onClick={handlePrivacyUpdate}>
                    Save Privacy Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">General Notifications</h3>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Switch
                        checked={notifications.emailNotifications}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                      </div>
                      <Switch
                        checked={notifications.pushNotifications}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, pushNotifications: checked })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Activity Notifications</h3>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Comments on Your Posts</Label>
                        <p className="text-sm text-muted-foreground">When someone comments on your writing</p>
                      </div>
                      <Switch
                        checked={notifications.commentNotifications}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, commentNotifications: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>New Followers</Label>
                        <p className="text-sm text-muted-foreground">When someone follows you</p>
                      </div>
                      <Switch
                        checked={notifications.followNotifications}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, followNotifications: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Collaboration Invites</Label>
                        <p className="text-sm text-muted-foreground">When invited to collaborate on projects</p>
                      </div>
                      <Switch
                        checked={notifications.collaborationNotifications}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, collaborationNotifications: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Weekly Digest</Label>
                        <p className="text-sm text-muted-foreground">Weekly summary of platform activity</p>
                      </div>
                      <Switch
                        checked={notifications.weeklyDigest}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyDigest: checked })}
                      />
                    </div>
                  </div>

                  <Button>
                    Save Notification Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance & Display</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Color Scheme</Label>
                    <Select value={theme.colorScheme} onValueChange={(value) => setTheme({ ...theme, colorScheme: value })}>
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light Mode</SelectItem>
                        <SelectItem value="dark">Dark Mode</SelectItem>
                        <SelectItem value="auto">Auto (System)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Font Size</Label>
                    <Select value={theme.fontSize} onValueChange={(value) => setTheme({ ...theme, fontSize: value })}>
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Compact Mode</Label>
                      <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
                    </div>
                    <Switch
                      checked={theme.compactMode}
                      onCheckedChange={(checked) => setTheme({ ...theme, compactMode: checked })}
                    />
                  </div>

                  <Button>
                    Save Appearance Settings
                  </Button>
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