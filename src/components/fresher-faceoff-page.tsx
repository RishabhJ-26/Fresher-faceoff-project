
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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

  const { toast } = useToast();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);

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
           startCameraStream(false); // Don't show error if camera was already denied
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
            if (clonedTrack.kind === 'audio') clonedTrack.enabled = true; // Simulate remote not muted
            peerStream.addTrack(clonedTrack);
          });
          remoteVideoRef.current.srcObject = peerStream;
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
      setHasCameraPermission(null); // Reset permission status on disconnect
    }

    return () => {
      stopStream(localStreamRef.current);
      stopStream(screenStreamRef.current);
    };
  }, [isConnected, startCameraStream]);

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
                <p>No one with ID <strong className="text-destructive-foreground">{interviewId}</strong> found.</p>
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
            description: `Share ID: ${currentId} with your peer.`,
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
          <p>Your new ID: <strong className="text-accent">{newId.replace("FF-NEW-","FF-")}</strong> (copied)</p>
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
        else setIsVideoOff(true); // if stream failed, it's still off
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


  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-hero-gradient p-4 sm:p-6 font-sans animate-background-pan">
        <Card className="w-full max-w-md shadow-depth-3 rounded-2xl animate-pop-in bg-card/90 backdrop-blur-lg border-primary/10">
          <CardHeader className="text-center p-6 sm:p-8">
            <div className="mx-auto mb-6 p-3 bg-gradient-to-br from-primary to-accent rounded-2xl w-fit shadow-xl shadow-primary/20 transform transition-all hover:scale-110 duration-300">
             <Users className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground" />
            </div>
            <div className="animate-fade-in-up delay-100">
              <CardTitle className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">Fresher Faceoff</CardTitle>
              <CardDescription className="text-md sm:text-lg text-muted-foreground pt-2">Your Peer Interview Platform</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="relative animate-fade-in-up delay-200">
              <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter Interview ID"
                value={interviewId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInterviewId(e.target.value)}
                className="text-base h-14 focus-visible:ring-accent focus-visible:ring-2 rounded-xl shadow-inner-soft pl-12 pr-12 text-md"
                aria-label="Interview ID Input"
              />
              {interviewId && (
                 <Button variant="ghost" size="icon" onClick={handleCopyInterviewId} className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-primary" aria-label="Copy Interview ID">
                    {copied ? <Check className="h-6 w-6 text-green-500 animate-pop-in" /> : <Copy className="h-6 w-6" />}
                </Button>
              )}
            </div>
            <div className="animate-fade-in-up delay-300">
              <Button onClick={handleConnect} className="w-full h-14 bg-primary hover:bg-primary/80 text-primary-foreground text-lg font-semibold rounded-xl shadow-strong hover:shadow-primary/50 transition-all duration-300 ease-out active:scale-95 transform hover:scale-[1.02] hover:-translate-y-0.5 active:shadow-soft">
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2.5 h-6 w-6 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2.5 h-5 w-5" /> Join Interview
                  </>
                )}
              </Button>
            </div>
            <div className="animate-fade-in-up delay-400">
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/70" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card/90 px-3 text-muted-foreground rounded-full">
                    Or
                  </span>
                </div>
              </div>
              <Button onClick={handleCreateInterview} variant="outline" className="w-full h-14 text-lg border-primary/50 hover:bg-primary/5 hover:text-primary rounded-xl shadow-soft hover:shadow-primary/30 transition-all duration-300 ease-out active:scale-95 transform hover:scale-[1.02] hover:-translate-y-0.5 active:shadow-inner-soft">
                <Sparkles className="mr-2.5 h-5 w-5" /> Create New Interview
              </Button>
            </div>
          </CardContent>
          <CardFooter className="text-center text-xs text-muted-foreground p-6 sm:p-8 animate-fade-in-up delay-500">
            <Info className="h-4 w-4 mr-1.5 inline-block flex-shrink-0"/>
            Connect with peers for mock interviews. Allow camera & mic access for the best experience.
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Connected State UI
  return (
    <TooltipProvider delayDuration={150}>
    <div className="flex flex-col h-screen bg-secondary overflow-hidden antialiased font-sans">
      <header className="bg-background/80 backdrop-blur-md p-3 shadow-strong flex justify-between items-center border-b border-border/30 z-20">
        <div className="flex items-center gap-2 animate-slide-in-left-smooth">
          <Users className="h-7 w-7 text-primary"/>
          <h1 className="text-xl font-semibold text-primary tracking-tight hidden sm:block">Fresher Faceoff</h1>
        </div>
        <div className="flex items-center gap-2 text-sm animate-fade-in-down delay-200">
            <span className="text-muted-foreground hidden md:inline">ID:</span> 
            <span className="font-mono text-foreground bg-primary/10 px-3 py-1.5 rounded-lg shadow-inner-soft text-xs sm:text-sm">{interviewId.replace("FF-NEW-", "FF-")}</span>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleCopyInterviewId} className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg" aria-label="Copy Interview ID">
                        {copied ? <Check className="h-5 w-5 text-green-500 animate-pop-in" /> : <Copy className="h-5 w-5" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Copy Interview ID</p></TooltipContent>
            </Tooltip>
        </div>
        <Button onClick={handleDisconnect} variant="destructive" size="sm" className="font-medium rounded-lg shadow-md hover:shadow-destructive/40 transition-all duration-200 active:scale-95 transform hover:scale-[1.03] animate-slide-in-right-smooth">
          <LogOut className="mr-1.5 h-4 w-4" /> Leave
        </Button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden bg-soft-gradient">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in-up delay-100">
          {/* Local Video */}
          <Card className="overflow-hidden shadow-depth-2 rounded-xl border-border/20 flex flex-col transition-all duration-300 hover:shadow-depth-3 relative bg-card/50 backdrop-blur-sm group">
            <CardHeader className="p-2.5 bg-card/70 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 rounded-t-xl">
              <CardTitle className="text-xs sm:text-sm text-center font-semibold text-primary flex items-center justify-center">
                <UserPlus className="w-3.5 h-3.5 mr-1.5"/> {isScreenShared ? "Your Screen Share" : "Your Video"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 aspect-video bg-muted/20 flex items-center justify-center relative mt-10"> {/* mt for header height */}
              <video ref={localVideoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover transition-opacity duration-300 rounded-b-xl", (isVideoOff && !isScreenShared) ? 'opacity-0' : 'opacity-100')}></video>
              {(isVideoOff && !isScreenShared) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 rounded-b-xl">
                    <Avatar className={cn("w-24 h-24 md:w-32 md:h-32", hasCameraPermission === false && "animate-pulse-gentle")}>
                    <AvatarFallback className="text-3xl md:text-4xl bg-primary/20 text-primary rounded-full border-2 border-primary/40">
                        YOU
                    </AvatarFallback>
                    </Avatar>
                    {hasCameraPermission === false && <p className="mt-3 text-xs text-destructive">Camera not available</p>}
                </div>
              )}
               { hasCameraPermission === false && !isScreenShared && !isVideoOff && ( // Show if camera was attempted but failed
                 <Alert variant="destructive" className="absolute bottom-2 left-2 right-2 md:left-3 md:right-auto md:w-auto max-w-xs text-xs p-1.5 shadow-lg rounded-md animate-fade-in-up bg-destructive/80 backdrop-blur-sm text-destructive-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <AlertTitle className="text-xs font-semibold">Camera Error</AlertTitle>
                  <AlertDescription className="text-xs opacity-90">
                    Access denied or not found.
                  </AlertDescription>
                </Alert>
               )}
               <div className="absolute top-11 right-1.5 flex flex-col gap-1.5 z-20 p-1 bg-black/25 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {isMuted && <MicOff className="w-4 h-4 text-red-400" />}
                  {isVideoOff && !isScreenShared && <VideoOff className="w-4 h-4 text-red-400" />}
                  {!isMuted && <Mic className="w-4 h-4 text-green-400" />}
                  {!isVideoOff && !isScreenShared && <Video className="w-4 h-4 text-green-400" />}

               </div>
            </CardContent>
          </Card>
          {/* Remote Video */}
          <Card className="overflow-hidden shadow-depth-2 rounded-xl border-border/20 flex flex-col transition-all duration-300 hover:shadow-depth-3 relative bg-card/50 backdrop-blur-sm group">
             <CardHeader className="p-2.5 bg-card/70 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 rounded-t-xl">
              <CardTitle className="text-xs sm:text-sm text-center font-semibold text-foreground flex items-center justify-center">
                <Users className="w-3.5 h-3.5 mr-1.5 text-accent" /> Peer&apos;s Video
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 aspect-video bg-muted/20 flex items-center justify-center mt-10">
               <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover rounded-b-xl"></video>
               {/* Placeholder for remote, assuming srcObject handles absence */}
               {(!remoteVideoRef.current || !remoteVideoRef.current.srcObject) && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 rounded-b-xl">
                    <Avatar className="w-24 h-24 md:w-32 md:h-32">
                        <AvatarFallback className="text-3xl md:text-4xl bg-accent/20 text-accent rounded-full border-2 border-accent/40">PEER</AvatarFallback>
                    </Avatar>
                    <p className="mt-3 text-xs text-muted-foreground">Waiting for peer...</p>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <Card className="w-full lg:w-80 xl:w-96 flex flex-col shadow-depth-2 rounded-xl border-border/20 max-h-[calc(100vh-200px)] lg:max-h-full transition-all duration-300 hover:shadow-depth-3 bg-card/60 backdrop-blur-md animate-fade-in-up delay-200">
          <CardHeader className="p-3 border-b border-border/30">
            <CardTitle className="text-lg flex items-center text-primary font-semibold">
              <MessageSquare className="mr-2 h-5 w-5" /> Interview Chat
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-3 bg-background/30" viewportRef={chatScrollAreaRef}>
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
                    <Avatar className={cn("h-7 w-7 shadow-soft", msg.sender === "me" ? "ml-1.5" : "mr-1.5")}>
                       <AvatarImage src={msg.sender === 'me' ? `https://picsum.photos/seed/${'myseed'}/32/32` : `https://picsum.photos/seed/${'peerseed'}/32/32`} alt={msg.sender} data-ai-hint={msg.sender === 'me' ? "male avatar" : "female avatar"}/>
                      <AvatarFallback className={cn("text-xs",msg.sender === "me" ? "bg-primary/30 text-primary" : "bg-accent/30 text-accent")}>
                        {msg.sender === "me" ? "ME" : "P"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn("p-2.5 rounded-xl shadow-soft text-sm",
                        msg.sender === "me"
                          ? "bg-primary text-primary-foreground rounded-br-lg"
                          : "bg-card text-card-foreground rounded-bl-lg border border-border/50" 
                      )}
                    >
                      <p className="break-words leading-snug">{msg.text}</p>
                      <p className={cn("text-xs mt-1", msg.sender === "me" ? "text-primary-foreground/70" : "text-muted-foreground/70", "text-right")}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
               {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-10 text-xs animate-fade-in-up">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2.5 text-muted-foreground/40"/>
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>
          </ScrollArea>
          <CardFooter className="p-2.5 border-t border-border/30 bg-card/50 backdrop-blur-sm">
            <div className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage();}}}
                className="flex-1 h-10 focus-visible:ring-accent rounded-lg shadow-inner-soft text-sm"
                aria-label="New message input"
              />
              <Button type="submit" size="icon" onClick={handleSendMessage} className="bg-accent hover:bg-accent/80 rounded-lg w-10 h-10 shadow-md hover:shadow-accent/50 transition-all duration-200 active:scale-95 transform hover:scale-[1.05]" aria-label="Send message">
                <Send className="h-4.5 w-4.5 text-accent-foreground" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>

      <footer className="bg-background/80 backdrop-blur-md p-2.5 shadow-t-strong flex justify-center items-center space-x-2 sm:space-x-3 border-t border-border/30 animate-fade-in-up delay-300">
        {[
          { id: 'mute', Icon: isMuted ? MicOff : Mic, active: isMuted, action: toggleMute, label: isMuted ? "Unmute" : "Mute", destructive: isMuted },
          { id: 'video', Icon: isVideoOff ? CameraOff : Video, active: isVideoOff, action: toggleVideo, label: isVideoOff ? "Start Video" : "Stop Video", destructive: isVideoOff, disabled: isScreenShared },
          { id: 'screen', Icon: isScreenShared ? ScreenShareOff : ScreenShare, active: isScreenShared, action: toggleShareScreen, label: isScreenShared ? "Stop Sharing" : "Share Screen", specialActive: isScreenShared },
          { id: 'disconnect', Icon: PhoneOff, action: handleDisconnect, label: "Leave Call", destructive: true, main: true },
        ].map(control => (
          <Tooltip key={control.id}>
            <TooltipTrigger asChild>
              <Button 
                variant={control.destructive && control.active ? "destructive" : 
                         control.main ? "destructive" : 
                         control.specialActive ? "default" : // For screen share active state
                         control.active ? "secondary" : "outline"}
                size="lg" 
                onClick={control.action} 
                disabled={control.disabled}
                className={cn(
                  "rounded-full p-0 aspect-square", 
                  control.main ? "w-16 h-16 sm:w-18 sm:h-18" : "w-12 h-12 sm:w-14 sm:h-14",
                  "shadow-strong hover:shadow-depth-1 transition-all duration-200 active:scale-95 focus:ring-2 focus:ring-offset-2 transform hover:scale-[1.04] hover:-translate-y-0.5", 
                  control.main ? "bg-destructive hover:bg-destructive/85 focus:ring-destructive/60" :
                  control.destructive && control.active ? "bg-destructive hover:bg-destructive/85 focus:ring-destructive/60" 
                    : control.specialActive ? "bg-accent hover:bg-accent/85 text-accent-foreground focus:ring-accent/60"
                    : control.active ? "bg-secondary text-secondary-foreground focus:ring-primary/60" 
                    : "border-border/70 hover:border-primary focus:ring-primary/60 hover:bg-secondary/60",
                  control.disabled && "opacity-60 cursor-not-allowed hover:scale-100 hover:translate-y-0"
                )} 
                aria-label={control.label}
              >
                <control.Icon className={control.main ? "h-6 w-6 sm:h-7 sm:w-7" : "h-5 w-5 sm:h-6 sm:w-6"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="mb-1"><p>{control.label}</p></TooltipContent>
          </Tooltip>
        ))}
      </footer>
    </div>
    </TooltipProvider>
  );
}

