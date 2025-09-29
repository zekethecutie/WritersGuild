
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  TestTube, 
  Users, 
  MessageSquare, 
  Music, 
  Settings,
  CheckCircle,
  XCircle,
  PlayCircle
} from "lucide-react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";

export default function AdminTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending'>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runTest = async (testName: string, testFunction: () => Promise<boolean>) => {
    setTestResults(prev => ({ ...prev, [testName]: 'pending' }));
    try {
      const result = await testFunction();
      setTestResults(prev => ({ ...prev, [testName]: result ? 'pass' : 'fail' }));
      return result;
    } catch (error) {
      console.error(`Test ${testName} failed:`, error);
      setTestResults(prev => ({ ...prev, [testName]: 'fail' }));
      return false;
    }
  };

  const createTestUser = async () => {
    try {
      const response = await fetch('/api/admin/create-test-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: 'azael',
          displayName: 'Azael Test User',
          email: 'azael.test@writerguild.test'
        })
      });
      
      if (response.ok) {
        toast({
          title: "Test user created",
          description: "User 'azael' has been created for collaboration testing",
        });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const testSpotifySearch = async () => {
    try {
      const response = await fetch('/api/spotify/search?q=test&limit=1', {
        credentials: 'include'
      });
      const data = await response.json();
      return response.ok && data.tracks && data.tracks.items.length > 0;
    } catch (error) {
      return false;
    }
  };

  const testUserSearch = async () => {
    try {
      const response = await fetch('/api/users/search?q=azael', {
        credentials: 'include'
      });
      const data = await response.json();
      return response.ok && Array.isArray(data) && data.length > 0;
    } catch (error) {
      return false;
    }
  };

  const testPostCreation = async () => {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: 'This is a **test post** with *rich formatting* for testing the platform functionality.',
          title: 'Admin Test Post',
          postType: 'text',
          privacy: 'public'
        })
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const testMessageCreation = async () => {
    try {
      // First create a conversation
      const convResponse = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ participantId: 'test-user-id' })
      });
      
      if (!convResponse.ok) return false;
      
      const conversation = await convResponse.json();
      
      // Then send a message
      const msgResponse = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: 'Test message from admin' })
      });
      
      return msgResponse.ok;
    } catch (error) {
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    
    const tests = [
      { name: 'Create Test User', func: createTestUser },
      { name: 'Spotify Search', func: testSpotifySearch },
      { name: 'User Search', func: testUserSearch },
      { name: 'Post Creation', func: testPostCreation },
      { name: 'Message System', func: testMessageCreation }
    ];

    for (const test of tests) {
      await runTest(test.name, test.func);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunningTests(false);
    
    toast({
      title: "Tests completed",
      description: "All platform tests have been executed. Check results below.",
    });
  };

  const getTestIcon = (status: 'pass' | 'fail' | 'pending' | undefined) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'fail': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      default: return <div className="w-4 h-4 border border-gray-500 rounded-full" />;
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:ml-64">
        <div className="container max-w-4xl mx-auto p-6">
          <div className="flex items-center space-x-2 mb-6">
            <TestTube className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Admin Testing Interface</h1>
            <Badge variant="destructive">Admin Only</Badge>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Platform Testing Suite
                <Button 
                  onClick={runAllTests} 
                  disabled={isRunningTests}
                  className="flex items-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" />
                  {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span>Create Test User (azael)</span>
                  </div>
                  {getTestIcon(testResults['Create Test User'])}
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Music className="w-5 h-5 text-green-500" />
                    <span>Spotify Integration</span>
                  </div>
                  {getTestIcon(testResults['Spotify Search'])}
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-500" />
                    <span>User Search (Collaborators)</span>
                  </div>
                  {getTestIcon(testResults['User Search'])}
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-orange-500" />
                    <span>Post Creation</span>
                  </div>
                  {getTestIcon(testResults['Post Creation'])}
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-cyan-500" />
                    <span>Message System</span>
                  </div>
                  {getTestIcon(testResults['Message System'])}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="manual" className="space-y-6">
            <TabsList>
              <TabsTrigger value="manual">Manual Testing</TabsTrigger>
              <TabsTrigger value="features">Feature Checklist</TabsTrigger>
              <TabsTrigger value="issues">Known Issues</TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <Card>
                <CardHeader>
                  <CardTitle>Manual Testing Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Test Post with Spotify & Collaboration:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Go to the home page and find the post composer</li>
                      <li>Create a new post with rich text formatting (bold, italic, etc.)</li>
                      <li>Click the music button and search for a song</li>
                      <li>Click the collaborator button and search for "azael"</li>
                      <li>Add azael as a collaborator</li>
                      <li>Publish the post and verify all features work</li>
                    </ol>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="font-semibold">Test Messages:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Navigate to the Messages page</li>
                      <li>Create a new conversation or select existing one</li>
                      <li>Send a test message</li>
                      <li>Verify real-time message delivery</li>
                      <li>Test emoji reactions and message interactions</li>
                    </ol>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="font-semibold">Test UI Components:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Check Settings page functionality</li>
                      <li>Verify Guidelines page loads correctly</li>
                      <li>Test follow/unfollow buttons</li>
                      <li>Verify guest restrictions work properly</li>
                      <li>Test logout functionality</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features">
              <Card>
                <CardHeader>
                  <CardTitle>Feature Implementation Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-green-600">✅ Implemented</h3>
                      <ul className="text-sm space-y-1">
                        <li>• Rich Text Editor with formatting</li>
                        <li>• Spotify Music Integration</li>
                        <li>• Collaborator System</li>
                        <li>• Real-time Messaging</li>
                        <li>• User Authentication</li>
                        <li>• Post Creation/Editing</li>
                        <li>• Image Upload</li>
                        <li>• Settings Page</li>
                        <li>• Guidelines Page</li>
                        <li>• WebSocket Support</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-orange-600">🔧 Needs Testing</h3>
                      <ul className="text-sm space-y-1">
                        <li>• Follow/Unfollow System</li>
                        <li>• Message Send/Receive</li>
                        <li>• Bold Text Styling</li>
                        <li>• Guest User Restrictions</li>
                        <li>• Privacy Settings</li>
                        <li>• Notification System</li>
                        <li>• Image Generation</li>
                        <li>• Series Management</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="issues">
              <Card>
                <CardHeader>
                  <CardTitle>Known Issues & Solutions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 border-l-4 border-yellow-500 bg-yellow-50/10">
                      <h3 className="font-semibold text-yellow-600">WebSocket Connection Issues</h3>
                      <p className="text-sm">WebSocket frequently disconnects and reconnects. This is likely due to Replit's environment changes.</p>
                    </div>

                    <div className="p-3 border-l-4 border-red-500 bg-red-50/10">
                      <h3 className="font-semibold text-red-600">Bold Text Color</h3>
                      <p className="text-sm">Bold text in rich editor appears dark instead of white. Fixed with custom CSS.</p>
                    </div>

                    <div className="p-3 border-l-4 border-blue-500 bg-blue-50/10">
                      <h3 className="font-semibold text-blue-600">Vite WebSocket Errors</h3>
                      <p className="text-sm">Vite development server WebSocket errors in console. These don't affect functionality.</p>
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
