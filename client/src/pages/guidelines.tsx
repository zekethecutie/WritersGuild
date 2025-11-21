
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
  ArrowLeft,
  Ban,
  UserX,
  Lock,
  Eye,
  FileText,
  Zap,
  Star,
  TrendingUp,
  Award,
  Target,
  Lightbulb,
  Globe
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
                  <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <BookOpen className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Creativity</h3>
                    <p className="text-sm text-muted-foreground">Encouraging original expression and artistic growth</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Community</h3>
                    <p className="text-sm text-muted-foreground">Supporting each other's writing journey</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
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
                  <FileText className="w-5 h-5 text-blue-500" />
                  Content Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4" />
                    Encouraged Content
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>Original poetry, stories, and creative writing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>Constructive feedback and writing tips</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Discussion of writing techniques and genres</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Collaborative writing projects</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Writing challenges and prompts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Sharing writing resources and tools</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Award className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>Celebrating fellow writers' achievements</span>
                    </li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Prohibited Content
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <Badge variant="destructive" className="mb-2">Spam & Abuse</Badge>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-start gap-2">
                          <Zap className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Repetitive or irrelevant posts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <TrendingUp className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Self-promotion without community engagement</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <UserX className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Harassment or targeted attacks</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Ban className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Impersonation of other users</span>
                        </li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <Badge variant="destructive" className="mb-2">Harmful Content</Badge>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Hate speech or discrimination</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Eye className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Explicit adult content (NSFW)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Ban className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Violence or threats</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Lock className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Illegal activities or content</span>
                        </li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <Badge variant="destructive" className="mb-2">Intellectual Property</Badge>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-start gap-2">
                          <FileText className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Plagiarized or copied content</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Shield className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Copyright violations</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Ban className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Unauthorized use of others' work</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <UserX className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>False authorship claims</span>
                        </li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <Badge variant="destructive" className="mb-2">Misinformation</Badge>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Deliberately false information</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Lightbulb className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Misleading writing advice</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FileText className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Fake publishing opportunities</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Ban className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                          <span>Scams or fraudulent schemes</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Feature-Specific Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Music className="w-4 h-4 text-green-500" />
                    Music Integration
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Only attach music relevant to your writing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Respect copyright and use only licensed tracks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Keep volume considerations in mind for readers</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Image className="w-4 h-4 text-blue-500" />
                    Images & Media
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Use your own images or properly licensed content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Eye className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Keep images appropriate and relevant</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Maximum 4 images per post</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Avoid overly large file sizes (max 10MB per image)</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    Comments & Feedback
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Provide constructive, specific feedback</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Heart className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Be encouraging while being honest</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Avoid generic comments like "good job"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>Ask questions to help writers improve</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-orange-500" />
                    Collaboration Features
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Only invite collaborators who have agreed to work with you</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Respect all collaborators' contributions equally</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>Clearly communicate roles and expectations</span>
                    </li>
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
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    How to Report
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    If you encounter content that violates these guidelines, please report it using the report button on posts or comments.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Badge variant="outline" className="justify-center">Spam</Badge>
                    <Badge variant="outline" className="justify-center">Harassment</Badge>
                    <Badge variant="outline" className="justify-center">Hate Speech</Badge>
                    <Badge variant="outline" className="justify-center">Inappropriate</Badge>
                    <Badge variant="outline" className="justify-center">Copyright</Badge>
                    <Badge variant="outline" className="justify-center">Misinformation</Badge>
                    <Badge variant="outline" className="justify-center">Violence</Badge>
                    <Badge variant="outline" className="justify-center">Other</Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-500" />
                    Enforcement Actions
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-sm">Warning</span>
                        <p className="text-xs text-muted-foreground">First-time minor violations</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-sm">Content Removal</span>
                        <p className="text-xs text-muted-foreground">Posts violating guidelines</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="w-3 h-3 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-sm">Temporary Ban</span>
                        <p className="text-xs text-muted-foreground">Repeated violations (3-30 days)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                      <div className="w-3 h-3 bg-gray-500 rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-sm">Permanent Ban</span>
                        <p className="text-xs text-muted-foreground">Severe or continued violations</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <Card className="bg-muted/30 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    <Shield className="w-5 h-5 text-primary" />
                    <BookOpen className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    These guidelines help us maintain a positive environment where creativity can flourish. 
                    Thank you for being part of the Writers Guild community!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: January 2025
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
