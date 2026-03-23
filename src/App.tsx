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
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  }
];

export default function App() {
  const [selectedStyle, setSelectedStyle] = useState(STYLES[1]); // Default to Modern Tech
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) setCustomApiKey(savedKey);
  }, []);

  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('user_gemini_api_key', key);
    setShowKeyInput(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResultImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateHeadshot = async () => {
    if (!image) return;

    setIsGenerating(true);
    setError(null);

    try {
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("No API key found. Please provide your own Gemini API key in settings.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

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
              text: `Transform this person in the photo into a professional headshot. ${selectedStyle.prompt}. Maintain the person's facial features and identity accurately but enhance the lighting, clothing, and background to match the professional style.`,
            },
          ],
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setResultImage(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error("No image was generated. Please try again.");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
        setError("Quota exceeded. The free tier limit has been reached. Please wait a minute or add your own API key in settings to continue.");
      } else if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('invalid')) {
        setError("Invalid API key. Please check your API key in settings.");
      } else {
        setError(err.message || "Failed to generate headshot. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResultImage(null);
    setError(null);
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
            <a className="text-primary font-bold border-b-2 border-primary text-sm font-medium py-1" href="#">Studio</a>
            <a className="text-zinc-600 hover:text-primary text-sm font-medium transition-all duration-300" href="#">Projects</a>
            <a className="text-zinc-600 hover:text-primary text-sm font-medium transition-all duration-300" href="#">Credits</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowKeyInput(true)}
              className={`hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 shadow-lg active:scale-95
                ${customApiKey 
                  ? 'bg-primary text-white shadow-emerald-900/20' 
                  : 'bg-white border border-outline-variant text-zinc-600 hover:bg-emerald-50'}`}
            >
              <Key className="w-4 h-4" />
              {customApiKey ? 'Key Active' : 'Add API Key'}
            </button>
            
            <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border-2 border-primary-container/30">
              <img 
                className="w-full h-full object-cover" 
                alt="User Profile" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4wZVl8qsN8t8tSYNZfVGnnwWNDWNbbiht8AG3SclVvPa_rq1WBhtdXMNpda9o_2EUBSukIcsi_IzsQWLDWiYXK6Z983uprbBsM0O9F896Nl4wLyPm1N_UUYB6EtW4x7X1JphgSTCvwjk8KBparFw2LFBJI-Abhpc4BkN5ksFjO3cErgRL0YsNRJxzMI0Wyfpa5yL09ORQe8LNqmc8YdYmL7lec7nAX7d71_VKcUMi2vRZX8Umu41aRurgPHZJkRMW3X30LPs196iz" 
              />
            </div>
          </div>
        </div>
      </header>

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

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Your API Key</label>
                  <input 
                    type="password"
                    placeholder="Paste your Gemini API key here..."
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary focus:ring-2 focus:ring-emerald-200 outline-none transition-all font-mono text-sm"
                  />
                  <p className="mt-2 text-xs text-neutral-400">
                    Get your key for free at <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Your key is stored locally in your browser and is only used to make requests directly to Google's AI services.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => saveApiKey(customApiKey)}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:scale-[1.02] transition-all"
                  >
                    Save Key
                  </button>
                  {customApiKey && (
                    <button 
                      onClick={() => {
                        setCustomApiKey('');
                        localStorage.removeItem('user_gemini_api_key');
                        setShowKeyInput(false);
                      }}
                      className="px-4 py-3 border border-neutral-200 text-neutral-600 rounded-xl font-bold hover:bg-neutral-50 transition-all"
                    >
                      Remove
                    </button>
                  )}
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
                className={`relative rounded-2xl border-2 border-dashed p-12 transition-all duration-300 cursor-pointer
                  ${image ? 'bg-surface-container border-primary' : 'bg-surface-container-low border-outline-variant hover:bg-surface-container hover:border-primary'}`}
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
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden shadow-lg mb-4">
                      <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); reset(); }}
                        className="absolute top-1 right-1 p-1 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors"
                      >
                        <RefreshCw className="w-3 h-3 text-neutral-600" />
                      </button>
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
                  <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-medium">
                    {error}
                    {error.includes('Quota') && (
                      <button 
                        onClick={() => setShowKeyInput(true)}
                        className="block mt-2 text-primary font-bold hover:underline"
                      >
                        Add your own API Key to bypass this limit
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 pt-4">
                  {resultImage ? (
                    <>
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = resultImage;
                          link.download = 'headshot-pro.png';
                          link.click();
                        }}
                        className="flex-1 min-w-[180px] bg-primary text-white py-4 rounded-full font-bold shadow-xl shadow-emerald-900/20 hover:scale-[1.02] transition-transform inner-glow flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Download 4K
                      </button>
                      <button 
                        onClick={generateHeadshot}
                        className="flex-1 min-w-[180px] bg-white/40 backdrop-blur-md border border-white/40 py-4 rounded-full font-bold hover:bg-white/60 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Re-generate
                      </button>
                    </>
                  ) : (
                    <button 
                      disabled={!image || isGenerating}
                      onClick={generateHeadshot}
                      className={`flex-1 min-w-[180px] py-4 rounded-full font-bold shadow-xl transition-all flex items-center justify-center gap-2
                        ${!image || isGenerating 
                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' 
                          : 'bg-primary text-white shadow-emerald-900/20 hover:scale-[1.02] inner-glow'}`}
                    >
                      {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      {isGenerating ? 'Processing...' : 'Generate Headshot'}
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-1/2 flex justify-center">
                <div className="relative w-full max-w-sm aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl transform rotate-1">
                  {resultImage ? (
                    <img className="w-full h-full object-cover" alt="Result" src={resultImage} />
                  ) : isGenerating ? (
                    <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                      <div className="relative">
                        <div className="w-24 h-24 border-4 border-emerald-100 border-t-primary rounded-full animate-spin" />
                        <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary" />
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
      </main>

      {/* BottomNavBar (Mobile) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pb-8 px-4 md:hidden">
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md rounded-full bg-white/60 backdrop-blur-2xl shadow-2xl shadow-emerald-900/10 flex justify-around items-center py-2 px-4 border border-white/20">
          <a className="flex flex-col items-center justify-center bg-primary text-white rounded-full p-3 scale-110 -translate-y-2 shadow-lg shadow-emerald-500/40" href="#">
            <Sparkles className="w-5 h-5" />
            <span className="font-headline text-[10px] uppercase tracking-widest font-bold mt-1">Studio</span>
          </a>
          <a className="flex flex-col items-center justify-center text-zinc-500 p-2 hover:text-primary transition-colors" href="#">
            <Folder className="w-5 h-5" />
            <span className="font-headline text-[10px] uppercase tracking-widest font-bold mt-1">Projects</span>
          </a>
          <a className="flex flex-col items-center justify-center text-zinc-500 p-2 hover:text-primary transition-colors" href="#">
            <CreditCard className="w-5 h-5" />
            <span className="font-headline text-[10px] uppercase tracking-widest font-bold mt-1">Credits</span>
          </a>
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
