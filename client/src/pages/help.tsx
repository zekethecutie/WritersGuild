import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, Send } from "lucide-react";

export default function HelpPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    category: "general",
    subject: "",
    message: "",
    contactEmail: user?.email || "",
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/feedback", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Thank you! Your feedback has been sent to our admin team.",
      });
      setFormData({
        category: "general",
        subject: "",
        message: "",
        contactEmail: user?.email || "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim()) {
      toast({
        title: "Required",
        description: "Please enter a subject",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.message.trim()) {
      toast({
        title: "Required",
        description: "Please enter your feedback message",
        variant: "destructive",
      });
      return;
    }

    submitFeedbackMutation.mutate(formData);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileNav />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold">Help & Feedback</h1>
              </div>
              <p className="text-muted-foreground">
                Have an idea, found a bug, or want to report something? We'd love to hear from you! 
                Your feedback helps us make Writers Guild better.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Send Us Your Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="general">General Feedback</SelectItem>
                        <SelectItem value="ui">UI/UX Suggestion</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Subject</label>
                    <Input
                      placeholder="Brief subject of your feedback"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      data-testid="input-feedback-subject"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Your Message</label>
                    <Textarea
                      placeholder="Tell us more details about your feedback..."
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      rows={6}
                      data-testid="textarea-feedback-message"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, contactEmail: e.target.value })
                      }
                      data-testid="input-feedback-email"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      So we can follow up with you if needed
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitFeedbackMutation.isPending}
                    data-testid="button-submit-feedback"
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {submitFeedbackMutation.isPending ? "Sending..." : "Send Feedback"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Community Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Learn about our community standards and how we keep Writers Guild a positive space.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/guidelines">View Guidelines</a>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">FAQ</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Check out frequently asked questions to quickly find answers.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
