
"use client";

import type { ChangeEvent } from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  Video,
  Mic,
  MessageSquare,
  Send,
  UserPlus,
  LogOut,
  MicOff,
  VideoOff,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  Settings,
  Info,
  Users,
  LogIn,
  Sparkles,
  CameraOff,
  Fullscreen,
  Minimize,
  Settings2,
  HelpCircle,
  Lightbulb,
  FileText,
  Brain,
  Play,
  Pause,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateInterviewQuestions, type GenerateInterviewQuestionsOutput } from "@/ai/flows/generate-interview-questions-flow";


interface Message {
  id: string;
  text: string;
  sender: "me" | "peer";
  timestamp: Date;
}

const FAKE_ACTIVE_INTERVIEWS = new Set<string>();
const INTERVIEW_CATEGORIES = [
  { value: "Software Engineering", label: "Software Engineering" },
  { value: "Product Management", label: "Product Management" },
  { value: "Data Science", label: "Data Science" },
  { value: "Marketing", label: "Marketing" },
  { value: "HR & Behavioral", label: "HR & Behavioral" },
  { value: "Custom Topic", label: "Custom Topic" },
];


export function FresherFaceoffPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [interviewId, setInterviewId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenShared, setIsScreenShared] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // New features state
  const [interviewCategory, setInterviewCategory] = useState<string>("");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);
  const [userNotes, setUserNotes] = useState<string>("");

  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);


  const { toast } = useToast();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);
  const mainLayoutRef = useRef<HTMLDivElement>(null);


  const stopStream = (stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const startCameraStream = useCallback(async (showErrorToast = true) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        if (showErrorToast) {
             toast({
                variant: "destructive",
                title: "Media Devices Not Supported",
                description: "Your browser does not support camera/microphone access.",
            });
        }
        setHasCameraPermission(false);
        return null;
    }

    if (localStreamRef.current) {
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: !isMuted });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
      setIsVideoOff(false);
      return stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      setHasCameraPermission(false);
      if (showErrorToast) {
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: "Please enable camera permissions in your browser settings.",
        });
      }
      return null;
    }
  }, [isMuted, toast]);

  const startScreenShareStream = useCallback(async () => {
     if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        toast({
          variant: "destructive",
          title: "Screen Share Not Supported",
          description: "Your browser does not support screen sharing.",
        });
        return null;
      }

    if (screenStreamRef.current) {
        stopStream(screenStreamRef.current);
        screenStreamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } });
      screenStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      stream.getVideoTracks()[0].onended = () => {
        setIsScreenShared(false);
        if (localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        } else {
           startCameraStream(false); 
        }
        toast({ title: "Screen Sharing Ended", description: "You stopped sharing your screen." });
      };
      setIsScreenShared(true);
      return stream;
    } catch (err: any) {
      console.error("Error starting screen share:", err);
       if (err.name === "NotAllowedError" || err.message?.includes("permission") || err.message?.includes("disallowed by permissions policy")) {
        toast({
          variant: "destructive",
          title: "Screen Share Permission Denied",
          description: "Screen sharing access was denied. If in an embedded environment, try a standalone browser. Otherwise, check browser permissions.",
          duration: 7000,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Screen Share Error",
          description: "Could not start screen sharing. Please try again.",
        });
      }
      setIsScreenShared(false); 
      return null;
    }
  }, [toast, startCameraStream]);


  useEffect(() => {
    if (isConnected) {
      startCameraStream().then(stream => {
        if (stream && remoteVideoRef.current) {
          const peerStream = new MediaStream();
          stream.getTracks().forEach(track => {
            const clonedTrack = track.clone();
            if (clonedTrack.kind === 'audio') clonedTrack.enabled = !isMuted; // Ensure audio track respects mute state
            peerStream.addTrack(clonedTrack);
          });
          remoteVideoRef.current.srcObject = peerStream;
          // Simulate remote video starting after a short delay
          setTimeout(() => {
             if(remoteVideoRef.current && !remoteVideoRef.current.srcObject) { // only if still not set
                const mockStream = new MediaStream();
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = 'hsl(var(--muted))'; 
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.fillStyle = 'hsl(var(--muted-foreground))';
                  ctx.font = '30px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText('Peer Video Offline', canvas.width / 2, canvas.height / 2);
                }
                const videoTrack = (canvas as any).captureStream(30).getVideoTracks()[0];
                mockStream.addTrack(videoTrack);
                remoteVideoRef.current.srcObject = mockStream;
             }
          }, 2000);
        }
      });
    } else {
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
      stopStream(screenStreamRef.current);
      screenStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setIsScreenShared(false); 
      setHasCameraPermission(null); 
    }

    return () => {
      stopStream(localStreamRef.current);
      stopStream(screenStreamRef.current);
    };
  }, [isConnected, startCameraStream, isMuted]);

  useEffect(() => {
    if (chatScrollAreaRef.current) {
      const viewport = chatScrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo(0, viewport.scrollHeight);
      }
    }
  }, [messages]);

  const handleConnect = () => {
    if (!interviewId.trim()) {
      toast({
        variant: "destructive",
        title: "Interview ID Required",
        description: "Please enter an Interview ID or create a new one.",
      });
      return;
    }

    setIsConnecting(true);
    setTimeout(() => {
      const effectiveId = interviewId.startsWith("FF-NEW-") ? interviewId.replace("FF-NEW-", "FF-") : interviewId;
      if (!FAKE_ACTIVE_INTERVIEWS.has(effectiveId) && !interviewId.startsWith("FF-NEW-")) {
         toast({
           variant: "destructive",
           title: "Connection Failed",
           description: (
            <div>
               <p>No active interview with ID <strong className="text-destructive-foreground">{interviewId}</strong> found.</p>
               <p className="text-xs mt-1">Please check the ID or create a new interview.</p>
            </div>
           ),
         });
         setIsConnecting(false);
         return;
      }

      setIsConnected(true);
      setIsConnecting(false);
      let currentId = interviewId;
      if (interviewId.startsWith("FF-NEW-")) {
          currentId = effectiveId;
          FAKE_ACTIVE_INTERVIEWS.add(currentId); 
          setInterviewId(currentId); 
          toast({
            title: "Interview Created & Joined!",
            description: (
              <div>
                Share ID: <strong className="text-accent-foreground bg-accent/20 px-1 py-0.5 rounded">{currentId}</strong> with your peer.
              </div>
            )
          });
      } else {
        toast({
          title: "Connection Successful!",
          description: `Joined interview: ${currentId}`,
        });
      }
    }, 1500);
  };
  
  const handleCreateInterview = () => {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newId = `FF-NEW-${randomPart}`;
    setInterviewId(newId);
    toast({
      title: "New Interview ID Generated!",
      description: (
        <div>
          <p>Your new ID: <strong className="text-accent-foreground bg-accent/20 px-1.5 py-0.5 rounded">{newId.replace("FF-NEW-","FF-")}</strong> (copied)</p>
          <p className="text-xs mt-1">Click 'Join Interview' to start. Share this ID with your peer.</p>
        </div>
      ),
      duration: 8000,
    });
    navigator.clipboard.writeText(newId.replace("FF-NEW-","FF-"));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };
  
  const handleDisconnect = () => {
    setIsConnected(false);
    setMessages([]);
    const effectiveId = interviewId.replace("FF-NEW-", "FF-");
    FAKE_ACTIVE_INTERVIEWS.delete(effectiveId); 
    setInterviewId(""); 
    toast({ title: "Disconnected", description: "You have left the interview session." });
    if (isFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
    }
    // Reset timer
    setIsTimerRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTimerSeconds(0);
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg: Message = { 
        id: `msg-${Date.now()}-${Math.random()}`, 
        text: newMessage, 
        sender: "me", 
        timestamp: new Date() 
      };
      setMessages(prevMessages => [...prevMessages, newMsg]);
      
      setTimeout(() => {
        const peerResponse: Message = {
          id: `msg-${Date.now() + 1}-${Math.random()}`, 
          text: `Received: "${newMessage.length > 25 ? newMessage.substring(0,22) + '...' : newMessage}"`, 
          sender: "peer", 
          timestamp: new Date() 
        };
        setMessages(prev => [...prev, peerResponse]);
      }, 800);
      setNewMessage("");
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    const currentActiveStream = isScreenShared && screenStreamRef.current ? screenStreamRef.current : localStreamRef.current;
    if (currentActiveStream) {
        currentActiveStream.getAudioTracks().forEach(track => track.enabled = !newMutedState);
    }
    toast({ title: newMutedState ? "Microphone Muted" : "Microphone Unmuted"});
  };

  const toggleVideo = async () => {
    if (isScreenShared) {
        toast({ title: "Video Control Disabled", description: "Stop screen sharing to control your camera."});
        return;
    }
    const newVideoOffState = !isVideoOff;
    
    if (localStreamRef.current) { 
        localStreamRef.current.getVideoTracks().forEach(track => {
          track.enabled = !newVideoOffState;
        });
        setIsVideoOff(newVideoOffState);
    } else if (!newVideoOffState) { 
        const stream = await startCameraStream();
        if(stream) setIsVideoOff(false);
        else setIsVideoOff(true); 
    } else { 
        setIsVideoOff(true);
    }
    toast({ title: newVideoOffState ? "Camera Off" : "Camera On"});
  };

  const toggleShareScreen = async () => {
    if (!isScreenShared) { 
        if(localStreamRef.current){ 
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null; 
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        
        const stream = await startScreenShareStream();
        if (stream) { 
            toast({ title: "Screen Sharing Started", description: "You are now sharing your screen." });
        } else { 
           await startCameraStream(false); 
        }
    } else { 
        if(screenStreamRef.current){
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }
        setIsScreenShared(false);
        await startCameraStream(false);
        toast({ title: "Screen Sharing Stopped", description: "You are no longer sharing your screen." });
    }
  };
  
  const handleCopyInterviewId = () => {
    const idToCopy = interviewId.startsWith("FF-NEW-") ? interviewId.replace("FF-NEW-", "FF-") : interviewId;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({title: "Copied!", description: "Interview ID copied to clipboard."});
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && mainLayoutRef.current) {
      mainLayoutRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleGenerateQuestions = async () => {
    if (!interviewCategory) {
      toast({ variant: "destructive", title: "Category Required", description: "Please select an interview category or choose 'Custom Topic'." });
      return;
    }
    if (interviewCategory === "Custom Topic" && !customTopic.trim()) {
      toast({ variant: "destructive", title: "Custom Topic Required", description: "Please enter your custom topic." });
      return;
    }

    setIsGeneratingQuestions(true);
    setGeneratedQuestions([]);
    try {
      const topic = interviewCategory === "Custom Topic" ? customTopic : interviewCategory;
      const result: GenerateInterviewQuestionsOutput = await generateInterviewQuestions({ topic, numQuestions: 5 });
      setGeneratedQuestions(result.questions);
      if (result.questions.length > 0 && !result.questions[0].startsWith("Error:")) {
        toast({ title: "AI Questions Generated!", description: `Found ${result.questions.length} questions for "${topic}". Check the 'Questions' tab after joining.` });
      } else if (result.questions.length > 0 && result.questions[0].startsWith("Error:")) {
        toast({ variant: "destructive", title: "AI Question Generation Failed", description: result.questions[0]});
      } else {
         toast({ variant: "destructive", title: "AI Question Generation Failed", description: "No questions were returned. Please try a different topic."});
      }
    } catch (error: any) {
      console.error("Error generating questions:", error);
      toast({ variant: "destructive", title: "Error Generating Questions", description: error.message || "An unexpected error occurred." });
      setGeneratedQuestions(["Failed to load questions. Please try again."]);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Timer Logic
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prevSeconds => prevSeconds + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleTimerToggle = () => setIsTimerRunning(!isTimerRunning);
  const handleTimerReset = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-background to-secondary/30 p-4 sm:p-6 font-sans animate-background-pan">
        <Card className="w-full max-w-lg bg-card/90 backdrop-blur-xl p-6 sm:p-10 rounded-2xl shadow-depth-3 border-border/40 animate-pop-in">
          <CardHeader className="text-center p-0 mb-6">
            <div className="mx-auto mb-6 p-3 bg-gradient-to-tr from-primary to-accent rounded-full w-fit shadow-xl shadow-primary/25 transform transition-all hover:scale-105 duration-300">
              <Users className="h-14 w-14 sm:h-16 sm:w-16 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Fresher Faceoff
            </CardTitle>
            <CardDescription className="text-md sm:text-lg text-muted-foreground mt-2">
              Peer-to-Peer Mock Interviews
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 p-0">
            {/* AI Question Generation Section */}
            <div className="space-y-3 p-4 border border-border/30 rounded-lg bg-background/50 shadow-sm">
              <h3 className="text-sm font-medium text-foreground flex items-center"><Brain className="w-4 h-4 mr-2 text-primary"/>Get AI Interview Questions</h3>
              <Select value={interviewCategory} onValueChange={setInterviewCategory}>
                <SelectTrigger className="w-full h-11 text-sm bg-input border-border/50 focus-visible:ring-primary focus-visible:ring-2 rounded-lg shadow-inner-soft placeholder:text-muted-foreground/60">
                  <SelectValue placeholder="Select Interview Category/Topic" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {interviewCategory === "Custom Topic" && (
                <Input
                  type="text"
                  placeholder="Enter Custom Topic (e.g., React component lifecycle)"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="h-11 text-sm bg-input border-border/50 focus-visible:ring-primary focus-visible:ring-2 rounded-lg shadow-inner-soft placeholder:text-muted-foreground/60"
                />
              )}
              <Button onClick={handleGenerateQuestions} disabled={isGeneratingQuestions || !interviewCategory} className="w-full h-11 text-sm bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg shadow-md hover:shadow-accent/30 transition-all duration-200 ease-out active:scale-95">
                {isGeneratingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isGeneratingQuestions ? "Generating..." : "Generate Questions"}
              </Button>
              {generatedQuestions.length > 0 && (
                <ScrollArea className="max-h-32 mt-2 p-2 border border-border/20 rounded-md bg-muted/30 text-xs">
                  <ul className="space-y-1 list-disc list-inside">
                    {generatedQuestions.map((q, i) => (
                      <li key={i} className={q.startsWith("Error:") || q.startsWith("Failed") ? "text-destructive" : "text-muted-foreground"}>{q}</li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>
            
            <div className="relative">
              <LogIn className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
              <Input
                type="text"
                placeholder="Enter Interview ID (e.g., FF-XXXXXX)"
                value={interviewId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInterviewId(e.target.value.toUpperCase())}
                className="text-base h-12 bg-input border-border/50 focus-visible:ring-primary focus-visible:ring-2 rounded-lg shadow-inner-soft pl-11 pr-11 text-md placeholder:text-muted-foreground/60"
                aria-label="Interview ID Input"
              />
              {interviewId && (
                 <Button variant="ghost" size="icon" onClick={handleCopyInterviewId} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-primary" aria-label="Copy Interview ID">
                    {copied ? <Check className="h-5 w-5 text-green-500 animate-pop-in" /> : <Copy className="h-5 w-5" />}
                </Button>
              )}
            </div>
            
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-md font-semibold rounded-lg shadow-strong hover:shadow-primary/40 transition-all duration-300 ease-out active:scale-95 transform hover:scale-[1.015] hover:-translate-y-0.5 active:shadow-soft"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" /> Join Interview
                </>
              )}
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/90 px-2.5 text-muted-foreground rounded-full">
                  Or
                </span>
              </div>
            </div>

            <Button 
              onClick={handleCreateInterview} 
              variant="outline" 
              className="w-full h-12 text-md border-border/70 hover:bg-secondary/80 hover:text-secondary-foreground rounded-lg shadow-soft hover:shadow-accent/30 transition-all duration-300 ease-out active:scale-95 transform hover:scale-[1.015] hover:-translate-y-0.5 active:shadow-inner-soft hover:border-accent/70"
            >
              <Sparkles className="mr-2 h-4 w-4 text-primary" /> Create New Interview
            </Button>
          </CardContent>
          
          <CardFooter className="p-0 pt-6">
            <p className="text-xs text-muted-foreground/70 text-center flex items-center justify-center w-full">
              <Info className="h-3.5 w-3.5 mr-1.5 inline-block flex-shrink-0"/>
              Ensure camera & microphone are enabled in your browser for the interview.
            </p>
          </CardFooter>
        </Card>
         <p className="text-xs text-muted-foreground/60 mt-8 animate-fade-in-up delay-500">&copy; {new Date().getFullYear()} FresherFaceoff. All rights reserved.</p>
      </div>
    );
  }

  // Connected State UI
  return (
    <TooltipProvider delayDuration={100}>
    <div ref={mainLayoutRef} className="flex flex-col h-screen bg-background text-foreground overflow-hidden antialiased font-sans">
      {/* Header Bar */}
      <header className="bg-card/95 backdrop-blur-lg p-2.5 shadow-md flex justify-between items-center border-b border-border/50 z-20">
        <div className="flex items-center gap-2 animate-slide-in-left-smooth">
          <div className="p-1.5 bg-gradient-to-br from-primary to-accent rounded-lg shadow-sm">
            <Users className="h-6 w-6 text-primary-foreground"/>
          </div>
          <h1 className="text-lg font-bold tracking-tight hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Fresher Faceoff
          </h1>
        </div>
        <div className="flex items-center gap-3 animate-fade-in-down delay-100">
            {/* Timer Display */}
            <div className="flex items-center gap-1.5 text-sm font-mono bg-muted/70 px-2.5 py-1 rounded-md shadow-inner-soft text-foreground">
              <Clock className="h-4 w-4 text-primary"/>
              <span>{formatTime(timerSeconds)}</span>
            </div>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleTimerToggle} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md">
                        {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isTimerRunning ? "Pause Timer" : "Start Timer"}</p></TooltipContent>
            </Tooltip>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleTimerReset} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Reset Timer</p></TooltipContent>
            </Tooltip>
            <span className="text-muted-foreground hidden md:inline text-xs mx-1">|</span>
            <span className="text-muted-foreground hidden md:inline text-xs">ID:</span> 
            <span className="font-mono text-foreground bg-muted/70 px-2.5 py-1 rounded-md shadow-inner-soft text-xs sm:text-sm tracking-wider">{interviewId.replace("FF-NEW-", "FF-")}</span>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleCopyInterviewId} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md" aria-label="Copy Interview ID">
                        {copied ? <Check className="h-4 w-4 text-green-500 animate-pop-in" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Copy Interview ID</p></TooltipContent>
            </Tooltip>
        </div>
        <div className="flex items-center gap-1.5 animate-slide-in-right-smooth">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md">
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Fullscreen className="h-4 w-4" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</p></TooltipContent>
            </Tooltip>
            <DropdownMenu>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md">
                                <Settings2 className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent><p>Settings</p></TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-48 bg-popover border-border/70 shadow-xl">
                    <DropdownMenuItem>Audio Settings</DropdownMenuItem>
                    <DropdownMenuItem>Video Settings</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/50"/>
                    <DropdownMenuItem>Report Issue</DropdownMenuItem>
                    <DropdownMenuItem>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Help & Feedback
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleDisconnect} variant="destructive" size="sm" className="font-medium rounded-md shadow-md hover:shadow-destructive/40 transition-all duration-200 active:scale-95 transform hover:scale-[1.02] gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Leave
            </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden bg-background/80">
        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-rows-2 md:grid-cols-1 lg:grid-cols-2 lg:grid-rows-1 gap-3 animate-fade-in-up delay-150">
          {/* Local Video */}
          <Card className="overflow-hidden shadow-xl rounded-xl border-border/30 flex flex-col transition-all duration-300 hover:shadow-primary/25 bg-card/90 backdrop-blur-md group relative">
            <CardHeader className="p-2.5 bg-card/80 backdrop-blur-md absolute top-0 left-0 right-0 z-10 rounded-t-xl border-b border-border/30 flex flex-row justify-between items-center">
              <CardTitle className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <UserPlus className="w-4 h-4"/> {isScreenShared ? "Your Screen" : "You"}
              </CardTitle>
              <div className="flex items-center gap-1.5">
                  {isMuted && <MicOff className="w-4 h-4 text-red-400" />}
                  {isVideoOff && !isScreenShared && <VideoOff className="w-4 h-4 text-red-400" />}
                  {!isMuted && <Mic className="w-4 h-4 text-green-400" />}
                  {!isVideoOff && !isScreenShared && <Video className="w-4 h-4 text-green-400" />}
               </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 aspect-video bg-muted/30 flex items-center justify-center relative mt-[45px]"> {/* mt for header height */}
              <video ref={localVideoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover transition-opacity duration-300 rounded-b-xl", (isVideoOff && !isScreenShared) || hasCameraPermission === false ? 'opacity-0' : 'opacity-100')}></video>
              {((isVideoOff && !isScreenShared) || (hasCameraPermission === false && !isScreenShared)) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/60 rounded-b-xl p-4 text-center">
                    <Avatar className={cn("w-20 h-20 md:w-28 md:h-28 shadow-lg", hasCameraPermission === false && "animate-pulse-gentle")}>
                    <AvatarFallback className="text-2xl md:text-3xl bg-primary/25 text-primary rounded-full border-2 border-primary/50">
                        YOU
                    </AvatarFallback>
                    </Avatar>
                    {hasCameraPermission === false && !isScreenShared && <p className="mt-3 text-sm text-destructive font-medium">Camera not available</p>}
                    {isVideoOff && hasCameraPermission !== false && !isScreenShared && <p className="mt-3 text-sm text-muted-foreground">Camera is off</p>}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Remote Video */}
          <Card className="overflow-hidden shadow-xl rounded-xl border-border/30 flex flex-col transition-all duration-300 hover:shadow-accent/25 bg-card/90 backdrop-blur-md group relative">
             <CardHeader className="p-2.5 bg-card/80 backdrop-blur-md absolute top-0 left-0 right-0 z-10 rounded-t-xl border-b border-border/30">
              <CardTitle className="text-sm text-center font-semibold text-accent flex items-center justify-center gap-1.5">
                <Users className="w-4 h-4" /> Peer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 aspect-video bg-muted/30 flex items-center justify-center mt-[45px]">
               <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover rounded-b-xl"></video>
               {(!remoteVideoRef.current || !remoteVideoRef.current.srcObject || remoteVideoRef.current?.srcObject?.getVideoTracks().length === 0) && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/60 rounded-b-xl p-4 text-center">
                    <Avatar className="w-20 h-20 md:w-28 md:h-28 shadow-lg">
                        <AvatarFallback className="text-2xl md:text-3xl bg-accent/25 text-accent rounded-full border-2 border-accent/50">PEER</AvatarFallback>
                    </Avatar>
                    <p className="mt-3 text-sm text-muted-foreground animate-pulse-gentle">Waiting for peer...</p>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Chat, Questions, Notes */}
        <Card className="w-full lg:w-[360px] xl:w-[400px] flex flex-col shadow-xl rounded-xl border-border/30 max-h-[calc(100vh-220px)] lg:max-h-full transition-all duration-300 hover:shadow-popover-foreground/15 bg-card/90 backdrop-blur-md animate-slide-in-right-smooth delay-250">
            <Tabs defaultValue="chat" className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-3 gap-1 p-1 bg-muted/60 rounded-t-xl rounded-b-none border-b border-border/40">
                <TabsTrigger value="chat" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                    <MessageSquare className="h-4 w-4"/> Chat
                </TabsTrigger>
                <TabsTrigger value="questions" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                    <Lightbulb className="h-4 w-4"/> Questions
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                    <FileText className="h-4 w-4"/> Notes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 flex flex-col m-0">
                <ScrollArea className="flex-1 p-3 bg-background/40" viewportRef={chatScrollAreaRef}>
                  <div className="space-y-3.5">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex animate-slide-in-bottom-fast",
                          msg.sender === "me" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className={cn("flex items-end gap-1.5 max-w-[85%]", msg.sender === "me" ? "flex-row-reverse" : "flex-row")}>
                          <Avatar className={cn("h-7 w-7 shadow", msg.sender === "me" ? "ml-1" : "mr-1")}>
                            <AvatarImage src={msg.sender === 'me' ? `https://picsum.photos/seed/${'myseed01'}/32/32` : `https://picsum.photos/seed/${'peerseed02'}/32/32`} alt={msg.sender} data-ai-hint={msg.sender === 'me' ? "male avatar" : "female avatar"}/>
                            <AvatarFallback className={cn("text-xs font-medium",msg.sender === "me" ? "bg-primary/40 text-primary-foreground" : "bg-accent/40 text-accent-foreground")}>
                              {msg.sender === "me" ? "ME" : "P"}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={cn("p-2.5 px-3 rounded-xl shadow",
                              msg.sender === "me"
                                ? "bg-primary text-primary-foreground rounded-br-lg"
                                : "bg-card text-card-foreground rounded-bl-lg border border-border/50" 
                            )}
                          >
                            <p className="break-words leading-relaxed text-sm">{msg.text}</p>
                            <p className={cn("text-[10px] mt-1.5 opacity-80", msg.sender === "me" ? "text-primary-foreground/80" : "text-muted-foreground", "text-right")}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-10 text-sm animate-fade-in-up delay-300">
                        <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50"/>
                        No messages yet. Start the conversation!
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-2.5 border-t border-border/40 bg-card/60 backdrop-blur-sm rounded-b-xl">
                  <div className="flex w-full items-center space-x-2">
                    <Input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage();}}}
                      className="flex-1 h-10 focus-visible:ring-accent focus-visible:border-accent rounded-lg shadow-inner-soft text-sm bg-input border-border/50 placeholder:text-muted-foreground/60"
                      aria-label="New message input"
                    />
                    <Button type="submit" size="icon" onClick={handleSendMessage} className="bg-accent hover:bg-accent/90 rounded-lg w-10 h-10 shadow-md hover:shadow-accent/40 transition-all duration-200 active:scale-95 transform hover:scale-[1.03]" aria-label="Send message">
                      <Send className="h-4.5 w-4.5 text-accent-foreground" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="questions" className="flex-1 flex flex-col m-0">
                 <ScrollArea className="flex-1 p-3 bg-background/40">
                    {isGeneratingQuestions && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3"/>
                            <p className="text-sm">Generating AI questions...</p>
                        </div>
                    )}
                    {!isGeneratingQuestions && generatedQuestions.length === 0 && (
                        <div className="text-center text-muted-foreground py-10 text-sm animate-fade-in-up">
                            <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50"/>
                            No questions generated yet. <br /> Use the controls in the lobby to generate questions.
                        </div>
                    )}
                    {!isGeneratingQuestions && generatedQuestions.length > 0 && (
                        <div className="space-y-3">
                            {generatedQuestions.map((question, index) => (
                                <Card key={index} className={cn("p-3 shadow-sm border-border/40 bg-card/80", question.startsWith("Error:") || question.startsWith("Failed") ? "border-destructive/50 bg-destructive/10" : "")}>
                                    <p className={cn("text-sm leading-relaxed", question.startsWith("Error:") || question.startsWith("Failed") ? "text-destructive" : "text-card-foreground")}>
                                        <strong className="text-primary mr-1.5">{index + 1}.</strong> {question}
                                    </p>
                                </Card>
                            ))}
                        </div>
                    )}
                 </ScrollArea>
              </TabsContent>
              
              <TabsContent value="notes" className="flex-1 flex flex-col m-0">
                <ScrollArea className="flex-1 p-0 bg-background/40">
                    <Textarea 
                        placeholder="Your private notes for the interview... (Only visible to you)"
                        value={userNotes}
                        onChange={(e) => setUserNotes(e.target.value)}
                        className="w-full h-full min-h-[200px] p-3 text-sm border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent resize-none placeholder:text-muted-foreground/60"
                    />
                </ScrollArea>
                 <div className="p-2.5 border-t border-border/40 bg-card/60 backdrop-blur-sm rounded-b-xl">
                    <p className="text-xs text-muted-foreground text-center">Notes are saved locally in your browser.</p>
                </div>
              </TabsContent>
            </Tabs>
        </Card>
      </main>

      {/* Footer Control Bar */}
      <footer className="bg-card/95 backdrop-blur-lg p-2.5 shadow-t-strong flex justify-center items-center space-x-2 sm:space-x-3 border-t border-border/50 animate-fade-in-up delay-350">
        {[
          { id: 'mute', Icon: isMuted ? MicOff : Mic, active: isMuted, action: toggleMute, label: isMuted ? "Unmute" : "Mute", destructive: isMuted },
          { id: 'video', Icon: isVideoOff ? CameraOff : Video, active: isVideoOff, action: toggleVideo, label: isVideoOff ? "Start Video" : "Stop Video", destructive: isVideoOff, disabled: isScreenShared },
          { id: 'screen', Icon: isScreenShared ? ScreenShareOff : ScreenShare, active: isScreenShared, action: toggleShareScreen, label: isScreenShared ? "Stop Sharing" : "Share Screen", specialActive: isScreenShared },
          { id: 'disconnect', Icon: PhoneOff, action: handleDisconnect, label: "Leave Call", destructive: true, main: true },
        ].map(control => (
          <Tooltip key={control.id}>
            <TooltipTrigger asChild>
              <Button 
                variant={control.destructive && control.active && !control.main ? "destructive" : 
                         control.main ? "destructive" : 
                         control.specialActive ? "default" : 
                         control.active ? "secondary" : "outline"}
                size={control.main ? "lg" : "default"} 
                onClick={control.action} 
                disabled={control.disabled}
                className={cn(
                  "rounded-full p-0 aspect-square", 
                  control.main ? "w-14 h-14 sm:w-16 sm:h-16 text-lg" : "w-11 h-11 sm:w-12 sm:h-12 text-base",
                  "shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-90 focus:ring-2 focus:ring-offset-2 transform hover:scale-[1.03] hover:-translate-y-0.5 focus:ring-offset-background", 
                  control.main ? "bg-destructive hover:bg-destructive/85 focus:ring-destructive/60" :
                  control.destructive && control.active ? "bg-destructive hover:bg-destructive/85 text-destructive-foreground focus:ring-destructive/60" 
                    : control.specialActive ? "bg-primary hover:bg-primary/85 text-primary-foreground focus:ring-primary/60" 
                    : control.active ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-ring/60" 
                    : "border-border/70 hover:border-primary/80 focus:ring-ring/60 hover:bg-secondary/60 text-foreground",
                  control.disabled && "opacity-50 cursor-not-allowed hover:scale-100 hover:translate-y-0 hover:shadow-xl"
                )} 
                aria-label={control.label}
              >
                <control.Icon className={control.main ? "h-6 w-6 sm:h-7 sm:w-7" : "h-5 w-5 sm:h-5.5 sm:w-5.5"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="mb-1.5 bg-popover text-popover-foreground border-border/70 shadow-lg" align="center"><p>{control.label}</p></TooltipContent>
          </Tooltip>
        ))}
      </footer>
    </div>
    </TooltipProvider>
  );
}

