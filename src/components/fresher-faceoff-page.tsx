
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Message {
  id: string;
  text: string;
  sender: "me" | "peer";
  timestamp: Date;
}

// Simulate a list of active interview IDs for demo purposes
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
  const [hasCameraPermission, setHasCameraPermission] = useState(true); 

  const { toast } = useToast();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);


  const stopStream = (stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const startCameraStream = useCallback(async () => {
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
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description: "Please enable camera permissions in your browser settings.",
      });
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
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
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
          description: "Screen sharing access was denied. If you're in an embedded window (like an IDE), you might need to open the app in a new browser tab or check iframe permissions.",
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
          // Simulate peer connection for demo
          // In a real app, send the stream to the peer
          // For demo purposes, we can show local as remote
          const peerStream = new MediaStream();
          stream.getTracks().forEach(track => peerStream.addTrack(track.clone()));
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


  const handleConnect = () => {
    if (!interviewId.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an Interview ID or create a new one.",
      });
      return;
    }

    setIsConnecting(true);
    setTimeout(() => {
      if (!FAKE_ACTIVE_INTERVIEWS.has(interviewId.replace("FF-NEW-", "FF-")) && !interviewId.startsWith("FF-NEW-")) {
         toast({
           variant: "destructive",
           title: "Connection Failed",
           description: `No one exists with Interview ID: ${interviewId}. Please check the ID or create a new one.`,
         });
         setIsConnecting(false);
         return;
      }

      setIsConnected(true);
      setIsConnecting(false);
      let currentId = interviewId;
      if (interviewId.startsWith("FF-NEW-")) {
          currentId = interviewId.replace("FF-NEW-", "FF-");
          FAKE_ACTIVE_INTERVIEWS.add(currentId);
          setInterviewId(currentId); 
      }
      toast({
        title: "Connection Successful",
        description: `Joined interview: ${currentId}`,
      });

    }, 1500);
  };

  const handleCreateInterview = () => {
    const newId = `FF-NEW-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    setInterviewId(newId);
    toast({
      title: "Interview ID Generated",
      description: `New Interview ID: ${newId}. Share this with your peer. They can join once you connect.`,
    });
  };
  
  const handleDisconnect = () => {
    setIsConnected(false);
    setMessages([]);
    setInterviewId(""); // Clear interview ID on disconnect
    toast({ title: "Disconnected", description: "You have left the interview." });
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg: Message = { id: Date.now().toString(), text: newMessage, sender: "me", timestamp: new Date() };
      setMessages(prevMessages => [...prevMessages, newMsg]);
      
      // Simulate peer receiving message and responding
      setTimeout(() => {
        const peerResponse: Message = {id: (Date.now()+1).toString(), text: `Echo: ${newMessage}`, sender: "peer", timestamp: new Date() };
        setMessages(prev => [...prev, peerResponse]);
      }, 1000);
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
    } else if (!newVideoOffState) { // if video is being turned ON and no stream exists
        const stream = await startCameraStream();
        if(stream) setIsVideoOff(false); // only set if stream started successfully
    } else { // video is being turned OFF and no stream exists (edge case)
        setIsVideoOff(true);
    }
    toast({ title: newVideoOffState ? "Camera Off" : "Camera On"});
  };

  const toggleShareScreen = async () => {
    if (!isScreenShared) { 
        if(localStreamRef.current){
            stopStream(localStreamRef.current); 
            localStreamRef.current = null; 
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null; 
        
        const stream = await startScreenShareStream();
        if (stream) {
            toast({ title: "Screen Sharing Started", description: "You are now sharing your screen." });
        } else {
           // Error toast is handled in startScreenShareStream, maybe restart camera?
           await startCameraStream(); // Attempt to restart camera if screen share failed
        }
    } else { 
        stopStream(screenStreamRef.current);
        screenStreamRef.current = null;
        setIsScreenShared(false);
        await startCameraStream(); 
        toast({ title: "Screen Sharing Stopped", description: "You stopped sharing your screen." });
    }
  };


  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4 font-sans">
        <Card className="w-full max-w-md shadow-2xl border-primary/20 rounded-xl">
          <CardHeader className="text-center p-6">
            <div className="mx-auto mb-6 p-3 bg-primary rounded-full w-fit shadow-lg shadow-primary/30">
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M17.5 17.5 22 22"/><path d="M20 11v2a8 8 0 1 1-5.196-7.402"/><path d="M5 17A7 7 0 1 0 5 3a7 7 0 0 0 0 14Z"/><path d="M15 17A7 7 0 1 0 15 3a7 7 0 0 0 0 14Z"/></svg>
            </div>
            <CardTitle className="text-3xl font-bold text-primary tracking-tight">Fresher Faceoff</CardTitle>
            <CardDescription className="text-md text-muted-foreground pt-1">Connect for a peer-to-peer interview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <Input
              type="text"
              placeholder="Enter Interview ID"
              value={interviewId}
              onChange={(e) => setInterviewId(e.target.value)}
              className="text-base h-12 focus-visible:ring-accent focus-visible:ring-2 rounded-lg shadow-inner"
            />
            <Button onClick={handleConnect} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" disabled={isConnecting}>
              {isConnecting ? "Connecting..." : (
                <>
                  <Phone className="mr-2 h-5 w-5" /> Join Interview
                </>
              )}
            </Button>
             <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
            <Button onClick={handleCreateInterview} variant="outline" className="w-full h-12 text-lg border-primary/50 hover:bg-primary/5 hover:text-primary rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
              <UserPlus className="mr-2 h-5 w-5" /> Create New Interview
            </Button>
          </CardContent>
          <CardFooter className="text-center text-xs text-muted-foreground p-6">
            <p>Ensure a stable internet connection and allow camera/microphone access when prompted.</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-secondary overflow-hidden antialiased font-sans">
      <header className="bg-background p-3 shadow-soft flex justify-between items-center border-b">
        <div className="flex items-center gap-2">
         <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 17.5 22 22"/><path d="M20 11v2a8 8 0 1 1-5.196-7.402"/><path d="M5 17A7 7 0 1 0 5 3a7 7 0 0 0 0 14Z"/><path d="M15 17A7 7 0 1 0 15 3a7 7 0 0 0 0 14Z"/></svg>
          <h1 className="text-xl font-semibold text-primary tracking-tight">Fresher Faceoff</h1>
        </div>
        <span className="text-xs text-muted-foreground hidden md:block">Interview ID: <span className="font-semibold text-foreground">{interviewId}</span></span>
        <Button onClick={handleDisconnect} variant="destructive" size="sm" className="font-medium rounded-md shadow-sm hover:shadow-md transition-shadow">
          <LogOut className="mr-1.5 h-4 w-4" /> Leave
        </Button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="overflow-hidden shadow-strong rounded-xl border-border/30 flex flex-col">
            <CardHeader className="p-2 bg-card/80 backdrop-blur-sm">
              <CardTitle className="text-xs text-center font-medium text-muted-foreground">{isScreenShared ? "Your Screen Share" : "Your Video"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 aspect-video bg-muted/30 flex items-center justify-center relative">
              <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-contain transition-opacity duration-300 ${isVideoOff && !isScreenShared ? 'opacity-0' : 'opacity-100'}`}></video>
              {(isVideoOff && !isScreenShared) && <Avatar className="w-24 h-24 md:w-32 md:h-32 absolute"><AvatarFallback className="text-3xl md:text-4xl bg-primary/20 text-primary rounded-full">YOU</AvatarFallback></Avatar>}
               { !hasCameraPermission && !isScreenShared && (
                 <Alert variant="destructive" className="absolute bottom-2 left-2 right-2 md:left-4 md:right-auto md:w-auto max-w-xs text-xs p-2 shadow-lg rounded-md">
                  <AlertTriangle className="h-3 w-3" />
                  <AlertTitle className="text-xs">Camera Error</AlertTitle>
                  <AlertDescription className="text-xs">
                    Camera access denied.
                  </AlertDescription>
                </Alert>
               )}
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-strong rounded-xl border-border/30 flex flex-col">
             <CardHeader className="p-2 bg-card/80 backdrop-blur-sm">
              <CardTitle className="text-xs text-center font-medium text-muted-foreground">Peer&apos;s Video</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 aspect-video bg-muted/30 flex items-center justify-center">
               <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain"></video>
               {/* Placeholder if peer video is off or not available */}
               {/* <Avatar className="w-24 h-24 md:w-32 md:h-32 absolute"><AvatarFallback className="text-3xl md:text-4xl bg-secondary text-secondary-foreground rounded-full">PEER</AvatarFallback></Avatar> */}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <Card className="w-full lg:w-80 xl:w-96 flex flex-col shadow-strong rounded-xl border-border/30 max-h-[calc(100vh-200px)] lg:max-h-full">
          <CardHeader className="p-3 border-b">
            <CardTitle className="text-lg flex items-center text-primary font-semibold">
              <MessageSquare className="mr-2 h-5 w-5" /> Chat
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-3 bg-background/30">
            <div className="space-y-3.5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-2.5 rounded-lg shadow-soft ${
                      msg.sender === "me"
                        ? "bg-primary text-primary-foreground rounded-br-xl"
                        : "bg-card text-foreground rounded-bl-xl border border-border/50" 
                    }`}
                  >
                    <p className="text-sm break-words leading-snug">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === "me" ? "text-primary-foreground/70" : "text-muted-foreground/70"} text-right`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
               {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-10 text-sm">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>
          </ScrollArea>
          <CardFooter className="p-2.5 border-t bg-card/80 backdrop-blur-sm">
            <div className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 h-10 focus-visible:ring-accent rounded-lg shadow-inner"
                aria-label="New message input"
              />
              <Button type="submit" size="icon" onClick={handleSendMessage} className="bg-accent hover:bg-accent/90 rounded-full w-10 h-10 shadow-md hover:shadow-lg transition-shadow duration-200" aria-label="Send message">
                <Send className="h-5 w-5 text-accent-foreground" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>

      <footer className="bg-background p-3 shadow-t-strong flex justify-center items-center space-x-2 sm:space-x-3 border-t">
        <Button variant={isMuted ? "destructive" : "outline"} size="icon" onClick={toggleMute} className="rounded-full w-12 h-12 sm:w-14 sm:h-14 shadow-md hover:shadow-lg transition-shadow duration-200" aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}>
          {isMuted ? <MicOff className="h-6 w-6 sm:h-7 sm:w-7" /> : <Mic className="h-6 w-6 sm:h-7 sm:w-7" />}
        </Button>
        <Button variant={isVideoOff ? "destructive" : "outline"} size="icon" onClick={toggleVideo} className="rounded-full w-12 h-12 sm:w-14 sm:h-14 shadow-md hover:shadow-lg transition-shadow duration-200" disabled={isScreenShared} aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}>
          {isVideoOff ? <VideoOff className="h-6 w-6 sm:h-7 sm:w-7" /> : <Video className="h-6 w-6 sm:h-7 sm:w-7" />}
        </Button>
         <Button 
          variant="outline"
          size="icon" 
          onClick={toggleShareScreen} 
          className="rounded-full w-12 h-12 sm:w-14 sm:h-14 shadow-md hover:shadow-lg transition-shadow duration-200"
          style={isScreenShared ? { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' } : {}}
          aria-label={isScreenShared ? "Stop screen sharing" : "Start screen sharing"}
        >
          {isScreenShared ? <ScreenShareOff className="h-6 w-6 sm:h-7 sm:w-7" /> : <ScreenShare className="h-6 w-6 sm:h-7 sm:w-7" />}
        </Button>
        <Button variant="destructive" size="lg" onClick={handleDisconnect} className="rounded-full w-16 h-12 sm:w-20 sm:h-14 shadow-md hover:shadow-lg transition-shadow duration-200 px-3 sm:px-4" aria-label="Disconnect call">
          <PhoneOff className="h-6 w-6 sm:h-7 sm:w-7" />
        </Button>
      </footer>
    </div>
  );
}

    