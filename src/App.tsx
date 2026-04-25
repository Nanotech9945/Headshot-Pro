/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Upload, 
  Camera, 
  Loader2, 
  RefreshCw, 
  Sparkles, 
  Download, 
  Key, 
  AlertCircle, 
  X, 
  Folder, 
  CreditCard, 
  Settings, 
  HelpCircle,
  CheckCircle2,
  Trash2,
  LogIn,
  LogOut,
  User as UserIcon,
  Eye,
  EyeOff,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import Cropper from 'react-easy-crop';
import getCroppedImg, { applyFilters, optimizeImage } from './lib/cropUtils';

import { auth, db } from './lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const STYLES = [
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Sharp, trustworthy, executive.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDll-GxjL4m9J-EluKipUUSwUSw1FdTmQ9jJ5hDy2N5o-JQmculHem3Af94PEdajc85eF6CpxJDRfUjAhT4RKYs7V68HYz2K5JOpkhDgDBu98IRxsAcWTO4wUTUTN8PLTf8lE39BeXjq_h2Qu5HbXs7qoUe5MsHsgzeGYzwpc97O1NSm4qPRnYS0ipVeSr9IYir6jBHY4aWuruLUeS7O-qDO9gFTFKYGqKxuewjpyJtI25tgtoquIMdB0pKAnSoIwxd5XDqEE7QTaL8',
    prompt: 'A professional corporate headshot with a clean, solid grey studio backdrop. The person is wearing professional business attire (suit or blazer). High-end studio lighting, sharp focus, 8k resolution.'
  },
  {
    id: 'tech',
    name: 'Modern Tech',
    description: 'Minimalist, clean, approachable.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAsv_2SRL7AglpZGhJd8eQVtPMzzL4SJabbX_osAxR5g1SHloaDk4-Qhiddr8Tro4LkMDAdiynSknoU_F-_bez4En-XLCLSXcN1ptmq2SlbDxjWFQ35bIVmLAoXrv7AeKX4_1j9CN6EAgVFNN9FHOSZckBaZJ6guouncN2Rggmo2Y2nrLBY7Os4sjBescMj2JTb8Nl6tXoZKbiwKWmJ_h4b2VzxEVRYQDtrB-L67lTsVlDQuhs-YEhBQqbW29dtz6R86NAoPcWriWf',
    prompt: 'A professional headshot in a modern tech office environment. Softly blurred background with glass walls and plants. The person is wearing business casual attire. Natural but professional lighting, high-end photography.'
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Dynamic, bold, expressive.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqKtrJMb4k_19uD3WS2Zab54be1BgxYhXWjd8hJu2OmPG9CZ4aT2YAomsByJYP70ABH1NZqWYveGXG9J-B7Wtb_hTzhyPvToo0A5dsY0Lrr1hCyRuSs_dxyeEWpZNkxRgc9DJ-3idvol2Z1fNk5q89R8E3nnszemC23rLjZafyrNyXCDuRGn5jyzaMc5Qwgae2IF8dCWtH-6clrxQIKPwenhrH3kbsNXdFXmpCN6JC9kpC-y8ch0YMt0jf4wXVuWWf_qOJhuEFW9LG',
    prompt: 'A professional headshot taken with creative, dynamic lighting. Warm tones, high-end magazine style. The person is wearing expressive but professional attire. Artistic but clean composition.'
  },
  {
    id: 'vintage',
    name: 'Vintage Glamour',
    description: 'Timeless, elegant, nostalgic.',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    prompt: 'A professional vintage-style glamour headshot. Classic soft cinematic lighting, 1950s aesthetic. Elegant attire, sophisticated atmosphere, grained film texture, masterpiece.'
  },
  {
    id: 'cyberpunk',
    name: 'Futuristic',
    description: 'Neon, edgy, high-tech.',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop',
    prompt: 'A professional headshot with a futuristic high-tech aesthetic. Subtle blue and magenta neon rim lighting. Minimalist high-tech background. Sharp focus, ultra-modern attire, cinematic atmosphere.'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const [selectedStyle, setSelectedStyle] = useState(STYLES[1]); // Default to Modern Tech
  const [image, setImage] = useState<string | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState(1); // Default to 1:1
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    exposure: 100,
    sharpen: 0,
    vignette: 0,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(true);
  const [isUpscaled, setIsUpscaled] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<{ title: string; message: string; action?: string } | null>(null);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [history, setHistory] = useState<{
    id: string;
    image: string;
    style: string;
    filters: typeof filters;
    timestamp: any;
    aspectRatio?: number;
  }[]>([]);

  // Auth & Connection Sync
  useEffect(() => {
    // Validate Connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch credits from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setCredits(docSnap.data().credits ?? 0);
          } else {
            setCredits(0);
          }
        });
      } else {
        setCredits(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch History (Hybrid Firestore + Local Storage)
  useEffect(() => {
    // 1. Initial load from local storage (for anonymous or immediate view)
    const savedLocalHistory = localStorage.getItem('headshot_history_local');
    if (savedLocalHistory && !currentUser) {
      try {
        setHistory(JSON.parse(savedLocalHistory));
      } catch (e) {
        console.error("Local history parse error:", e);
      }
    }

    if (!currentUser) return;

    // 2. If logged in, fetch from Firestore
    const q = query(
      collection(db, `users/${currentUser.uid}/generations`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setHistory(items);
    }, (err) => {
      console.error("Firestore history error:", err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Sync LOCAL history only when NOT logged in
  useEffect(() => {
    if (!currentUser && history.length > 0) {
      localStorage.setItem('headshot_history_local', JSON.stringify(history.slice(0, 8)));
    }
  }, [history, currentUser]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) setCustomApiKey(savedKey);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Save user to users collection
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        createdAt: serverTimestamp(),
        credits: 0 // Default to 0 credits on login
      }, { merge: true });
      
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setError({ title: "Login Failed", message: err.message });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await updateProfile(result.user, { displayName: authDisplayName });
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          displayName: authDisplayName,
          createdAt: serverTimestamp(),
          credits: 0
        });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setError({ title: "Authentication Error", message: err.message });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const addToHistory = async (resultImg: string) => {
    // Optimize image to stay under 1MB Firestore limit
    const optimizedImg = await optimizeImage(resultImg, 1000, 0.7);
    if (!optimizedImg) return;

    const newItem = {
      image: optimizedImg,
      style: selectedStyle.id,
      filters: { ...filters },
      aspectRatio: aspectRatio,
      timestamp: currentUser ? serverTimestamp() : Date.now(),
    };

    if (currentUser) {
      if ((credits ?? 0) <= 0) {
        setError({
          title: "Out of Credits",
          message: "You have used all your generation credits. Please upgrade to continue saving high-quality headshots to your history.",
          action: "View Pricing Packages"
        });
        return;
      }

      try {
        await addDoc(collection(db, `users/${currentUser.uid}/generations`), {
          ...newItem,
          userId: currentUser.uid,
        });
        // Decrement credits
        await setDoc(doc(db, 'users', currentUser.uid), {
          credits: (credits ?? 0) - 1
        }, { merge: true });
      } catch (err: any) {
        console.error("Failed to add to Firestore history:", err);
      }
    } else {
      // Local history fallback
      setHistory(prev => [{ ...newItem, id: Math.random().toString(36).substr(2, 9) }, ...prev].slice(0, 8));
    }
  };

  const deleteFromHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser) {
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/generations`, id));
      } catch (err) {
        console.error("Delete error:", err);
      }
    } else {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const restoreFromHistory = (item: typeof history[0]) => {
    setResultImage(item.image);
    setFilters(item.filters);
    const styleObj = STYLES.find(s => s.id === item.style);
    if (styleObj) setSelectedStyle(styleObj);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('user_gemini_api_key', key);
    setShowKeyInput(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError({ title: "Invalid File", message: "Please upload an image file (PNG, JPG, etc)." });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImage(reader.result as string);
      setShowCropper(true);
      setResultImage(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const onCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropDone = async () => {
    if (tempImage && croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(tempImage, croppedAreaPixels);
        setImage(croppedImage);
        setShowCropper(false);
        setTempImage(null);
      } catch (e) {
        console.error(e);
        setError({
          title: "Cropping Failed",
          message: "We encountered an issue while processing your crop. This can happen with very high-resolution images or unusual formats.",
          action: "Try a different image or use a smaller area."
        });
      }
    }
  };

  const generateHeadshot = async () => {
    if (!image) return;

    setIsGenerating(true);
    setError(null);
    setRetryAttempt(0);

    const maxRetries = 3;
    let attempt = 0;

    const runGeneration = async (): Promise<void> => {
      try {
        const apiKey = customApiKey || process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
          throw new Error("No API key found. Please provide your own Gemini API key in settings.");
        }

        // Apply image filters before sending to AI
        const filtersToApply = isEnhanced ? filters : {
          brightness: 100,
          contrast: 100,
          saturation: 100,
          exposure: 100,
          sharpen: 0,
          vignette: 0
        };
        const filteredImage = await applyFilters(image, filtersToApply);
        if (!filteredImage) throw new Error("Failed to process image filters.");

        const ai = new GoogleGenAI({ apiKey });
        
        const base64Data = filteredImage.split(',')[1];
        const mimeType = filteredImage.split(';')[0].split(':')[1];

        const upscalePrompt = isUpscaled ? ", ultra high resolution 4K details, crisp sharp textures" : "";

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType,
                },
              },
              {
                text: `Transform this person in the photo into a professional headshot. ${selectedStyle.prompt}${upscalePrompt}. Maintain the person's facial features and identity accurately but enhance the lighting, clothing, and background to match the professional style. Crucially, apply a subtle but distinct professional background blur (bokeh effect) with a shallow depth of field to make the person stand out prominently from the background.`,
              },
            ],
          },
        });

        let foundImage = false;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            setResultImage(`data:image/png;base64,${part.inlineData.data}`);
            addToHistory(`data:image/png;base64,${part.inlineData.data}`);
            foundImage = true;
            break;
          }
        }

        if (!foundImage) {
          throw new Error("No image was generated. Please try again.");
        }
      } catch (err: any) {
        const errorMessage = err.message || "";
        const isRetryable = 
          errorMessage.includes('429') || 
          errorMessage.toLowerCase().includes('quota') ||
          errorMessage.includes('503') ||
          errorMessage.includes('504') ||
          errorMessage.includes('502') ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('NetworkError');

        if (attempt < maxRetries && isRetryable) {
          attempt++;
          setRetryAttempt(attempt);
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return runGeneration();
        }
        throw err;
      }
    };

    try {
      await runGeneration();
    } catch (err: any) {
      console.error("Generation error:", err);
      const errorMessage = err.message || "";
      
      if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota')) {
        setError({
          title: "Quota Exceeded",
          message: attempt > 0 ? `Failed after ${attempt} retries. The free tier limit is still active.` : "The shared free tier limit for Gemini has been reached for the moment.",
          action: "Please wait a minute, or add your own API Key in settings to enjoy unlimited generation."
        });
      } else if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid')) {
        setError({
          title: "Invalid API Key",
          message: "The API key provided appears to be invalid or has been revoked.",
          action: "Please check your key in the settings menu and ensure it belongs to the correct project."
        });
      } else if (errorMessage.toLowerCase().includes('safety')) {
        setError({
          title: "Content Filtered",
          message: "The AI safety filters were triggered by this image or the requested transformation.",
          action: "Try using a different photo with a clear, unobstructed view of your face."
        });
      } else if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError')) {
        setError({
          title: "Connection Lost",
          message: attempt > 0 ? `Connection failed after ${attempt} attempts.` : "We couldn't connect to the AI studio services. Please check your internet connection.",
          action: "Verify your network and try again in a few moments."
        });
      } else if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded')) {
        setError({
          title: "Model Overloaded",
          message: attempt > 0 ? `Server is still overloaded after ${attempt} retries.` : "Google's AI models are currently receiving a high volume of requests.",
          action: "Take a breath, wait a few seconds, and try hitting generate again."
        });
      } else {
        setError({
          title: "Generation Failed",
          message: errorMessage || "An unexpected error occurred during the image transformation process.",
          action: "Please try again or try an alternative photo."
        });
      }
    } finally {
      setIsGenerating(false);
      setRetryAttempt(0);
    }
  };

  const reset = () => {
    setImage(null);
    setResultImage(null);
    setError(null);
    setFilters({ 
      brightness: 100, 
      contrast: 100, 
      saturation: 100,
      exposure: 100,
      sharpen: 0,
      vignette: 0
    });
  };

  const handleDownload = () => {
    if (!resultImage) return;

    if (!currentUser) {
      setIsAuthModalOpen(true);
      setError({
        title: "Login Required",
        message: "Your demo headshot is ready! Please log in to download and save your professional results.",
      });
      return;
    }
    
    if ((credits ?? 0) <= 0) {
      setShowPricing(true);
      setError({
        title: "Premium Feature",
        message: "Downloading high-resolution photos requires an active package.",
        action: "View Packages"
      });
      return;
    }
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `headshot-${selectedStyle.id}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans">
      {/* TopAppBar */}
      <header className="bg-white/70 backdrop-blur-3xl sticky top-0 z-50 shadow-[0px_20px_40px_rgba(0,109,54,0.06)]">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 group">
            <Camera className="text-primary text-3xl" />
            <span className="text-2xl font-extrabold tracking-tighter text-primary font-headline">Headshot Pro</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-primary font-bold border-b-2 border-primary text-sm font-medium py-1"
            >
              Studio
            </button>
            <button 
              onClick={() => document.getElementById('gallery-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-zinc-600 hover:text-primary text-sm font-medium transition-all duration-300"
            >
              History
            </button>
            <button 
              onClick={() => {
                if (currentUser) {
                  setShowPricing(true);
                } else {
                  setIsAuthModalOpen(true);
                }
              }}
              className="text-zinc-600 hover:text-primary text-sm font-medium transition-all duration-300"
            >
              Credits {credits !== null && `(${credits})`}
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-on-surface">{currentUser.displayName || 'Creator'}</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">{credits} Credits</p>
                  <button 
                    onClick={() => signOut(auth)}
                    className="text-[10px] font-bold text-red-500 uppercase tracking-wider hover:underline"
                  >
                    Sign Out
                  </button>
                </div>
                <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border-2 border-primary-container/30">
                  <img 
                    className="w-full h-full object-cover" 
                    alt="User Profile" 
                    src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName || 'U'}&background=random`}
                  />
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="px-6 py-2.5 rounded-full bg-primary text-white font-bold text-sm shadow-lg shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
            <button 
              onClick={() => setShowKeyInput(true)}
              className={`hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 shadow-lg active:scale-95
                ${customApiKey 
                  ? 'bg-white border border-primary text-primary' 
                  : 'bg-white border border-outline-variant text-zinc-600 hover:bg-emerald-50'}`}
            >
              <Key className="w-4 h-4" />
              {customApiKey ? 'Key Active' : 'API Key'}
            </button>
          </div>
        </div>
      </header>

      {/* Pricing Modal */}
      <AnimatePresence>
        {showPricing && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPricing(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative bg-neutral-50 rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden p-12"
            >
              <button 
                onClick={() => setShowPricing(false)}
                className="absolute top-8 right-8 p-3 hover:bg-neutral-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-neutral-400" />
              </button>

              <div className="text-center mb-12">
                <h2 className="text-4xl font-headline font-black tracking-tight mb-4">Choose Your Package</h2>
                <p className="text-zinc-500 text-lg">Professional headshots shouldn't cost a fortune. Select a plan to continue.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Starter */}
                <div className="bg-white p-8 rounded-[2rem] border border-neutral-200 flex flex-col items-center text-center shadow-sm hover:shadow-xl transition-all h-full">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Starter</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-black">₹99</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-zinc-600 text-sm">
                    <li className="flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4 text-primary" /> 3 High-Quality Photos</li>
                    <li className="flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4 text-primary" /> All Styles Available</li>
                    <li className="flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4 text-primary" /> Lifetime History</li>
                  </ul>
                  <button 
                    onClick={() => {
                      // Mock purchase
                      if (currentUser) {
                        setDoc(doc(db, 'users', currentUser.uid), { credits: (credits ?? 0) + 3 }, { merge: true });
                        setShowPricing(false);
                      }
                    }}
                    className="mt-auto w-full py-4 rounded-2xl bg-zinc-900 text-white font-bold text-sm tracking-wide"
                  >
                    Select Plan
                  </button>
                </div>

                {/* Professional (MOST POPULAR) */}
                <div className="bg-primary p-8 rounded-[2rem] flex flex-col items-center text-center text-white shadow-2xl relative scale-105 z-10">
                  <div className="absolute -top-4 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                    Best Value
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Professional</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-black">₹499</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-white/80 text-sm">
                    <li className="flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4" /> 30 Professional Photos</li>
                    <li className="flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4" /> Priority Generation</li>
                    <li className="flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4" /> Commercial Usage</li>
                  </ul>
                  <button 
                    onClick={() => {
                      if (currentUser) {
                        setDoc(doc(db, 'users', currentUser.uid), { credits: (credits ?? 0) + 30 }, { merge: true });
                        setShowPricing(false);
                      }
                    }}
                    className="mt-auto w-full py-4 rounded-2xl bg-white text-primary font-bold text-sm tracking-wide shadow-lg"
                  >
                    Get 30 Photos
                  </button>
                </div>

                {/* Enterprise */}
                <div className="bg-white p-8 rounded-[2rem] border border-neutral-200 flex flex-col items-center text-center shadow-sm hover:shadow-xl transition-all h-full">
                  <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-purple-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-black">₹999</span>
                    <span className="text-zinc-400 text-sm ml-1 font-bold">/mo</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-zinc-600 text-sm">
                    <li className="flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4 text-primary" /> 100+ Photos / Month</li>
                    <li className="flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4 text-primary" /> Dedicated Support</li>
                    <li className="flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4 text-primary" /> Custom Style Requests</li>
                  </ul>
                  <button 
                     onClick={() => {
                      if (currentUser) {
                        setDoc(doc(db, 'users', currentUser.uid), { credits: (credits ?? 0) + 120 }, { merge: true });
                        setShowPricing(false);
                      }
                    }}
                    className="mt-auto w-full py-4 rounded-2xl bg-zinc-900 text-white font-bold text-sm tracking-wide"
                  >
                    Upgrade Monthly
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
               <div className="p-8">
                <button 
                  onClick={() => setIsAuthModalOpen(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UserIcon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-headline font-bold text-2xl tracking-tight">
                    {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                  </h3>
                  <p className="text-zinc-500 text-sm">Save your headshots across all devices</p>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-neutral-200 rounded-xl font-bold text-sm hover:bg-neutral-50 transition-all"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-zinc-400 font-bold">Or Email</span></div>
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    {authMode === 'signup' && (
                      <input 
                        type="text" 
                        placeholder="Full Name"
                        required
                        value={authDisplayName}
                        onChange={(e) => setAuthDisplayName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary outline-none text-sm"
                      />
                    )}
                    <input 
                      type="email" 
                      placeholder="Email Address"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary outline-none text-sm"
                    />
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="Password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary outline-none text-sm"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={isAuthLoading}
                      className="w-full py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {isAuthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                      {authMode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                  </form>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-sm text-zinc-500">
                    {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                    <button 
                      onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                      className="ml-2 text-primary font-bold hover:underline"
                    >
                      {authMode === 'login' ? 'Sign Up' : 'Log In'}
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* API Key Modal */}
      <AnimatePresence>
        {showKeyInput && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowKeyInput(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
            >
              <button 
                onClick={() => setShowKeyInput(false)}
                className="absolute top-4 right-4 p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-lg">Gemini API Settings</h3>
                  <p className="text-sm text-neutral-500">Bypass shared quota limits</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-on-background">Personal Gemini API Key</label>
                  <div className="relative group">
                    <input 
                      type="password"
                      placeholder="AI_..."
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 focus:border-primary focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-mono text-sm bg-neutral-50/50"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {customApiKey ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Key className="w-5 h-5 text-neutral-300" />
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-neutral-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Get your free key at <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">Google AI Studio</a>.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-neutral-100"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-neutral-400 font-bold tracking-widest">Or use platform key</span>
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    if (window.aistudio?.openSelectKey) {
                      await window.aistudio.openSelectKey();
                      setShowKeyInput(false);
                    } else {
                      setError("Platform key selection is not available in this environment.");
                    }
                  }}
                  className="w-full py-3.5 px-4 bg-white border border-neutral-200 rounded-xl font-bold text-sm text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all flex items-center justify-center gap-2 group"
                >
                  <Settings className="w-4 h-4 text-neutral-400 group-hover:rotate-90 transition-transform" />
                  Select Project Key
                </button>

                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-emerald-900">Privacy & Security</p>
                    <p className="text-xs text-emerald-800/80 leading-relaxed">
                      Your personal API key is stored only in this browser's local storage. We never send it to our servers.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => saveApiKey(customApiKey)}
                    className="flex-1 py-4 bg-primary text-white rounded-xl font-bold shadow-xl shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Save Changes
                  </button>
                  {customApiKey && (
                    <button 
                      onClick={() => {
                        setCustomApiKey('');
                        localStorage.removeItem('user_gemini_api_key');
                        setShowKeyInput(false);
                      }}
                      className="px-6 py-4 border border-neutral-200 text-neutral-600 rounded-xl font-bold hover:bg-neutral-50 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cropper Modal */}
      <AnimatePresence>
        {showCropper && tempImage && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-white z-10">
                <div>
                  <h3 className="font-headline font-bold text-xl text-on-background">Crop your portrait</h3>
                  <p className="text-sm text-zinc-500">Center your face for the best AI results</p>
                </div>
                <button 
                  onClick={() => { setShowCropper(false); setTempImage(null); }}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              <div className="relative flex-1 bg-neutral-900">
                <Cropper
                  image={tempImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspectRatio}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="p-6 bg-white border-t border-neutral-100 space-y-6 z-10">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-700">Aspect Ratio</span>
                    <div className="flex gap-2">
                      {[
                        { label: '1:1', value: 1 },
                        { label: '4:5 (Portrait)', value: 4/5 },
                        { label: '16:9 (Wide)', value: 16/9 }
                      ].map((ratio) => (
                        <button
                          key={ratio.label}
                          onClick={() => setAspectRatio(ratio.value)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold transition-all border tracking-wider
                            ${aspectRatio === ratio.value 
                              ? 'bg-primary text-white border-primary shadow-md' 
                              : 'bg-white text-zinc-500 border-neutral-200 hover:border-primary/30 hover:bg-emerald-50'}`}
                        >
                          {ratio.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-zinc-700 whitespace-nowrap">Zoom</span>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      aria-labelledby="Zoom"
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => { setShowCropper(false); setTempImage(null); }}
                    className="flex-1 py-3 px-6 border border-neutral-200 text-zinc-600 rounded-xl font-bold hover:bg-neutral-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCropDone}
                    className="flex-[2] py-3 px-6 bg-primary text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Crop & Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-6 pt-12 pb-32">
        {/* Section 1: Minimalist Upload */}
        <section className="mb-20 text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tight text-on-background mb-6">
            Elevate your <span className="text-gradient-emerald">professional identity.</span>
          </h1>
          <p className="text-zinc-500 max-w-2xl mx-auto mb-10 text-lg">
            Upload a single portrait and let our AI master photographers craft your perfect headshot in seconds.
          </p>
          
          <div className="max-w-3xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-primary-container/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-2xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer
                  ${image ? 'bg-surface-container border-primary' : isDragging ? 'bg-emerald-50 border-primary scale-[1.02] ring-4 ring-emerald-500/10' : 'bg-surface-container-low border-outline-variant hover:bg-surface-container hover:border-primary'}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                <div className="flex flex-col items-center">
                  {image ? (
                    <div className="flex flex-col items-center w-full max-w-lg">
                      <div 
                        className="relative rounded-2xl overflow-hidden shadow-2xl mb-8 border-4 border-white transition-all duration-500 bg-surface-container"
                        style={{ 
                          width: '192px', // w-48
                          aspectRatio: aspectRatio.toString(),
                          maxHeight: '240px' 
                        }}
                      >
                          <img 
                            src={image} 
                            alt="Preview" 
                            className="w-full h-full object-cover transition-all" 
                            style={{ 
                              filter: `brightness(${(filters.brightness * filters.exposure) / 100}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`
                            }}
                            referrerPolicy="no-referrer" 
                          />
                          {filters.vignette > 0 && (
                            <div 
                              className="absolute inset-0 pointer-events-none" 
                              style={{ 
                                background: `radial-gradient(circle, transparent 50%, rgba(0,0,0,${filters.vignette / 150}))` 
                              }}
                            />
                          )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); reset(); }}
                          className="absolute top-2 right-2 p-1.5 bg-white shadow-lg rounded-full hover:scale-110 transition-all text-neutral-600"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Adjustment Suite */}
                      <div className="w-full bg-white/50 backdrop-blur-md rounded-2xl p-6 border border-white/40 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-4">
                            <h4 className="font-headline font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              Enhancement Suite
                            </h4>
                            
                            {/* Master Toggle */}
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <div className="relative">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={isEnhanced}
                                  onChange={() => setIsEnhanced(!isEnhanced)}
                                />
                                <div className="w-8 h-4 bg-neutral-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                              </div>
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight group-hover:text-primary transition-colors">Magic Enhance</span>
                            </label>

                            {/* 4K Upscaler Toggle */}
                            <label className="flex items-center gap-2 cursor-pointer group border-l border-zinc-200 pl-4">
                              <div className="relative">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={isUpscaled}
                                  onChange={() => setIsUpscaled(!isUpscaled)}
                                />
                                <div className="w-8 h-4 bg-neutral-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500"></div>
                              </div>
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight group-hover:text-purple-600 transition-colors">4K Ultra HD</span>
                            </label>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setFilters({ 
                              brightness: 100, 
                              contrast: 100, 
                              saturation: 100,
                              exposure: 100,
                              sharpen: 0,
                              vignette: 0
                            }); }}
                            className="text-[10px] font-bold text-zinc-400 hover:text-primary transition-colors hover:underline"
                          >
                            Reset Adjustments
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                          <div className="space-y-1.5 font-sans">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3"/> Brightness</span>
                              <span className="text-primary">{filters.brightness}%</span>
                            </div>
                            <input 
                              type="range" min="50" max="150" step="1"
                              value={filters.brightness}
                              onChange={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, brightness: parseInt(e.target.value) })) }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full accent-primary h-1 bg-neutral-100 rounded-full appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5 font-sans">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                              <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Contrast</span>
                              <span className="text-primary">{filters.contrast}%</span>
                            </div>
                            <input 
                              type="range" min="50" max="150" step="1"
                              value={filters.contrast}
                              onChange={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, contrast: parseInt(e.target.value) })) }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full accent-primary h-1 bg-neutral-100 rounded-full appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5 font-sans">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                              <span className="flex items-center gap-1"><Folder className="w-3 h-3"/> Saturation</span>
                              <span className="text-primary">{filters.saturation}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="200" step="1"
                              value={filters.saturation}
                              onChange={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, saturation: parseInt(e.target.value) })) }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full accent-primary h-1 bg-neutral-100 rounded-full appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5 font-sans">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3"/> Exposure</span>
                              <span className="text-primary">{filters.exposure}%</span>
                            </div>
                            <input 
                              type="range" min="50" max="150" step="1"
                              value={filters.exposure}
                              onChange={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, exposure: parseInt(e.target.value) })) }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full accent-emerald-500 h-1 bg-neutral-100 rounded-full appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5 font-sans">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                              <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Sharpening</span>
                              <span className="text-primary">{filters.sharpen}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="100" step="1"
                              value={filters.sharpen}
                              onChange={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, sharpen: parseInt(e.target.value) })) }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full accent-blue-500 h-1 bg-neutral-100 rounded-full appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5 font-sans">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                              <span className="flex items-center gap-1"><Folder className="w-3 h-3"/> Vignette</span>
                              <span className="text-primary">{filters.vignette}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="100" step="1"
                              value={filters.vignette}
                              onChange={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, vignette: parseInt(e.target.value) })) }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full accent-neutral-800 h-1 bg-neutral-100 rounded-full appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="text-primary text-3xl" />
                    </div>
                  )}
                  
                  <h3 className="font-headline text-xl font-bold mb-2">
                    {image ? 'Photo uploaded' : 'Drop your photo here'}
                  </h3>
                  <p className="text-sm text-zinc-500">PNG, JPG or WEBP (Max. 10MB)</p>
                  
                  {!image && (
                    <button className="mt-6 bg-white border border-outline-variant px-8 py-3 rounded-full font-bold text-sm hover:bg-emerald-50 transition-colors">
                      Browse Files
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Theme Selection */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-headline text-2xl font-bold tracking-tight">Select your aesthetic</h2>
            <div className="flex gap-2">
              <span className="text-xs font-bold text-primary bg-primary-container/10 px-3 py-1 rounded-full uppercase tracking-wider">
                {STYLES.length} Styles Available
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STYLES.map((style) => (
              <div 
                key={style.id}
                onClick={() => setSelectedStyle(style)}
                className={`group relative bg-surface-container-lowest rounded-2xl p-4 shadow-[0px_20px_40px_rgba(0,109,54,0.04)] hover:shadow-xl transition-all duration-500 cursor-pointer overflow-hidden border-2
                  ${selectedStyle.id === style.id ? 'border-primary' : 'border-transparent hover:border-primary-container/30'}`}
              >
                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4 relative">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt={style.name} 
                    src={style.image} 
                  />
                  {style.id === 'tech' && (
                    <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded-md">
                      Popular
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-headline font-bold text-lg">{style.name}</h3>
                    <p className="text-sm text-zinc-500">{style.description}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                    ${selectedStyle.id === style.id ? 'border-primary' : 'border-outline-variant group-hover:border-primary'}`}>
                    <div className={`w-3 h-3 rounded-full bg-primary transition-opacity
                      ${selectedStyle.id === style.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Result / Processing */}
        <section className="relative">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[120%] h-64 bg-emerald-100/30 blur-[100px] -z-10 rounded-full"></div>
          
          <div className="liquid-glass rounded-2xl p-8 md:p-12 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-container/40 to-transparent"></div>
            
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="w-full lg:w-1/2 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-white/20 text-primary text-sm font-bold">
                  <Sparkles className="w-4 h-4" />
                  {resultImage ? 'AI Processing Complete' : isGenerating ? 'AI Processing...' : 'Ready to Generate'}
                </div>
                
                <h2 className="font-headline text-4xl font-bold tracking-tight">
                  {resultImage ? 'Your Masterpiece is ready.' : isGenerating ? 'Developing your photo...' : 'Transform your photo.'}
                </h2>
                
                <p className="text-zinc-600 text-lg leading-relaxed">
                  {resultImage 
                    ? `Using our proprietary Studio 3.0 Engine, we've enhanced your lighting, corrected skin tones, and generated a premium professional backdrop matching the ${selectedStyle.name} aesthetic.`
                    : isGenerating 
                    ? "Our AI is adjusting lighting, clothing, and background for a professional finish. This usually takes about 10-20 seconds."
                    : "Upload your photo and select a style above to generate your professional headshot."}
                </p>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-100 p-5 rounded-2xl flex gap-4 text-left"
                  >
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-headline font-bold text-red-900">{error.title}</h4>
                      <p className="text-sm text-red-800/80 leading-relaxed">
                        {error.message}
                      </p>
                      {error.action && (
                        <p className="text-xs font-bold text-red-900/60 mt-2 flex items-center gap-1.5 italic">
                          <HelpCircle className="w-3.5 h-3.5" />
                          Tip: {error.action}
                        </p>
                      )}
                      
                      {error.title === "Quota Exceeded" && (
                        <button 
                          onClick={() => setShowKeyInput(true)}
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 text-xs font-bold rounded-full hover:bg-red-100 transition-colors shadow-sm"
                        >
                          <Key className="w-3.5 h-3.5" />
                          Upgrade with Personal Key
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => setError(null)}
                      className="shrink-0 self-start p-1 hover:bg-red-100 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </motion.div>
                )}

                <div className="flex flex-wrap gap-4 pt-4">
                  {resultImage ? (
                    <>
                      <button 
                        onClick={handleDownload}
                        className="flex-1 min-w-[180px] bg-primary text-white py-4 rounded-full font-bold shadow-xl shadow-emerald-900/20 hover:scale-[1.02] transition-transform inner-glow flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Download PNG
                      </button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={generateHeadshot}
                        className="flex-1 min-w-[180px] bg-slate-800/10 text-slate-700 backdrop-blur-md border border-slate-200 py-4 rounded-full font-bold hover:bg-emerald-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                        Re-generate
                      </motion.button>
                    </>
                  ) : (
                    <motion.button 
                      whileHover={!image || isGenerating ? {} : { scale: 1.02 }}
                      whileTap={!image || isGenerating ? {} : { scale: 0.98 }}
                      disabled={!image || isGenerating}
                      onClick={generateHeadshot}
                      className={`flex-1 min-w-[180px] py-4 rounded-full font-bold shadow-xl transition-all flex items-center justify-center gap-2
                        ${!image || isGenerating 
                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' 
                          : 'bg-primary text-white shadow-emerald-900/20 inner-glow'}`}
                    >
                      {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      {isGenerating ? (retryAttempt > 0 ? `Retrying (${retryAttempt}/3)...` : 'Processing...') : 'Generate Headshot'}
                    </motion.button>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-1/2 flex justify-center">
                <div 
                  className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl transform rotate-1 bg-surface-container transition-all duration-500"
                  style={{ aspectRatio: aspectRatio.toString() }}
                >
                  {resultImage ? (
                    <div className="relative w-full h-full group/result">
                      <img className="w-full h-full object-cover" alt="Result" src={resultImage} />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/result:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button 
                          onClick={handleDownload}
                          className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all hover:scale-110 shadow-2xl"
                          title="Download Image"
                        >
                          <Download className="w-8 h-8" />
                        </button>
                      </div>
                    </div>
                  ) : isGenerating ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-white/40 backdrop-blur-sm">
                      <div className="relative mb-8">
                        {/* Outer Glow */}
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                        
                        {/* Main Spinner */}
                        <div className="relative w-32 h-32">
                          <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle
                              className="text-neutral-200 stroke-current"
                              strokeWidth="4"
                              cx="50"
                              cy="50"
                              r="45"
                              fill="transparent"
                            />
                            <circle
                              className="text-primary stroke-current animate-[spin_3s_linear_infinite]"
                              strokeWidth="4"
                              strokeLinecap="round"
                              cx="50"
                              cy="50"
                              r="45"
                              fill="transparent"
                              strokeDasharray="283"
                              strokeDashoffset="180"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Camera className="w-10 h-10 text-primary animate-bounce shadow-xl" />
                          </div>
                        </div>

                        {/* Scanning Line Effect */}
                        <motion.div 
                          initial={{ top: '0%' }}
                          animate={{ top: '100%' }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent z-10"
                        />
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-headline text-xl font-bold text-on-surface">
                          {retryAttempt > 0 ? `Retrying (Attempt ${retryAttempt}/3)` : 'Developing Studio Quality'}
                        </h3>
                        <div className="flex flex-col gap-2">
                          <p className="text-sm text-zinc-500 font-medium">
                            {retryAttempt > 0 ? 'Server is busy, searching for alternatives...' : 'Analyzing facial features...'}
                          </p>
                          <div className="w-48 h-1.5 bg-neutral-200 rounded-full overflow-hidden mx-auto">
                            <motion.div 
                              className="h-full bg-primary"
                              initial={{ width: "0%" }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 15, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-neutral-50 flex flex-col items-center justify-center p-12 text-center gap-4">
                      <ImageIcon className="w-16 h-16 text-neutral-200" />
                      <p className="text-neutral-400 font-medium">Preview will appear here</p>
                    </div>
                  )}
                  
                  {resultImage && (
                    <div className="absolute bottom-6 left-6 right-6 liquid-glass p-4 rounded-xl shadow-lg border-white/40 transition-all duration-500 hover:translate-y-[-4px]">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-primary mb-1">Style</p>
                          <p className="font-headline font-bold text-sm">{selectedStyle.name} v2.4</p>
                        </div>
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-primary flex items-center justify-center">
                            <CheckCircle2 className="text-white w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Studio Gallery Section */}
        {history.length > 0 && (
          <motion.div 
            id="gallery-section"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-24 mb-12 px-6 md:px-12"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-headline font-bold text-on-surface">Your Studio Gallery</h2>
                <p className="text-zinc-500 font-medium">Revisit and refine your previous masterpieces</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full text-primary text-xs font-bold border border-emerald-100">
                <Sparkles className="w-3.5 h-3.5" />
                {history.length}/8 Slots Used
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {history.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -5 }}
                  className="group relative cursor-pointer"
                  onClick={() => restoreFromHistory(item)}
                >
                  <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-lg border-4 border-white bg-white transition-all group-hover:shadow-2xl ring-1 ring-black/5 relative">
                    <img 
                      src={item.image} 
                      alt="History Item" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                    
                    {/* Style/Filter Snapshot Badge */}
                    <div className="absolute top-3 left-3 bg-white/70 backdrop-blur-md rounded-lg p-2 flex flex-col gap-1 border border-white/40 shadow-sm opacity-90 transition-opacity group-hover:opacity-100">
                       <div className="flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-primary" />
                          <span className="text-[8px] font-bold uppercase tracking-tight text-on-surface">
                            {STYLES.find(s => s.id === item.style)?.name}
                          </span>
                       </div>
                       <div className="flex gap-0.5">
                          {Object.entries(item.filters).map(([k, v]) => (
                            v !== 100 && v !== 0 && (
                              <div key={k} className="w-1 h-1 rounded-full bg-primary" title={`${k}: ${v}`} />
                            )
                          ))}
                       </div>
                    </div>
                    
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-sm">
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = document.createElement('a');
                          link.href = item.image;
                          link.download = `headshot-retry-${item.id}.png`;
                          link.click();
                        }}
                        className="p-3 bg-white rounded-full text-on-surface hover:bg-primary hover:text-white transition-all shadow-xl hover:scale-110"
                        title="Quick Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => deleteFromHistory(item.id, e)}
                        className="p-3 bg-white rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-xl hover:scale-110"
                        title="Delete from Gallery"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-start px-2">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                        {STYLES.find(s => s.id === item.style)?.name || 'Custom'}
                      </p>
                      <p className="text-xs text-zinc-400 font-medium">
                        {(() => {
                          const date = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
                          return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        })()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* BottomNavBar (Mobile) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pb-8 px-4 md:hidden">
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md rounded-full bg-white/60 backdrop-blur-2xl shadow-2xl shadow-emerald-900/10 flex justify-around items-center py-2 px-4 border border-white/20">
          <a className="flex flex-col items-center justify-center bg-primary text-white rounded-full p-3 scale-110 -translate-y-2 shadow-lg shadow-emerald-500/40" href="#">
            <Sparkles className="w-5 h-5" />
            <span className="font-headline text-[10px] uppercase tracking-widest font-bold mt-1">Studio</span>
          </a>
          <button 
            onClick={() => document.getElementById('gallery-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center justify-center text-zinc-500 p-2 hover:text-primary transition-colors"
          >
            <Folder className="w-5 h-5" />
            <span className="font-headline text-[10px] uppercase tracking-widest font-bold mt-1">History</span>
          </button>
          <button 
            onClick={() => {
              if (currentUser) {
                setShowPricing(true);
              } else {
                setIsAuthModalOpen(true);
              }
            }}
            className="flex flex-col items-center justify-center text-zinc-500 p-2 hover:text-primary transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            <span className="font-headline text-[10px] uppercase tracking-widest font-bold mt-1">Credits</span>
          </button>
          {!currentUser && (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="flex flex-col items-center justify-center text-zinc-500 p-2 hover:text-primary transition-colors"
            >
              <UserIcon className="w-5 h-5" />
              <span className="font-headline text-[10px] uppercase tracking-widest font-bold mt-1">Profile</span>
            </button>
          )}
          {currentUser && (
            <button 
              onClick={() => signOut(auth)}
              className="flex flex-col items-center justify-center text-red-500 p-2"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-headline text-[10px] uppercase tracking-widest font-bold mt-1">Exit</span>
            </button>
          )}
          <button 
            onClick={() => setShowKeyInput(true)}
            className="flex flex-col items-center justify-center text-zinc-500 p-2 hover:text-primary transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="font-headline text-[10px] uppercase tracking-widest font-bold mt-1">Settings</span>
          </button>
        </div>
      </nav>

      {/* Floating Action Button */}
      <button className="fixed right-6 bottom-32 md:bottom-8 bg-primary text-white w-14 h-14 rounded-full shadow-2xl shadow-emerald-900/40 flex items-center justify-center group hover:scale-110 active:scale-95 transition-all z-40">
        <HelpCircle className="w-6 h-6" />
      </button>
    </div>
  );
}
