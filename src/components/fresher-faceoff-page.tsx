
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
  Bot,
  ThumbsUp,
  ThumbsDown,
  UserCircle,
  ListChecks,
  Timer,
  Share2,
  Star,
  MessageCircleQuestion
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";


interface Message {
  id: string;
  text: string;
  sender: "me" | "peer" | "ai";
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [interviewCategory, setInterviewCategory] = useState<string>("");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);
  const [userNotes, setUserNotes] = useState<string>("");

  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [activeTab, setActiveTab] = useState<"chat" | "questions" | "notes" | "feedback" | "resources">("chat");
  const [questionTimerSeconds, setQuestionTimerSeconds] = useState(0);
  const [isQuestionTimerRunning, setIsQuestionTimerRunning] = useState(false);
  const questionTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  const [overallFeedback, setOverallFeedback] = useState("");
  const [showAiFeedbackProcessing, setShowAiFeedbackProcessing] = useState(false);
  const [questionDifficulty, setQuestionDifficulty] = useState<"easy" | "medium" | "hard" | null>(null);


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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
      });
      screenStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getVideoTracks()[0].onended = () => {
        setIsScreenShared(false);
        startCameraStream(false).then(camStream => {
          if (!camStream) { 
            setIsVideoOff(true); 
            if (localVideoRef.current) localVideoRef.current.srcObject = null;
          }
        });
        toast({ title: "Screen Sharing Ended", description: "You stopped sharing your screen." });
      };
      setIsScreenShared(true); 
      setIsVideoOff(false); 
      return stream;
    } catch (err: any) {
      console.error("Error starting screen share:", err);
       if (err.name === "NotAllowedError" || err.message?.includes("permission") || err.message?.includes("disallowed by permissions policy")) {
        toast({
          variant: "destructive",
          title: "Screen Share Permission Denied",
          description: "Screen sharing access was denied. This can happen if the page is not served over HTTPS, or if it's inside an iframe without appropriate permissions. Try opening the app in a standalone browser window if embedded. Otherwise, check browser permissions.",
          duration: 10000,
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
      if (!isScreenShared) { 
        startCameraStream().then(stream => {
          if (stream && remoteVideoRef.current) {
            // Simulate peer connection by cloning local stream to remote video element for demo purposes
            const peerStream = new MediaStream();
            stream.getTracks().forEach(track => {
              const clonedTrack = track.clone();
              if (clonedTrack.kind === 'audio') clonedTrack.enabled = !isMuted; // Respect mute state for peer's audio
              peerStream.addTrack(clonedTrack);
            });
            remoteVideoRef.current.srcObject = peerStream;
            
            // Fallback for peer video if it doesn't load after a delay (e.g. for actual P2P connection issues)
            setTimeout(() => {
               if(remoteVideoRef.current && (!remoteVideoRef.current.srcObject || remoteVideoRef.current.srcObject.getTracks().length === 0)) {
                  // This mock stream is a placeholder, in a real app you'd handle P2P connection state
                  const mockStream = new MediaStream();
                  const canvas = document.createElement('canvas');
                  canvas.width = 640; 
                  canvas.height = 480;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = 'hsl(var(--muted))';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = 'hsl(var(--muted-foreground))';
                    ctx.font = '30px Inter, sans-serif'; 
                    ctx.textAlign = 'center';
                    ctx.fillText('Peer Video Offline', canvas.width / 2, canvas.height / 2);
                  }
                  const videoTrack = (canvas as any).captureStream(30).getVideoTracks()[0];
                  if(videoTrack) mockStream.addTrack(videoTrack);
                  remoteVideoRef.current.srcObject = mockStream;
               }
            }, 2000); // Wait 2 seconds before showing placeholder
          } else if (!stream) {
               setIsVideoOff(true); // If camera failed, ensure video is marked as off
          }
        });
      } else if (screenStreamRef.current && localVideoRef.current) { // If screen sharing is active
        localVideoRef.current.srcObject = screenStreamRef.current;
      }
    } else { // If not connected
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
      stopStream(screenStreamRef.current);
      screenStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setIsScreenShared(false);
      setHasCameraPermission(null); // Reset camera permission state
      setIsVideoOff(false);
    }

    // Cleanup streams on component unmount or when isConnected/isScreenShared changes
    return () => {
      stopStream(localStreamRef.current);
      stopStream(screenStreamRef.current);
    };
  }, [isConnected, startCameraStream, isMuted, isScreenShared]); // Added isMuted and isScreenShared as dependencies

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (chatScrollAreaRef.current) {
      const viewport = chatScrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo(0, viewport.scrollHeight);
      }
    }
  }, [messages]);

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

    // Check camera permission proactively before connecting
    if (hasCameraPermission === null) { // Only if not already checked/denied
        const stream = await startCameraStream(false); // Don't show error toast yet
        if (!stream) { // If camera access fails or is denied
            toast({
                variant: "destructive",
                title: "Camera Access Recommended",
                description: "Camera access is denied or unavailable. You can still join, but video features will be limited.",
                duration: 7000,
            });
        }
    } else if (hasCameraPermission === false) { // If already known to be denied
        toast({
            variant: "destructive",
            title: "Camera Access Denied",
            description: "Video features will be limited. Please enable camera access in browser settings for full functionality.",
            duration: 7000,
        });
    }


    // Simulate connection delay
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
          setInterviewId(currentId); // Update interviewId to the actual ID
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
      setIsTimerRunning(true); // Start the interview timer
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
    setInterviewId(""); // Clear interview ID on disconnect
    toast({ title: "Disconnected", description: "You have left the interview session." });

    if (isFullscreen && document.fullscreenElement) {
        document.exitFullscreen?.().catch(err => console.error("Error exiting fullscreen on disconnect:", err));
    }
    setIsFullscreen(false); // Ensure fullscreen state is reset
    // Stop and reset interview timer
    setIsTimerRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTimerSeconds(0);

    // Stop and reset question timer
    setIsQuestionTimerRunning(false);
    if (questionTimerIntervalRef.current) clearInterval(questionTimerIntervalRef.current);
    setQuestionTimerSeconds(0);
    setCurrentQuestionIndex(null);
    setOverallFeedback("");
    setShowAiFeedbackProcessing(false);
    setActiveTab("chat");
  };

  const handleSendMessage = (text?: string, sender: "me" | "ai" = "me") => {
    const messageText = text || newMessage;
    if (messageText.trim()) {
      const newMsg: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        text: messageText,
        sender: sender,
        timestamp: new Date(),
        feedback: sender === "ai" ? null : undefined, // Initialize feedback for AI messages
      };
      setMessages(prevMessages => [...prevMessages, newMsg]);

      // Simulate peer response if message is from "me"
      if (sender === "me") {
        setTimeout(() => {
          const peerResponse: Message = {
            id: `msg-${Date.now() + 1}-${Math.random()}`,
            text: `Received: "${messageText.length > 25 ? messageText.substring(0,22) + '...' : messageText}"`,
            sender: "peer",
            timestamp: new Date()
          };
          setMessages(prev => [...prev, peerResponse]);
        }, 800);
        setNewMessage(""); // Clear input field
      }
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    // Apply mute state to local audio tracks (camera and screen share if active)
    if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !newMutedState);
    }
    if (screenStreamRef.current) {
        screenStreamRef.current.getAudioTracks().forEach(track => track.enabled = !newMutedState);
    }
    toast({ title: newMutedState ? "Microphone Muted" : "Microphone Unmuted"});
  };

  const toggleVideo = async () => {
    // If screen sharing, this button should first stop screen share then toggle video
    if (isScreenShared) { 
      await toggleShareScreen(); // This will stop screen share and attempt to restart camera
      return;
    }

    const newVideoOffState = !isVideoOff;
    setIsVideoOff(newVideoOffState); // Optimistically update UI

    if (localStreamRef.current) { // If camera stream exists
        localStreamRef.current.getVideoTracks().forEach(track => {
          track.enabled = !newVideoOffState; // Toggle track enabled state
        });
        if (localVideoRef.current) { // Ensure video element reflects this
          localVideoRef.current.srcObject = localStreamRef.current;
        }
    } else if (!newVideoOffState) { // If no stream, and trying to turn video ON
        const stream = await startCameraStream();
        if(!stream) setIsVideoOff(true); // If starting camera failed, revert UI state
    }
    
    toast({ title: newVideoOffState ? "Camera Off" : "Camera On"});
  };


// Toggle Screen Sharing
const toggleShareScreen = async () => {
    if (!isScreenShared) { // If not currently sharing, start sharing
        // Temporarily disable camera video tracks if active
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => track.enabled = false);
        }
        const stream = await startScreenShareStream();
        if (stream) { // Successfully started screen share
            toast({ title: "Screen Sharing Started", description: "You are now sharing your screen." });
        } else { // Failed to start screen share, re-enable camera if it was on
           if (localStreamRef.current) { // If camera stream exists
              localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !isVideoOff); // Re-enable based on isVideoOff state
              if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
           } else if (!isVideoOff) { // If no camera stream, but video wasn't off, try to start it
             await startCameraStream(false); // Start camera without error toast if it fails now
           }
           // setIsScreenShared(false) is handled by startScreenShareStream on failure
        }
    } else { // If currently sharing, stop sharing
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop()); // Stop all tracks of screen stream
            screenStreamRef.current = null; // Clear reference
        }
        setIsScreenShared(false); // Update state

        // Re-enable camera video if it was not explicitly turned off
        if (localStreamRef.current) { // If camera stream exists
            localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !isVideoOff); // Re-enable based on isVideoOff state
            if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        } else if (!isVideoOff) { // If no camera stream, but video wasn't off, try to start it
            await startCameraStream(false);
        } else if (isVideoOff && localVideoRef.current) { // If video was off, ensure local video element is blank
            localVideoRef.current.srcObject = null;
        }
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
    const element = document.documentElement; 

    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        toast({ variant: "destructive", title: "Fullscreen Error", description: "Could not enter fullscreen mode."});
        console.error("Fullscreen request failed:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          toast({ variant: "destructive", title: "Fullscreen Error", description: "Could not exit fullscreen mode."});
          console.error("Exit fullscreen request failed:", err);
        });
      }
    }
  };

  // Listen to fullscreen changes to update state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // AI Question Generation
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
    setGeneratedQuestions([]); // Clear previous questions
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
      setGeneratedQuestions(["Failed to load questions. Please try again."]); // Show error in list
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Interview Timer Logic
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

  // Question Timer Logic
  useEffect(() => {
    if (isQuestionTimerRunning) {
      questionTimerIntervalRef.current = setInterval(() => {
        setQuestionTimerSeconds(prevSeconds => prevSeconds + 1);
      }, 1000);
    } else {
      if (questionTimerIntervalRef.current) {
        clearInterval(questionTimerIntervalRef.current);
      }
    }
    return () => {
      if (questionTimerIntervalRef.current) {
        clearInterval(questionTimerIntervalRef.current);
      }
    };
  }, [isQuestionTimerRunning]);

  const handleStartQuestionTimer = (index: number) => {
    setCurrentQuestionIndex(index);
    setQuestionTimerSeconds(0);
    setIsQuestionTimerRunning(true);
    toast({ title: "Question Timer Started", description: `Timing for question ${index + 1}.`});
  };

  const handleStopQuestionTimer = () => {
    setIsQuestionTimerRunning(false);
    if (currentQuestionIndex !== null) {
        // Send AI message about question completion and time
        handleSendMessage(`Finished question ${currentQuestionIndex + 1}. Time taken: ${formatTime(questionTimerSeconds)}`, "ai");
    }
    setCurrentQuestionIndex(null); // Reset current question
  };

  // Feedback for AI Messages
  const handleMessageFeedback = (messageId: string, feedback: "good" | "bad") => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );
    toast({ title: "Feedback Submitted", description: `Marked AI response as ${feedback}.` });
  };

  // AI Feedback on Session
  const handleGetAiFeedback = () => {
    if (messages.filter(m => m.sender === "me" || m.sender === "peer").length < 2) {
      toast({ variant: "destructive", title: "Not Enough Interaction", description: "Please have a more substantial conversation before requesting AI feedback." });
      return;
    }
    setShowAiFeedbackProcessing(true);
    // Simulate AI processing
    setTimeout(() => {
      const feedbackText = `Overall, the interview interaction showed good potential. Key strengths include clear communication and relevant questions. Areas for improvement could be to elaborate more on answers and to ask more follow-up questions to dive deeper into topics. The pacing was generally good. Remember to maintain eye contact and show enthusiasm!`;
      setOverallFeedback(feedbackText);
      handleSendMessage(feedbackText, "ai"); // Send feedback as an AI message
      setActiveTab("feedback"); // Switch to feedback tab
      setShowAiFeedbackProcessing(false);
      toast({ title: "AI Feedback Generated!", description: "Check the 'Feedback' tab for insights." });
    }, 2500);
  };

  // Share Interview (Web Share API or Copy)
  const handleShareInterview = () => {
    const idToShare = interviewId.replace("FF-NEW-", "FF-");
    if (navigator.share) {
      navigator.share({
        title: 'Join My Fresher Faceoff Interview!',
        text: `Let's practice! Join my Fresher Faceoff interview with ID: ${idToShare}`,
        url: window.location.href, // Share current page URL
      })
      .then(() => toast({ title: "Shared!", description: "Interview details sent."}))
      .catch((error) => {
        console.error('Error sharing:', error);
        handleCopyInterviewId(); // Fallback to copy if share fails
        toast({title: "Share Failed, ID Copied", description: "Could not use share. Interview ID copied to clipboard instead."});
      });
    } else { // Fallback if Web Share API is not supported
      handleCopyInterviewId();
      toast({title: "Copied for Sharing", description: "Interview ID copied. Please paste it to your peer."});
    }
  };

  const handleRateQuestion = (difficulty: "easy" | "medium" | "hard") => {
    setQuestionDifficulty(difficulty);
    toast({ title: "Question Rated", description: `You rated this question as ${difficulty}.` });
  };


  // Lobby View (when not connected)
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-hero-gradient p-4 sm:p-6 font-sans animate-background-pan selection:bg-primary/30 selection:text-primary-foreground">
        <Card className="w-full max-w-lg bg-card/90 backdrop-blur-xl p-6 sm:p-10 rounded-2xl shadow-depth-3 border-border/40 animate-pop-in">
          <CardHeader className="text-center p-0 mb-8">
             <div className={cn(
                "group mx-auto mb-6 p-3.5 bg-gradient-to-tr from-primary via-accent to-primary/70 rounded-full w-fit shadow-xl shadow-primary/30 transform transition-all hover:scale-105 duration-300",
                "animate-shine"
              )}>
              <Users className="h-16 w-16 sm:h-20 sm:w-20 text-primary-foreground" />
            </div>
            <CardTitle className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-[200%_auto] animate-gradient-text pb-1">
              Fresher Faceoff
            </CardTitle>
            <CardDescription className="text-lg sm:text-xl text-muted-foreground mt-2">
              Peer-to-Peer Mock Interviews <br className="sm:hidden"/> with AI Assistance
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 p-0">
            {/* AI Question Generation Section */}
            <div className="space-y-3 p-4 border border-border/30 rounded-xl bg-background/60 shadow-sm animate-fade-in-up delay-100 hover:shadow-md transition-shadow duration-300">
              <h3 className="text-base font-semibold text-foreground flex items-center"><Brain className="w-5 h-5 mr-2.5 text-primary"/>AI Interview Questions</h3>
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

            {/* Interview ID Input */}
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
              {interviewId && !interviewId.startsWith("FF-NEW-") && ( // Show copy only if it's not a newly generated local ID
                 <Button variant="ghost" size="icon" onClick={handleCopyInterviewId} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md" aria-label="Copy Interview ID">
                    {copied ? <Check className="h-5 w-5 text-green-400 animate-pop-in" /> : <Copy className="h-5 w-5" />}
                </Button>
              )}
            </div>

            {/* Join Button */}
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
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

            {/* "Or" Separator */}
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

            {/* Create New Interview Button */}
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

  // Interview View (when connected)
  return (
    <TooltipProvider delayDuration={150}>
    <div className={cn(
      "flex flex-col h-screen bg-background text-foreground overflow-hidden antialiased font-sans selection:bg-primary/30 selection:text-primary-foreground",
       isFullscreen && "fixed inset-0 z-[999]" 
      )}>
      {/* Header (always shown, adapted for fullscreen) */}
        <header className={cn(
          "bg-card/95 backdrop-blur-lg p-3 shadow-md flex justify-between items-center border-b border-border/50 z-20",
          isFullscreen && "fixed top-0 left-0 right-0"
          )}>
          <div className={cn("group flex items-center gap-2.5 animate-slide-in-left-smooth")}>
            <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg animate-shine">
              <Users className="h-7 w-7 text-primary-foreground"/>
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-[200%_auto] animate-gradient-text">
              Fresher Faceoff
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 animate-fade-in-down delay-100">
              {/* Interview Timer */}
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
              {/* Interview ID and Share (hidden on smaller screens or adapted) */}
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
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md">
                          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Fullscreen className="h-5 w-5" />}
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</p></TooltipContent>
              </Tooltip>
              <DropdownMenu>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md">
                                  <Settings2 className="h-5 w-5" />
                              </Button>
                          </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent><p>Settings</p></TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-52 bg-popover border-border/70 shadow-xl backdrop-blur-md">
                      <DropdownMenuItem className="hover:bg-accent/20 focus:bg-accent/30">Audio Settings</DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-accent/20 focus:bg-accent/30">Video Settings</DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50"/>
                      <DropdownMenuItem className="hover:bg-accent/20 focus:bg-accent/30">Report Issue</DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-accent/20 focus:bg-accent/30">
                          <HelpCircle className="mr-2 h-4 w-4" />
                          Help & Feedback
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handleDisconnect} variant="destructive" size="sm" className="font-medium rounded-lg shadow-md hover:shadow-destructive/40 transition-all duration-200 active:scale-95 transform hover:scale-[1.02] gap-1.5 h-9 px-3.5">
                <LogOut className="h-4 w-4" /> Leave
              </Button>
          </div>
        </header>

      {/* Main Content Area: Videos and Chat/Tabs Panel */}
      <main className={cn(
        "flex flex-1 gap-3.5 p-3.5 overflow-hidden", 
        isFullscreen ? "pt-[70px] pb-[86px]" : "pt-0 pb-0", // Adjust padding for fixed header/footer in fullscreen
        "bg-background/80" // Apply background to main area for consistent look
      )}>
        {/* Peer Video (Left Column) */}
        <div className="flex-1 flex flex-col gap-3.5 animate-fade-in-up delay-100 overflow-hidden">
           <Card className="overflow-hidden shadow-xl rounded-xl border-border/40 flex flex-col transition-all duration-300 hover:shadow-accent/30 bg-card/90 backdrop-blur-md group relative flex-1">
              <CardHeader className="p-2.5 bg-card/80 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 rounded-t-xl border-b border-border/40">
                <CardTitle className="text-sm text-center font-semibold text-accent flex items-center justify-center gap-1.5">
                  <Users className="w-4.5 h-4.5" /> Peer
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 bg-muted/40 flex items-center justify-center mt-[41px]">
                 <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover rounded-b-xl"></video>
                 {(!remoteVideoRef.current || !remoteVideoRef.current.srcObject || remoteVideoRef.current?.srcObject?.getVideoTracks().length === 0) && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/70 backdrop-blur-sm p-3 text-center rounded-b-xl">
                      <Avatar className="w-24 h-24 md:w-32 md:h-32 shadow-lg border-2 border-accent/30">
                          <AvatarImage src={`https://picsum.photos/seed/peerLarge/256/256`} alt="Peer Avatar" data-ai-hint="friendly avatar"/>
                          <AvatarFallback className="text-3xl md:text-4xl bg-accent/25 text-accent rounded-full">PEER</AvatarFallback>
                      </Avatar>
                      <p className="mt-3 text-sm text-muted-foreground animate-pulse-gentle">Waiting for peer...</p>
                   </div>
                 )}
              </CardContent>
            </Card>
        </div>

        {/* User Video (Middle Column) */}
        <div className="flex-1 flex flex-col gap-3.5 animate-fade-in-up delay-150 overflow-hidden">
           <Card className="overflow-hidden shadow-xl rounded-xl border-2 border-primary/50 flex flex-col transition-all duration-300 hover:shadow-primary/40 bg-card/90 backdrop-blur-md group z-10 relative flex-1">
             <CardHeader className="p-2.5 bg-card/80 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 rounded-t-xl border-b border-border/30 flex flex-row justify-between items-center">
              <CardTitle className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <UserCircle className="w-4.5 h-4.5"/> {isScreenShared ? "Your Screen" : "You"}
              </CardTitle>
              <div className="flex items-center gap-1.5">
                  {isMuted && <MicOff className="w-4 h-4 text-red-400" />}
                  {isVideoOff && !isScreenShared && <VideoOff className="w-4 h-4 text-red-400" />}
                  {!isMuted && <Mic className="w-4 h-4 text-green-400" />}
                  {!isVideoOff && !isScreenShared && <Video className="w-4 h-4 text-green-400" />}
               </div>
              </CardHeader>
             <CardContent className="p-0 flex-1 bg-muted/40 flex items-center justify-center relative mt-[41px]">
               <video ref={localVideoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover transition-opacity duration-300 rounded-b-xl", (isVideoOff && !isScreenShared) || hasCameraPermission === false ? 'opacity-0' : 'opacity-100')}></video>
               {((isVideoOff && !isScreenShared) || (hasCameraPermission === false && !isScreenShared)) && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/70 backdrop-blur-sm p-2 text-center rounded-b-xl">
                     <Avatar className={cn("w-16 h-16 shadow-md border border-primary/30", hasCameraPermission === false && "animate-pulse-gentle")}>
                     <AvatarImage src={`https://picsum.photos/seed/myAvatarSmall/64/64`} alt="My Avatar" data-ai-hint="professional avatar"/>
                     <AvatarFallback className="text-xl bg-primary/25 text-primary rounded-full">
                         ME
                     </AvatarFallback>
                     </Avatar>
                     {hasCameraPermission === false && !isScreenShared && <p className="mt-2 text-xs text-destructive font-semibold">No Camera Access</p>}
                     {isVideoOff && hasCameraPermission !== false && !isScreenShared && <p className="mt-2 text-xs text-muted-foreground">Camera is Off</p>}
                 </div>
               )}
                {hasCameraPermission === null && !isScreenShared && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/70 backdrop-blur-sm p-2 text-center rounded-b-xl">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                    <p className="text-xs text-muted-foreground">Accessing Camera...</p>
                  </div>
                )}
             </CardContent>
           </Card>
        </div>

        {/* Chat/Tabs Panel (Right Column) */}
        <Card className={cn(
          "flex flex-col shadow-xl rounded-xl border-border/40 transition-all duration-300 hover:shadow-popover-foreground/20 bg-card/90 backdrop-blur-md animate-slide-in-right-smooth delay-250",
          "flex-1 max-h-full overflow-hidden" // Ensure it takes available space and handles overflow
        )}>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-1 p-1.5 bg-muted/60 rounded-t-xl rounded-b-none border-b border-border/40">
                <TabsTrigger value="chat" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all">
                    <MessageSquare className="h-4 w-4"/> Chat
                </TabsTrigger>
                <TabsTrigger value="questions" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all">
                    <ListChecks className="h-4 w-4"/> Questions
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all">
                    <FileText className="h-4 w-4"/> Notes
                </TabsTrigger>
                <TabsTrigger value="feedback" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all hidden sm:inline-flex">
                    <Bot className="h-4 w-4"/> AI Coach
                </TabsTrigger>
                <TabsTrigger value="resources" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all hidden sm:inline-flex">
                    <Lightbulb className="h-4 w-4"/> Resources
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
                <ScrollArea className="flex-1 p-3.5 bg-background/50" viewportRef={chatScrollAreaRef}>
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
                          <div
                            className={cn("p-3 px-3.5 rounded-xl shadow-lg",
                              msg.sender === "me"
                                ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-br-xl"
                                : msg.sender === "ai"
                                ? "bg-accent/15 text-accent-foreground border border-accent/40 rounded-bl-xl shadow-accent/10"
                                : "bg-card text-card-foreground rounded-bl-xl border border-border/60"
                            )}
                          >
                            <p className="break-words leading-relaxed text-sm">{msg.text}</p>
                            <p className={cn("text-[11px] mt-2 opacity-90", msg.sender === "me" ? "text-primary-foreground/90" : msg.sender === "ai" ? "text-accent-foreground/90" : "text-muted-foreground", "text-right")}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {msg.sender === "ai" && msg.feedback !== undefined && ( // Show feedback buttons for AI messages
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
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-12 text-sm animate-fade-in-up delay-300 flex flex-col items-center">
                        <MessageCircleQuestion className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40"/>
                        No messages yet. <br/> Start the conversation or ask the AI a question!
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-3 border-t border-border/40 bg-card/70 backdrop-blur-sm rounded-b-xl">
                  <div className="flex w-full items-center space-x-2.5">
                    <Input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage();}}}
                      className="flex-1 h-11 focus-visible:ring-accent focus-visible:border-accent rounded-lg shadow-inner-soft text-sm bg-input border-input hover:border-accent/70 focus:border-accent placeholder:text-muted-foreground/60"
                      aria-label="New message input"
                    />
                    <Button type="submit" size="icon" onClick={() => handleSendMessage()} className="bg-gradient-to-br from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 rounded-lg w-11 h-11 shadow-lg hover:shadow-accent/40 transition-all duration-200 active:scale-95 transform hover:scale-[1.03]" aria-label="Send message">
                      <Send className="h-5 w-5 text-accent-foreground" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="questions" className="flex-1 flex flex-col m-0 overflow-hidden">
                 <ScrollArea className="flex-1 p-3.5 bg-background/50">
                    {isGeneratingQuestions && ( // Show loader while generating
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4"/>
                            <p className="text-base">Generating AI questions...</p>
                            <Progress value={66} className="w-3/4 mt-4 h-2.5 animate-pulse-gentle bg-primary/20" />
                        </div>
                    )}
                    {!isGeneratingQuestions && generatedQuestions.length === 0 && (
                        <div className="text-center text-muted-foreground py-12 text-sm animate-fade-in-up flex flex-col items-center">
                            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40"/>
                            No questions generated yet. <br /> Use controls in the lobby or ask AI to generate some.
                        </div>
                    )}
                    {!isGeneratingQuestions && generatedQuestions.length > 0 && (
                        <div className="space-y-3.5">
                            {generatedQuestions.map((question, index) => (
                                <Card key={index} className={cn("p-3.5 shadow-lg border-border/50 bg-card/90 hover:bg-card/95 transition-all duration-200 hover:shadow-primary/10", question.startsWith("Error:") || question.startsWith("Failed") ? "border-destructive/60 bg-destructive/10 shadow-destructive/10" : "", currentQuestionIndex === index && "ring-2 ring-offset-2 ring-offset-background ring-primary border-primary shadow-primary/20")}>
                                    <div className="flex justify-between items-start gap-2">
                                        <p className={cn("text-sm leading-relaxed flex-1", question.startsWith("Error:") || question.startsWith("Failed") ? "text-destructive font-medium" : "text-card-foreground")}>
                                            <strong className="text-primary mr-2">{index + 1}.</strong> {question}
                                        </p>
                                        {currentQuestionIndex !== index && !(question.startsWith("Error:") || question.startsWith("Failed")) && ( // Show start timer button if not current question
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-2 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md" onClick={() => handleStartQuestionTimer(index)}>
                                                        <Timer className="h-4.5 w-4.5"/>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Start Timer for this Question</p></TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                    {currentQuestionIndex === index && ( // Show timer and stop button if current question
                                        <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                                            <span className="text-base font-mono text-primary tabular-nums">{formatTime(questionTimerSeconds)}</span>
                                            <Button size="sm" variant="destructive" onClick={handleStopQuestionTimer} className="gap-1.5 rounded-md">
                                                <Pause className="h-4 w-4"/> Stop Timer
                                            </Button>
                                        </div>
                                    )}
                                     {/* Difficulty Rating for non-error questions */}
                                     {!(question.startsWith("Error:") || question.startsWith("Failed")) && (
                                        <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-start space-x-2">
                                            <span className="text-xs text-muted-foreground mr-2">Rate difficulty:</span>
                                            {["easy", "medium", "hard"].map(diff => (
                                                <Button
                                                    key={diff}
                                                    variant={questionDifficulty === diff ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handleRateQuestion(diff as "easy"|"medium"|"hard")}
                                                    className={cn("capitalize text-xs px-2.5 py-1 h-auto rounded-md",
                                                        questionDifficulty === diff && (diff === "easy" ? "bg-green-500/80 hover:bg-green-500/90 border-green-500/80 text-white" : diff === "medium" ? "bg-yellow-500/80 hover:bg-yellow-500/90 border-yellow-500/80 text-white" : "bg-red-500/80 hover:bg-red-500/90 border-red-500/80 text-white"),
                                                        questionDifficulty !== diff && "border-border/50 hover:border-primary/70"
                                                    )}
                                                >
                                                    {diff}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                 </ScrollArea>
              </TabsContent>

              <TabsContent value="notes" className="flex-1 flex flex-col m-0 overflow-hidden">
                <ScrollArea className="flex-1 p-0.5 bg-background/50">
                    <Textarea
                        placeholder="Your private notes for the interview... (Only visible to you)"
                        value={userNotes}
                        onChange={(e) => setUserNotes(e.target.value)}
                        className="w-full h-full min-h-[200px] p-3.5 text-sm border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent resize-none placeholder:text-muted-foreground/60"
                    />
                </ScrollArea>
                 <div className="p-3 border-t border-border/40 bg-card/70 backdrop-blur-sm rounded-b-xl">
                    <p className="text-xs text-muted-foreground text-center">Notes are saved locally in your browser.</p>
                </div>
              </TabsContent>

              <TabsContent value="feedback" className="flex-1 flex flex-col m-0 overflow-hidden">
                 <ScrollArea className="flex-1 p-3.5 bg-background/50">
                    <div className="space-y-4">
                        <Button onClick={handleGetAiFeedback} disabled={showAiFeedbackProcessing} className="w-full h-11 text-base font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity rounded-lg shadow-lg hover:shadow-primary/30">
                            {showAiFeedbackProcessing ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2"/>}
                            {showAiFeedbackProcessing ? "Analyzing Session..." : "Get AI Feedback on Session"}
                        </Button>
                        {overallFeedback && ( // Display AI feedback if available
                            <Card className="p-4 bg-card/90 border-accent/50 shadow-lg animate-scale-in">
                                <CardHeader className="p-0 pb-2.5">
                                    <CardTitle className="text-lg text-accent flex items-center gap-2.5"><Bot className="h-5.5 w-5.5"/> AI Coach Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <p className="text-sm text-card-foreground whitespace-pre-wrap leading-relaxed">{overallFeedback}</p>
                                </CardContent>
                            </Card>
                        )}
                        {showAiFeedbackProcessing && ( // Show loader while processing
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3"/>
                                <p className="text-base">AI is processing your session...</p>
                                <Progress value={50} className="w-4/5 mt-4 h-2.5 animate-pulse-gentle bg-primary/20" />
                            </div>
                        )}
                         {!showAiFeedbackProcessing && !overallFeedback && ( // Initial state for feedback tab
                             <div className="text-center text-muted-foreground py-12 text-sm animate-fade-in-up flex flex-col items-center">
                                <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40"/>
                                Click the button above to get AI-powered feedback on your interview performance and interactions.
                            </div>
                         )}
                    </div>
                 </ScrollArea>
              </TabsContent>
              <TabsContent value="resources" className="flex-1 flex flex-col m-0 overflow-hidden">
                <ScrollArea className="flex-1 p-3.5 bg-background/50">
                    <div className="space-y-4">
                        <Card className="p-4 bg-card/90 border-primary/40 shadow-lg">
                            <CardHeader className="p-0 pb-2">
                                <CardTitle className="text-lg text-primary flex items-center gap-2"><Lightbulb className="h-5 w-5"/> Interview Tips</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 text-sm space-y-1.5 text-card-foreground">
                                <p><strong className="font-medium">STAR Method:</strong> Structure answers for behavioral questions (Situation, Task, Action, Result).</p>
                                <p><strong className="font-medium">Research:</strong> Understand the company and role you're (mock) interviewing for.</p>
                                <p><strong className="font-medium">Ask Questions:</strong> Prepare thoughtful questions for your interviewer (peer).</p>
                                <p><strong className="font-medium">Body Language:</strong> Maintain good posture and eye contact (even virtual!).</p>
                            </CardContent>
                        </Card>
                        <Card className="p-4 bg-card/90 border-accent/40 shadow-lg">
                            <CardHeader className="p-0 pb-2">
                                <CardTitle className="text-lg text-accent flex items-center gap-2"><Brain className="h-5 w-5"/> Common Topics</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 text-sm space-y-1 text-card-foreground">
                                <ul className="list-disc list-inside pl-1 space-y-1 marker:text-accent/80">
                                    <li>Data Structures & Algorithms (for Tech roles)</li>
                                    <li>Problem Solving & Critical Thinking</li>
                                    <li>Teamwork & Collaboration</li>
                                    <li>Strengths & Weaknesses</li>
                                    <li>Why are you interested in this field?</li>
                                </ul>
                            </CardContent>
                        </Card>
                         <Alert className="border-primary/40 bg-primary/5">
                            <Star className="h-5 w-5 text-primary" />
                            <AlertTitle className="text-primary">Pro Tip!</AlertTitle>
                            <AlertDescription className="text-primary/80">
                                Record your mock interviews (if your peer agrees) and review them later to identify areas for improvement. Self-reflection is key!
                            </AlertDescription>
                        </Alert>
                    </div>
                </ScrollArea>
            </TabsContent>
            </Tabs>
        </Card>
      </main>

      {/* Footer: Call Controls (always shown, adapted for fullscreen) */}
      <footer className={cn(
        "bg-card/95 backdrop-blur-lg p-3 shadow-t-strong flex justify-center items-center space-x-2.5 sm:space-x-3.5 border-t border-border/50 animate-fade-in-up delay-350",
        isFullscreen && "fixed bottom-0 left-0 right-0"
        )}>
            {[
              { id: 'mute', Icon: isMuted ? MicOff : Mic, active: isMuted, action: toggleMute, label: isMuted ? "Unmute" : "Mute", destructive: isMuted },
              { id: 'video', Icon: isVideoOff || isScreenShared ? CameraOff : Video, active: isVideoOff, action: toggleVideo, label: isScreenShared ? "Stop Share & Start Video" : (isVideoOff ? "Start Video" : "Stop Video"), destructive: isVideoOff && !isScreenShared },
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
                    // Disable video toggle if screen sharing is active (it's handled by screen share button now)
                    disabled={control.id === 'video' && isScreenShared && !isVideoOff} 
                    className={cn(
                      "rounded-full p-0 aspect-square",
                      control.main ? "w-16 h-16 sm:w-[70px] sm:h-[70px] text-lg" : "w-12 h-12 sm:w-14 sm:h-14 text-base",
                      "shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-90 focus:ring-2 focus:ring-offset-2 transform hover:scale-[1.04] hover:-translate-y-1 focus:ring-offset-background",
                      control.main ? "bg-destructive hover:bg-destructive/85 focus:ring-destructive/60" :
                      control.destructive && control.active ? "bg-destructive hover:bg-destructive/85 text-destructive-foreground focus:ring-destructive/60"
                        : control.specialActive ? "bg-primary hover:bg-primary/85 text-primary-foreground focus:ring-primary/60"
                        : control.active ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-ring/60"
                        : "border-border/70 hover:border-primary/80 focus:ring-ring/60 hover:bg-secondary/60 text-foreground",
                      // Specific styling for disabled video button during screen share
                      (control.id === 'video' && isScreenShared && !isVideoOff) && "opacity-50 cursor-not-allowed hover:scale-100 hover:translate-y-0 hover:shadow-xl" 
                    )}
                    aria-label={control.label}
                  >
                    <control.Icon className={control.main ? "h-7 w-7 sm:h-8 sm:w-8" : "h-5.5 w-5.5 sm:h-6 sm:w-6"} />
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

