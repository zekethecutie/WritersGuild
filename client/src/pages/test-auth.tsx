
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestAuth() {
  const { user, login, register, logout } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    displayName: ""
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isRegistering) {
        await register(formData.username, formData.email, formData.password, formData.displayName);
      } else {
        await login(formData.username, formData.password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Test - Logged In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Welcome, {user.displayName || user.username}!</p>
              <p>User ID: {user.id}</p>
              <p>Username: @{user.username}</p>
              <p>Email: {user.email}</p>
              <p>Admin: {user.isAdmin ? "Yes" : "No"}</p>
              <Button onClick={logout}>Logout</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                required
              />
            </div>

            {isRegistering && (
              <>
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    placeholder="Display Name (optional)"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  />
                </div>
              </>
            )}

            <div>
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Loading..." : (isRegistering ? "Register" : "Login")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRegistering(!isRegistering)}
              >
                {isRegistering ? "Switch to Login" : "Switch to Register"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
