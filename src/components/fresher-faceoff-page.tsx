
"use client";

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
  const [hasCameraPermission, setHasCameraPermission] = useState(true); // Assume true initially, verify on connect
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
    if (screenStreamRef.current) {
        stopStream(screenStreamRef.current);
        screenStreamRef.current = null;
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        toast({
          variant: "destructive",
          title: "Screen Share Not Supported",
          description: "Your browser does not support screen sharing.",
        });
        return null;
      }
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
           startCameraStream(); 
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
          description: "Screen sharing access was denied. If you are in an embedded environment (e.g., an IDE or iframe), try opening the application in a standalone browser window. Otherwise, check your browser's screen recording permissions.",
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
          // Simulate peer connection for demo - clone local stream to remote for visualization
          const peerStream = new MediaStream();
          stream.getTracks().forEach(track => {
            const clonedTrack = track.clone();
            // Simulate remote user not being muted initially
            if (clonedTrack.kind === 'audio') clonedTrack.enabled = true;
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
        title: "Interview ID Missing",
        description: "Please enter an Interview ID or create a new one to connect.",
      });
      return;
    }

    setIsConnecting(true);
    // Simulate network delay
    setTimeout(() => {
      // Logic to check if interviewId exists (if it's not a new one)
      if (!FAKE_ACTIVE_INTERVIEWS.has(interviewId.replace("FF-NEW-", "FF-")) && !interviewId.startsWith("FF-NEW-")) {
         toast({
           variant: "destructive",
           title: "Connection Failed",
           description: `Interview ID "${interviewId}" not found. Please check the ID or create a new one.`,
         });
         setIsConnecting(false);
         return;
      }

      setIsConnected(true);
      setIsConnecting(false);
      let currentId = interviewId;
      if (interviewId.startsWith("FF-NEW-")) {
          // This is a new interview being started by this user
          currentId = interviewId.replace("FF-NEW-", "FF-");
          FAKE_ACTIVE_INTERVIEWS.add(currentId); // Add to "active" list
          setInterviewId(currentId); // Update the displayed ID
          toast({
            title: "Interview Created & Joined!",
            description: `You are connected to: ${currentId}. Share this ID with your peer.`,
          });
      } else {
        // Joining an existing interview
        toast({
          title: "Connection Successful!",
          description: `You are connected to interview: ${currentId}`,
        });
      }
    }, 1500);
  };
  
  const handleCreateInterview = () => {
    // Generate a more user-friendly ID structure
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newId = `FF-NEW-${randomPart}`;
    setInterviewId(newId);
    toast({
      title: "New Interview ID Generated!",
      description: (
        <div>
          <p>Your new Interview ID is: <strong className="text-accent">{newId}</strong></p>
          <p className="text-xs mt-1">Share this with your peer. They can join once you click 'Join Interview'.</p>
        </div>
      ),
      duration: 7000,
    });
  };
  
  const handleDisconnect = () => {
    setIsConnected(false);
    setMessages([]);
    setInterviewId(""); 
    FAKE_ACTIVE_INTERVIEWS.delete(interviewId); // Clean up demo ID
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
      
      // Simulate peer response
      setTimeout(() => {
        const peerResponse: Message = {
          id: `msg-${Date.now() + 1}-${Math.random()}`, 
          text: `Thanks for your message: "${newMessage.length > 30 ? newMessage.substring(0,27) + '...' : newMessage}"`, 
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
    
    if (localStreamRef.current) { // If stream exists, toggle track
        localStreamRef.current.getVideoTracks().forEach(track => {
          track.enabled = !newVideoOffState;
        });
        setIsVideoOff(newVideoOffState);
    } else if (!newVideoOffState) { // If no stream and trying to turn ON
        const stream = await startCameraStream();
        if(stream) setIsVideoOff(false); // Successfully started
    } else { // If no stream and trying to turn OFF (or already off)
        setIsVideoOff(true);
    }
    toast({ title: newVideoOffState ? "Camera Off" : "Camera On"});
  };

  const toggleShareScreen = async () => {
    if (!isScreenShared) { 
        // Turning screen share ON
        if(localStreamRef.current){ // Stop camera stream if it exists
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null; 
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null; // Clear video element
        
        const stream = await startScreenShareStream();
        if (stream) { // Screen share started successfully
            toast({ title: "Screen Sharing Started", description: "You are now sharing your screen." });
        } else { // Screen share failed or was cancelled, try to restart camera
           await startCameraStream(); 
        }
    } else { 
        // Turning screen share OFF
        if(screenStreamRef.current){
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }
        setIsScreenShared(false);
        await startCameraStream(); // Restart camera stream
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-6 font-sans animate-background-gradient">
        <Card className="w-full max-w-lg shadow-2xl border-primary/20 rounded-2xl animate-pop bg-card/80 backdrop-blur-md">
          <CardHeader className="text-center p-8">
            <div className="mx-auto mb-6 p-4 bg-gradient-to-br from-primary to-accent rounded-full w-fit shadow-xl shadow-primary/30 transform transition-transform hover:scale-110">
             <Users className="h-12 w-12 text-primary-foreground" />
            </div>
            <div className="animate-fade-in delay-100">
              <CardTitle className="text-4xl font-bold text-primary tracking-tight">Fresher Faceoff</CardTitle>
              <CardDescription className="text-lg text-muted-foreground pt-2">Peer-to-Peer Interview Platform</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            <div className="relative animate-fade-in delay-200">
              <Input
                type="text"
                placeholder="Enter or Generate Interview ID"
                value={interviewId}
                onChange={(e) => setInterviewId(e.target.value)}
                className="text-base h-14 focus-visible:ring-accent focus-visible:ring-2 rounded-xl shadow-inner pl-4 pr-12 text-lg"
                aria-label="Interview ID Input"
              />
              {interviewId && (
                 <Button variant="ghost" size="icon" onClick={handleCopyInterviewId} className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-primary" aria-label="Copy Interview ID">
                    {copied ? <Check className="h-6 w-6 text-green-500" /> : <Copy className="h-6 w-6" />}
                </Button>
              )}
            </div>
            <div className="animate-fade-in delay-300">
              <Button onClick={handleConnect} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-xl font-semibold rounded-xl shadow-lg hover:shadow-primary/40 transition-all duration-300 ease-out active:scale-95 transform hover:scale-[1.02]" disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2.5 h-6 w-6 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2.5 h-6 w-6" /> Join Interview
                  </>
                )}
              </Button>
            </div>
            <div className="animate-fade-in delay-400">
              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/70" />
                </div>
                <div className="relative flex justify-center text-sm uppercase">
                  <span className="bg-card/80 px-3 text-muted-foreground rounded-full">
                    Or
                  </span>
                </div>
              </div>
              <Button onClick={handleCreateInterview} variant="outline" className="w-full h-14 text-xl border-primary/60 hover:bg-primary/10 hover:text-primary rounded-xl shadow-md hover:shadow-primary/20 transition-all duration-300 ease-out active:scale-95 transform hover:scale-[1.02]">
                <UserPlus className="mr-2.5 h-6 w-6" /> Create New
              </Button>
            </div>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground p-8 animate-fade-in delay-500">
            <Info className="h-4 w-4 mr-1.5 inline-block"/>
            Ensure a stable internet connection and allow camera/microphone access.
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Connected State UI
  return (
    <TooltipProvider delayDuration={100}>
    <div className="flex flex-col h-screen bg-secondary overflow-hidden antialiased font-sans">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md p-3 shadow-lg flex justify-between items-center border-b border-border/50 z-10">
        <div className="flex items-center gap-3 animate-slide-in-left">
          <Users className="h-8 w-8 text-primary"/>
          <h1 className="text-2xl font-semibold text-primary tracking-tight">Fresher Faceoff</h1>
        </div>
        <div className="flex items-center gap-2 text-sm animate-fade-in delay-200">
            <span className="text-muted-foreground hidden md:inline">ID:</span> 
            <span className="font-semibold text-foreground bg-primary/10 px-2 py-1 rounded-md">{interviewId.replace("FF-NEW-", "FF-")}</span>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleCopyInterviewId} className="h-9 w-9 text-muted-foreground hover:text-primary" aria-label="Copy Interview ID">
                        {copied ? <Check className="h-5 w-5 text-green-500 animate-pop" /> : <Copy className="h-5 w-5" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Copy Interview ID</p></TooltipContent>
            </Tooltip>
        </div>
        <Button onClick={handleDisconnect} variant="destructive" size="sm" className="font-medium rounded-lg shadow-md hover:shadow-destructive/30 transition-all duration-200 active:scale-95 transform hover:scale-[1.03] animate-slide-in-right">
          <LogOut className="mr-1.5 h-4 w-4" /> Leave
        </Button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden bg-modern-gradient">
        {/* Video Area */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in delay-100">
          {/* Local Video */}
          <Card className="overflow-hidden shadow-xl rounded-xl border-border/30 flex flex-col transition-all duration-300 hover:shadow-2xl relative bg-muted/20 backdrop-blur-sm">
            <CardHeader className="p-3 bg-card/60 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 rounded-t-xl">
              <CardTitle className="text-sm text-center font-semibold text-primary flex items-center justify-center">
                <UserPlus className="w-4 h-4 mr-2"/> {isScreenShared ? "Your Screen Share" : "Your Video"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 aspect-video bg-muted/30 flex items-center justify-center relative mt-12"> {/* mt-12 for header height */}
              <video ref={localVideoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover transition-opacity duration-300 rounded-b-xl", (isVideoOff && !isScreenShared) ? 'opacity-0' : 'opacity-100')}></video>
              {(isVideoOff && !isScreenShared) && (
                <Avatar className={cn("w-32 h-32 md:w-40 md:h-40 absolute", !hasCameraPermission && "animate-pulse-subtle")}>
                  <AvatarFallback className="text-4xl md:text-5xl bg-primary/20 text-primary rounded-full border-2 border-primary/50">
                    YOU
                  </AvatarFallback>
                </Avatar>
              )}
               { !hasCameraPermission && !isScreenShared && (
                 <Alert variant="destructive" className="absolute bottom-3 left-3 right-3 md:left-4 md:right-auto md:w-auto max-w-xs text-xs p-2 shadow-lg rounded-md animate-fade-in bg-destructive/80 backdrop-blur-sm text-destructive-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">Camera Error</AlertTitle>
                  <AlertDescription className="text-xs">
                    Camera access denied or not found.
                  </AlertDescription>
                </Alert>
               )}
               {/* Status icons for local video */}
               <div className="absolute top-14 right-2 flex flex-col gap-2 z-20 p-1 bg-black/20 rounded-md">
                  {isMuted && <MicOff className="w-5 h-5 text-red-400" />}
                  {isVideoOff && !isScreenShared && <VideoOff className="w-5 h-5 text-red-400" />}
               </div>
            </CardContent>
          </Card>
          {/* Remote Video */}
          <Card className="overflow-hidden shadow-xl rounded-xl border-border/30 flex flex-col transition-all duration-300 hover:shadow-2xl relative bg-muted/20 backdrop-blur-sm">
             <CardHeader className="p-3 bg-card/60 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 rounded-t-xl">
              <CardTitle className="text-sm text-center font-semibold text-foreground flex items-center justify-center">
                <Users className="w-4 h-4 mr-2 text-accent" /> Peer&apos;s Video
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 aspect-video bg-muted/30 flex items-center justify-center mt-12">
               <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover rounded-b-xl"></video>
               {/* Placeholder when remote video is not available - you might need state for this */}
               {/* <Avatar className="w-32 h-32 md:w-40 md:h-40 absolute"><AvatarFallback className="text-4xl md:text-5xl bg-accent/20 text-accent rounded-full border-2 border-accent/50">PEER</AvatarFallback></Avatar> */}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <Card className="w-full lg:w-96 xl:w-[26rem] flex flex-col shadow-xl rounded-xl border-border/30 max-h-[calc(100vh-220px)] lg:max-h-full transition-all duration-300 hover:shadow-2xl bg-card/70 backdrop-blur-md animate-fade-in delay-200">
          <CardHeader className="p-4 border-b border-border/50">
            <CardTitle className="text-xl flex items-center text-primary font-semibold">
              <MessageSquare className="mr-2.5 h-6 w-6" /> Interview Chat
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-4 bg-background/40" viewportRef={chatScrollAreaRef}>
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex animate-slide-in-bottom",
                    msg.sender === "me" ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn("flex items-end gap-2 max-w-[90%]", msg.sender === "me" ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className={cn("h-8 w-8 shadow-sm", msg.sender === "me" ? "ml-2" : "mr-2")}>
                      <AvatarImage src={msg.sender === 'me' ? `https://picsum.photos/seed/${'myseed'}/40/40` : `https://picsum.photos/seed/${'peerseed'}/40/40`} alt={msg.sender} data-ai-hint={msg.sender === 'me' ? "male avatar" : "female avatar"}/>
                      <AvatarFallback className={cn(msg.sender === "me" ? "bg-primary/30 text-primary" : "bg-accent/30 text-accent")}>
                        {msg.sender === "me" ? "ME" : "P"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`p-3 rounded-2xl shadow-md ${
                        msg.sender === "me"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card text-card-foreground rounded-bl-md border border-border/60" 
                      }`}
                    >
                      <p className="text-sm break-words leading-relaxed">{msg.text}</p>
                      <p className={`text-xs mt-1.5 ${msg.sender === "me" ? "text-primary-foreground/80" : "text-muted-foreground/80"} text-right`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
               {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-12 text-sm animate-fade-in">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50"/>
                  No messages yet. <br/> Start the conversation!
                </div>
              )}
            </div>
          </ScrollArea>
          <CardFooter className="p-3 border-t border-border/50 bg-card/60 backdrop-blur-sm">
            <div className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage();}}}
                className="flex-1 h-11 focus-visible:ring-accent rounded-lg shadow-inner text-sm"
                aria-label="New message input"
              />
              <Button type="submit" size="icon" onClick={handleSendMessage} className="bg-accent hover:bg-accent/90 rounded-lg w-11 h-11 shadow-md hover:shadow-accent/40 transition-all duration-200 active:scale-95 transform hover:scale-[1.05]" aria-label="Send message">
                <Send className="h-5 w-5 text-accent-foreground" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>

      {/* Controls Footer */}
      <footer className="bg-background/80 backdrop-blur-md p-3 shadow-t-strong flex justify-center items-center space-x-3 sm:space-x-4 border-t border-border/50 animate-fade-in delay-300">
        {[
          { id: 'mute', Icon: isMuted ? MicOff : Mic, active: isMuted, action: toggleMute, label: isMuted ? "Unmute" : "Mute", destructive: isMuted },
          { id: 'video', Icon: isVideoOff ? VideoOff : Video, active: isVideoOff, action: toggleVideo, label: isVideoOff ? "Start Video" : "Stop Video", destructive: isVideoOff, disabled: isScreenShared },
          { id: 'screen', Icon: isScreenShared ? ScreenShareOff : ScreenShare, active: isScreenShared, action: toggleShareScreen, label: isScreenShared ? "Stop Sharing" : "Share Screen", destructive: false /* Special active color for screen share */ },
          { id: 'disconnect', Icon: PhoneOff, active: false, action: handleDisconnect, label: "Leave Call", destructive: true, main: true },
        ].map(control => (
          <Tooltip key={control.id}>
            <TooltipTrigger asChild>
              <Button 
                variant={control.destructive && control.active || (control.id === 'disconnect') ? "destructive" : (control.active ? "secondary" : "outline")}
                size="lg" 
                onClick={control.action} 
                disabled={control.disabled}
                className={cn(
                  "rounded-full p-0", 
                  control.main ? "w-20 h-14 sm:w-24 sm:h-14" : "w-14 h-14 sm:w-16 sm:h-16",
                  "shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 focus:ring-2 focus:ring-offset-2 transform hover:scale-[1.05]", 
                  control.destructive && control.active ? "bg-destructive hover:bg-destructive/90 focus:ring-destructive/50" 
                    : control.id === 'disconnect' ? "bg-destructive hover:bg-destructive/90 focus:ring-destructive/50" 
                    : control.id === 'screen' && control.active ? "bg-accent hover:bg-accent/90 text-accent-foreground focus:ring-accent/50"
                    : control.active ? "bg-secondary text-secondary-foreground focus:ring-primary/50" 
                    : "focus:ring-primary/50 hover:bg-secondary/70",
                  control.disabled && "opacity-50 cursor-not-allowed hover:scale-100"
                )} 
                aria-label={control.label}
              >
                <control.Icon className={control.main ? "h-6 w-6 sm:h-7 sm:w-7" : "h-6 w-6 sm:h-7 sm:w-7"} />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{control.label}</p></TooltipContent>
          </Tooltip>
        ))}
      </footer>
    </div>
    </TooltipProvider>
  );
}
