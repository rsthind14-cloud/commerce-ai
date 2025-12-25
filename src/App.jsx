import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Clock, Zap, CheckCircle, Menu, X, Star, Camera, Image as ImageIcon, Loader, UploadCloud, Send, AlertTriangle, Lightbulb } from 'lucide-react';

// --- CONFIGURATION ---
// IMPORTANT: Jab tu isse apni website par daale, toh apni asli API Key yahan quotes mein daal dena.
// Example: const apiKey = "AIzaSy...";
const apiKey = "AIzaSyCpzPAvvOyVuD3twEnoquniyMRGnYTCPuk"; 

const App = () => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'text', 
      text: "Namaste! Main Commerce Wale Bhaiya ka AI Assistant hoon. Accounts, Eco ya BST ka koi bhi doubt ho, photo bhejo ya type karo.", 
      sender: 'ai' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const chatEndRef = useRef(null);
  
  // Refs for file inputs
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // --- HELPER: Convert File to Base64 ---
  const fileToGenerativePart = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      };
      reader.readAsDataURL(file);
    });
  };

  // --- API CALL: Gemini Logic ---
  const callGeminiAPI = async (userText, imagePart = null) => {
    // Safety Check for API Key
    if (!apiKey && window.location.hostname !== "localhost") {
        // Agar key nahi hai toh user ko batao (Localhost pe ignore kar sakte hain demo ke liye)
        // console.warn("API Key missing");
    }

    setIsTyping(true);

    // System Prompt to enforce Commerce logic and Special Notes
    const systemPrompt = `
      You are an expert Commerce Tutor (Accounts, Economics, Business Studies) for Indian students (CBSE/ISC).
      
      Your Goal: Solve the student's doubt accurately.
      
      CRITICAL INSTRUCTIONS:
      1. **Formatting**: Use Markdown. Use Tables for numerical solutions (Journal entries, Balance sheets).
      2. **Alterations & Logic**: If the question allows multiple interpretations (e.g., taking 360 days vs 365 days for interest, assuming Par vs Premium if not specified, using PBIT vs PAT), choose the standard academic approach but EXPLAIN IT.
      3. **Special Note**: If you made any such assumption or alteration, you MUST end your response with a section titled "SPECIAL NOTE:" explaining the logic.
          Example: "SPECIAL NOTE: Calculated interest on 360 days basis as per standard banking convention for this type of problem."
      4. **Tables**: Format tables clearly using Markdown syntax (e.g., | Date | Particulars | Dr | Cr |).
    `;

    try {
      const payload = {
        contents: [
          {
            parts: [
              { text: systemPrompt + "\n\nStudent's Query: " + (userText || "Analyze this image.") },
              ...(imagePart ? [imagePart] : [])
            ]
          }
        ]
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";
      
      // Separate the Special Note from the main text if present
      const noteSeparator = "SPECIAL NOTE:";
      let mainContent = aiText;
      let specialNote = null;

      if (aiText.includes(noteSeparator)) {
        const parts = aiText.split(noteSeparator);
        mainContent = parts[0];
        specialNote = parts[1].trim();
      }

      setMessages(prev => [
        ...prev, 
        { 
          id: Date.now() + 1, 
          text: mainContent, 
          note: specialNote, // Store note separately
          sender: 'ai', 
          type: 'text' 
        }
      ]);

    } catch (error) {
      console.error("API Error:", error);
      // Fallback response if API fails (or key is missing)
      setMessages(prev => [
        ...prev, 
        { 
          id: Date.now() + 1, 
          text: "Technical Issue: I couldn't connect to the AI server. \n\n(Did you add your API Key in the code?)", 
          sender: 'ai', 
          type: 'text' 
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- HANDLERS ---
  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage = { id: Date.now(), text: input, sender: 'user', type: 'text' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    callGeminiAPI(input);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const handleFileUpload = async (e, source) => {
    const file = e.target.files[0];
    if (!file) return;

    // UI Feedback immediately
    const userMessage = { 
      id: Date.now(), 
      text: source === 'camera' ? '📸 Photo captured' : '🖼️ Image uploaded', 
      sender: 'user',
      isImage: true 
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const imagePart = await fileToGenerativePart(file);
      await callGeminiAPI("Solve the question in this image. Explain step-by-step.", imagePart);
    } catch (error) {
      console.error("File Error:", error);
      setIsTyping(false);
    }
  };

  return (
    <div className="font-sans text-gray-800 bg-gray-50 min-h-screen flex flex-col">
      
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="bg-orange-600 p-1.5 rounded-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900">
                  Commerce<span className="text-orange-600">Wale</span>Bhaiya
                </span>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-600 hover:text-orange-600 transition-colors font-medium">Courses</a>
              <a href="#" className="text-gray-600 hover:text-orange-600 transition-colors font-medium">Notes</a>
              <a href="#" className="text-orange-600 font-bold border-b-2 border-orange-600 pb-1">AI Solution</a>
              <button className="bg-orange-600 text-white px-5 py-2 rounded-full font-medium hover:bg-orange-700 transition-all transform hover:scale-105 shadow-md">
                Login
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600 hover:text-gray-900">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-2">
            <div className="px-4 space-y-2">
              <a href="#" className="block py-2 text-gray-600 font-medium">Courses</a>
              <a href="#" className="block py-2 text-gray-600 font-medium">Notes</a>
              <a href="#" className="block py-2 text-orange-600 font-bold">AI Solution</a>
              <button className="w-full mt-2 bg-orange-600 text-white px-5 py-2 rounded-lg font-medium">
                Login
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 gap-6">
        
        {/* Left Side: Info & Features */}
        <div className="w-full md:w-1/3 flex flex-col justify-center space-y-6 py-6">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-4">
              <Zap className="w-3 h-3 mr-1" />
              NEW FEATURE
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
              Instant Doubt <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                Solution Engine
              </span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 leading-relaxed">
              Assumptions matter! Whether it's 360 days or 365, PBIT or PAT, our AI explains the <strong>logic</strong> behind every calculation.
            </p>
          </div>

          <div className="space-y-4">
            <FeatureItem icon={Clock} title="Step-by-Step Logic" desc="Understand the 'Why' behind the answer." />
            <FeatureItem icon={CheckCircle} title="Assumptions Explained" desc="Clear notes on standard alterations." />
            <FeatureItem icon={Star} title="Visual Tables" desc="Proper formats for Accounts & Stats." />
          </div>
        </div>

        {/* Right Side: Interactive Chat Interface */}
        <div className="w-full md:w-2/3 flex flex-col h-[600px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          
          {/* Chat Header */}
          <div className="bg-gray-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg">
                AI
              </div>
              <div>
                <h3 className="font-bold text-white">Doubt Solver</h3>
                <div className="flex items-center text-green-400 text-xs font-medium">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                  Online
                </div>
              </div>
            </div>
            <button 
              onClick={() => setMessages([{ id: 1, text: "Hi! Ask me any doubt. I will explain any assumptions I make!", sender: 'ai', type: 'text' }])}
              className="text-gray-400 hover:text-white text-xs bg-gray-800 px-3 py-1 rounded transition-colors"
            >
              Clear Chat
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-4 space-y-6 bg-gray-50 scrollbar-hide">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                  <div 
                    className={`max-w-[90%] md:max-w-[80%] rounded-2xl px-5 py-4 shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-orange-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                    }`}
                  >
                    {/* User Image Message */}
                    {msg.isImage ? (
                      <div className="flex items-center gap-2 font-medium">
                        <UploadCloud className="w-5 h-5" />
                        {msg.text}
                      </div>
                    ) : (
                      // AI Text Message with Markdown-like formatting (Basic Table Support)
                      <div className="text-sm md:text-base leading-relaxed overflow-x-auto">
                        <FormattedText text={msg.text} />
                      </div>
                    )}
                  </div>
                </div>

                {/* SPECIAL NOTE / EXPLANATION BOX */}
                {msg.note && (
                  <div className="mt-2 ml-2 max-w-[85%] bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg shadow-sm">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-yellow-800 text-xs uppercase tracking-wide mb-1">Assumption / Logic Note</h4>
                        <p className="text-sm text-yellow-800 italic">{msg.note}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center space-x-2">
                   <Loader className="w-4 h-4 animate-spin text-orange-600" />
                   <span className="text-xs text-gray-500 font-medium">Analyzing & formatting tables...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-end gap-2">
              
              {/* Camera Button */}
              <button 
                onClick={() => cameraInputRef.current.click()}
                className="flex-shrink-0 p-3 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                title="Open Camera"
              >
                <Camera className="w-6 h-6" />
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  ref={cameraInputRef} 
                  onChange={(e) => handleFileUpload(e, 'camera')}
                />
              </button>

              {/* Gallery Button */}
              <button 
                onClick={() => fileInputRef.current.click()}
                className="flex-shrink-0 p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Upload from Gallery"
              >
                <ImageIcon className="w-6 h-6" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e, 'gallery')}
                />
              </button>

              {/* Text Input */}
              <div className="flex-grow relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask doubt..."
                  className="w-full p-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none text-gray-700 pr-10"
                />
              </div>

              {/* Send Button */}
              <button 
                onClick={handleSend}
                disabled={!input.trim()}
                className={`flex-shrink-0 p-3 rounded-xl transition-all shadow-md flex items-center justify-center ${
                  input.trim() 
                    ? 'bg-orange-600 text-white hover:bg-orange-700 hover:scale-105' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>&copy; 2024 Commerce Wale Bhaiya. All rights reserved.</p>
      </footer>
    </div>
  );
};

// --- Helper Component to Render Markdown-ish Tables & Text ---
const FormattedText = ({ text }) => {
  if (!text) return null;

  // Split logic to detect tables (rows starting with |)
  const lines = text.split('\n');
  
  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        // Simple detection for table rows: starts and ends with |
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            const cells = line.split('|').filter(cell => cell.trim() !== '');
            // Check if it's a separator line (e.g., |---|---|)
            if (line.includes('---')) return null; 

            return (
                <div key={idx} className="grid grid-flow-col auto-cols-fr gap-2 bg-gray-50 border-b border-gray-200 p-2 text-xs font-mono">
                    {cells.map((cell, cIdx) => (
                        <div key={cIdx} className="truncate px-1">{cell.trim()}</div>
                    ))}
                </div>
            );
        }
        
        // Bold text handling (**text**)
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx} className="min-h-[1.2em]">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

const FeatureItem = ({ icon: Icon, title, desc }) => (
  <div className="flex items-start">
    <div className="flex-shrink-0">
      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-orange-100 text-orange-600">
        <Icon className="h-5 w-5" />
      </div>
    </div>
    <div className="ml-4">
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{desc}</p>
    </div>
  </div>
);

export default App;