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
  Info,
  Users,
  LogIn,
  Sparkles,
  CameraOff,
  Play,
  Pause,
  RefreshCw,
  Clock,
  Bot,
  ThumbsUp,
  ThumbsDown,
  UserCircle,
  Share2,
  MessageCircleQuestion,
  Users2,
  Settings2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateInterviewQuestions, type GenerateInterviewQuestionsOutput } from "@/ai/flows/generate-interview-questions-flow";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";


interface Message {
  id: string;
  text: string;
  sender: "me" | "peer" | "ai" | "system";
  timestamp: Date;
  feedback?: "good" | "bad" | null;
  reactions?: string[];
}

const FAKE_ACTIVE_INTERVIEWS = new Set<string>();

const INTERVIEW_CATEGORIES = [
  { value: "Software Engineering", label: "Software Engineering" },
  { value: "Product Management", label: "Product Management" },
  { value: "Data Science", label: "Data Science" },
  { value: "Marketing", label: "Marketing" },
  { value: "HR & Behavioral", label: "HR & Behavioral" },
  { value: "System Design", label: "System Design" },
  { value: "Frontend Development", label: "Frontend Development" },
  { value: "Backend Development", label: "Backend Development" },
  { value: "DevOps & SRE", label: "DevOps & SRE" },
  { value: "Cybersecurity", label: "Cybersecurity" },
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
  
  const [interviewCategory, setInterviewCategory] = useState<string>("");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);

  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showAiFeedbackProcessing, setShowAiFeedbackProcessing] = useState(false);
  const [isPeerConnected, setIsPeerConnected] = useState(false);


  const { toast } = useToast();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);


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
    
    if (localStreamRef.current && !isScreenShared) { 
        localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !isMuted);
        localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
        if (localVideoRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
             localVideoRef.current.srcObject = localStreamRef.current;
        }
        setHasCameraPermission(true); 
        return localStreamRef.current;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current && !isScreenShared) { 
        localVideoRef.current.srcObject = stream;
      }
      stream.getAudioTracks().forEach(track => track.enabled = !isMuted);
      stream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);

      setHasCameraPermission(true);
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
  }, [isMuted, isVideoOff, toast, isScreenShared]);


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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        // audio: true // Consider if audio sharing from screen is needed
      });
      screenStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream; 
      }
      
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => track.enabled = false);
        // Ensure audio from local mic continues if not muted
        localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !isMuted);
      }

      stream.getVideoTracks()[0].onended = () => { 
        setIsScreenShared(false); 
        if (localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current; 
            localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !isVideoOff); 
        } else if (!localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = null; 
        }
        toast({ title: "Screen Sharing Ended", description: "You stopped sharing your screen." });
      };
      setIsScreenShared(true);
      setIsVideoOff(false); 
      return stream;
    } catch (err: any) {
      console.error("Error starting screen share:", err);
       if (err.name === "NotAllowedError" || err.message?.includes("permission") || err.message?.includes("disallowed by permissions policy") || err.message?.includes("Permission denied by system")) {
        toast({
          variant: "destructive",
          title: "Screen Share Permission Denied",
          description: "Screen sharing access was denied. Ensure page is served over HTTPS or permissions are granted in browser/OS settings.",
          duration: 10000,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Screen Share Error",
          description: `Could not start screen sharing. ${err.name}: ${err.message}`,
        });
      }
      setIsScreenShared(false);
      return null;
    }
  }, [toast, isMuted, isVideoOff]); 


 useEffect(() => {
    let isMounted = true;

    const manageStreams = async () => {
        if (!isMounted) return;

        if (isConnected) {
            if (!localStreamRef.current && hasCameraPermission !== false && !isScreenShared) {
                await startCameraStream(false); 
            }

            if (localStreamRef.current) {
                localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !isMuted);
                if (!isScreenShared) { 
                    localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
                } else { 
                    localStreamRef.current.getVideoTracks().forEach(track => track.enabled = false);
                }
            }

            if (isScreenShared) { 
                if (screenStreamRef.current && localVideoRef.current && localVideoRef.current.srcObject !== screenStreamRef.current) {
                    localVideoRef.current.srcObject = screenStreamRef.current;
                }
            } else { 
                if (localStreamRef.current && localVideoRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
                    localVideoRef.current.srcObject = localStreamRef.current;
                } else if (!localStreamRef.current && localVideoRef.current && !isVideoOff && hasCameraPermission === true) { 
                     localVideoRef.current.srcObject = null; 
                } else if (hasCameraPermission === false && localVideoRef.current) {
                    localVideoRef.current.srcObject = null;
                }
            }
            
            // Simulate peer connection and stream for UI
            if (isPeerConnected && remoteVideoRef.current) {
                if (isScreenShared && screenStreamRef.current) { // If local user is screen sharing
                    const peerScreenStream = new MediaStream();
                    if (localStreamRef.current) {
                        localStreamRef.current.getAudioTracks().forEach(track => {
                            if (track.readyState === 'live') {
                                const clonedTrack = track.clone();
                                clonedTrack.enabled = !isMuted; 
                                peerScreenStream.addTrack(clonedTrack);
                            }
                        });
                    }
                    screenStreamRef.current.getVideoTracks().forEach(track => {
                       if (track.readyState === 'live') {
                           const clonedTrack = track.clone();
                           clonedTrack.enabled = true; 
                           peerScreenStream.addTrack(clonedTrack);
                       }
                    });
                    if (remoteVideoRef.current.srcObject !== peerScreenStream ) {
                       remoteVideoRef.current.srcObject = peerScreenStream;
                    }
                } else if (localStreamRef.current && !isScreenShared) { // Local user is on camera
                    const peerCameraStream = new MediaStream();
                    localStreamRef.current.getTracks().forEach(track => {
                        if (track.readyState === 'live') {
                            const clonedTrack = track.clone();
                            if (track.kind === 'audio') clonedTrack.enabled = !isMuted;
                            if (track.kind === 'video') clonedTrack.enabled = !isVideoOff;
                            peerCameraStream.addTrack(clonedTrack);
                        }
                    });
                    if (remoteVideoRef.current.srcObject !== peerCameraStream ) {
                         remoteVideoRef.current.srcObject = peerCameraStream;
                    }
                } else { // No local stream to mirror for peer, or peer's camera is off.
                    // To simulate peer's camera being off, we can set srcObject to null.
                    // This part depends on how you want to represent peer's video off state.
                    // For now, if local stream is not available to "fake" as peer, clear it.
                    remoteVideoRef.current.srcObject = null;
                }
            } else if (!isPeerConnected && remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null; // Clear peer video if not connected
            }

        } else { 
            stopStream(localStreamRef.current); localStreamRef.current = null;
            stopStream(screenStreamRef.current); screenStreamRef.current = null;
            if (localVideoRef.current) localVideoRef.current.srcObject = null;
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            setIsScreenShared(false); 
        }
    };

    manageStreams();

    return () => {
        isMounted = false;
    };
  }, [isConnected, isScreenShared, isMuted, isVideoOff, startCameraStream, hasCameraPermission, isPeerConnected]);


  useEffect(() => {
    if (chatScrollAreaRef.current && isConnected) {
        chatScrollAreaRef.current.scrollTo({ 
            top: chatScrollAreaRef.current.scrollHeight, 
            behavior: 'smooth' 
        });
    }
  }, [messages, isConnected]);

  const handleConnect = async () => {
    if (!interviewId.trim()) {
      toast({
        variant: "destructive",
        title: "Interview ID Required",
        description: "Please enter an Interview ID or create a new one.",
      });
      return;
    }
    setIsConnecting(true);
    
    await startCameraStream(false); 
    
    if (hasCameraPermission === false && !isVideoOff) { 
        toast({
            variant: "default",
            title: "Camera Access Recommended",
            description: "Camera access is denied or unavailable. Some features might be limited. You can enable it in browser settings.",
            duration: 7000,
        });
    }

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
          setTimeout(() => {
            if(isConnected) { // Check if still connected before showing peer connected toast
              setIsPeerConnected(true);
              setMessages(prev => [...prev, {id: `sys-${Date.now()}`, text: "Peer has joined the interview!", sender: "system", timestamp: new Date()}]);
              toast({title: "Peer Connected!", description: "Your peer has joined the interview."});
            }
          }, 2000);

      } else {
        toast({
          title: "Connection Successful!",
          description: `Joined interview: ${currentId}`,
        });
        setIsPeerConnected(true); 
        setMessages(prev => [...prev, {id: `sys-${Date.now()}`, text: "Peer is in the interview.", sender: "system", timestamp: new Date()}]);
      }
      setIsTimerRunning(true);
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
    setIsPeerConnected(false);
    setMessages([]);
    const effectiveId = interviewId.replace("FF-NEW-", "FF-");
    FAKE_ACTIVE_INTERVIEWS.delete(effectiveId);
    
    toast({ title: "Disconnected", description: "You have left the interview session." });

    setIsTimerRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTimerSeconds(0);

    setShowAiFeedbackProcessing(false);

    stopStream(localStreamRef.current); localStreamRef.current = null;
    stopStream(screenStreamRef.current); screenStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    
    setIsScreenShared(false);
    // Reset camera permission to null to allow re-check on next connection
    // setHasCameraPermission(null); // This might be too aggressive, user might just be rejoining.
                                 // Let's keep hasCameraPermission state unless explicitly reset or error.
  };

  const handleSendMessage = (text?: string, sender: "me" | "ai" = "me") => {
    const messageText = text || newMessage;
    if (!messageText.trim()) return;

    if (!isPeerConnected && sender === "me") {
       const pendingMsg: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        text: messageText,
        sender: "me",
        timestamp: new Date(),
      };
      setMessages(prevMessages => [...prevMessages, pendingMsg, {id: `sys-wait-${Date.now()}`, text: "(Message will be sent once peer connects...)", sender: "system", timestamp: new Date()} ]);
      setNewMessage(""); // Clear input after preparing to send
      return;
    }

    const newMsg: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      text: messageText,
      sender: sender,
      timestamp: new Date(),
      feedback: sender === "ai" ? null : undefined,
    };
    setMessages(prevMessages => [...prevMessages, newMsg]);

    if (sender === "me") {
      // Simulate peer receiving the message
      setTimeout(() => {
        const peerResponse: Message = {
          id: `msg-${Date.now() + 1}-${Math.random()}`,
          text: `Mock response: "${messageText.length > 25 ? messageText.substring(0,22) + '...' : messageText}"`, 
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

    if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !newMutedState);
    }
    toast({ title: newMutedState ? "Microphone Muted" : "Microphone Unmuted"});
};

const toggleVideo = async () => {
    if (isScreenShared) { 
        stopStream(screenStreamRef.current);
        screenStreamRef.current = null;
        setIsScreenShared(false); 
        
        const newDesiredVideoOffState = isVideoOff; // Keep the user's intended camera state
        if (!newDesiredVideoOffState) { 
            const stream = await startCameraStream(false); 
            if (stream) {
                toast({ title: "Screen Share Stopped, Camera On" });
                 if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                 stream.getVideoTracks().forEach(track => track.enabled = true); // Explicitly enable
            } else {
                toast({ title: "Screen Share Stopped, Camera Failed to Start", description: "Camera might be off or permission denied." });
                setIsVideoOff(true); 
            }
        } else { 
             toast({ title: "Screen Share Stopped", description: "Camera remains off." });
             if (localStreamRef.current) { 
                localStreamRef.current.getVideoTracks().forEach(track => track.enabled = false);
                if(localVideoRef.current) {
                   localVideoRef.current.srcObject = localStreamRef.current; 
                }
             } else if (localVideoRef.current) { 
                localVideoRef.current.srcObject = null;
             }
        }
        return; 
    }

    const newVideoOffState = !isVideoOff;
    setIsVideoOff(newVideoOffState);

    if (!newVideoOffState) { 
        const stream = await startCameraStream(false);
        if (stream) {
            if (localVideoRef.current && localStreamRef.current) { 
                localVideoRef.current.srcObject = localStreamRef.current;
                localStreamRef.current.getVideoTracks().forEach(track => track.enabled = true);
            }
            toast({ title: "Camera On" });
        } else {
            toast({ variant: "destructive", title:"Camera Failed", description: "Could not start camera. Check permissions."});
            setIsVideoOff(true); 
        }
    } else { 
         if (localStreamRef.current) {
             localStreamRef.current.getVideoTracks().forEach(track => track.enabled = false);
         } 
         // Don't set srcObject to null here if stream exists, just disable tracks.
         // This allows showing a black frame or avatar if hasCameraPermission is true but video is off.
         // If hasCameraPermission is false, srcObject should already be null or will be handled by useEffect.
         toast({ title: "Camera Off" });
    }
};


const toggleShareScreen = async () => {
    if (!isScreenShared) { 
        const stream = await startScreenShareStream(); 
        if (stream) {
            toast({ title: "Screen Sharing Started", description: "You are now sharing your screen." });
        }
    } else { 
        stopStream(screenStreamRef.current);
        screenStreamRef.current = null;
        setIsScreenShared(false);
        if (localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current; 
            localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !isVideoOff); 
        } else if (localVideoRef.current) { 
            localVideoRef.current.srcObject = null; 
        }
        toast({ title: "Screen Sharing Stopped" });
    }
  };


  const handleCopyInterviewId = () => {
    const idToCopy = interviewId.replace("FF-NEW-", "FF-");
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({title: "Copied!", description: "Interview ID copied to clipboard."});
    }
  };

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
        toast({ title: "AI Questions Generated!", description: `Found ${result.questions.length} questions for "${topic}".` });
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


  const handleMessageFeedback = (messageId: string, feedback: "good" | "bad") => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );
    toast({ title: "Feedback Submitted", description: `Marked AI response as ${feedback}.` });
  };

  const handleGetAiFeedback = () => {
    if (messages.filter(m => m.sender === "me" || m.sender === "peer").length < 2) {
      toast({ variant: "destructive", title: "Not Enough Interaction", description: "Please have a more substantial conversation before requesting AI feedback." });
      return;
    }
    setShowAiFeedbackProcessing(true);
    setTimeout(() => {
      const feedbackText = `Overall, the interview interaction showed good potential. Key strengths include clear communication and relevant questions. Areas for improvement could be to elaborate more on answers and to ask more follow-up questions to dive deeper into topics. The pacing was generally good. Remember to maintain eye contact and show enthusiasm!`;
      handleSendMessage(feedbackText, "ai"); 
      setShowAiFeedbackProcessing(false);
      toast({ title: "AI Feedback Generated!", description: "Check the chat for insights." });
    }, 2500);
  };

  const handleShareInterview = () => {
    const idToShare = interviewId.replace("FF-NEW-", "FF-");
    if (navigator.share) {
      navigator.share({
        title: 'Join My Fresher Faceoff Interview!',
        text: `Let's practice! Join my Fresher Faceoff interview with ID: ${idToShare}`,
        url: window.location.href, 
      })
      .then(() => toast({ title: "Shared!", description: "Interview details sent."}))
      .catch((error) => {
        console.error('Error sharing:', error);
        handleCopyInterviewId(); 
        toast({title: "Share Failed, ID Copied", description: "Could not use share. Interview ID copied to clipboard instead."});
      });
    } else {
      handleCopyInterviewId(); 
      toast({title: "Copied for Sharing", description: "Interview ID copied. Please paste it to your peer."});
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-hero-gradient p-4 sm:p-6 font-sans animate-background-pan selection:bg-primary/30 selection:text-primary-foreground overflow-y-auto">
        <Card className="w-full max-w-lg bg-card/90 backdrop-blur-xl p-6 sm:p-10 rounded-2xl shadow-depth-3 border-border/40 animate-pop-in">
          <CardHeader className="text-center p-0 mb-8">
             <div className={cn(
                "group mx-auto mb-6 p-3.5 bg-gradient-to-tr from-primary via-accent to-primary/70 rounded-full w-fit shadow-xl shadow-primary/30 transform transition-all hover:scale-105 duration-300",
                "animate-shine" 
              )}>
              <Users2 className="h-16 w-16 sm:h-20 sm:w-20 text-primary-foreground" />
            </div>
            <CardTitle className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-[200%_auto] animate-gradient-text pb-1">
              Fresher Faceoff
            </CardTitle>
            <CardDescription className="text-lg sm:text-xl text-muted-foreground mt-2">
              Peer-to-Peer Mock Interviews <br className="sm:hidden"/> with AI Assistance
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 p-0">
            <div className="space-y-3 p-4 border border-border/30 rounded-xl bg-background/60 shadow-sm animate-fade-in-up delay-100 hover:shadow-md transition-shadow duration-300">
              <h3 className="text-base font-semibold text-foreground flex items-center"><Sparkles className="w-5 h-5 mr-2.5 text-primary"/>AI Interview Questions</h3>
              <Select value={interviewCategory} onValueChange={setInterviewCategory}>
                <SelectTrigger className="w-full h-12 text-sm bg-input border-input hover:border-primary/70 focus:border-primary focus-visible:ring-primary focus-visible:ring-2 rounded-lg shadow-inner-soft placeholder:text-muted-foreground/60">
                  <SelectValue placeholder="Select Interview Category/Topic" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border/70 shadow-xl backdrop-blur-md">
                  {INTERVIEW_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="hover:bg-accent/20 focus:bg-accent/30 data-[state=checked]:bg-primary/20 data-[state=checked]:text-primary-foreground">
                        {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {interviewCategory === "Custom Topic" && (
                <Input
                  type="text"
                  placeholder="Enter Custom Topic (e.g., React state management)"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="h-12 text-sm bg-input border-input hover:border-primary/70 focus:border-primary focus-visible:ring-primary focus-visible:ring-2 rounded-lg shadow-inner-soft placeholder:text-muted-foreground/60"
                />
              )}
              <Button onClick={handleGenerateQuestions} disabled={isGeneratingQuestions || !interviewCategory} className="w-full h-12 text-base font-medium bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground rounded-lg shadow-md hover:shadow-accent/30 transition-all duration-300 ease-out active:scale-95 transform hover:scale-[1.01] hover:-translate-y-px">
                {isGeneratingQuestions ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                {isGeneratingQuestions ? "Generating..." : "Generate AI Questions"}
              </Button>
              {generatedQuestions.length > 0 && (
                <ScrollArea className="max-h-36 mt-3 p-3 border border-border/20 rounded-lg bg-muted/40 text-sm shadow-inner-soft">
                  <ul className="space-y-1.5 list-decimal list-inside marker:text-primary/80">
                    {generatedQuestions.map((q, i) => (
                      <li key={i} className={cn("transition-colors text-ellipsis overflow-hidden whitespace-nowrap", q.startsWith("Error:") || q.startsWith("Failed") ? "text-destructive font-medium" : "text-muted-foreground hover:text-foreground")}>{q}</li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>

            <div className="relative animate-fade-in-up delay-200">
              <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70 pointer-events-none" />
              <Input
                type="text"
                placeholder="Enter Interview ID (e.g., FF-XXXXXX)"
                value={interviewId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInterviewId(e.target.value.toUpperCase())}
                className="text-base h-14 bg-input border-input hover:border-primary/70 focus:border-primary focus-visible:ring-primary focus-visible:ring-2 rounded-lg shadow-inner-soft pl-12 pr-12 text-lg placeholder:text-muted-foreground/60 tracking-wider"
                aria-label="Interview ID Input"
              />
              {interviewId && !interviewId.startsWith("FF-NEW-") && (
                 <Button variant="ghost" size="icon" onClick={handleCopyInterviewId} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md" aria-label="Copy Interview ID">
                    {copied ? <Check className="h-5 w-5 text-green-400 animate-pop-in" /> : <Copy className="h-5 w-5" />}
                </Button>
              )}
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting || (!interviewId && !interviewId.startsWith("FF-NEW-"))} 
              className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground text-lg font-semibold rounded-lg shadow-strong hover:shadow-primary/40 transition-all duration-300 ease-out active:scale-95 transform hover:scale-[1.015] hover:-translate-y-0.5 active:shadow-soft animate-fade-in-up delay-300"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2.5 h-6 w-6 animate-spin" />
                  Joining Interview...
                </>
              ) : (
                <>
                  <Phone className="mr-2.5 h-5 w-5" /> Join Interview
                </>
              )}
            </Button>

            <div className="relative py-2 animate-fade-in-up delay-350">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-card/90 px-3 py-0.5 text-muted-foreground rounded-full shadow-sm">
                  Or
                </span>
              </div>
            </div>

            <Button
              onClick={handleCreateInterview}
              variant="outline"
              className="w-full h-14 text-lg border-border/70 hover:bg-secondary/80 hover:text-secondary-foreground rounded-lg shadow-soft hover:shadow-accent/30 transition-all duration-300 ease-out active:scale-95 transform hover:scale-[1.015] hover:-translate-y-0.5 active:shadow-inner-soft hover:border-accent/70 animate-fade-in-up delay-400"
            >
              <Sparkles className="mr-2.5 h-5 w-5 text-primary" /> Create New Interview
            </Button>
          </CardContent>

          <CardFooter className="p-0 pt-8 animate-fade-in-up delay-500">
            <p className="text-xs text-muted-foreground/80 text-center flex items-center justify-center w-full">
              <Info className="h-4 w-4 mr-1.5 inline-block flex-shrink-0 text-primary/80"/>
              Ensure camera & microphone are enabled in browser settings.
            </p>
          </CardFooter>
        </Card>
         <p className="text-xs text-muted-foreground/70 mt-10 animate-fade-in-up delay-700">&copy; {new Date().getFullYear()} FresherFaceoff. All rights reserved.</p>
      </div>
    );
  }

  // Main connected layout
  return (
    <TooltipProvider delayDuration={150}>
    <div ref={pageContainerRef} className={cn("flex flex-col h-screen max-h-screen bg-background text-foreground antialiased font-sans selection:bg-primary/30 selection:text-primary-foreground overflow-hidden")}>
        <header className="bg-card/95 backdrop-blur-lg p-3 shadow-md flex justify-between items-center border-b border-border/50 z-20 shrink-0">
          <div className="group flex items-center gap-2.5 animate-slide-in-left-smooth">
            <div className={cn(
                "p-2 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg",
                 "animate-shine" 
                )}>
              <Users2 className="h-7 w-7 text-primary-foreground"/>
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-[200%_auto] animate-gradient-text">
              Fresher Faceoff
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 animate-fade-in-down delay-100">
              <div className="flex items-center gap-2 text-sm font-mono bg-muted/70 px-3 py-1.5 rounded-lg shadow-inner-soft text-foreground tabular-nums">
                <Clock className="h-4.5 w-4.5 text-primary"/>
                <span>{formatTime(timerSeconds)}</span>
              </div>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={handleTimerToggle} className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md">
                          {isTimerRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{isTimerRunning ? "Pause Timer" : "Start Timer"}</p></TooltipContent>
              </Tooltip>
               <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={handleTimerReset} className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md">
                          <RefreshCw className="h-4.5 w-4.5" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Reset Timer</p></TooltipContent>
              </Tooltip>
              <div className="hidden md:flex items-center gap-2">
                  <span className="text-muted-foreground text-sm mx-1">|</span>
                  <span className="text-muted-foreground text-sm">ID:</span>
                  <Badge variant="secondary" className="font-mono text-sm tracking-wider py-1 px-2.5 shadow-sm">{interviewId.replace("FF-NEW-", "FF-")}</Badge>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={handleCopyInterviewId} className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md" aria-label="Copy Interview ID">
                              {copied ? <Check className="h-5 w-5 text-green-400 animate-pop-in" /> : <Copy className="h-5 w-5" />}
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Copy Interview ID</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleShareInterview} className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md" aria-label="Share Interview ID">
                            <Share2 className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Share Interview</p></TooltipContent>
                </Tooltip>
              </div>
          </div>
          <div className="flex items-center gap-2 animate-slide-in-right-smooth">
             
              <Button onClick={handleDisconnect} variant="destructive" size="sm" className="font-medium rounded-lg shadow-md hover:shadow-destructive/40 transition-all duration-200 active:scale-95 transform hover:scale-[1.02] gap-1.5 h-9 px-3.5">
                <LogOut className="h-4 w-4" /> Leave
              </Button>
          </div>
        </header>

        {/* Main content: Three vertical columns */}
        <main className="grid grid-cols-3 gap-3.5 p-3.5 flex-1 overflow-hidden h-full">
            {/* Peer Video - First Column */}
            <div className="relative flex flex-col bg-card/90 backdrop-blur-md rounded-xl shadow-xl border-border/40 animate-fade-in-up delay-100 overflow-hidden min-h-0 h-full">
                <CardHeader className="p-2.5 bg-card/80 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 rounded-t-xl border-b border-border/40">
                    <CardTitle className="text-sm text-center font-semibold text-accent flex items-center justify-center gap-1.5">
                        <Users className="w-4.5 h-4.5" /> Peer
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 bg-muted/40 flex items-center justify-center mt-[41px] relative overflow-hidden h-full">
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover rounded-b-xl"></video>
                    {(!isPeerConnected || (!remoteVideoRef.current || !remoteVideoRef.current.srcObject || (remoteVideoRef.current?.srcObject && remoteVideoRef.current.srcObject.getVideoTracks().every(t => !t.enabled || t.muted)))) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/70 backdrop-blur-sm p-3 text-center rounded-b-xl">
                            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 shadow-lg border-2 border-accent/30 animate-pulse-gentle">
                                <AvatarImage src="https://picsum.photos/seed/peerLarge/200/200" alt="Peer Avatar" data-ai-hint="friendly avatar" />
                                <AvatarFallback className="text-2xl sm:text-3xl bg-accent/25 text-accent rounded-full">PEER</AvatarFallback>
                            </Avatar>
                            <p className="mt-3 text-sm text-muted-foreground animate-pulse-gentle">
                                {isPeerConnected ? "Peer's video is off or loading..." : "Waiting for peer..."}
                            </p>
                        </div>
                    )}
                </CardContent>
            </div>

            {/* Local Video (You) - Second Column */}
            <div className="relative flex flex-col bg-card/90 backdrop-blur-md rounded-xl shadow-xl border-border/40 animate-fade-in-up delay-150 overflow-hidden min-h-0 h-full">
                <CardHeader className="p-2.5 bg-card/80 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 rounded-t-xl border-b border-border/40">
                    <CardTitle className="text-sm text-center font-semibold text-primary flex items-center justify-center gap-1.5">
                        <UserCircle className="w-4.5 h-4.5" /> {isScreenShared ? "Your Screen" : "You"}
                    </CardTitle>
                    <div className="absolute top-2 right-2 flex items-center gap-1 sm:gap-1.5">
                        {isMuted && <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />}
                        {isVideoOff && !isScreenShared && <VideoOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />}
                        {!isMuted && <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />}
                        {!isVideoOff && !isScreenShared && <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />}
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 bg-muted/40 flex items-center justify-center mt-[41px] relative overflow-hidden h-full">
                    <video ref={localVideoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover transition-opacity duration-300 rounded-b-xl", (isVideoOff && !isScreenShared && hasCameraPermission !== false) || (hasCameraPermission === false && !isScreenShared) ? 'opacity-0' : 'opacity-100')}></video>
                    {hasCameraPermission === null && !isScreenShared && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/70 backdrop-blur-sm p-2 text-center rounded-b-xl">
                            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-spin mb-1 sm:mb-2" />
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Camera...</p>
                        </div>
                    )}
                    {hasCameraPermission === false && !isScreenShared && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/70 backdrop-blur-sm p-2 text-center rounded-b-xl">
                            <Avatar className="w-16 h-16 sm:w-20 sm:h-20 shadow-md border border-primary/30 animate-pulse-gentle">
                                <AvatarImage src="https://picsum.photos/seed/myAvatarSmall/100/100" alt="My Avatar" data-ai-hint="professional avatar" />
                                <AvatarFallback className="text-xl sm:text-2xl bg-primary/25 text-primary rounded-full">ME</AvatarFallback>
                            </Avatar>
                            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-destructive font-semibold">No Camera</p>
                        </div>
                    )}
                    {hasCameraPermission === true && isVideoOff && !isScreenShared && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/70 backdrop-blur-sm p-2 text-center rounded-b-xl">
                            <Avatar className="w-16 h-16 sm:w-20 sm:h-20 shadow-md border border-primary/30">
                                <AvatarImage src="https://picsum.photos/seed/myAvatarSmall/100/100" alt="My Avatar" data-ai-hint="professional avatar" />
                                <AvatarFallback className="text-xl sm:text-2xl bg-primary/25 text-primary rounded-full">ME</AvatarFallback>
                            </Avatar>
                            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">Camera Off</p>
                        </div>
                    )}
                </CardContent>
            </div>
            
            {/* Chat Area - Third Column */}
            <Card className="flex flex-col shadow-xl rounded-xl border-border/40 transition-all duration-300 hover:shadow-popover-foreground/20 bg-card/90 backdrop-blur-md animate-fade-in-up delay-300 overflow-hidden min-h-0 h-full">
                <CardHeader className="p-2.5 bg-card/80 backdrop-blur-sm rounded-t-xl border-b border-border/40 shrink-0">
                    <CardTitle className="text-sm text-center font-semibold text-primary flex items-center justify-center gap-1.5">
                        <MessageSquare className="w-4.5 h-4.5" /> Chat
                    </CardTitle>
                </CardHeader>
                
                <ScrollArea className="flex-1 p-3.5 bg-background/50 mt-0" viewportRef={chatScrollAreaRef}>
                    <div className="space-y-4">
                    {messages.map((msg) => (
                        <div
                        key={msg.id}
                        className={cn(
                            "flex animate-slide-in-bottom-fast",
                            msg.sender === "me" ? "justify-end" : "justify-start"
                        )}
                        >
                        <div className={cn("flex items-end gap-2 max-w-[85%]", msg.sender === "me" ? "flex-row-reverse" : "flex-row")}>
                           {msg.sender !== "system" && (
                            <Avatar className={cn("h-8 w-8 shadow-md", msg.sender === "me" ? "ml-1.5" : msg.sender === "ai" ? "mr-1.5" : "mr-1.5")}>
                            {msg.sender === 'ai' ? (
                                <AvatarFallback className="bg-gradient-to-br from-accent to-accent/70 text-accent-foreground shadow-inner-soft"><Bot className="h-4.5 w-4.5"/></AvatarFallback>
                            ) : (
                                <>
                                <AvatarImage src={msg.sender === 'me' ? `https://picsum.photos/seed/${'myseed01'}/32/32` : `https://picsum.photos/seed/${'peerseed02'}/32/32`} alt={msg.sender} data-ai-hint={msg.sender === 'me' ? "professional avatar" : "friendly avatar"}/>
                                <AvatarFallback className={cn("text-xs font-semibold",msg.sender === "me" ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground" : "bg-gradient-to-br from-secondary to-secondary/70 text-secondary-foreground")}>
                                    {msg.sender === "me" ? "ME" : "P"}
                                </AvatarFallback>
                                </>
                            )}
                            </Avatar>
                           )}
                            <div
                            className={cn("p-3 px-3.5 rounded-xl shadow-lg",
                                msg.sender === "me"
                                ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-br-xl"
                                : msg.sender === "ai"
                                ? "bg-accent/15 text-accent-foreground border border-accent/40 rounded-bl-xl shadow-accent/10"
                                : msg.sender === "system"
                                ? "bg-muted/60 text-muted-foreground text-xs italic text-center w-full py-2 px-3 rounded-md shadow-inner-soft"
                                : "bg-card text-card-foreground rounded-bl-xl border border-border/60"
                            )}
                            >
                            <p className={cn("break-words leading-relaxed", msg.sender === "system" ? "text-center" : "text-sm")}>{msg.text}</p>
                            {msg.sender !== "system" && (
                                <p className={cn("text-[11px] mt-2 opacity-90", msg.sender === "me" ? "text-primary-foreground/90" : msg.sender === "ai" ? "text-accent-foreground/90" : "text-muted-foreground", "text-right")}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            )}
                            {msg.sender === "ai" && msg.feedback !== undefined && (
                                <div className="mt-2.5 pt-2 border-t border-accent/30 flex items-center justify-end space-x-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className={cn("h-7 w-7 hover:bg-green-500/25 text-muted-foreground hover:text-green-400", msg.feedback === "good" && "bg-green-500/25 text-green-400")} onClick={() => handleMessageFeedback(msg.id, "good")}>
                                                <ThumbsUp className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs p-1.5"><p>Helpful</p></TooltipContent>
                                    </Tooltip>
                                        <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className={cn("h-7 w-7 hover:bg-red-500/25 text-muted-foreground hover:text-red-400", msg.feedback === "bad" && "bg-red-500/25 text-red-400")} onClick={() => handleMessageFeedback(msg.id, "bad")}>
                                                <ThumbsDown className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs p-1.5"><p>Not Helpful</p></TooltipContent>
                                    </Tooltip>
                                </div>
                            )}
                            </div>
                        </div>
                        </div>
                    ))}
                    {messages.length === 0 && !isPeerConnected && (
                        <div className="text-center text-muted-foreground py-12 text-sm animate-fade-in-up delay-300 flex flex-col items-center">
                            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40"/>
                            Waiting for peer to connect... <br/> Share the interview ID: <strong className="font-mono bg-muted p-1 rounded">{interviewId.replace("FF-NEW-", "FF-")}</strong>
                        </div>
                    )}
                     {messages.length === 0 && isPeerConnected && (
                        <div className="text-center text-muted-foreground py-12 text-sm animate-fade-in-up delay-300 flex flex-col items-center">
                            <MessageCircleQuestion className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40"/>
                            No messages yet. <br/> Start the conversation!
                        </div>
                    )}
                    </div>
                </ScrollArea>
                
                <div className="p-3 border-t border-b border-border/40 bg-card/80 backdrop-blur-sm shrink-0">
                    <Button onClick={handleGetAiFeedback} disabled={showAiFeedbackProcessing || !isPeerConnected} className="w-full h-10 text-sm font-medium bg-gradient-to-r from-primary/80 via-accent/80 to-primary/80 text-primary-foreground hover:opacity-90 transition-opacity rounded-lg shadow-lg hover:shadow-primary/20">
                        {showAiFeedbackProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2"/>}
                        {showAiFeedbackProcessing ? "Analyzing..." : (isPeerConnected ? "Get AI Session Feedback" : "AI Feedback (Peer Offline)")}
                    </Button>
                    {showAiFeedbackProcessing && (
                        <Progress value={66} className="w-full mt-2 h-1.5 animate-pulse-gentle bg-primary/20" />
                    )}
                </div>

                <div className="p-3 border-t border-border/40 bg-card/80 backdrop-blur-sm rounded-b-xl shrink-0">
                    <div className="flex w-full items-center space-x-2.5">
                    <Input
                        type="text"
                        placeholder={isPeerConnected ? "Type a message..." : "Waiting for peer to chat..."}
                        value={newMessage}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage();}}}
                        className="flex-1 h-11 focus-visible:ring-accent focus-visible:border-accent rounded-lg shadow-inner-soft text-sm bg-input border-input hover:border-accent/70 focus:border-accent placeholder:text-muted-foreground/60"
                        aria-label="New message input"
                        disabled={!isPeerConnected && !newMessage.trim()} 
                    />
                    <Button type="submit" size="icon" onClick={() => handleSendMessage()} disabled={!newMessage.trim()} className="bg-gradient-to-br from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 rounded-lg w-11 h-11 shadow-lg hover:shadow-accent/40 transition-all duration-200 active:scale-95 transform hover:scale-[1.03]" aria-label="Send message">
                        <Send className="h-5 w-5 text-accent-foreground" />
                    </Button>
                    </div>
                </div>
            </Card>
        </main>

      <footer className="bg-card/95 backdrop-blur-lg p-3 shadow-t-strong flex justify-center items-center space-x-2.5 sm:space-x-3.5 border-t border-border/50 animate-fade-in-up delay-350 shrink-0">
            {[
              { id: 'mute', Icon: isMuted ? MicOff : Mic, active: isMuted, action: toggleMute, label: isMuted ? "Unmute" : "Mute", destructive: isMuted },
              { id: 'video', Icon: isVideoOff || (isScreenShared && !localStreamRef.current?.getVideoTracks().find(t=>t.enabled)) ? CameraOff : Video, active: isVideoOff, action: toggleVideo, label: isScreenShared ? "Stop Share & Start Video" : (isVideoOff ? "Start Video" : "Stop Video"), destructive: isVideoOff && !isScreenShared },
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
                    disabled={(control.id === 'video' && isScreenShared && isVideoOff && hasCameraPermission === false)}
                    className={cn(
                      "rounded-full p-0 aspect-square",
                      control.main ? "w-16 h-16 sm:w-[70px] sm:h-[70px] text-lg" : "w-12 h-12 sm:w-14 sm:h-14 text-base",
                      "shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-90 focus:ring-2 focus:ring-offset-2 transform hover:scale-[1.04] hover:-translate-y-1 focus:ring-offset-background",
                      control.main ? "bg-destructive hover:bg-destructive/85 focus:ring-destructive/60" :
                      control.destructive && control.active ? "bg-destructive hover:bg-destructive/85 text-destructive-foreground focus:ring-destructive/60"
                        : control.specialActive ? "bg-primary hover:bg-primary/85 text-primary-foreground focus:ring-primary/60"
                        : control.active ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-ring/60"
                        : "border-border/70 hover:border-primary/80 focus:ring-ring/60 hover:bg-secondary/60 text-foreground",
                      (control.id === 'video' && isScreenShared && isVideoOff && hasCameraPermission === false) && "opacity-50 cursor-not-allowed hover:scale-100 hover:translate-y-0 hover:shadow-xl"
                    )}
                    aria-label={control.label}
                  >
                    <control.Icon className={control.main ? "h-7 w-7 sm:h-8 sm:h-8" : "h-5.5 w-5.5 sm:h-6 sm:h-6"} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="mb-2 bg-popover text-popover-foreground border-border/70 shadow-lg backdrop-blur-sm" align="center"><p>{control.label}</p></TooltipContent>
              </Tooltip>
            ))}
          </footer>
    </div>
    </TooltipProvider>
  );
}

