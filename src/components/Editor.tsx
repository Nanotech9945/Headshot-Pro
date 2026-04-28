import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Layout, 
  Settings2, 
  Sliders, 
  Sparkles, 
  Type as FontIcon, 
  Sticker, 
  Layers, 
  MousePointer2, 
  Plus, 
  Trash2, 
  Maximize2, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ArrowBigUp,
  ArrowBigDown,
  Eye,
  EyeOff,
  Square,
  Circle,
  Shapes,
  Image as ImageIcon,
  Save,
  Download,
  Share2,
  Undo2,
  Redo2,
  Eraser,
  ImagePlus,
  CloudUpload,
  UserRound,
  Wand2,
  Scissors,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as fabric from 'fabric';
import axios from 'axios';

interface EditorProps {
  onBack: () => void;
  initialImage?: string;
}

export default function AdvancedEditor({ onBack, initialImage }: EditorProps) {
  const [isMasking, setIsMasking] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [activePanel, setActivePanel] = useState('tools');
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const swapInputRef = useRef<HTMLInputElement>(null);

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth - 40,
      height: containerRef.current.clientHeight - 40,
      backgroundColor: '#1a1a1a',
      preserveObjectStacking: true,
    });

    setCanvas(fabricCanvas);

    fabricCanvas.on('selection:created', (e) => setSelectedObject(e.selected?.[0] || null));
    fabricCanvas.on('selection:updated', (e) => setSelectedObject(e.selected?.[0] || null));
    fabricCanvas.on('selection:cleared', () => setSelectedObject(null));

    // Mark paths as mask paths if in masking mode
    fabricCanvas.on('path:created', (e) => {
      const path = e.path;
      if (fabricCanvas.isDrawingMode) {
        (path as any).isMaskPath = true;
      }
    });

    // Handle resizing
    const handleResize = () => {
      if (containerRef.current) {
        fabricCanvas.setDimensions({
          width: containerRef.current.clientWidth - 40,
          height: containerRef.current.clientHeight - 40
        });
        fabricCanvas.renderAll();
      }
    };

    window.addEventListener('resize', handleResize);

    // Initial load
    if (initialImage) {
      fabric.FabricImage.fromURL(initialImage, { crossOrigin: 'anonymous' }).then((img) => {
        img.scaleToWidth(500);
        fabricCanvas.add(img);
        fabricCanvas.centerObject(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
      });
    }

    return () => {
      fabricCanvas.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [initialImage]);

  // AI Functions
  const generateFill = async () => {
    if (!canvas || !selectedObject || !(selectedObject instanceof fabric.FabricImage) || !prompt) return;
    
    const targetObj = selectedObject;
    setIsProcessing(true);
    try {
      // Find all paths that were drawn for masking
      const maskPaths = canvas.getObjects().filter(obj => (obj as any).isMaskPath);
      
      if (maskPaths.length === 0) {
        throw new Error("Please draw on the image to select the area to fill.");
      }

      // To ensure perfect alignment, we use a temporary canvas to export both image and mask
      // in the same coordinate space.
      const exportWidth = targetObj.getScaledWidth();
      const exportHeight = targetObj.getScaledHeight();
      
      // 1. Export Image
      // We use the object's own toDataURL which handles its scaling/rotation correctly
      const originalImage = targetObj.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });

      // 2. Export Mask
      // Create a temporary canvas matching the object's dataURL dimensions
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = exportWidth;
      maskCanvas.height = exportHeight;
      const maskFabricCanvas = new fabric.StaticCanvas(maskCanvas, {
        backgroundColor: 'black'
      });

      // We need to render the paths relative to the object's transform
      // The easiest way is to use the object's inverse transform on the paths
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const invTransform = fabric.util.invertTransform(targetObj.calcTransformMatrix());

      for (const path of maskPaths) {
          const clonedPath = await path.clone();
          // Transform path to object's local space
          clonedPath.transform(invTransform);
          // Adjust to center-based or top-left based coords
          // fabric objects in Fabric 7 use center by default if not specified? 
          // Actually, let's just use the matrix to place it.
          clonedPath.set({
              fill: 'white',
              stroke: 'white',
              left: clonedPath.left + exportWidth / 2,
              top: clonedPath.top + exportHeight / 2
          });
          maskFabricCanvas.add(clonedPath);
      }

      maskFabricCanvas.renderAll();
      const maskUrl = maskFabricCanvas.toDataURL({ format: 'png', multiplier: 1 });

      // 3. Send to API
      const response = await axios.post('/api/ai/gen-fill', { 
        image: originalImage, 
        mask: maskUrl, 
        prompt: prompt 
      });
      
      const newImg = await fabric.FabricImage.fromURL(response.data.image);
      newImg.set({
        left: targetObj.left,
        top: targetObj.top,
        scaleX: targetObj.scaleX,
        scaleY: targetObj.scaleY,
        angle: targetObj.angle
      });
      
      canvas.discardActiveObject();
      canvas.remove(targetObj);
      // Remove mask paths from main canvas
      maskPaths.forEach(p => canvas.remove(p));
      
      canvas.add(newImg);
      canvas.setActiveObject(newImg);
      canvas.renderAll();
      setPrompt('');
      setIsMasking(false);
      canvas.isDrawingMode = false;
    } catch (err: any) {
      console.error("GenFill Error:", err);
      const apiError = err.response?.data?.error || err.message;
      alert(`Generative fill failed: ${apiError}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMasking = () => {
    if (!canvas) return;
    const nextState = !isMasking;
    setIsMasking(nextState);
    canvas.isDrawingMode = nextState;
    if (nextState) {
        const brush = new fabric.PencilBrush(canvas);
        brush.width = 30;
        brush.color = 'rgba(239, 68, 68, 0.5)';
        canvas.freeDrawingBrush = brush;
    }
  };

  const removeBackground = async () => {
    if (!canvas || !selectedObject || !(selectedObject instanceof fabric.FabricImage)) return;
    
    const targetObj = selectedObject;
    setIsProcessing(true);
    try {
      const dataUrl = targetObj.toDataURL({ format: 'png', multiplier: 1 });
      const response = await axios.post('/api/ai/remove-bg', { image: dataUrl });
      
      const newImg = await fabric.FabricImage.fromURL(response.data.image);
      newImg.set({
        left: targetObj.left,
        top: targetObj.top,
        scaleX: targetObj.scaleX,
        scaleY: targetObj.scaleY,
        angle: targetObj.angle
      });
      
      canvas.discardActiveObject();
      canvas.remove(targetObj);
      canvas.add(newImg);
      canvas.setActiveObject(newImg);
      canvas.renderAll();
    } catch (err) {
      console.error("BG Removal Error:", err);
      alert("Failed to remove background. Ensure API key is set.");
    } finally {
      setIsProcessing(false);
    }
  };

  const faceSwap = async (swapFile: File) => {
    if (!canvas || !selectedObject || !(selectedObject instanceof fabric.FabricImage)) return;
    
    const targetObj = selectedObject;
    setIsProcessing(true);
    try {
      const targetUrl = targetObj.toDataURL({ format: 'png', multiplier: 1 });
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const swapUrl = e.target?.result as string;
        const response = await axios.post('/api/ai/face-swap', { 
          targetImage: targetUrl, 
          swapImage: swapUrl 
        });
        
        const newImg = await fabric.FabricImage.fromURL(response.data.image);
        newImg.scaleToWidth(targetObj.getScaledWidth());
        newImg.set({
          left: targetObj.left,
          top: targetObj.top,
        });
        
        canvas.discardActiveObject();
        canvas.remove(targetObj);
        canvas.add(newImg);
        canvas.setActiveObject(newImg);
        canvas.renderAll();
      };
      reader.readAsDataURL(swapFile);
    } catch (err) {
      console.error("Face Swap Error:", err);
      alert("Face swap failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && canvas) {
      const reader = new FileReader();
      reader.onload = (f) => {
        fabric.FabricImage.fromURL(f.target?.result as string).then((img) => {
          img.scaleToWidth(400);
          canvas.add(img);
          canvas.centerObject(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText('Double click to edit', {
      left: 100,
      top: 100,
      fontFamily: 'Inter',
      fill: '#ffffff',
      fontSize: 40,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addShape = (type: 'rect' | 'circle') => {
    if (!canvas) return;
    let shape;
    if (type === 'rect') {
      shape = new fabric.Rect({
        left: 100,
        top: 100,
        fill: '#6366f1',
        width: 100,
        height: 100,
      });
    } else {
      shape = new fabric.Circle({
        left: 100,
        top: 100,
        fill: '#10b981',
        radius: 50,
      });
    }
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  };

  const downloadCanvas = () => {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `studio-edit-${Date.now()}.png`;
    link.href = canvas.toDataURL({ format: 'png', multiplier: 2 });
    link.click();
  };

  return (
    <div className="h-screen bg-[#0a0a0a] text-zinc-300 flex overflow-hidden font-sans selection:bg-primary/30">
      {/* Left Sidebar: Tools */}
      <div className="w-[72px] bg-[#121212] border-r border-white/5 flex flex-col items-center py-6 gap-4 z-[120]">
        <button onClick={onBack} className="p-3 mb-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
          <ChevronDown className="w-5 h-5 rotate-90" />
        </button>
        
        <ToolbarButton 
          icon={<MousePointer2 className="w-5 h-5" />} 
          label="Select" 
          active={activePanel === 'tools'}
          onClick={() => setActivePanel('tools')} 
        />
        <ToolbarButton 
          icon={<Wand2 className="w-5 h-5" />} 
          label="AI Magic" 
          active={activePanel === 'ai'}
          onClick={() => setActivePanel('ai')} 
        />
        <ToolbarButton 
          icon={<Sliders className="w-5 h-5" />} 
          label="Adjust" 
          active={activePanel === 'adjust'}
          onClick={() => setActivePanel('adjust')} 
        />
        <ToolbarButton 
          icon={<FontIcon className="w-5 h-5" />} 
          label="Text" 
          active={activePanel === 'text'}
          onClick={() => setActivePanel('text')} 
        />
        <ToolbarButton 
          icon={<Shapes className="w-5 h-5" />} 
          label="Shapes" 
          active={activePanel === 'element'}
          onClick={() => setActivePanel('element')} 
        />
        
        <div className="mt-auto flex flex-col gap-4">
             <ToolbarButton icon={<CloudUpload className="w-5 h-5" />} label="Upload" onClick={() => fileInputRef.current?.click()} />
             <ToolbarButton icon={<Download className="w-5 h-5" />} label="Download" onClick={downloadCanvas} />
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
      <input type="file" ref={swapInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && faceSwap(e.target.files[0])} accept="image/*" />

      {/* Main Canvas Area */}
      <main ref={containerRef} className="flex-1 relative bg-[#0f0f0f] flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="shadow-2xl rounded-lg" />
        
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[200] flex flex-col items-center justify-center gap-4">
             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
             <p className="text-primary font-bold animate-pulse uppercase tracking-widest text-xs">AI is working its magic...</p>
          </div>
        )}

        {/* Floating Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 px-6 flex items-center gap-6 shadow-2xl z-50">
          <button onClick={() => canvas?.setZoom(canvas.getZoom() * 0.9)} className="p-1 hover:text-primary transition-colors"><ZoomOut className="w-4 h-4" /></button>
          <div className="text-[10px] font-mono text-zinc-500">100%</div>
          <button onClick={() => canvas?.setZoom(canvas.getZoom() * 1.1)} className="p-1 hover:text-primary transition-colors"><ZoomIn className="w-4 h-4" /></button>
          <div className="h-4 w-[1px] bg-white/10 mx-2" />
          <button onClick={() => {
            const active = canvas?.getActiveObject();
            if (active) canvas?.centerObject(active);
          }} className="p-1 hover:text-primary transition-colors"><Maximize2 className="w-4 h-4" /></button>
          <button onClick={() => downloadCanvas()} className="p-1 hover:text-primary transition-colors"><Download className="w-4 h-4" /></button>
        </div>
      </main>

      {/* Right Sidebar: Properties */}
      <aside className="w-80 bg-[#121212] border-l border-white/5 flex flex-col z-[110]">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Properties</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {activePanel === 'ai' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase text-primary tracking-widest">AI Tools</label>
                <div className="grid grid-cols-1 gap-3">
                  <AIToolButton 
                    icon={<Scissors className="w-5 h-5" />} 
                    title="Remove Background" 
                    desc="Perfect cutout in seconds"
                    onClick={removeBackground}
                    disabled={!selectedObject || !(selectedObject instanceof fabric.FabricImage)}
                  />
                  <AIToolButton 
                    icon={<UserRound className="w-5 h-5" />} 
                    title="Face Swap" 
                    desc="Replace face from another image"
                    onClick={() => swapInputRef.current?.click()}
                    disabled={!selectedObject || !(selectedObject instanceof fabric.FabricImage)}
                    isComingSoon={true}
                  />
                  <div className="pt-4 border-t border-white/5 space-y-4">
                    <AIToolButton 
                      icon={<Sparkles className={`w-5 h-5 ${isMasking ? 'text-primary' : ''}`} />} 
                      title="Generative Fill" 
                      desc={isMasking ? "Draw over area to fill" : "Magic image completion"}
                      onClick={toggleMasking}
                      active={isMasking}
                      disabled={!selectedObject || !(selectedObject instanceof fabric.FabricImage)}
                      isComingSoon={true}
                    />
                    
                    {isMasking && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <textarea 
                          placeholder="What should we fill here? (e.g. 'a beautiful sunset')"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:border-primary outline-none min-h-[80px] resize-none"
                        />
                        <button 
                          onClick={generateFill}
                          disabled={!prompt || isProcessing}
                          className="w-full py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                          Fill Selected Area
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'text' && (
            <div className="space-y-6">
              <button 
                onClick={addText}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:scale-102 transition-all shadow-lg shadow-primary/20"
              >
                Add Text Layer
              </button>
            </div>
          )}

          {activePanel === 'element' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => addShape('rect')} className="p-6 bg-white/5 rounded-2xl hover:bg-white/10 transition-all flex flex-col items-center gap-3">
                  <Square className="w-8 h-8" />
                  <span className="text-[10px] font-bold uppercase">Rectangle</span>
                </button>
                <button onClick={() => addShape('circle')} className="p-6 bg-white/5 rounded-2xl hover:bg-white/10 transition-all flex flex-col items-center gap-3">
                  <Circle className="w-8 h-8" />
                  <span className="text-[10px] font-bold uppercase">Circle</span>
                </button>
              </div>
            </div>
          )}

          {!selectedObject ? (
            <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl flex flex-col items-center gap-4">
              <MousePointer2 className="w-8 h-8 text-zinc-700" />
              <p className="text-xs text-zinc-600 px-10 leading-relaxed font-medium">Select an element on canvas to edit its properties</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-primary">Selected Element</span>
                <button onClick={() => { canvas?.remove(selectedObject); canvas?.renderAll(); }} className="text-red-500/50 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Layer Controls */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Arrange Layers</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      if (canvas && selectedObject) {
                        const objects = canvas.getObjects();
                        canvas.moveObjectTo(selectedObject, objects.length - 1);
                        canvas.renderAll();
                      }
                    }}
                    className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase"
                    title="Bring to Front"
                  >
                    <ArrowBigUp className="w-4 h-4" /> To Front
                  </button>
                  <button 
                    onClick={() => {
                      if (canvas && selectedObject) {
                        canvas.moveObjectTo(selectedObject, 0);
                        canvas.renderAll();
                      }
                    }}
                    className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase"
                    title="Send to Back"
                  >
                    <ArrowBigDown className="w-4 h-4" /> To Back
                  </button>
                  <button 
                    onClick={() => {
                      if (canvas && selectedObject) {
                        const objects = canvas.getObjects();
                        const currentIndex = objects.indexOf(selectedObject);
                        if (currentIndex < objects.length - 1) {
                          canvas.moveObjectTo(selectedObject, currentIndex + 1);
                          canvas.renderAll();
                        }
                      }
                    }}
                    className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase"
                    title="Bring Forward"
                  >
                    <ArrowUp className="w-4 h-4" /> Forward
                  </button>
                  <button 
                    onClick={() => {
                      if (canvas && selectedObject) {
                        const objects = canvas.getObjects();
                        const currentIndex = objects.indexOf(selectedObject);
                        if (currentIndex > 0) {
                          canvas.moveObjectTo(selectedObject, currentIndex - 1);
                          canvas.renderAll();
                        }
                      }
                    }}
                    className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase"
                    title="Send Backward"
                  >
                    <ArrowDown className="w-4 h-4" /> Backward
                  </button>
                </div>
              </div>

              {/* General Adjustments */}
              <div className="space-y-6">
                <div className="space-y-4">
                   <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500">
                     <span>Opacity</span>
                     <span>{Math.round((selectedObject.opacity || 1) * 100)}%</span>
                   </div>
                   <input 
                    type="range" min="0" max="1" step="0.01"
                    value={selectedObject.opacity}
                    onChange={(e) => {
                      selectedObject.set({ opacity: parseFloat(e.target.value) });
                      canvas?.renderAll();
                    }}
                    className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none"
                   />
                </div>

                {selectedObject instanceof fabric.IText && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase text-zinc-500">Text Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {['#ffffff', '#000000', '#6366f1', '#10b981', '#ef4444', '#f59e0b'].map(c => (
                        <button 
                          key={`text-color-${c}`}
                          onClick={() => {
                            selectedObject.set({ fill: c });
                            canvas?.renderAll();
                          }}
                          className={`w-8 h-8 rounded-full border-2 ${selectedObject.fill === c ? 'border-primary' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={downloadCanvas}
            className="w-full py-4 bg-white text-black rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all"
          >
            <Download className="w-4 h-4" /> Export studio result
          </button>
        </div>
      </aside>
    </div>
  );
}

function ToolbarButton({ icon, label, onClick, active }: { icon: React.ReactNode, label: string, onClick?: () => void, active?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`group relative p-3.5 rounded-2xl transition-all duration-300 flex flex-col items-center gap-1 ${active ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
    >
      {icon}
      <div className="opacity-0 group-hover:opacity-100 transition-all absolute left-16 bg-[#1a1a1a] border border-white/10 px-3 py-1.5 rounded-xl shadow-2xl whitespace-nowrap z-50 text-[10px] font-bold uppercase tracking-widest pointer-events-none">
        {label}
      </div>
    </button>
  );
}

function AIToolButton({ icon, title, desc, onClick, disabled, active, isComingSoon }: { icon: any, title: string, desc: string, onClick?: () => void, disabled?: boolean, active?: boolean, isComingSoon?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled || isComingSoon}
      className={`w-full p-4 rounded-2xl border flex items-start gap-4 transition-all text-left relative overflow-hidden ${disabled || isComingSoon ? 'opacity-50 grayscale cursor-not-allowed border-white/5' : active ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' : 'bg-white/5 border-white/5 hover:border-primary/50 hover:bg-primary/5 group'}`}
    >
      {isComingSoon && (
        <div className="absolute top-0 right-0 bg-primary/20 text-primary text-[8px] font-bold uppercase py-1 px-3 rounded-bl-xl tracking-widest border-l border-b border-primary/30">
          Coming Soon
        </div>
      )}
      <div className={`p-3 rounded-xl bg-white/5 transition-colors ${(!disabled && !active && !isComingSoon) && 'group-hover:bg-primary/20 group-hover:text-primary'} ${active && 'bg-primary/20 text-primary'}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-tight">{title}</h4>
        <p className="text-[10px] text-zinc-500 mt-0.5">{desc}</p>
      </div>
    </button>
  );
}
