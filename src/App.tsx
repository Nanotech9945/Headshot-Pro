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
  Settings2,
  HelpCircle,
  CheckCircle2,
  Trash2,
  LogIn,
  LogOut,
  User as UserIcon,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Scissors,
  Users,
  Ban,
  Shield,
  ShieldAlert,
  Search,
  Activity,
  UserRound,
  Wand2,
  CloudUpload
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';

import Cropper from 'react-easy-crop';
import getCroppedImg, { applyFilters, optimizeImage } from './lib/cropUtils';
import AdvancedEditor from './components/Editor';

import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
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
  collectionGroup,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
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
    name: 'Corporate Executive',
    description: 'Sharp, trustworthy, and commanding executive presence.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDll-GxjL4m9J-EluKipUUSwUSw1FdTmQ9jJ5hDy2N5o-JQmculHem3Af94PEdajc85eF6CpxJDRfUjAhT4RKYs7V68HYz2K5JOpkhDgDBu98IRxsAcWTO4wUTUTN8PLTf8lE39BeXjq_h2Qu5HbXs7qoUe5MsHsgzeGYzwpc97O1NSm4qPRnYS0ipVeSr9IYir6jBHY4aWuruLUeS7O-qDO9gFTFKYGqKxuewjpyJtI25tgtoquIMdB0pKAnSoIwxd5XDqEE7QTaL8',
    prompt: 'A professional high-end corporate headshot. The subject has a confident and neutral executive facial expression, maintaining their original identity. They are wearing a bespoke charcoal suit with a crisp white shirt and silk tie (or elegant professional blazer). Clean, minimalist medium-grey studio background with professional three-point lighting. 8k resolution, photorealistic, sharp focus on eyes, shallow depth of field.'
  },
  {
    id: 'tech',
    name: 'Modern Startup',
    description: 'Minimalist, approachable, and innovative tech vibe.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAsv_2SRL7AglpZGhJd8eQVtPMzzL4SJabbX_osAxR5g1SHloaDk4-Qhiddr8Tro4LkMDAdiynSknoU_F-_bez4En-XLCLSXcN1ptmq2SlbDxjWFQ35bIVmLAoXrv7AeKX4_1j9CN6EAgVFNN9FHOSZckBaZJ6guouncN2Rggmo2Y2nrLBY7Os4sjBescMj2JTb8Nl6tXoZKbiwKWmJ_h4b2VzxEVRYQDtrB-L67lTsVlDQuhs-YEhBQqbW29dtz6R86NAoPcWriWf',
    prompt: 'A sleek professional headshot in a bright, modern tech office. The subject maintains their original facial expression and features. Background features soft-focus glass partitions, lush indoor plants, and natural light beams. Subject is wearing premium business casual attire (merino wool sweater or light blazer). Natural morning lighting, high-end commercial photography style, ultra-sharp detail.'
  },
  {
    id: 'creative',
    name: 'Creative Studio',
    description: 'Dynamic, artistic, and expressive professional look.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqKtrJMb4k_19uD3WS2Zab54be1BgxYhXWjd8hJu2OmPG9CZ4aT2YAomsByJYP70ABH1NZqWYveGXG9J-B7Wtb_hTzhyPvToo0A5dsY0Lrr1hCyRuSs_dxyeEWpZNkxRgc9DJ-3idvol2Z1fNk5q89R8E3nnszemC23rLjZafyrNyXCDuRGn5jyzaMc5Qwgae2IF8dCWtH-6clrxQIKPwenhrH3kbsNXdFXmpCN6JC9kpC-y8ch0YMt0jf4wXVuWWf_qOJhuEFW9LG',
    prompt: 'An artistic professional portrait with sophisticated chiaroscuro lighting. Subject retains their authentic facial expression and identity. Warm, rich earth tones in the atmosphere. Wearing high-quality textured creative professional attire. Soft, warm studio backlight creating a subtle rim light effect. High-end editorial magazine quality, detailed skin textures, masterful color grading.'
  },
  {
    id: 'vintage',
    name: 'Timeless Elegance',
    description: 'Classic, sophisticated, and nostalgically cinematic.',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    prompt: 'A professional cinematic headshot with a vintage 1950s aesthetic. Authentic facial expression and features are preserved. Classic Hollywood soft-key lighting. Subject wearing elegant period-accurate professional attire. Subtle film grain, rich tonality, timeless atmosphere. Rendered with the quality of a legendary portrait photographer.'
  },
  {
    id: 'outdoors',
    name: 'Natural Professional',
    description: 'Authentic, outdoor, and naturally lit professional portrait.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
    prompt: 'A high-end professional outdoor headshot during the golden hour. Authentic facial expression maintained. Background is a beautiful, softly blurred natural setting with warm sunlight. Subject wearing high-quality outdoor-appropriate professional clothing. Sharp detail on the subject with creamy bokeh background, stunning natural light.'
  },
  {
    id: 'model',
    name: 'Model Folio',
    description: 'High-fashion, dramatic, striking.',
    image: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?q=80&w=600&auto=format&fit=crop',
    prompt: 'A high-fashion model portfolio headshot. Strong directional lighting, moody shadows. Wearing editorial fashion attire. Striking, high-impact aesthetic. Master portrait photography.'
  }
];

const BACKGROUNDS = [
  { id: 'office', name: 'Modern Office', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=400&auto=format&fit=crop' },
  { id: 'highrise', name: 'Elite Highrise', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=400&auto=format&fit=crop' },
  { id: 'studio', name: 'Neutral Studio', image: 'https://images.unsplash.com/photo-1598331668826-20cecc596b86?q=80&w=400&auto=format&fit=crop' },
  { id: 'penthouse', name: 'Exec Penthouse', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=400&auto=format&fit=crop' },
  { id: 'loft', name: 'Industrial Loft', image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=400&auto=format&fit=crop' },
  { id: 'library', name: 'Academic Library', image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=400&auto=format&fit=crop' },
  { id: 'medical', name: 'Modern Medical', image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=400&auto=format&fit=crop' },
  { id: 'lab', name: 'Innovation Lab', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=400&auto=format&fit=crop' },
  { id: 'terrace', name: 'Skyline Terrace', image: 'https://images.unsplash.com/photo-1519710192704-742913539415?q=80&w=400&auto=format&fit=crop' },
  { id: 'boardroom', name: 'Executive Board', image: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?q=80&w=400&auto=format&fit=crop' },
  { id: 'minimal', name: 'Minimalist Wall', image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=400&auto=format&fit=crop' },
  { id: 'gallery', name: 'Art Gallery', image: 'https://images.unsplash.com/photo-1518998053502-517cb83cca26?q=80&w=400&auto=format&fit=crop' },
  { id: 'luxury-lobby', name: 'Luxury Lobby', image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=400&auto=format&fit=crop' },
  { id: 'glass-office', name: 'Glass Office', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=400&auto=format&fit=crop' },
  { id: 'high-retail', name: 'High-End Retail', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=400&auto=format&fit=crop' },
  { id: 'rooftop', name: 'Corporate Rooftop', image: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?q=80&w=400&auto=format&fit=crop' },
];

function LimitItem({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10'
  };
  
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-white/10 transition-all">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-xs font-bold text-zinc-300 uppercase tracking-tight">{label}</span>
      </div>
      <span className="text-xs font-black text-white">{value}</span>
    </div>
  );
}

function AdminDashboard({ setError }: { setError: (err: { title: string, message: string }) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [globalHeadshots, setGlobalHeadshots] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingGenerations, setLoadingGenerations] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(items);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    try {
      const q = query(collectionGroup(db, 'headshots'), orderBy('timestamp', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGlobalHeadshots(items.slice(0, 12));
        setLoadingGenerations(false);
      }, (err) => {
        console.error("Global headshots query failed (likely missing index):", err);
        setError({
          title: "Database Index Required",
          message: "The global feed requires a Firestore index. If you are an admin, check the browser console for a link to create it, or wait for automatic indexing."
        });
        setLoadingGenerations(false);
      });
    } catch (err) {
      console.error("Error setting up global headshots listener:", err);
      setLoadingGenerations(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const toggleBlockUser = async (user: any) => {
    // Prevent blocking oneself
    if (user.id === auth.currentUser?.uid || user.email === 't19788994@gmail.com') {
      setError({
        title: "Action Restricted",
        message: "Administrators cannot be blocked to prevent accidental loss of management access."
      });
      return;
    }

    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    try {
      await setDoc(doc(db, 'users', user.id), { 
        status: newStatus,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid?.includes(searchQuery)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-16 py-12"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 pb-12">
        <div className="space-y-2">
          <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Command <span className="text-primary italic">Center</span></h2>
          <p className="text-zinc-500 font-medium">Manage elite members and oversee global generation activity.</p>
        </div>
        <div className="relative group min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder="Identity Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:border-primary/30 transition-all font-medium text-sm"
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl space-y-2">
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Global Partners</div>
          <div className="text-4xl font-black text-on-surface tracking-tighter">{users.length}</div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl space-y-2">
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Portals</div>
          <div className="text-4xl font-black text-primary tracking-tighter">{globalHeadshots.length}+</div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl space-y-2">
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Status</div>
          <div className="text-4xl font-black text-emerald-500 tracking-tighter">
            {users.filter(u => u.status !== 'blocked').length}
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl space-y-2">
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Restricted</div>
          <div className="text-4xl font-black text-red-500 tracking-tighter">
             {users.filter(u => u.status === 'blocked').length}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-black uppercase tracking-tight">Member Registry</h3>
        </div>
        <div className="bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Member</th>
                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Credits</th>
                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Joined</th>
                <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</th>
                <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Hydrating Members List...</p>
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-900 rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold bg-primary uppercase">
                            {user.displayName?.[0] || user.email?.[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-on-surface">{user.displayName || 'Unnamed Partner'}</div>
                        <div className="text-xs text-zinc-400 font-mono">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-primary rounded-full text-[10px] font-black uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      {user.credits || 0}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-tight">
                      {user.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      user.status === 'blocked' 
                        ? 'bg-red-50 text-red-500' 
                        : 'bg-emerald-50 text-emerald-500'
                    }`}>
                      {user.status || 'active'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => toggleBlockUser(user)}
                      disabled={user.email === 't19788994@gmail.com'}
                      className={`p-3 rounded-2xl transition-all shadow-xl hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 ${
                        user.status === 'blocked'
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                          : 'bg-red-500 text-white shadow-red-500/20'
                      }`}
                      title={user.email === 't19788994@gmail.com' ? 'Admin Cannot Be Blocked' : (user.status === 'blocked' ? 'Authorize Member' : 'Suspend Member')}
                    >
                      {user.status === 'blocked' ? <Shield className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Activity Feed */}
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-black uppercase tracking-tight">Recent Global Generations</h3>
        </div>
        
        {loadingGenerations ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl">
             <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
             <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Scanning Global Vault...</p>
          </div>
        ) : globalHeadshots.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl">
            <ImageIcon className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
            <p className="text-sm font-bold text-zinc-300 uppercase tracking-widest">No Recent Generations Detected.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {globalHeadshots.map((item) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative aspect-[4/5] rounded-3xl overflow-hidden bg-zinc-100 border-2 border-white shadow-lg"
              >
                <img src={item.image} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-[10px] font-black text-white uppercase tracking-widest">{item.style}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [activeTab, setActiveTab] = useState<'generator' | 'editor' | 'gallery' | 'admin'>('generator');
  const [showLimitsModal, setShowLimitsModal] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('seen_limits_modal');
    if (!hasSeen) {
      setShowLimitsModal(true);
    }
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [15, -15]);
  const rotateY = useTransform(x, [-100, 100], [-15, 15]);

  function handleMouse(event: React.MouseEvent) {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const [selectedStyle, setSelectedStyle] = useState(STYLES[1]); // Default to Modern Tech
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | null>(null);
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
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Check if admin
        const adminDocRef = doc(db, 'admins', user.uid);
        getDoc(adminDocRef)
          .then(snap => {
            setIsAdmin(snap.exists() || user.email === 't19788994@gmail.com');
          })
          .catch(err => {
            console.error("Admin check failed:", err);
            // Fallback to email check if document read fails
            setIsAdmin(user.email === 't19788994@gmail.com');
          });

        // Fetch credits from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setCredits(userData.credits ?? 0);
            
            // Auto-fix if main admin is accidentally blocked
            const isMainAdmin = user.email === 't19788994@gmail.com';
            if (isMainAdmin && userData.status === 'blocked') {
              console.log("Admin detected as blocked. Auto-restoring status...");
              await setDoc(userDocRef, { 
                status: 'active',
                updatedAt: serverTimestamp() 
              }, { merge: true });
              return;
            }

            // Auto logout if blocked (but never for the primary admin)
            if (userData.status === 'blocked' && !isMainAdmin) {
              signOut(auth);
              setError({ title: "Account Blocked", message: "Your account has been suspended by an administrator." });
            }
          } else {
            setCredits(0);
          }
        }, (err) => {
          console.error("Credit snapshot error for user", user.uid, err);
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`, user);
        });
      } else {
        setCredits(null);
        setIsAdmin(false);
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
      collection(db, `users/${currentUser.uid}/headshots`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setHistory(items);
    }, (err) => {
      console.error("History snapshot error for user", currentUser.uid, err);
      handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}/headshots`, currentUser);
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
      
      const userRef = doc(db, 'users', result.user.uid);
      try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          // Initialize new user
          await setDoc(userRef, {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            credits: 3 // Give 3 free credits to new users as per requirement
          });
        } else {
          // Update existing user profile/last login (merge: true handles fields safely)
          await setDoc(userRef, {
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${result.user.uid}`);
      }
      
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
        try {
          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            email: result.user.email,
            displayName: authDisplayName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            credits: 0
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${result.user.uid}`);
        }
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
      upscaled: isUpscaled,
      enhanced: isEnhanced,
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
        const path = `users/${currentUser.uid}/headshots`;
        await addDoc(collection(db, path), {
          ...newItem,
          userId: currentUser.uid,
        });
        // Decrement credits & Update updatedAt
        await setDoc(doc(db, 'users', currentUser.uid), {
          credits: (credits ?? 0) - 1,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/headshots`);
      }
    } else {
      // Local history fallback
      setHistory(prev => [{ ...newItem, id: Math.random().toString(36).substr(2, 9) }, ...prev].slice(0, 8));
    }
  };

  const deleteFromHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser) {
      const path = `users/${currentUser.uid}/headshots/${id}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

   const restoreFromHistory = (item: any) => {
    setResultImage(item.image);
    setFilters(item.filters);
    if (item.upscaled !== undefined) setIsUpscaled(item.upscaled);
    if (item.enhanced !== undefined) setIsEnhanced(item.enhanced);
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

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomBackground(reader.result as string);
        setSelectedBackgroundId('custom');
      };
      reader.readAsDataURL(file);
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

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const setupCamera = async () => {
      if (isCameraActive && videoRef.current) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Ensure video plays
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(console.error);
            };
          }
        } catch (err) {
          console.error("Camera setup failed:", err);
          setIsCameraActive(false);
          setError({ 
            title: "Camera Error", 
            message: "Could not access camera. Please check your browser permissions and ensure no other app is using it." 
          });
        }
      }
    };

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraActive]);

  const startCamera = () => {
    setError(null);
    setIsCameraActive(true);
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsCameraActive(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      setTempImage(dataUrl);
      setShowCropper(true);
      stopCamera();
    }
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

    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    if (credits !== null && credits <= 0 && !isAdmin) {
      setError({
        title: "No Credits Left",
        message: "You have used all your generation credits. Please upgrade your plan to continue.",
        action: "View Pricing"
      });
      setShowPricing(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setRetryAttempt(0);

    try {
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API key is not configured.");

      const ai = new GoogleGenAI({ apiKey });
      let prompt = `AUTHENTIC PROFESSIONAL PORTRAIT: ${selectedStyle.prompt}. 
      CRITICAL INSTRUCTIONS: 
      1. MAINTAIN THE EXACT IDENTITY, face shape, features, and facial expression of the person in the source image. 
      2. ONLY transform the lighting, background, and clothing to match the luxury executive style. 
      3. OUTPUT exactly one binary image data as PNG.`;

      const getImageData = (dataUrl: string) => {
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
        return {
          inlineData: {
            data: parts[1],
            mimeType: mime
          }
        };
      };

      const parts: any[] = [getImageData(image)];

      if (customBackground) {
        parts.push(getImageData(customBackground));
        prompt += `\n\nUSE THE SECOND IMAGE AS THE SPECIFIC BACKGROUND. Seamlessly place the subject from the first image into the environment shown in the second image. Match the lighting of the subject to the new background for perfect realism.`;
      } else if (selectedBackgroundId) {
        const bg = BACKGROUNDS.find(b => b.id === selectedBackgroundId);
        if (bg) {
           prompt += `\n\nPlace the subject in a ${bg.name} environment. Maintain high-end studio lighting and professional depth of field.`;
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            ...parts,
            { text: prompt }
          ]
        }
      });

      let foundImage = false;
      const responseParts = response.candidates?.[0]?.content?.parts || [];
      for (const part of responseParts) {
        if (part.inlineData) {
          const resultUrl = `data:image/png;base64,${part.inlineData.data}`;
          
          // Optimize image to stay under 1MB Firestore limit
          const optimizedUrl = await optimizeImage(resultUrl, 1000, 0.7) || resultUrl;
          
          setResultImage(optimizedUrl);
          
          // Add to history and sync with Firestore
          if (currentUser) {
            const headshotRef = collection(db, `users/${currentUser.uid}/headshots`);
            await addDoc(headshotRef, {
              image: optimizedUrl,
              style: selectedStyle.id,
              timestamp: serverTimestamp(),
              userId: currentUser.uid
            });
            
            // Deduct credit
            if (!isAdmin) {
              const userDocRef = doc(db, 'users', currentUser.uid);
              await setDoc(userDocRef, { 
                credits: (credits || 5) - 1,
                updatedAt: serverTimestamp()
              }, { merge: true });
            }
          }
          
          foundImage = true;
          break;
        }
      }

      if (!foundImage) throw new Error("AI failed to generate image. Please try again.");

    } catch (err: any) {
      console.error(err);
      setError({ title: "Studio Busy", message: "We encountered a temporary error. Please try again in a few seconds." });
    } finally {
      setIsGenerating(false);
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
    <div className="min-h-screen bg-[#fcfcfc] text-on-surface font-sans perspective-1000">
      <AnimatePresence>
        {showLimitsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-[#121212] border border-white/10 rounded-[32px] max-w-md w-full p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-emerald-500" />
              
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Sparkles className="text-primary w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Studio Usage Limits</h2>
                  <p className="text-zinc-500 text-sm font-medium">Daily credits automatically refresh at midnight.</p>
                </div>

                <div className="w-full space-y-4">
                  <LimitItem icon={<Scissors className="w-4 h-4" />} label="Background Removal" value="1 Credit/Day" color="emerald" />
                  <LimitItem icon={<UserRound className="w-4 h-4" />} label="Face Swap" value="3 Credits/Day" color="blue" />
                  <LimitItem icon={<Wand2 className="w-4 h-4" />} label="Gen Fill" value="5 Uses/Day" color="purple" />
                </div>

                <button 
                  onClick={() => {
                    setShowLimitsModal(false);
                    localStorage.setItem('seen_limits_modal', 'true');
                  }}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {!currentUser && !isAuthModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-6"
          >
            <div className="max-w-md w-full text-center space-y-8">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Camera className="text-primary w-10 h-10" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter uppercase">Professional <span className="text-primary">Studio</span></h1>
              <p className="text-zinc-500 font-medium leading-relaxed">
                Transform your selfies into studio-quality professional headshots using the world's most advanced AI.
              </p>
              
              <div className="grid gap-4 mt-8">
                <button 
                  onClick={() => {
                    setAuthMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Sign In to Start
                </button>
                <div className="flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-zinc-100" />
                  <span className="text-[10px] uppercase font-black text-zinc-300 tracking-widest">or</span>
                  <div className="h-[1px] flex-1 bg-zinc-100" />
                </div>
                <button 
                  onClick={() => {
                    setAuthMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-4 bg-white border border-zinc-100 text-on-surface rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-zinc-50 transition-all"
                >
                  Create Account
                </button>
              </div>

              <div className="pt-12 grid grid-cols-3 gap-6 opacity-40 grayscale">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" className="rounded-xl" />
                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop" className="rounded-xl" />
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop" className="rounded-xl" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TopAppBar */}
      <header className="bg-white/70 backdrop-blur-3xl sticky top-0 z-50 shadow-[0px_20px_40px_rgba(0,109,54,0.06)] border-b border-zinc-100">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('generator')}>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Camera className="text-primary w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-on-surface font-headline uppercase">Portrait Studio <span className="text-primary italic">3D</span></span>
          </div>
          
          <nav className="hidden lg:flex items-center gap-10 relative">
            {[
              { id: 'generator', label: 'Studio' },
              { id: 'editor', label: 'Elite Editor' },
              { id: 'gallery', label: 'Vault' },
              ...(isAdmin ? [{ id: 'admin', label: 'Admins' }] : []),
              { id: 'pricing', label: 'Credits' }
            ].map(tab => (
              <button 
                key={`top-tab-${tab.id}`}
                onClick={() => {
                  if (tab.id === 'pricing') {
                    if (currentUser) setShowPricing(true);
                    else setIsAuthModalOpen(true);
                    return;
                  }
                  setActiveTab(tab.id as any);
                }}
                className={`group relative py-2 font-black text-[11px] uppercase tracking-[0.2em] transition-all ${activeTab === tab.id ? 'text-primary' : 'text-zinc-500 hover:text-on-surface'}`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="active_tab_line"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Free Tier */}
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-neutral-200 flex flex-col items-center text-center shadow-sm hover:shadow-xl transition-all h-full">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Free</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-black">₹0</span>
                    <span className="text-zinc-400 text-sm ml-1 font-bold">/lifetime</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-zinc-600 text-sm">
                    <li className="flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4 text-primary" /> 3 Elite Portraits</li>
                    <li className="flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4 text-primary" /> Multi-Source Tech</li>
                    <li className="flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4 text-primary" /> Full Commercial Rights</li>
                  </ul>
                  <button 
                    onClick={async () => {
                      if (currentUser) {
                        try {
                          const userDocRef = doc(db, 'users', currentUser.uid);
                          const snap = await getDoc(userDocRef);
                          if (!snap.exists()) {
                            await setDoc(userDocRef, { 
                              uid: currentUser.uid,
                              email: currentUser.email,
                              displayName: currentUser.displayName,
                              photoURL: currentUser.photoURL,
                              credits: 3,
                              role: 'user',
                              status: 'active',
                              createdAt: serverTimestamp(),
                              updatedAt: serverTimestamp()
                            });
                          } else {
                            // If user exists, we only set credits to 3 if they have 0 and haven't claimed?
                            // For simplicity, let's just allow them to reset to 3 if they have 0, 
                            // OR just say it's claimed.
                            const data = snap.data();
                            if ((data.credits || 0) <= 0) {
                              await setDoc(userDocRef, { 
                                credits: 3,
                                updatedAt: serverTimestamp()
                              }, { merge: true });
                            } else {
                              setError({
                                title: "Plan Active",
                                message: "Your Elite Free Tier is already active with remaining credits."
                              });
                            }
                          }
                          setShowPricing(false);
                        } catch (err) {
                          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
                        }
                      } else {
                        setIsAuthModalOpen(true);
                      }
                    }}
                    className="mt-auto w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm tracking-wide"
                  >
                    Claim Free Tier
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
                      setError({
                        title: "Payment Portal Offline",
                        message: "The Professional payment gateway is currently under maintenance. Please try again later or use the Free tier."
                      });
                    }}
                    className="mt-auto w-full py-4 rounded-2xl bg-white text-primary font-bold text-sm tracking-wide shadow-lg"
                  >
                    Upgrade to Pro
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
                      setError({
                        title: "Enterprise Plan",
                        message: "Please contact our sales team at business@portraitstudio3d.com for dedicated enterprise access."
                      });
                    }}
                    className="mt-auto w-full py-4 rounded-2xl bg-zinc-900 text-white font-bold text-sm tracking-wide"
                  >
                    Contact Sales
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
                          key={`aspect-ratio-${ratio.label}`}
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

      <main className="max-w-7xl mx-auto px-6 py-12 min-h-[70vh]">
        <AnimatePresence mode="wait">
          {activeTab === 'admin' && isAdmin ? (
            <div key="admin-view">
              <AdminDashboard setError={setError} />
            </div>
          ) : activeTab === 'editor' ? (
            <motion.div
              key="editor-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[120]"
            >
              <AdvancedEditor 
                onBack={() => setActiveTab('generator')} 
                initialImage={resultImage || (history.length > 0 ? history[0].image : null)} 
              />
            </motion.div>
          ) : activeTab === 'gallery' ? (
            <motion.div
              key="gallery-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 pb-12">
                 <div className="space-y-2">
                    <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Studio <span className="text-primary italic">Vault</span></h2>
                    <p className="text-zinc-500 font-medium">Revisit and refine your professional transformations.</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="bg-zinc-50 border border-zinc-100 px-6 py-3 rounded-2xl flex items-center gap-3">
                       <ImageIcon className="w-5 h-5 text-primary" />
                       <span className="text-[11px] font-black uppercase tracking-widest text-on-surface">{history.length} Generations</span>
                    </div>
                 </div>
              </div>

              {history.length === 0 ? (
                <div className="py-40 text-center border-2 border-dashed border-zinc-100 rounded-[3.5rem] bg-zinc-50/30">
                   <div className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center mx-auto mb-8 border border-zinc-100">
                     <ImageIcon className="w-10 h-10 text-zinc-200" />
                   </div>
                   <h3 className="text-2xl font-bold mb-3 tracking-tight">The vault is currently empty</h3>
                   <p className="text-zinc-400 font-medium max-w-xs mx-auto text-sm leading-relaxed">Your professional journey starts with your first generation. Head back to the studio to begin.</p>
                   <button 
                     onClick={() => setActiveTab('generator')} 
                     className="mt-10 px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                   >
                     Direct to Studio
                   </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                  {history.map((item, i) => (
                    <motion.div 
                      key={`history-item-${item.id || i}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-100 shadow-2xl border border-white/5 cursor-pointer"
                    >
                      <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="Generated" />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-6 backdrop-blur-md">
                         <div className="flex gap-4">
                           <button 
                             onClick={() => restoreFromHistory(item)}
                             className="bg-white text-on-surface p-4 rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all"
                             title="Full View"
                           >
                             <Eye className="w-6 h-6" />
                           </button>
                           <button 
                             onClick={() => {
                               setResultImage(item.image);
                               setActiveTab('editor');
                             }}
                             className="bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-all shadow-xl shadow-primary/20"
                           >
                             Open Editor
                           </button>
                         </div>
                         <button 
                            onClick={(e) => deleteFromHistory(item.id, e)}
                            className="bg-white/10 hover:bg-red-500 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all"
                         >
                           Remove from vault
                         </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="generator-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <section className="mb-20 text-center relative pt-12 pb-24 overflow-hidden">
                {/* 3D Floating Decorations */}
                <motion.div 
                  animate={{ 
                    y: [0, -20, 0],
                    rotate: [0, 10, 0]
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-0 -left-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl" 
                />
                <motion.div 
                  animate={{ 
                    y: [0, 20, 0],
                    rotate: [0, -10, 0]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-0 -right-10 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl" 
                />

                <div className="relative z-10">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900 rounded-full shadow-2xl mx-auto"
                  >
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">AI GEN 3.0 Elite</span>
                  </motion.div>
                  
                  <h1 className="font-headline text-6xl md:text-8xl font-black tracking-tighter text-on-background mb-8 leading-[0.9]">
                    PROFESSIONAL<br />
                    <span className="text-gradient-emerald">IDENTITY.</span>
                  </h1>
                  
                  <p className="text-zinc-500 max-w-xl mx-auto mb-16 text-lg font-medium leading-relaxed font-sans">
                    Transform your casual selfies into studio-grade executive portraits with the power of SnapPro’s neural engine.
                  </p>
                
                  <div className="max-w-3xl mx-auto relative group">
                    {/* 3D Tilt Sandbox */}
                    <motion.div 
                      onMouseMove={handleMouse}
                      onMouseLeave={handleMouseLeave}
                      style={{ rotateX, rotateY, perspective: 1000 }}
                      className="mx-auto w-full aspect-[16/9] relative cursor-crosshair"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-purple-500/10 rounded-[2.5rem] -rotate-2 scale-[1.02] blur-xl group-hover:scale-[1.05] transition-transform duration-700" />
                      <div className="relative bg-white border border-zinc-100 rounded-[2.5rem] shadow-2xl h-full flex flex-col items-center justify-center p-12 overflow-hidden">
                {/* Decorative Grid */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                  style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '50px 50px' }} 
                />
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                {!image && !isCameraActive ? (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`w-full h-full border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all duration-500 cursor-pointer
                      ${isDragging ? 'border-primary bg-primary/5' : 'border-zinc-100 hover:border-primary/30'}
                    `}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                      <Upload className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="font-headline text-2xl font-black mb-2 tracking-tight">Drop your portrait here</h3>
                    <p className="text-zinc-400 text-sm font-medium mb-8">JPG, PNG, WebP up to 10MB</p>
                    
                    <div className="flex gap-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-8 py-3 bg-zinc-900 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-black transition-colors shadow-lg"
                      >
                        Select File
                      </button>
                      <button 
                        onClick={startCamera}
                        className="px-8 py-3 bg-primary text-white rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Take Photo
                      </button>
                    </div>
                  </motion.div>
                ) : isCameraActive ? (
                  <div className="w-full h-full relative rounded-3xl overflow-hidden shadow-2xl bg-black">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      muted
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <div className="absolute inset-x-0 bottom-8 flex justify-center gap-6">
                      <button 
                        onClick={stopCamera}
                        className="px-6 py-3 bg-white/20 backdrop-blur-md text-white rounded-full text-xs font-bold border border-white/20 hover:bg-white/30 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={takePhoto}
                        className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all border-4 border-primary"
                      >
                        <div className="w-12 h-12 rounded-full border-2 border-primary/20" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full relative rounded-3xl overflow-hidden shadow-2xl">
                    <img src={image} className="w-full h-full object-cover" alt="Source" />
                    <button 
                      onClick={() => setImage(null)}
                      className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-black transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    
                    <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                       <div className="flex gap-4">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowCropper(true); }}
                            className="p-3 bg-white/10 backdrop-blur-md text-white rounded-xl hover:bg-white/20 transition-all border border-white/10 shadow-lg"
                          >
                             <RefreshCw className="w-5 h-5" />
                          </button>
                       </div>
                       <button 
                         onClick={generateHeadshot}
                         disabled={isGenerating}
                         className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                       >
                         {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 transition-transform group-hover:rotate-12" />}
                         {isGenerating ? 'Synthesizing...' : 'Generate 8K Headshot'}
                       </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 sm:gap-8">
            {STYLES.map((style) => (
              <div 
                key={`style-item-${style.id}`}
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
                    <h3 className="font-headline font-bold text-sm tracking-tight">{style.name}</h3>
                    <p className="text-[10px] text-zinc-500">{style.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                    ${selectedStyle.id === style.id ? 'border-primary' : 'border-outline-variant group-hover:border-primary'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full bg-primary transition-opacity
                      ${selectedStyle.id === style.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2.5: Background Selection */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col gap-1">
              <h2 className="font-headline text-2xl font-bold tracking-tight">Studio Backgrounds</h2>
              <p className="text-sm text-zinc-500 font-medium tracking-tight">Choose a premium setting or upload your own.</p>
            </div>
            <div className="flex gap-2">
               <button 
                 onClick={() => {
                  setSelectedBackgroundId(null);
                  setCustomBackground(null);
                 }}
                 className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                   ${!selectedBackgroundId ? 'bg-zinc-900 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
               >
                 Auto Generate
               </button>
            </div>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide -mx-2 px-2">
            <input 
              type="file" 
              ref={bgInputRef} 
              onChange={handleBackgroundUpload} 
              accept="image/*" 
              className="hidden" 
            />
            
            {/* Custom Upload Card */}
            <div 
              onClick={() => bgInputRef.current?.click()}
              className={`flex-shrink-0 w-44 group relative bg-surface-container-lowest rounded-2xl p-4 shadow-sm border-2 cursor-pointer overflow-hidden transition-all duration-500
                ${selectedBackgroundId === 'custom' ? 'border-primary' : 'border-zinc-100 hover:border-primary/30'}`}
            >
              <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4 relative bg-zinc-100 flex flex-col items-center justify-center gap-2 group-hover:bg-zinc-200 transition-colors">
                {customBackground ? (
                  <img src={customBackground} className="w-full h-full object-cover" alt="Custom" />
                ) : (
                  <>
                    <CloudUpload className="w-8 h-8 text-zinc-300 group-hover:text-primary transition-colors" />
                    <span className="text-[10px] font-black uppercase text-zinc-400">Upload Own</span>
                  </>
                )}
              </div>
              <div className="flex justify-between items-center">
                 <h3 className="font-headline font-bold text-sm tracking-tight">{customBackground ? 'My Custom' : 'Custom'}</h3>
                 <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
                    ${selectedBackgroundId === 'custom' ? 'border-primary' : 'border-outline-variant group-hover:border-primary'}`}>
                    <div className={`w-2 h-2 rounded-full bg-primary transition-opacity
                      ${selectedBackgroundId === 'custom' ? 'opacity-100' : 'opacity-0'}`}></div>
                  </div>
              </div>
            </div>

            {BACKGROUNDS.map((bg) => (
              <div 
                key={`bg-item-${bg.id}`}
                onClick={() => {
                  setSelectedBackgroundId(bg.id);
                  setCustomBackground(null);
                }}
                className={`flex-shrink-0 w-44 group relative bg-surface-container-lowest rounded-2xl p-4 shadow-sm border-2 cursor-pointer overflow-hidden transition-all duration-500
                  ${selectedBackgroundId === bg.id ? 'border-primary' : 'border-zinc-100 hover:border-primary/30'}`}
              >
                <div className="aspect-[4/5] rounded-xl overflow-hidden mb-4 relative">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt={bg.name} 
                    src={bg.image} 
                  />
                </div>
                <div className="flex justify-between items-center">
                  <h3 className="font-headline font-bold text-sm tracking-tight">{bg.name}</h3>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
                    ${selectedBackgroundId === bg.id ? 'border-primary' : 'border-outline-variant group-hover:border-primary'}`}>
                    <div className={`w-2 h-2 rounded-full bg-primary transition-opacity
                      ${selectedBackgroundId === bg.id ? 'opacity-100' : 'opacity-0'}`}></div>
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
                      <button 
                        onClick={() => setActiveTab('editor')}
                        className="flex-1 min-w-[180px] bg-white text-primary border-2 border-primary/20 py-4 rounded-full font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Settings2 className="w-5 h-5" />
                        Refine in Editor
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
      </motion.div>
    )}
  </AnimatePresence>
</main>

      {/* BottomNavBar (Mobile) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pb-8 px-4 md:hidden">
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md rounded-full bg-white/60 backdrop-blur-2xl shadow-2xl shadow-emerald-900/10 flex justify-around items-center py-2 px-4 border border-white/20">
          <a className="flex flex-col items-center justify-center bg-primary text-white rounded-full p-3 scale-110 -translate-y-2 shadow-lg shadow-emerald-500/40" href="#" onClick={(e) => { e.preventDefault(); setActiveTab('generator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <Sparkles className="w-5 h-5" />
            <span className="font-headline text-[10px] uppercase tracking-widest font-bold mt-1">Studio</span>
          </a>
          <button 
            onClick={() => { setActiveTab('editor'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center p-2 transition-colors ${activeTab === 'editor' ? 'text-primary' : 'text-zinc-500'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-headline text-[10px] uppercase tracking-widest font-bold mt-1">Editor</span>
          </button>
          <button 
            onClick={() => { setActiveTab('gallery'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center p-2 transition-colors ${activeTab === 'gallery' ? 'text-primary' : 'text-zinc-500'}`}
          >
            <Folder className="w-5 h-5" />
            <span className="font-headline text-[10px] uppercase tracking-widest font-bold mt-1">Vault</span>
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
