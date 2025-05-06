
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
  ScreenShareOff, // Changed from StopScreenShare
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
  const [hasCameraPermission, setHasCameraPermission] = useState(true); // Assume true initially

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
      setIsVideoOff(false); // Ensure video is on when stream starts
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
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      // Handle "track ended" event (e.g. user clicks "Stop sharing" button in browser UI)
      stream.getVideoTracks()[0].onended = () => {
        setIsScreenShared(false);
        if (localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        } else {
           startCameraStream(); // Fallback to camera if no prior camera stream
        }
        toast({ title: "Screen Sharing Ended", description: "You stopped sharing your screen." });
      };
      setIsScreenShared(true);
      return stream;
    } catch (err) {
      console.error("Error starting screen share:", err);
      toast({
        variant: "destructive",
        title: "Screen Share Error",
        description: "Could not start screen sharing. Please try again.",
      });
      setIsScreenShared(false); // Ensure state is correct on error
      return null;
    }
  }, [toast, startCameraStream]);


  useEffect(() => {
    if (isConnected) {
      startCameraStream().then(stream => {
        if (stream && remoteVideoRef.current) {
          // Simulate peer connection for demo
          remoteVideoRef.current.srcObject = stream; // Show local as remote for demo
        }
      });
    } else {
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
      stopStream(screenStreamRef.current);
      screenStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setIsScreenShared(false); // Reset screen share state on disconnect
    }

    // Cleanup on component unmount
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
    // Simulate connection attempt
    setTimeout(() => {
      // Simulate checking if interview ID exists
      if (!FAKE_ACTIVE_INTERVIEWS.has(interviewId) && !interviewId.startsWith("FF-NEW-")) {
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
      toast({
        title: "Connection Successful",
        description: `Joined interview: ${interviewId}`,
      });
      // If it was a newly created ID, add it to "active" list
      if (interviewId.startsWith("FF-NEW-")) {
          const confirmedId = interviewId.replace("FF-NEW-", "FF-");
          FAKE_ACTIVE_INTERVIEWS.add(confirmedId);
          setInterviewId(confirmedId); // Update ID to "confirmed" state
      }

    }, 1500);
  };

  const handleCreateInterview = () => {
    const newId = `FF-NEW-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
    setInterviewId(newId);
    // FAKE_ACTIVE_INTERVIEWS.add(newId); // Add to a temporary set or handle upon actual connection
    toast({
      title: "Interview ID Generated",
      description: `New Interview ID: ${newId}. Share this with your peer. They can join once you connect.`,
    });
  };
  
  const handleDisconnect = () => {
    setIsConnected(false);
    setMessages([]);
    toast({ title: "Disconnected", description: "You have left the interview." });
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([
        ...messages,
        { id: Date.now().toString(), text: newMessage, sender: "me", timestamp: new Date() },
      ]);
      // Simulate peer receiving message
      setTimeout(() => {
        setMessages(prev => [...prev, {id: (Date.now()+1).toString(), text: "Okay, got it!", sender: "peer", timestamp: new Date() }]);
      }, 1000);
      setNewMessage("");
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !newMutedState);
    }
    if (screenStreamRef.current && isScreenShared) {
        screenStreamRef.current.getAudioTracks().forEach(track => track.enabled = !newMutedState);
    }
    toast({ title: newMutedState ? "Microphone Muted" : "Microphone Unmuted"});
  };

  const toggleVideo = async () => {
    if (isScreenShared) {
        toast({ title: "Video Control Disabled", description: "Stop screen sharing to control your camera."});
        return;
    }
    const newVideoOffState = !isVideoOff;
    setIsVideoOff(newVideoOffState);
    if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !newVideoOffState);
    } else if (!newVideoOffState) { // if video is being turned ON and no stream exists
        await startCameraStream();
    }
    toast({ title: newVideoOffState ? "Camera Off" : "Camera On"});
  };

  const toggleShareScreen = async () => {
    if (!isScreenShared) { // Start sharing
        stopStream(localStreamRef.current); // Stop camera before screen share
        localStreamRef.current = null; // Clear camera stream ref
        if (localVideoRef.current) localVideoRef.current.srcObject = null; // Clear video element
        
        const stream = await startScreenShareStream();
        if (stream) {
             // In a real app, you'd send this new screen stream to the peer
            if (remoteVideoRef.current) {
                // For demo, also show local screen in remote view
                // remoteVideoRef.current.srcObject = stream; // This might be confusing, better to keep peer video separate
            }
            toast({ title: "Screen Sharing Started", description: "You are now sharing your screen." });
        }
    } else { // Stop sharing
        stopStream(screenStreamRef.current);
        screenStreamRef.current = null;
        setIsScreenShared(false);
        await startCameraStream(); // Restart camera stream
        toast({ title: "Screen Sharing Stopped", description: "You stopped sharing your screen." });
    }
  };


  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md shadow-2xl border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-6 p-4 bg-primary rounded-full w-fit shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M17.5 17.5 22 22"/><path d="M20 11v2a8 8 0 1 1-5.196-7.402"/><path d="M5 17A7 7 0 1 0 5 3a7 7 0 0 0 0 14Z"/><path d="M15 17A7 7 0 1 0 15 3a7 7 0 0 0 0 14Z"/></svg>
            </div>
            <CardTitle className="text-4xl font-bold text-primary">Fresher Faceoff</CardTitle>
            <CardDescription className="text-lg text-muted-foreground pt-1">Connect for a peer-to-peer interview experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <Input
              type="text"
              placeholder="Enter Interview ID"
              value={interviewId}
              onChange={(e) => setInterviewId(e.target.value)}
              className="text-base h-12 focus-visible:ring-accent focus-visible:ring-2"
            />
            <Button onClick={handleConnect} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold" disabled={isConnecting}>
              {isConnecting ? "Connecting..." : (
                <>
                  <Phone className="mr-2 h-5 w-5" /> Join Interview
                </>
              )}
            </Button>
             <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-background px-3 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
            <Button onClick={handleCreateInterview} variant="outline" className="w-full h-12 text-lg border-primary/50 hover:bg-primary/5 hover:text-primary">
              <UserPlus className="mr-2 h-5 w-5" /> Create New Interview
            </Button>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground pt-6">
            <p>Ensure a stable internet connection and allow camera/microphone access when prompted.</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-secondary overflow-hidden antialiased">
      <header className="bg-background p-3 shadow-md flex justify-between items-center border-b">
        <div className="flex items-center gap-2">
         <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M17.5 17.5 22 22"/><path d="M20 11v2a8 8 0 1 1-5.196-7.402"/><path d="M5 17A7 7 0 1 0 5 3a7 7 0 0 0 0 14Z"/><path d="M15 17A7 7 0 1 0 15 3a7 7 0 0 0 0 14Z"/></svg>
          <h1 className="text-2xl font-semibold text-primary">Fresher Faceoff</h1>
        </div>
        <span className="text-sm text-muted-foreground hidden md:block">Interview ID: <span className="font-semibold text-foreground">{interviewId}</span></span>
        <Button onClick={handleDisconnect} variant="destructive" size="sm" className="font-medium">
          <LogOut className="mr-2 h-4 w-4" /> Leave
        </Button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="overflow-hidden shadow-lg rounded-xl border-border/50">
            <CardHeader className="p-2 bg-muted/50">
              <CardTitle className="text-sm text-center text-muted-foreground">{isScreenShared ? "Your Screen Share" : "Your Video"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 aspect-video bg-card flex items-center justify-center relative">
              <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-contain ${isVideoOff && !isScreenShared ? 'hidden' : ''}`}></video>
              {isVideoOff && !isScreenShared && <Avatar className="w-28 h-28"><AvatarFallback className="text-4xl bg-primary/20 text-primary">YOU</AvatarFallback></Avatar>}
               { !hasCameraPermission && !isScreenShared && (
                 <Alert variant="destructive" className="absolute bottom-2 left-2 right-2 md:left-4 md:right-auto md:w-auto max-w-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Camera Error</AlertTitle>
                  <AlertDescription>
                    Camera access denied. Please check permissions.
                  </AlertDescription>
                </Alert>
               )}
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-lg rounded-xl border-border/50">
             <CardHeader className="p-2 bg-muted/50">
              <CardTitle className="text-sm text-center text-muted-foreground">Peer&apos;s Video</CardTitle>
            </CardHeader>
            <CardContent className="p-0 aspect-video bg-card flex items-center justify-center">
               <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain"></video>
               {/* Placeholder if peer video is off or not available */}
               {/* Example: <Avatar className="w-28 h-28"><AvatarFallback className="text-4xl bg-secondary text-secondary-foreground">PEER</AvatarFallback></Avatar> */}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <Card className="w-full lg:w-80 xl:w-96 flex flex-col shadow-lg rounded-xl border-border/50 max-h-[calc(100vh-180px)] lg:max-h-full">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-xl flex items-center text-primary">
              <MessageSquare className="mr-2 h-5 w-5" /> Chat
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-xl shadow-md ${
                      msg.sender === "me"
                        ? "bg-primary text-primary-foreground rounded-br-lg"
                        : "bg-muted text-foreground rounded-bl-lg"
                    }`}
                  >
                    <p className="text-sm break-words">{msg.text}</p>
                    <p className={`text-xs mt-1.5 ${msg.sender === "me" ? "text-primary-foreground/80" : "text-muted-foreground/80"} text-right`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
               {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>
          </ScrollArea>
          <CardFooter className="p-3 border-t bg-background/50">
            <div className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 h-10 focus-visible:ring-accent"
              />
              <Button type="submit" size="icon" onClick={handleSendMessage} className="bg-primary hover:bg-primary/90 rounded-full w-10 h-10">
                <Send className="h-5 w-5 text-primary-foreground" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>

      <footer className="bg-background p-4 shadow-t-md flex justify-center items-center space-x-3 border-t">
        <Button variant={isMuted ? "destructive" : "outline"} size="icon" onClick={toggleMute} className="rounded-full w-14 h-14 shadow-md">
          {isMuted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
        </Button>
        <Button variant={isVideoOff ? "destructive" : "outline"} size="icon" onClick={toggleVideo} className="rounded-full w-14 h-14 shadow-md" disabled={isScreenShared}>
          {isVideoOff ? <VideoOff className="h-7 w-7" /> : <Video className="h-7 w-7" />}
        </Button>
         <Button 
          variant={isScreenShared ? "default" : "outline"} 
          size="icon" 
          onClick={toggleShareScreen} 
          className="rounded-full w-14 h-14 shadow-md"
          // Use bg-accent when active (isScreenShared is true)
          style={isScreenShared ? { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' } : {}}
        >
          {isScreenShared ? <ScreenShareOff className="h-7 w-7" /> : <ScreenShare className="h-7 w-7" />}
        </Button>
        <Button variant="destructive" size="lg" onClick={handleDisconnect} className="rounded-full w-20 h-14 shadow-md px-4">
          <PhoneOff className="h-7 w-7" />
        </Button>
      </footer>
    </div>
  );
}

    