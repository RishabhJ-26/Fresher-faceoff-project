"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, Mic, MessageSquare, Send, UserPlus, LogOut, MicOff, VideoOff, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  sender: "me" | "peer";
  timestamp: Date;
}

export function FresherFaceoffPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [interviewId, setInterviewId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const { toast } = useToast();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Placeholder for WebRTC logic
  useEffect(() => {
    if (isConnected) {
      // Simulate video stream
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            // In a real app, you'd send this stream to the peer
            // and receive their stream to display in remoteVideoRef
            if (remoteVideoRef.current) {
                 // For demo, also show local stream in remote view if no peer
                remoteVideoRef.current.srcObject = stream;
            }
            toast({ title: "Connected!", description: "Video and audio stream started." });
          })
          .catch(err => {
            console.error("Error accessing media devices.", err);
            toast({ variant: "destructive", title: "Media Error", description: "Could not access camera/microphone." });
          });
      }
    } else {
        // Cleanup streams if disconnected
        if (localVideoRef.current && localVideoRef.current.srcObject) {
            (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
            (remoteVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            remoteVideoRef.current.srcObject = null;
        }
    }
  }, [isConnected, toast]);


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
      setIsConnected(true);
      setIsConnecting(false);
      toast({
        title: "Connection Successful",
        description: `Joined interview: ${interviewId}`,
      });
    }, 1500);
  };

  const handleCreateInterview = () => {
    const newId = `FF-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
    setInterviewId(newId);
    toast({
      title: "Interview Created",
      description: `New Interview ID: ${newId}. Share this with your peer.`,
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

  const toggleMute = () => setIsMuted(!isMuted);
  const toggleVideo = () => setIsVideoOff(!isVideoOff);


  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary rounded-full w-fit">
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M17.5 17.5 22 22"/><path d="M20 11v2a8 8 0 1 1-5.196-7.402"/><path d="M5 17A7 7 0 1 0 5 3a7 7 0 0 0 0 14Z"/><path d="M15 17A7 7 0 1 0 15 3a7 7 0 0 0 0 14Z"/></svg>
            </div>
            <CardTitle className="text-3xl font-bold text-primary">Fresher Faceoff</CardTitle>
            <CardDescription className="text-lg">Connect for a peer interview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input
              type="text"
              placeholder="Enter Interview ID"
              value={interviewId}
              onChange={(e) => setInterviewId(e.target.value)}
              className="text-base h-12"
            />
            <Button onClick={handleConnect} className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isConnecting}>
              {isConnecting ? "Connecting..." : (
                <>
                  <Phone className="mr-2 h-5 w-5" /> Join Interview
                </>
              )}
            </Button>
             <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
            <Button onClick={handleCreateInterview} variant="outline" className="w-full h-12">
              <UserPlus className="mr-2 h-5 w-5" /> Create New Interview
            </Button>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground">
            <p>Ensure you have a stable internet connection and allow camera/microphone access.</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-secondary overflow-hidden">
      <header className="bg-background p-3 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2">
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M17.5 17.5 22 22"/><path d="M20 11v2a8 8 0 1 1-5.196-7.402"/><path d="M5 17A7 7 0 1 0 5 3a7 7 0 0 0 0 14Z"/><path d="M15 17A7 7 0 1 0 15 3a7 7 0 0 0 0 14Z"/></svg>
          <h1 className="text-xl font-semibold text-primary">Fresher Faceoff</h1>
        </div>
        <span className="text-sm text-muted-foreground">Interview ID: {interviewId}</span>
        <Button onClick={handleDisconnect} variant="destructive" size="sm">
          <LogOut className="mr-2 h-4 w-4" /> Leave Interview
        </Button>
      </header>

      <main className="flex-1 flex flex-col md:flex-row gap-2 p-2 overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
          <Card className="overflow-hidden shadow-lg">
            <CardHeader className="p-2 bg-muted">
              <CardTitle className="text-sm text-center text-muted-foreground">Your Video</CardTitle>
            </CardHeader>
            <CardContent className="p-0 aspect-video bg-black flex items-center justify-center">
              <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}></video>
              {isVideoOff && <Avatar className="w-24 h-24"><AvatarFallback className="text-3xl">YOU</AvatarFallback></Avatar>}
            </CardContent>
          </Card>
          <Card className="overflow-hidden shadow-lg">
             <CardHeader className="p-2 bg-muted">
              <CardTitle className="text-sm text-center text-muted-foreground">Peer's Video</CardTitle>
            </CardHeader>
            <CardContent className="p-0 aspect-video bg-black flex items-center justify-center">
               <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
               {/* Add fallback if peer video is off or not available */}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <Card className="w-full md:w-80 lg:w-96 flex flex-col shadow-lg">
          <CardHeader className="p-3 border-b">
            <CardTitle className="text-lg flex items-center text-primary">
              <MessageSquare className="mr-2 h-5 w-5" /> Chat
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] p-2.5 rounded-xl shadow ${
                      msg.sender === "me"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === "me" ? "text-blue-200" : "text-muted-foreground/80"}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <CardFooter className="p-3 border-t">
            <div className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1"
              />
              <Button type="submit" size="icon" onClick={handleSendMessage} className="bg-accent hover:bg-accent/90">
                <Send className="h-4 w-4 text-accent-foreground" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>

      <footer className="bg-background p-3 shadow-t-md flex justify-center items-center space-x-3">
        <Button variant={isMuted ? "destructive" : "outline"} size="icon" onClick={toggleMute} className="rounded-full w-12 h-12">
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>
        <Button variant={isVideoOff ? "destructive" : "outline"} size="icon" onClick={toggleVideo} className="rounded-full w-12 h-12">
          {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </Button>
        <Button variant="destructive" size="icon" onClick={handleDisconnect} className="rounded-full w-16 h-12">
          <PhoneOff className="h-6 w-6" />
        </Button>
      </footer>
    </div>
  );
}
