import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Bot, User, Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: "bot" | "user";
  content: string;
  timestamp: Date;
}

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cn-bot-chat`;

const ChatWindow = ({ isOpen, onClose }: ChatWindowProps) => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: "👋 Hello! I'm **CN Bot**, your assistant for the Clarification Portal.\n\nI can help you:\n- 🔍 **Search CNs** - Just describe what you're looking for\n- 📝 **Explain issues** - Share CN details and I'll summarize\n- ✍️ **Draft responses** - I'll help write professional comments\n- 📋 **Closure notes** - Get help with closure summaries\n\nHow can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasGreetedRef = useRef(false);

  // Stop speech when sound is disabled
  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Toggle sound and stop any ongoing speech when disabled
  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => {
      if (prev) {
        stopSpeech();
      }
      return !prev;
    });
  }, [stopSpeech]);

  // Text-to-speech function using Web Speech API
  const speakText = useCallback((text: string) => {
    if (!isSoundEnabled) return;
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[*#_`]/g, '').trim();
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex')
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  }, [isSoundEnabled]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      
      if (!hasGreetedRef.current && messages.length > 0 && messages[0].id === "welcome" && isSoundEnabled) {
        hasGreetedRef.current = true;
        setTimeout(() => {
          speakText(messages[0].content);
        }, 300);
      }
    }
  }, [isOpen, messages, speakText, isSoundEnabled]);

  const addMessage = useCallback((role: "bot" | "user", content: string): string => {
    const id = crypto.randomUUID();
    const newMessage: Message = {
      id,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return id;
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, content } : msg
    ));
  }, []);

  const streamChat = useCallback(async (userMessage: string) => {
    setIsLoading(true);
    
    // Build conversation history for context
    const conversationHistory = messages
      .filter(m => m.id !== "welcome")
      .map(m => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.content
      }));
    
    // Add current message
    conversationHistory.push({ role: "user", content: userMessage });

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: conversationHistory }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Create bot message placeholder
      const botMessageId = addMessage("bot", "");
      let fullContent = "";

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process line by line
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              updateMessage(botMessageId, fullContent);
            }
          } catch {
            // Incomplete JSON, put it back
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              updateMessage(botMessageId, fullContent);
            }
          } catch { /* ignore */ }
        }
      }

      // Speak the response if sound is enabled
      if (isSoundEnabled && fullContent) {
        speakText(fullContent);
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      addMessage("bot", `Sorry, I encountered an error: ${error.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  }, [messages, addMessage, updateMessage, isSoundEnabled, speakText]);

  const handleSend = useCallback(() => {
    const query = inputValue.trim();
    if (!query || isLoading) return;

    addMessage("user", query);
    setInputValue("");
    streamChat(query);
  }, [inputValue, isLoading, addMessage, streamChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Simple markdown renderer for bold and bullet points
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Handle bullet points
      if (line.trim().startsWith('- ')) {
        const bulletContent = line.trim().substring(2);
        return (
          <div key={i} className="flex gap-2 ml-2">
            <span>•</span>
            <span dangerouslySetInnerHTML={{ __html: formatBold(bulletContent) }} />
          </div>
        );
      }
      // Regular line with bold support
      return (
        <div key={i} dangerouslySetInnerHTML={{ __html: formatBold(line) || '&nbsp;' }} />
      );
    });
  };

  const formatBold = (text: string) => {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-24 right-4 z-[9999] w-[400px] max-w-[calc(100vw-2rem)] h-[75vh] max-h-[650px] bg-card border border-border rounded-xl shadow-2xl flex flex-col"
      role="dialog"
      aria-label="CN Bot Chat"
      aria-modal="true"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-violet-600 to-purple-600 px-3 py-3 flex items-center gap-2 flex-shrink-0 rounded-t-xl">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-semibold text-sm truncate">CN Bot</h2>
          <p className="text-white/70 text-xs truncate">AI-Powered Clarification Assistant</p>
        </div>
        <button
          type="button"
          onClick={toggleSound}
          className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-md text-white bg-white/20 hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label={isSoundEnabled ? "Mute voice" : "Enable voice"}
        >
          {isSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-md text-white bg-white/20 hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === "bot"
                    ? "bg-violet-100 dark:bg-violet-900/30"
                    : "bg-primary/10"
                }`}
              >
                {msg.role === "bot" ? (
                  <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className={`flex flex-col ${msg.role === "user" ? "items-end" : ""} max-w-[85%]`}>
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === "bot"
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {msg.role === "bot" ? renderContent(msg.content) : msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-violet-600 dark:text-violet-400 animate-spin" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="flex-shrink-0 p-3 border-t border-border bg-background/50">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about CNs..."
            className="flex-1 h-10 text-sm"
            aria-label="Message input"
            disabled={isLoading}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="h-10 px-4"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Press Enter to send • I can search CNs, explain issues, and draft responses
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
