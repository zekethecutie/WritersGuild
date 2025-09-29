
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Heart, 
  Users, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle,
  BookOpen,
  Music,
  Image,
  Flag,
  ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";

export default function Guidelines() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:ml-64">
        <div className="container max-w-4xl mx-auto p-6">
          <div className="flex items-center space-x-4 mb-6">
            <Button variant="ghost" onClick={() => setLocation('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-3xl font-bold">Community Guidelines</h1>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-primary/20">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Writers Guild Community Guidelines</CardTitle>
                <p className="text-muted-foreground">
                  Building a safe, creative, and inclusive space for all writers
                </p>
              </CardHeader>
            </Card>

            {/* Core Values */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Our Core Values
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-blue-500/10">
                    <BookOpen className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Creativity</h3>
                    <p className="text-sm text-muted-foreground">Encouraging original expression and artistic growth</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-500/10">
                    <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Community</h3>
                    <p className="text-sm text-muted-foreground">Supporting each other's writing journey</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-purple-500/10">
                    <Shield className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Respect</h3>
                    <p className="text-sm text-muted-foreground">Treating all members with dignity and kindness</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  Content Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-green-600 flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4" />
                    Encouraged Content
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Original poetry, stories, and creative writing</li>
                    <li>• Constructive feedback and writing tips</li>
                    <li>• Discussion of writing techniques and genres</li>
                    <li>• Collaborative writing projects</li>
                    <li>• Writing challenges and prompts</li>
                    <li>• Sharing writing resources and tools</li>
                    <li>• Celebrating fellow writers' achievements</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-red-600 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Prohibited Content
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Badge variant="destructive" className="mb-2">Spam & Abuse</Badge>
                      <ul className="space-y-1 text-sm">
                        <li>• Repetitive or irrelevant posts</li>
                        <li>• Self-promotion without community engagement</li>
                        <li>• Harassment or targeted attacks</li>
                        <li>• Impersonation of other users</li>
                      </ul>
                    </div>
                    <div>
                      <Badge variant="destructive" className="mb-2">Harmful Content</Badge>
                      <ul className="space-y-1 text-sm">
                        <li>• Hate speech or discrimination</li>
                        <li>• Explicit adult content (NSFW)</li>
                        <li>• Violence or threats</li>
                        <li>• Illegal activities or content</li>
                      </ul>
                    </div>
                    <div>
                      <Badge variant="destructive" className="mb-2">Intellectual Property</Badge>
                      <ul className="space-y-1 text-sm">
                        <li>• Plagiarized or copied content</li>
                        <li>• Copyright violations</li>
                        <li>• Unauthorized use of others' work</li>
                        <li>• False authorship claims</li>
                      </ul>
                    </div>
                    <div>
                      <Badge variant="destructive" className="mb-2">Misinformation</Badge>
                      <ul className="space-y-1 text-sm">
                        <li>• Deliberately false information</li>
                        <li>• Misleading writing advice</li>
                        <li>• Fake publishing opportunities</li>
                        <li>• Scams or fraudulent schemes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle>Feature-Specific Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Music className="w-4 h-4 text-green-500" />
                    Music Integration
                  </h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Only attach music relevant to your writing</li>
                    <li>• Respect copyright and use only licensed tracks</li>
                    <li>• Keep volume considerations in mind for readers</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Image className="w-4 h-4 text-blue-500" />
                    Images & Media
                  </h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Use your own images or properly licensed content</li>
                    <li>• Keep images appropriate and relevant</li>
                    <li>• Maximum 4 images per post</li>
                    <li>• Avoid overly large file sizes</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    Comments & Feedback
                  </h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Provide constructive, specific feedback</li>
                    <li>• Be encouraging while being honest</li>
                    <li>• Avoid generic comments like "good job"</li>
                    <li>• Ask questions to help writers improve</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Reporting */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="w-5 h-5 text-orange-500" />
                  Reporting & Enforcement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">How to Report</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    If you encounter content that violates these guidelines, please report it using the report button on posts or comments.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Badge variant="outline">Spam</Badge>
                    <Badge variant="outline">Harassment</Badge>
                    <Badge variant="outline">Hate Speech</Badge>
                    <Badge variant="outline">Inappropriate</Badge>
                    <Badge variant="outline">Copyright</Badge>
                    <Badge variant="outline">Misinformation</Badge>
                    <Badge variant="outline">Violence</Badge>
                    <Badge variant="outline">Other</Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Enforcement Actions</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span><strong>Warning:</strong> First-time minor violations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span><strong>Content Removal:</strong> Posts violating guidelines</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span><strong>Temporary Ban:</strong> Repeated violations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span><strong>Permanent Ban:</strong> Severe or continued violations</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <p className="text-center text-sm text-muted-foreground">
                  These guidelines help us maintain a positive environment where creativity can flourish. 
                  Thank you for being part of the Writers Guild community!
                </p>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Last updated: January 2025
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
