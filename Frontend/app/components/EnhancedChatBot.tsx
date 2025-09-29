"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, ThumbsUp, Minus, Copy, Check } from "lucide-react";
import { ChatWebSocket } from "@/lib/websocket";
import { chatAPI, BotPrompt, ChatMessage } from "@/lib/chat-api";

/* ---------- Types ---------- */

interface Message {
  id: string;
  type: "bot" | "user" | "system";
  text: string;
  time: string;
  special?: boolean;
  attachment?: string;
  rich?: any;
  sender_name?: string;
  created_at: string;
}

interface ChatbotProps {
  botName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  className?: string;
  disabled?: boolean;
  conversationId?: string;
  onConversationChange?: (conversationId: string) => void;
}

/* ---------- Utils ---------- */

const nowTime = () =>
  new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
};

/* ---------- Tiny UI bits ---------- */

function CheckIcon() {
  return (
    <svg
      className="w-3 h-3 text-indigo-500"
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden
    >
      <path
        d="M10.5 3.5L4.5 9.5L1.5 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <div
      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-600" />
      ) : (
        <Copy className="w-3 h-3 text-gray-500" />
      )}
    </button>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 my-2 font-mono text-sm overflow-x-auto">
      {language && (
        <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide">
          {language}
        </div>
      )}
      <pre className="whitespace-pre-wrap">{code}</pre>
      <CopyButton text={code} />
    </div>
  );
}

function MarkdownRenderer({ text }: { text: string }) {
  // Simple markdown-like rendering
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let codeBlock = '';
  let inCodeBlock = false;
  let language = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <CodeBlock key={i} code={codeBlock.trim()} language={language} />
        );
        codeBlock = '';
        inCodeBlock = false;
        language = '';
      } else {
        // Start code block
        language = line.slice(3).trim();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlock += line + '\n';
      continue;
    }

    // Regular text processing
    if (line.trim() === '') {
      elements.push(<br key={i} />);
    } else if (line.startsWith('•') || line.startsWith('-')) {
      elements.push(
        <div key={i} className="flex items-start">
          <span className="text-gray-500 mr-2">•</span>
          <span>{line.slice(1).trim()}</span>
        </div>
      );
    } else {
      elements.push(
        <div key={i} className="mb-1">
          {line}
        </div>
      );
    }
  }

  return <div>{elements}</div>;
}

/* ---------- Component ---------- */

export function ChatBot({
  botName = "CRM Assistant",
  primaryColor = "from-indigo-500 to-purple-600",
  secondaryColor = "from-purple-600 to-purple-800",
  position = "bottom-left",
  className = "",
  disabled = false,
  conversationId: initialConversationId,
  onConversationChange,
}: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [prompts, setPrompts] = useState<BotPrompt[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [wsConnected, setWsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<ChatWebSocket | null>(null);

  /* ---------- WebSocket Management ---------- */

  const connectWebSocket = useCallback(async (convId: string) => {
    if (wsRef.current) {
      wsRef.current.disconnect();
    }

    const ws = new ChatWebSocket();
    wsRef.current = ws;

    // Set up event listeners
    ws.on('message:new', (data) => {
      const { message } = data;
      addMessage({
        id: message.id,
        type: message.type,
        text: message.text,
        time: formatTime(message.created_at),
        created_at: message.created_at,
        sender_name: message.sender_name,
        attachment: message.attachment,
      });
    });

    ws.on('typing', (data) => {
      const { user_id, is_typing } = data;
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (is_typing) {
          newSet.add(user_id);
        } else {
          newSet.delete(user_id);
        }
        return newSet;
      });
    });

    ws.on('read', (data) => {
      // Handle read receipts if needed
      console.log('Read receipts:', data);
    });

    try {
      await ws.connect(convId);
      setWsConnected(true);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setWsConnected(false);
    }
  }, []);

  /* ---------- Message Management ---------- */

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const addUserMessage = useCallback((text: string) => {
    const message: Message = {
      id: `temp-${Date.now()}`,
      type: "user",
      text,
      time: nowTime(),
      created_at: new Date().toISOString(),
    };
    addMessage(message);
    return message;
  }, [addMessage]);

  const addBotMessage = useCallback((text: string) => {
    const message: Message = {
      id: `bot-${Date.now()}`,
      type: "bot",
      text,
      time: nowTime(),
      created_at: new Date().toISOString(),
    };
    addMessage(message);
    return message;
  }, [addMessage]);

  /* ---------- API Integration ---------- */

  const loadPrompts = useCallback(async () => {
    try {
      const promptsData = await chatAPI.getBotPrompts();
      setPrompts(promptsData);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const messagesData = await chatAPI.getMessages(convId);
      const formattedMessages: Message[] = messagesData.map(msg => ({
        id: msg.id,
        type: msg.type,
        text: msg.text,
        time: formatTime(msg.created_at),
        created_at: msg.created_at,
        sender_name: msg.sender_name,
        attachment: msg.attachment,
        rich: msg.rich,
      }));
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSending) return;

    setIsSending(true);
    setIsTyping(false);

    try {
      // Add user message optimistically
      const userMessage = addUserMessage(text);

      // Send via WebSocket if connected, otherwise HTTP
      if (wsConnected && wsRef.current?.isConnected()) {
        wsRef.current.sendMessage(text);
      } else {
        // HTTP fallback
        const response = await chatAPI.submitUserMessage(text, conversationId || undefined);
        
        if (!conversationId) {
          setConversationId(response.conversation_id);
          onConversationChange?.(response.conversation_id);
          await connectWebSocket(response.conversation_id);
        }

        // Get bot response
        const botResponse = await chatAPI.getBotResponse(response.conversation_id);
        addBotMessage(botResponse.message);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addBotMessage("I'm sorry, I couldn't process your message right now. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [conversationId, wsConnected, isSending, addUserMessage, addBotMessage, onConversationChange, connectWebSocket]);

  /* ---------- Effects ---------- */

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
      connectWebSocket(conversationId);
    }
  }, [conversationId, loadMessages, connectWebSocket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && isOpen && setIsOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, []);

  /* ---------- Position ---------- */

  const fabPos =
    position === "bottom-right"
      ? "bottom-6 right-6"
      : position === "top-left"
      ? "top-6 left-6"
      : position === "top-right"
      ? "top-6 right-6"
      : "bottom-6 left-6";

  /* ---------- Handlers ---------- */

  const handleSend = () => {
    if (!inputValue.trim() || isSending) return;
    
    const text = inputValue.trim();
    setInputValue("");
    sendMessage(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    // Send typing indicator via WebSocket
    if (wsConnected && wsRef.current?.isConnected()) {
      wsRef.current.sendTyping(e.target.value.length > 0);
    }
  };

  const handlePromptClick = (prompt: BotPrompt) => {
    setInputValue(prompt.text);
    inputRef.current?.focus();
  };

  /* ---------- Render ---------- */

  return (
    <div className={`fixed ${fabPos} z-50 ${className}`}>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cls(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-300 hover:scale-110",
          `bg-gradient-to-br ${primaryColor}`,
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Open chat"
      >
        {isOpen ? <Minus className="w-6 h-6" /> : <Send className="w-6 h-6" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="absolute bottom-20 left-0 w-96 h-[600px] bg-white rounded-[28px] md:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className={`bg-gradient-to-r ${primaryColor} p-6 text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{botName}</h3>
                <p className="text-sm opacity-90">
                  {wsConnected ? "Connected" : "Connecting..."}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-yellow-400'}`} />
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 h-[400px]">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p>Start a conversation with {botName}!</p>
                <div className="mt-4 space-y-2">
                  {prompts.slice(0, 3).map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => handlePromptClick(prompt)}
                      className="block w-full text-left px-4 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {prompt.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cls(
                  "flex",
                  message.type === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div className={cls(
                  "max-w-[85%] group",
                  message.type === "user" ? "order-2" : "order-1"
                )}>
                  <div className={cls(
                    "rounded-[20px] px-5 py-4 shadow-sm border border-gray-200/50",
                    message.type === "user"
                      ? `bg-gradient-to-br ${primaryColor} text-white rounded-br-md`
                      : "bg-gray-100 text-gray-900 rounded-bl-md"
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <MarkdownRenderer text={message.text} />
                        {message.attachment && (
                          <div className="mt-2">
                            <img
                              src={message.attachment}
                              alt="Attachment"
                              className="max-w-full h-auto rounded"
                            />
                          </div>
                        )}
                      </div>
                      <CopyButton text={message.text} />
                    </div>
                    <div className={cls(
                      "text-xs mt-2 opacity-70",
                      message.type === "user" ? "text-white" : "text-gray-500"
                    )}>
                      {message.time}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-end space-x-3 max-w-[85%]">
                  <div
                    className={cls(
                      "w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br",
                      secondaryColor
                    )}
                  >
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <div className="flex items-center space-x-0.5">
                        <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                        <div className="w-1.5 h-1.5 bg-purple-600 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-[20px] rounded-bl-md px-5 py-4 shadow-sm border border-gray-200/50">
                    <div className="flex space-x-1">
                      <Dot />
                      <Dot delay="0.1s" />
                      <Dot delay="0.2s" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Typing Users */}
            {typingUsers.size > 0 && (
              <div className="text-sm text-gray-500 italic">
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-gray-100 p-5 rounded-b-[28px] md:rounded-b-3xl">
            <div className="flex flex-wrap gap-2 mb-4">
              {prompts.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => handlePromptClick(prompt)}
                  className="inline-flex items-center px-4 py-2.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-full transition-all"
                >
                  {prompt.title}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleTyping}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isSending}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isSending}
                className={cls(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white transition-all",
                  `bg-gradient-to-br ${primaryColor}`,
                  (!inputValue.trim() || isSending) && "opacity-50 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
