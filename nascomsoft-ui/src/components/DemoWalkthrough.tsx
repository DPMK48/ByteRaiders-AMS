import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  ArrowRight, 
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  User,
  Scan,
  CheckCircle,
  Settings,
  X
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface DemoStep {
  id: number;
  title: string;
  description: string;
  component: 'login' | 'scanner' | 'success' | 'dashboard';
  action: string;
  userType?: 'student' | 'staff' | 'admin';
}

const demoSteps: DemoStep[] = [
  {
    id: 1,
    title: 'User Login',
    description: 'User logs in with their credentials',
    component: 'login',
    action: 'Enter email and password',
    userType: 'student'
  },
  {
    id: 2,
    title: 'QR Scanner Access',
    description: 'Student/Staff are redirected to QR scanner',
    component: 'scanner',
    action: 'Navigate to QR scanner interface',
    userType: 'student'
  },
  {
    id: 3,
    title: 'Attendance Marking',
    description: 'User scans QR code to mark attendance',
    component: 'scanner',
    action: 'Click "Start Scan" button',
    userType: 'student'
  },
  {
    id: 4,
    title: 'Success Confirmation',
    description: 'System confirms successful check-in',
    component: 'success',
    action: 'Attendance marked successfully',
    userType: 'student'
  },
  {
    id: 5,
    title: 'Admin Dashboard',
    description: 'Admin can view and manage attendance',
    component: 'dashboard',
    action: 'Access admin management features',
    userType: 'admin'
  }
];

interface DemoWalkthroughProps {
  onClose: () => void;
}

export function DemoWalkthrough({ onClose }: DemoWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && currentStep < demoSteps.length - 1) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setCurrentStep(curr => curr + 1);
            return 0;
          }
          return prev + 2;
        });
      }, 100);
    }

    return () => clearInterval(interval);
  }, [isPlaying, currentStep]);

  const handleNext = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setProgress(0);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setProgress(0);
    }
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setProgress(0);
    setIsPlaying(false);
  };

  const renderDemoContent = () => {
    const step = demoSteps[currentStep];
    
    switch (step.component) {
      case 'login':
        return (
          <div className="bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-8 rounded-lg">
            <Card className="w-full max-w-sm mx-auto shadow-lg">
              <CardHeader className="text-center space-y-4">
                <div className="w-12 h-12 bg-[--color-nascomsoft-primary] rounded-lg mx-auto flex items-center justify-center">
                  <span className="text-white font-bold">N</span>
                </div>
                <div>
                  <h3 className="text-lg">Welcome Back</h3>
                  <p className="text-sm text-muted-foreground">Nascomsoft Embedded Attendance System</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="h-10 bg-muted rounded border"></div>
                  <div className="h-10 bg-muted rounded border"></div>
                </div>
                <Button className="w-full bg-[--color-nascomsoft-primary] text-white">
                  <User className="h-4 w-4 mr-2" />
                  Sign In as {step.userType?.charAt(0).toUpperCase()}{step.userType?.slice(1)}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'scanner':
        return (
          <div className="bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-8 rounded-lg">
            <div className="max-w-sm mx-auto space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scan className="h-5 w-5 text-[--color-nascomsoft-primary]" />
                    QR Code Scanner
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/30 rounded-lg px-4 py-3 text-center">
                    <span className="text-sm">Ready to scan for check-in</span>
                  </div>
                  
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <div className="text-center">
                      {currentStep === 2 ? (
                        <div className="space-y-2">
                          <Scan className="h-16 w-16 mx-auto text-[--color-nascomsoft-primary] animate-pulse" />
                          <p className="text-sm">Camera viewfinder</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
                          <p className="text-sm">Scanning...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button className="w-full bg-[--color-nascomsoft-primary] text-white">
                    <Scan className="h-4 w-4 mr-2" />
                    {currentStep === 2 ? 'Start Scan' : 'Scanning...'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-8 rounded-lg">
            <div className="max-w-sm mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mx-auto flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-green-700 dark:text-green-400">
                        ✅ Checked in successfully at 09:15 AM
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Your attendance has been recorded
                      </p>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Present
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'dashboard':
        return (
          <div className="bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-8 rounded-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg">Admin Dashboard</h3>
                <Settings className="h-5 w-5 text-[--color-nascomsoft-primary]" />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-3">
                  <div className="text-xl font-bold">15</div>
                  <div className="text-xs text-muted-foreground">Students</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xl font-bold">8</div>
                  <div className="text-xs text-muted-foreground">Staff</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xl font-bold">12</div>
                  <div className="text-xs text-muted-foreground">Check-ins</div>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Jane Smith</span>
                    <Badge variant="default">Present</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>John Doe</span>
                    <Badge variant="default">Present</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Alice Johnson</span>
                    <Badge variant="secondary">Partial</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Demo Walkthrough</CardTitle>
            <p className="text-sm text-muted-foreground">
              Experience the complete attendance system workflow
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Step {currentStep + 1} of {demoSteps.length}</span>
              <span>{Math.round((currentStep / (demoSteps.length - 1)) * 100)}% Complete</span>
            </div>
            <Progress value={(currentStep / (demoSteps.length - 1)) * 100} className="h-2" />
            {isPlaying && currentStep < demoSteps.length - 1 && (
              <Progress value={progress} className="h-1" />
            )}
          </div>

          {/* Current Step Info */}
          <div className="text-center space-y-2">
            <h2 className="text-xl">{demoSteps[currentStep].title}</h2>
            <p className="text-muted-foreground">{demoSteps[currentStep].description}</p>
            <Badge variant="outline">
              {demoSteps[currentStep].action}
            </Badge>
          </div>

          {/* Demo Content */}
          <div className="min-h-[400px]">
            {renderDemoContent()}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handlePlay}
                disabled={currentStep === demoSteps.length - 1}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>

            <Button 
              onClick={handleNext}
              disabled={currentStep === demoSteps.length - 1}
              className="bg-[--color-nascomsoft-primary] hover:bg-[--color-nascomsoft-secondary] text-white"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2">
            {demoSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentStep(index);
                  setProgress(0);
                  setIsPlaying(false);
                }}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-[--color-nascomsoft-primary]' 
                    : index < currentStep 
                    ? 'bg-green-500' 
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}