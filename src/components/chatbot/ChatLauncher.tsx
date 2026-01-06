import { useState } from "react";
import { Bot } from "lucide-react";
import ChatWindow from "./ChatWindow";

const ChatLauncher = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group"
        aria-label="Open CN Bot chat"
        aria-expanded={isOpen}
      >
        {/* Speech bubble with "WhatsApp" text */}
        <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg transform transition-all duration-200 group-hover:scale-105 group-hover:shadow-xl">
          WhatsApp
          {/* Speech bubble tail */}
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-l-[8px] border-l-emerald-500 border-b-[6px] border-b-transparent" />
        </div>
        
        {/* Robot Avatar */}
        <div className="relative w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl group-hover:from-violet-400 group-hover:to-purple-500">
          <Bot className="w-7 h-7 text-white" />
          {/* Online indicator */}
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-background animate-pulse" />
        </div>
      </button>

      {/* Chat Window */}
      <ChatWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default ChatLauncher;
