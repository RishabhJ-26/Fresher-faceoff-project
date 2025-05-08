
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


interface Message {
  id: string;
  text: string;
  sender: "me" | "peer";
  timestamp: Date;
}

const FAKE_ACTIVE_INTERVIEWS = new Set<string>();

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
                // Add a dummy track to trigger video display
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = '#333'; // Dark placeholder
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.fillStyle = '#fff';
                  ctx.font = '30px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText('Peer Video', canvas.width / 2, canvas.height / 2);
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
          <p>Your new ID: <strong className="text-accent-foreground bg-accent/80 px-1.5 py-0.5 rounded">{newId.replace("FF-NEW-","FF-")}</strong> (copied)</p>
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


  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-background to-secondary/20 p-4 sm:p-6 font-sans animate-background-pan">
        <Card className="w-full max-w-lg space-y-6 bg-card/80 backdrop-blur-lg p-6 sm:p-10 rounded-2xl shadow-depth-3 border-border/30 animate-pop-in">
          <CardHeader className="text-center p-0 mb-6">
            <div className="mx-auto mb-6 p-3 bg-gradient-to-tr from-primary to-accent rounded-full w-fit shadow-xl shadow-primary/20 transform transition-all hover:scale-105 duration-300">
              <Users className="h-14 w-14 sm:h-16 sm:w-16 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Fresher <span className="text-primary">Faceoff</span>
            </CardTitle>
            <CardDescription className="text-md sm:text-lg text-muted-foreground mt-2">
              Peer-to-Peer Mock Interviews
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-5 p-0">
            <div className="relative">
              <LogIn className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
              <Input
                type="text"
                placeholder="Enter Interview ID (e.g., FF-XXXXXX)"
                value={interviewId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInterviewId(e.target.value.toUpperCase())}
                className="text-base h-12 bg-input border-border/50 focus-visible:ring-primary focus-visible:ring-2 rounded-lg shadow-inner-soft pl-11 pr-11 text-md placeholder:text-muted-foreground/50"
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
                <span className="bg-card/80 px-2.5 text-muted-foreground rounded-full">
                  Or
                </span>
              </div>
            </div>

            <Button 
              onClick={handleCreateInterview} 
              variant="outline" 
              className="w-full h-12 text-md border-border/70 hover:bg-secondary/80 hover:text-secondary-foreground rounded-lg shadow-soft hover:shadow-accent/30 transition-all duration-300 ease-out active:scale-95 transform hover:scale-[1.015] hover:-translate-y-0.5 active:shadow-inner-soft hover:border-accent/70"
            >
              <Sparkles className="mr-2 h-4 w-4 text-accent" /> Create New Interview
            </Button>
          </CardContent>
          
          <CardFooter className="p-0 pt-4">
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
      <header className="bg-card/90 backdrop-blur-lg p-2.5 shadow-md flex justify-between items-center border-b border-border/40 z-20">
        <div className="flex items-center gap-2 animate-slide-in-left-smooth">
          <div className="p-1.5 bg-gradient-to-br from-primary to-accent rounded-lg">
            <Users className="h-6 w-6 text-primary-foreground"/>
          </div>
          <h1 className="text-lg font-bold tracking-tight hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Fresher Faceoff
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm animate-fade-in-down delay-100">
            <span className="text-muted-foreground hidden md:inline text-xs">ID:</span> 
            <span className="font-mono text-foreground bg-muted/60 px-2.5 py-1 rounded-md shadow-inner-soft text-xs sm:text-sm tracking-wider">{interviewId.replace("FF-NEW-", "FF-")}</span>
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
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>Audio Settings</DropdownMenuItem>
                    <DropdownMenuItem>Video Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Report Issue</DropdownMenuItem>
                    <DropdownMenuItem>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Help & Feedback
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleDisconnect} variant="destructive" size="sm" className="font-medium rounded-md shadow-sm hover:shadow-destructive/30 transition-all duration-200 active:scale-95 transform hover:scale-[1.02]">
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Leave
            </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row gap-2.5 p-2.5 overflow-hidden bg-background/70">
        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-rows-2 md:grid-cols-1 lg:grid-cols-2 lg:grid-rows-1 gap-2.5 animate-fade-in-up delay-150">
          {/* Local Video */}
          <Card className="overflow-hidden shadow-lg rounded-xl border-border/20 flex flex-col transition-all duration-300 hover:shadow-primary/20 bg-card/80 backdrop-blur-sm group relative">
            <CardHeader className="p-2 bg-card/70 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 rounded-t-xl border-b border-border/20 flex flex-row justify-between items-center">
              <CardTitle className="text-xs font-medium text-primary flex items-center">
                <UserPlus className="w-3.5 h-3.5 mr-1.5"/> {isScreenShared ? "Your Screen" : "You"}
              </CardTitle>
              <div className="flex items-center gap-1">
                  {isMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                  {isVideoOff && !isScreenShared && <VideoOff className="w-3.5 h-3.5 text-red-400" />}
                  {!isMuted && <Mic className="w-3.5 h-3.5 text-green-400" />}
                  {!isVideoOff && !isScreenShared && <Video className="w-3.5 h-3.5 text-green-400" />}
               </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 aspect-video bg-muted/20 flex items-center justify-center relative mt-[37px]"> {/* mt for header height */}
              <video ref={localVideoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover transition-opacity duration-300 rounded-b-xl", (isVideoOff && !isScreenShared) || hasCameraPermission === false ? 'opacity-0' : 'opacity-100')}></video>
              {((isVideoOff && !isScreenShared) || (hasCameraPermission === false && !isScreenShared)) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 rounded-b-xl">
                    <Avatar className={cn("w-20 h-20 md:w-28 md:h-28 shadow-md", hasCameraPermission === false && "animate-pulse-gentle")}>
                    <AvatarFallback className="text-2xl md:text-3xl bg-primary/20 text-primary rounded-full border-2 border-primary/40">
                        YOU
                    </AvatarFallback>
                    </Avatar>
                    {hasCameraPermission === false && !isScreenShared && <p className="mt-2.5 text-xs text-destructive font-medium">Camera not available</p>}
                    {isVideoOff && hasCameraPermission !== false && !isScreenShared && <p className="mt-2.5 text-xs text-muted-foreground">Camera is off</p>}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Remote Video */}
          <Card className="overflow-hidden shadow-lg rounded-xl border-border/20 flex flex-col transition-all duration-300 hover:shadow-accent/20 bg-card/80 backdrop-blur-sm group relative">
             <CardHeader className="p-2 bg-card/70 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 rounded-t-xl border-b border-border/20">
              <CardTitle className="text-xs text-center font-medium text-accent flex items-center justify-center">
                <Users className="w-3.5 h-3.5 mr-1.5" /> Peer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 aspect-video bg-muted/20 flex items-center justify-center mt-[37px]">
               <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover rounded-b-xl"></video>
               {(!remoteVideoRef.current || !remoteVideoRef.current.srcObject || remoteVideoRef.current?.srcObject?.getVideoTracks().length === 0) && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 rounded-b-xl">
                    <Avatar className="w-20 h-20 md:w-28 md:h-28 shadow-md">
                        <AvatarFallback className="text-2xl md:text-3xl bg-accent/20 text-accent rounded-full border-2 border-accent/40">PEER</AvatarFallback>
                    </Avatar>
                    <p className="mt-2.5 text-xs text-muted-foreground animate-pulse-gentle">Waiting for peer...</p>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <Card className="w-full lg:w-[340px] xl:w-[380px] flex flex-col shadow-lg rounded-xl border-border/20 max-h-[calc(100vh-200px)] lg:max-h-full transition-all duration-300 hover:shadow-popover-foreground/10 bg-card/80 backdrop-blur-md animate-slide-in-right-smooth delay-250">
          <CardHeader className="p-3 border-b border-border/30">
            <CardTitle className="text-md flex items-center text-primary font-semibold">
              <MessageSquare className="mr-2 h-4.5 w-4.5" /> Interview Chat
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-2.5 bg-background/30" viewportRef={chatScrollAreaRef}>
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex animate-slide-in-bottom-fast",
                    msg.sender === "me" ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn("flex items-end gap-1.5 max-w-[80%]", msg.sender === "me" ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className={cn("h-6 w-6 shadow-sm", msg.sender === "me" ? "ml-1" : "mr-1")}>
                       <AvatarImage src={msg.sender === 'me' ? `https://picsum.photos/seed/${'myseed01'}/32/32` : `https://picsum.photos/seed/${'peerseed02'}/32/32`} alt={msg.sender} data-ai-hint={msg.sender === 'me' ? "male avatar" : "female avatar"}/>
                      <AvatarFallback className={cn("text-xs font-medium",msg.sender === "me" ? "bg-primary/30 text-primary-foreground" : "bg-accent/30 text-accent-foreground")}>
                        {msg.sender === "me" ? "ME" : "P"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn("p-2 px-2.5 rounded-lg shadow-sm text-sm",
                        msg.sender === "me"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card text-card-foreground rounded-bl-md border border-border/40" 
                      )}
                    >
                      <p className="break-words leading-relaxed">{msg.text}</p>
                      <p className={cn("text-[10px] mt-1 opacity-70", msg.sender === "me" ? "text-primary-foreground/80" : "text-muted-foreground", "text-right")}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
               {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-xs animate-fade-in-up delay-300">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40"/>
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>
          </ScrollArea>
          <CardFooter className="p-2 border-t border-border/30 bg-card/50 backdrop-blur-sm">
            <div className="flex w-full items-center space-x-1.5">
              <Input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage();}}}
                className="flex-1 h-9 focus-visible:ring-accent rounded-md shadow-inner-soft text-sm bg-input border-border/40 placeholder:text-muted-foreground/50"
                aria-label="New message input"
              />
              <Button type="submit" size="icon" onClick={handleSendMessage} className="bg-accent hover:bg-accent/90 rounded-md w-9 h-9 shadow-md hover:shadow-accent/40 transition-all duration-200 active:scale-95 transform hover:scale-[1.03]" aria-label="Send message">
                <Send className="h-4 w-4 text-accent-foreground" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>

      {/* Footer Control Bar */}
      <footer className="bg-card/90 backdrop-blur-lg p-2 shadow-t-strong flex justify-center items-center space-x-2 sm:space-x-2.5 border-t border-border/40 animate-fade-in-up delay-350">
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
                  control.main ? "w-14 h-14 sm:w-16 sm:h-16" : "w-11 h-11 sm:w-12 sm:h-12",
                  "shadow-lg hover:shadow-xl transition-all duration-200 active:scale-90 focus:ring-2 focus:ring-offset-2 transform hover:scale-[1.03] hover:-translate-y-0.5 focus:ring-offset-background", 
                  control.main ? "bg-destructive hover:bg-destructive/85 focus:ring-destructive/50" :
                  control.destructive && control.active ? "bg-destructive hover:bg-destructive/85 text-destructive-foreground focus:ring-destructive/50" 
                    : control.specialActive ? "bg-primary hover:bg-primary/85 text-primary-foreground focus:ring-primary/50" // Changed screen share active to primary
                    : control.active ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-ring/50" 
                    : "border-border/60 hover:border-primary/70 focus:ring-ring/50 hover:bg-secondary/50 text-foreground",
                  control.disabled && "opacity-50 cursor-not-allowed hover:scale-100 hover:translate-y-0 hover:shadow-lg"
                )} 
                aria-label={control.label}
              >
                <control.Icon className={control.main ? "h-5 w-5 sm:h-6 sm:w-6" : "h-4.5 w-4.5 sm:h-5 sm:w-5"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="mb-1.5" align="center"><p>{control.label}</p></TooltipContent>
          </Tooltip>
        ))}
      </footer>
    </div>
    </TooltipProvider>
  );
}


