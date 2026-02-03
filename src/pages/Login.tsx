import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileSpreadsheet, Lock, UserPlus, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const from = location.state?.from?.pathname || '/';

  const validateMobileNumber = (number: string) => {
    // Allow empty for optional or validate 10-digit number
    if (!number) return true;
    const cleaned = number.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isSignUp && mobileNumber && !validateMobileNumber(mobileNumber)) {
      setError('Please enter a valid mobile number (10-15 digits)');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isSignUp) {
        const result = await signUp(email, password, displayName, mobileNumber);
        if (result.success) {
          toast({
            title: 'Account created!',
            description: 'You can now sign in with your credentials.',
          });
          setIsSignUp(false);
          setMobileNumber('');
        } else {
          setError(result.error || 'Failed to create account');
        }
      } else {
        const result = await signIn(email, password);
        if (result.success) {
          toast({
            title: 'Welcome back!',
            description: 'You have been logged in successfully.',
          });
          navigate(from, { replace: true });
        } else {
          setError(result.error || 'Invalid email or password');
        }
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display tracking-wide text-foreground">
            CN Clarification Portal
          </h1>
          <p className="text-muted-foreground">
            Manage and search Excel clarification data
          </p>
        </div>
        
        {/* Login Card */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              {isSignUp ? <UserPlus className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </CardTitle>
            <CardDescription>
              {isSignUp ? 'Create a new account to access the portal' : 'Enter your credentials to access the portal'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Enter display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Mobile Number
                    </Label>
                    <Input
                      id="mobileNumber"
                      type="tel"
                      placeholder="Enter mobile number (for password recovery)"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      autoComplete="tel"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for password recovery via OTP
                    </p>
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </div>
              
              {!isSignUp && (
                <div className="text-right">
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
              </Button>
            </form>
            
            <div className="mt-6 pt-4 border-t border-border/50">
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setMobileNumber('');
                }}
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}