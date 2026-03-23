/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Upload, Camera, Check, Loader2, RefreshCw, Briefcase, Building2, Sun, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STYLES = [
  {
    id: 'corporate',
    name: 'Corporate Grey',
    description: 'Classic studio look with a neutral grey backdrop.',
    icon: <Briefcase className="w-5 h-5" />,
    prompt: 'A professional corporate headshot with a clean, solid grey studio backdrop. The person is wearing professional business attire (suit or blazer). High-end studio lighting, sharp focus, 8k resolution.'
  },
  {
    id: 'tech',
    name: 'Modern Tech',
    description: 'Modern office environment with soft bokeh.',
    icon: <Building2 className="w-5 h-5" />,
    prompt: 'A professional headshot in a modern tech office environment. Softly blurred background with glass walls and plants. The person is wearing business casual attire. Natural but professional lighting, high-end photography.'
  },
  {
    id: 'outdoor',
    name: 'Natural Light',
    description: 'Outdoor setting with soft natural sunlight.',
    icon: <Sun className="w-5 h-5" />,
    prompt: 'A professional headshot taken outdoors with soft, natural morning light. Blurred greenery in the background. The person is wearing smart casual attire. Warm, inviting atmosphere, professional portrait photography.'
  }
];

export default function App() {
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Extract base64 data
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
      setError(err.message || "Failed to generate headshot. Please try again.");
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
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Camera className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">Headshot Pro</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-neutral-500">
            <a href="#" className="hover:text-neutral-900 transition-colors">How it works</a>
            <a href="#" className="hover:text-neutral-900 transition-colors">Styles</a>
            <a href="#" className="hover:text-neutral-900 transition-colors">Pricing</a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* Left Column: Controls */}
          <div className="space-y-8">
            <section>
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                Professional headshots <br />
                <span className="text-emerald-600">in seconds.</span>
              </h1>
              <p className="text-neutral-500 text-lg">
                Upload a casual selfie and let our AI transform it into a studio-quality professional portrait.
              </p>
            </section>

            {/* Step 1: Upload */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs flex items-center justify-center font-bold">1</span>
                <h2 className="font-semibold">Upload your selfie</h2>
              </div>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-4
                  ${image ? 'border-emerald-200 bg-emerald-50/30' : 'border-neutral-200 hover:border-emerald-400 hover:bg-neutral-100/50'}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                {image ? (
                  <div className="relative w-full aspect-square max-w-[200px] rounded-xl overflow-hidden shadow-lg">
                    <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-neutral-600" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-neutral-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Click to upload or drag and drop</p>
                      <p className="text-sm text-neutral-400">PNG, JPG up to 10MB</p>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Step 2: Style */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs flex items-center justify-center font-bold">2</span>
                <h2 className="font-semibold">Choose your style</h2>
              </div>
              
              <div className="grid gap-3">
                {STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                      ${selectedStyle.id === style.id 
                        ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600' 
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                      ${selectedStyle.id === style.id ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                      {style.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold flex items-center justify-between">
                        {style.name}
                        {selectedStyle.id === style.id && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="text-xs text-neutral-500">{style.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <button
              disabled={!image || isGenerating}
              onClick={generateHeadshot}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg
                ${!image || isGenerating 
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]'}`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Professional Headshot
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </p>
            )}
          </div>

          {/* Right Column: Result */}
          <div className="sticky top-28">
            <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl overflow-hidden aspect-[4/5] relative group">
              <AnimatePresence mode="wait">
                {resultImage ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    <img 
                      src={resultImage} 
                      alt="Generated Headshot" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-6 left-6 right-6">
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = resultImage;
                          link.download = 'headshot-pro.png';
                          link.click();
                        }}
                        className="w-full py-3 bg-white/90 backdrop-blur-sm rounded-xl font-semibold text-neutral-900 shadow-xl hover:bg-white transition-all"
                      >
                        Download Headshot
                      </button>
                    </div>
                  </motion.div>
                ) : isGenerating ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full flex flex-col items-center justify-center p-12 text-center gap-6 bg-neutral-50"
                  >
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                      <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Developing your photo...</h3>
                      <p className="text-neutral-400 text-sm">Our AI is adjusting lighting, clothing, and background for a professional finish.</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full flex flex-col items-center justify-center p-12 text-center gap-4 bg-neutral-50"
                  >
                    <div className="w-20 h-20 rounded-full bg-white shadow-inner flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-neutral-200" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Your headshot will appear here</h3>
                      <p className="text-neutral-400 text-sm">Upload a photo and select a style to get started.</p>
                    </div>
                    
                    {/* Example Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-8 opacity-40 grayscale">
                      <div className="w-24 h-24 rounded-lg bg-neutral-200 animate-pulse" />
                      <div className="w-24 h-24 rounded-lg bg-neutral-200 animate-pulse" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="mt-6 flex items-center justify-center gap-8 text-neutral-400">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
                <Check className="w-4 h-4 text-emerald-500" />
                Studio Quality
              </div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
                <Check className="w-4 h-4 text-emerald-500" />
                AI Enhanced
              </div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
                <Check className="w-4 h-4 text-emerald-500" />
                Fast Delivery
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-12 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-neutral-900 rounded flex items-center justify-center">
              <Camera className="text-white w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight">Headshot Pro</span>
          </div>
          <p className="text-neutral-400 text-sm">© 2026 AI Headshot Pro. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-neutral-500">
            <a href="#" className="hover:text-neutral-900">Privacy</a>
            <a href="#" className="hover:text-neutral-900">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
