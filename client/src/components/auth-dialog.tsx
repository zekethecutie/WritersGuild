
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, BookOpen, PenTool, Users, Sparkles } from "lucide-react";

const CONTENT_GENRES = [
  'Poetry', 'Fiction', 'Non-Fiction', 'Fantasy', 'Romance', 'Mystery', 
  'Science Fiction', 'Horror', 'Young Adult', 'Literary Fiction', 
  'Memoir', 'Creative Writing', 'Short Stories', 'Flash Fiction',
  'Historical Fiction', 'Thriller', 'Adventure', 'Drama'
];

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  action?: string;
  restrictedFeature?: string;
}

export default function AuthDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  action = "continue",
  restrictedFeature 
}: AuthDialogProps) {
  const { login } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: basic info, 2: role selection, 3: preferences

  // Form states
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    username: ""
  });

  const [userRole, setUserRole] = useState<'writer' | 'reader'>('reader');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(loginForm.email, loginForm.password);
      if (result.success) {
        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in."
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: "Login failed",
          description: result.error || "Invalid credentials",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerForm.displayName || !registerForm.username || !registerForm.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (registerForm.password.length < 8) {
      toast({
        title: "Error", 
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    setStep(2);
  };

  const handleRegisterStep2 = () => {
    setStep(3);
  };

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleRegisterComplete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: registerForm.username,
          email: registerForm.email || undefined,
          password: registerForm.password,
          displayName: registerForm.displayName,
          userRole,
          preferredGenres: selectedGenres,
          isWriter: userRole === 'writer'
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Account created!",
          description: "Welcome to Writers Guild! Your account has been created successfully."
        });
        onOpenChange(false);
        onSuccess?.();
        window.location.reload(); // Refresh to update auth state
      } else {
        const errorData = await response.json();
        toast({
          title: "Registration failed",
          description: errorData.message || "Failed to create account",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setRegisterForm({
      email: "",
      password: "",
      confirmPassword: "",
      displayName: "",
      username: ""
    });
    setUserRole('reader');
    setSelectedGenres([]);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        resetForm();
        setActiveTab("login");
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {activeTab === "login" ? "Welcome Back" : 
             step === 1 ? "Join Writers Guild" :
             step === 2 ? "Tell us about yourself" :
             "Customize your experience"}
          </DialogTitle>
        </DialogHeader>

        {activeTab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email or Username</Label>
              <Input
                id="login-email"
                type="text"
                value={loginForm.email}
                onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email or username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center space-y-2">
              <Button
                type="button"
                variant="link"
                onClick={() => setActiveTab("register")}
                className="text-sm"
              >
                Don't have an account? Sign up
              </Button>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.href = '/explore';
                  }}
                  className="text-sm border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground"
                >
                  Continue as Guest
                </Button>
              </div>
            </div>
          </form>
        ) : step === 1 ? (
          <form onSubmit={handleRegisterStep1} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="register-displayName">Display Name *</Label>
                <Input
                  id="register-displayName"
                  value={registerForm.displayName}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Your display name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-username">Username *</Label>
                <Input
                  id="register-username"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  placeholder="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">Email (Optional)</Label>
              <Input
                id="register-email"
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your.email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">Password *</Label>
              <div className="relative">
                <Input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Create a password (min. 8 characters)"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-confirmPassword">Confirm Password *</Label>
              <Input
                id="register-confirmPassword"
                type="password"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm your password"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Continue
            </Button>

            <div className="text-center space-y-2">
              <Button
                type="button"
                variant="link"
                onClick={() => setActiveTab("login")}
                className="text-sm"
              >
                Already have an account? Sign in
              </Button>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.href = '/explore';
                  }}
                  className="text-sm border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground"
                >
                  Continue as Guest
                </Button>
              </div>
            </div>
          </form>
        ) : step === 2 ? (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-6">
                Help us personalize your experience by telling us how you plan to use Writers Guild.
              </p>
            </div>

            <RadioGroup
              value={userRole}
              onValueChange={(value: 'writer' | 'reader') => setUserRole(value)}
              className="space-y-4"
            >
              <Card className={`cursor-pointer transition-colors ${userRole === 'writer' ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="writer" id="writer" />
                    <div className="flex items-center space-x-2">
                      <PenTool className="w-5 h-5 text-primary" />
                      <Label htmlFor="writer" className="text-base font-semibold cursor-pointer">
                        I'm a Writer
                      </Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    Share your stories, poems, and creative works. Connect with readers and fellow writers.
                  </p>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-colors ${userRole === 'reader' ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="reader" id="reader" />
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      <Label htmlFor="reader" className="text-base font-semibold cursor-pointer">
                        I'm a Reader
                      </Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    Discover amazing stories and connect with your favorite authors. Support the writing community.
                  </p>
                </CardContent>
              </Card>
            </RadioGroup>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleRegisterStep2}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold mb-2">What genres interest you?</h3>
              <p className="text-muted-foreground text-sm">
                Select the types of content you'd like to see. You can change this later in your settings.
              </p>
            </div>

            <div className="space-y-4 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {CONTENT_GENRES.map((genre) => (
                  <Button
                    key={genre}
                    type="button"
                    variant={selectedGenres.includes(genre) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleGenreToggle(genre)}
                    className="justify-start text-left h-auto py-2"
                  >
                    {genre}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleRegisterComplete}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Creating account..." : `Complete Setup (${selectedGenres.length} genres)`}
              </Button>
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={handleRegisterComplete}
                disabled={isLoading}
                className="text-sm"
              >
                Skip for now
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
