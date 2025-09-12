"use client";

import { useState, useRef, useEffect } from "react";
import { Send, ThumbsUp, Minus } from "lucide-react";

/* ---------- Types ---------- */

type Step = "WELCOME" | "WHAT" | "WHEN" | "WHERE" | "RESULTS" | "FOLLOW_UP";
type WhenPreset = "today" | "this_week" | "no_rush";

interface Message {
  id: number;
  type: "bot" | "user";
  text: string;
  time: string;
  special?: boolean;
}

interface Where {
  city: string;
  country?: string;
  lat?: number;
  lon?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  badges?: string[];
  earliestEta?: string;
}

interface ChatbotProps {
  botName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  onSendMessage?: (message: string) => void;
  onBotResponse?: (userMessage: string) => Promise<string> | string;
  onFetchProducts?: (payload: {
    what: string;
    when: WhenPreset;
    where: Where;
  }) => Promise<Product[]>;
  onAddToCart?: (productId: string) => Promise<void> | void;
  onInstantCheckout?: (productId: string) => Promise<string> | string;
  className?: string;
  disabled?: boolean;
}

/* ---------- Utils ---------- */

const nowTime = () =>
  new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });

const locationKey = "cc:userLocation";

const loadJSON = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const saveJSON = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

/* ---------- Prompts ---------- */

const CHANGE_LOCATION_PROMPT =
  "What should be your location? Type your city and country (e.g., Dubai, UAE) or use the options below.";

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

/* ---------- Component ---------- */

export function ChatBot({
  botName = "CreativeAI",
  primaryColor = "from-indigo-500 to-purple-600",
  secondaryColor = "from-purple-600 to-purple-800",
  position = "bottom-left",
  onSendMessage,
  onBotResponse,
  onFetchProducts,
  onAddToCart,
  onInstantCheckout,
  className = "",
  disabled = false,
}: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const [step, setStep] = useState<Step>("WELCOME");
  const [what, setWhat] = useState<string | undefined>();
  const [when, setWhen] = useState<WhenPreset | undefined>();
  const [where, setWhere] = useState<Where | undefined>(undefined);

  const [editingLocation, setEditingLocation] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hi bubble (once per load)
  const [showHi, setShowHi] = useState(false);

  /* ---------- Init ---------- */

  useEffect(() => {
    const known = loadJSON<Where>(locationKey) || undefined;

    setMessages([
      {
        id: Date.now(),
        type: "bot",
        text: "Hi there 👋! I can help you find the perfect product fast.",
        time: nowTime(),
      },
    ]);

    setStep("WHAT");
    setWhere(known);
  }, []);

  // Autoscroll and focus handling
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && isOpen && setIsOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    setShowHi(true);
    const t = setTimeout(() => setShowHi(false), 2000);
    return () => clearTimeout(t);
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
  const panelPos =
    position === "bottom-right"
      ? "md:bottom-24 md:right-6"
      : position === "top-left"
      ? "md:top-24 md:left-6"
      : position === "top-right"
      ? "md:top-24 md:right-6"
      : "md:bottom-24 md:left-6";

  /* ---------- Messaging helpers ---------- */

  const addBotMessage = (text: string, special = false) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        type: "bot",
        text,
        time: nowTime(),
        special,
      },
    ]);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), type: "user", text, time: nowTime() },
    ]);
  };

  /* ---------- Flow ---------- */

  const handleToggle = () => {
    if (!disabled) setIsOpen((v) => !v);
  };

  const formatWhere = (w?: Where) =>
    w ? [w.city, w.country].filter(Boolean).join(", ") : "";

  const parseWhere = (txt: string): Where => {
    const parts = txt.split(",").map((s) => s.trim());
    if (parts.length >= 2) return { city: parts[0], country: parts[1] };
    return { city: txt.trim() };
  };

  const capitalize = (s?: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  const proceedToResults = async (finalWhere?: Where) => {
    const w = finalWhere || where;
    const wh = when || "no_rush";
    if (!what) {
      addBotMessage("Tell me what you’re looking for first 🙂");
      setStep("WHAT");
      setInputValue("");
      return;
    }
    if (!w) {
      setStep("WHERE");
      return;
    }

    setIsTyping(true);
    setTimeout(() => {
      addBotMessage(
        `You’re looking for ${what}, needed ${
          wh === "today"
            ? "today"
            : wh === "this_week"
            ? "this week"
            : "with no rush"
        }, delivered to ${formatWhere(w)}. Here’s what I found…`
      );
      setIsTyping(false);
    }, 350);

    setLoadingProducts(true);
    try {
      let items: Product[] = [];
      if (onFetchProducts) {
        items = await onFetchProducts({ what, when: wh, where: w });
      } else {
        items = [
          {
            id: "P-101",
            name: `${capitalize(what)} – Prime`,
            price: 199,
            image: "/images/sample-1.jpg",
            badges:
              wh === "today" ? ["Same-day", "Bestseller"] : ["Bestseller"],
            earliestEta: wh === "today" ? "Today" : "Tue 12 Aug",
          },
          {
            id: "P-102",
            name: `${capitalize(what)} – Budget`,
            price: 129,
            image: "/images/sample-2.jpg",
            badges: ["Value"],
            earliestEta: wh === "today" ? "Today" : "Wed 13 Aug",
          },
          {
            id: "P-103",
            name: `${capitalize(what)} – Deluxe`,
            price: 259,
            image: "/images/sample-3.jpg",
            badges: ["-15%"],
            earliestEta: wh === "today" ? "Today" : "Thu 14 Aug",
          },
        ];
      }
      setProducts(items);
      setStep("RESULTS");
    } catch {
      addBotMessage(
        "Hmm, I couldn’t fetch products right now. Please try again."
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text) return;

    addUserMessage(text);
    setInputValue("");

    if (step === "WHAT") {
      const cleaned = text
        .replace(/^what\s+are\s+you\s+looking\s+for\??\s*/i, "")
        .trim();
      const nextWhat = cleaned || text;
      setWhat(nextWhat);
      setIsTyping(true);
      setTimeout(() => {
        addBotMessage(`Got it — ${nextWhat} ✅`);
        setIsTyping(false);
        // If we have a saved location and not editing it, skip WHERE and go to WHEN
        if (where && !editingLocation) {
          setStep("WHEN");
        } else {
          setStep("WHERE");
        }
      }, 300);
      return;
    }

    if (step === "WHERE") {
      const w = parseWhere(text);
      setWhere(w);
      // PERSIST LOCATION ONLY
      saveJSON(locationKey, w);
      setEditingLocation(false);
      setIsTyping(true);
      setTimeout(() => {
        addBotMessage(`Great — deliver to: ${formatWhere(w)} ✅`);
        setIsTyping(false);
        // If WHAT is known, go to WHEN; else back to WHAT
        setStep(what ? "WHEN" : "WHAT");
      }, 300);
      return;
    }

    // general chat fallback
    if (onSendMessage) onSendMessage(text);
    setIsTyping(true);
    try {
      const reply = onBotResponse
        ? await onBotResponse(text)
        : "I can also help find products. Try telling me what you need!";
      setTimeout(() => {
        addBotMessage(reply);
        setIsTyping(false);
      }, 350);
    } catch {
      setIsTyping(false);
    }
  };

  /* ---------- Inline Questions (always right after latest bot response) ---------- */

  // Determine which prompts are still pending (and their order)
  const hasSavedLocation = Boolean(where && where.city && !editingLocation);

  const pendingQuestions: Array<"WHAT" | "WHEN" | "WHERE"> = [];
  if (!what) pendingQuestions.push("WHAT");
  if (!when) pendingQuestions.push("WHEN");
  if (!hasSavedLocation) pendingQuestions.push("WHERE");

  const Chip = ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      className="inline-flex items-center px-4 py-2.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-full transition-all"
    >
      {children}
    </button>
  );

  const InlineQuestions = () => {
    if (step === "RESULTS") return null;
    if (pendingQuestions.length === 0) return null;

    return (
      <div className="mt-2 space-y-3">
        {pendingQuestions.map((q) => {
          if (q === "WHAT") {
            return (
              <div key="q-what" className="flex justify-start">
                <div className="flex items-end space-x-3 max-w-[85%]">
                  <div
                    className={cls(
                      "w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br",
                      secondaryColor
                    )}
                  >
                    <div className="w-6 h-6 bg-white rounded-full" />
                  </div>
                  <div className="bg-gray-100 rounded-[20px] rounded-bl-md px-5 py-4 shadow-sm border border-gray-200/50">
                    <p className="text-sm text-gray-800 font-medium">
                      What are you looking for?
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          if (q === "WHEN") {
            return (
              <div key="q-when" className="flex flex-wrap gap-2 pl-12">
                <Chip onClick={() => handleWhenSelect("today")}>Today</Chip>
                <Chip onClick={() => handleWhenSelect("this_week")}>
                  This week
                </Chip>
                <Chip onClick={() => handleWhenSelect("no_rush")}>No rush</Chip>
              </div>
            );
          }

          // WHERE
          return (
            <div key="q-where" className="space-y-2">
              <div className="flex justify-start">
                <div className="flex items-end space-x-3 max-w-[85%]">
                  <div
                    className={cls(
                      "w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br",
                      secondaryColor
                    )}
                  >
                    <div className="w-6 h-6 bg-white rounded-full" />
                  </div>
                  <div className="bg-gray-100 rounded-[20px] rounded-bl-md px-5 py-4 shadow-sm border border-gray-200/50">
                    <p className="text-sm text-gray-800 font-medium">
                      {editingLocation
                        ? CHANGE_LOCATION_PROMPT
                        : "Where should we deliver it? Type your city (e.g., Dubai, UAE) or use the options below."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pl-12">
                {where && !editingLocation && (
                  <Chip
                    onClick={() => {
                      addBotMessage(`Deliver to: ${formatWhere(where)} ✅`);
                      // If WHAT exists, move to WHEN; else WHAT
                      setStep(what ? "WHEN" : "WHAT");
                    }}
                  >
                    Deliver to: {formatWhere(where)} ✅
                  </Chip>
                )}
                <Chip
                  onClick={() => {
                    setInputValue("");
                    setTimeout(() => inputRef.current?.focus(), 0);
                    setStep("WHERE");
                    setEditingLocation(true);
                  }}
                >
                  Other
                </Chip>
                <Chip
                  onClick={async () => {
                    try {
                      const pos = await new Promise<GeolocationPosition>(
                        (res, rej) => {
                          if (!navigator.geolocation) rej("not available");
                          else
                            navigator.geolocation.getCurrentPosition(res, rej);
                        }
                      );
                      const approx: Where = {
                        city: "Your area",
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                      };
                      setWhere(approx);
                      saveJSON(locationKey, approx);
                      addBotMessage(
                        "Location captured. You can refine the city name if needed."
                      );
                      setEditingLocation(false);
                      setStep(what ? "WHEN" : "WHAT");
                    } catch {
                      addBotMessage(
                        "Couldn’t access location. Please type your city (e.g., Dubai, UAE)."
                      );
                      setEditingLocation(true);
                      setStep("WHERE");
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }
                  }}
                >
                  Use my location
                </Chip>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleWhenSelect = (val: WhenPreset) => {
    setWhen(val);
    addBotMessage(
      val === "today"
        ? "Speedy! Let’s try for same-day delivery. 🏎️"
        : val === "this_week"
        ? "Got it — this week works. 🗓️"
        : "No rush — I’ll show the best options. 😌"
    );
    // If we already know where (saved or just set), proceed to results; else ask WHERE
    if (where && !editingLocation) {
      setStep("RESULTS");
      proceedToResults();
    } else {
      setStep("WHERE");
    }
  };

  /* ---------- UI bits ---------- */

  const SummaryChips = () => {
    // keep as a small recap row (optional)
    if (!what && !when && !where) return null;
    return (
      <div className="flex flex-wrap gap-2 py-2">
        {what && (
          <span className="px-3 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-full">
            What: <span className="font-medium">{what}</span>
          </span>
        )}
        {when && (
          <span className="px-3 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-full">
            When:{" "}
            <span className="font-medium">
              {when === "today"
                ? "Today"
                : when === "this_week"
                ? "This week"
                : "No rush"}
            </span>
          </span>
        )}
      </div>
    );
  };

  const ProductGrid = () => {
    if (step !== "RESULTS") return null;
    if (loadingProducts)
      return (
        <div className="mt-4 text-sm text-gray-600">Loading products…</div>
      );
    if (products.length === 0)
      return (
        <div className="mt-4 text-sm text-gray-600">
          No matches yet. Try adjusting When.
        </div>
      );

    return (
      <div className="mt-4 grid grid-cols-1 gap-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition"
          >
            <div className="aspect-[16/10] bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={p.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "/images/default.jpg";
                }}
              />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">{p.name}</h4>
                <div className="text-indigo-600 font-bold">${p.price}</div>
              </div>
              {p.badges && p.badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.badges.map((b, i) => (
                    <span
                      key={i}
                      className="text-[10px] uppercase tracking-wide bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
              {p.earliestEta && (
                <div className="text-xs text-gray-600 mt-2">
                  Earliest delivery: {p.earliestEta}
                </div>
              )}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={async () => {
                    try {
                      if (onAddToCart) await onAddToCart(p.id);
                      addBotMessage("Added to cart ✅");
                    } catch {
                      addBotMessage("Couldn’t add to cart. Please try again.");
                    }
                  }}
                  className={cls(
                    "text-white text-sm rounded-full px-4 py-2 hover:opacity-90",
                    "bg-gradient-to-r",
                    primaryColor
                  )}
                >
                  Add to Cart
                </button>
                <button
                  onClick={async () => {
                    try {
                      const url = (await onInstantCheckout?.(p.id)) || "#";
                      window.open(url, "_blank");
                    } catch {
                      addBotMessage(
                        "Instant checkout is unavailable right now."
                      );
                    }
                  }}
                  className="text-sm rounded-full px-4 py-2 border border-gray-200 hover:bg-gray-50"
                >
                  Instant checkout
                </button>
                <button
                  onClick={() =>
                    addBotMessage(`Opening details for ${p.name}…`)
                  }
                  className="text-sm rounded-full px-3 py-2 hover:bg-gray-50"
                >
                  View details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ---------- Render ---------- */

  if (disabled) return null;

  return (
    <div className={className}>
      {/* Floating Chat Icon */}
      <div className={cls("fixed z-50", fabPos)}>
        <div className="relative">
          {/* Hi tooltip bubble */}
          <div
            className={cls(
              "absolute pointer-events-none select-none",
              "transition-all duration-300 ease-out",
              showHi
                ? "opacity-100 -translate-y-1 translate-x-1"
                : "opacity-0 -translate-y-2 translate-x-0"
            )}
            style={{ bottom: "calc(100% + 6px)", left: "calc(60% - 12px)" }}
            aria-hidden="true"
          >
            <div className="relative px-8 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-2xl border border-white/20 backdrop-blur-sm whitespace-nowrap">
              <span className="relative z-10">Hi! 👋</span>
              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 rounded-lg pointer-events-none" />
              <div
                className="absolute w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-600 rotate-45 border-l border-t border-white/20 shadow-lg"
                style={{ bottom: "-6px", left: "20px" }}
              />
            </div>
          </div>

          <button
            onClick={handleToggle}
            className={cls(
              "w-16 h-16 rounded-full shadow-xl transition-all duration-300 ease-out bg-gradient-to-r",
              primaryColor,
              isOpen
                ? "scale-90"
                : "hover:scale-110 hover:shadow-2xl animate-pulse"
            )}
            style={{
              animationDuration: isOpen ? "0s" : "3s",
              animationIterationCount: "infinite",
            }}
            aria-label={isOpen ? "Close chat" : "Open chat"}
          >
            <div className="w-full h-full rounded-full flex items-center justify-center relative">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-inner">
                <div
                  className={cls(
                    "w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-r",
                    primaryColor
                  )}
                >
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full" />
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Chat Interface */}
      {isOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cls(
              "fixed z-50 bg-white transition-all duration-300 ease-out",
              "bottom-0 left-0 right-0 h-[92vh] rounded-t-[28px] shadow-2xl",
              "md:right-auto md:w-[420px] md:h-[600px] md:rounded-3xl md:shadow-[0_20px_60px_rgba(0,0,0,0.15)]",
              panelPos,
              isOpen
                ? "translate-y-0 md:scale-100 md:opacity-100"
                : "translate-y-full md:scale-95 md:opacity-0"
            )}
            role="dialog"
            aria-label={`${botName} chat window`}
          >
            {/* Header */}
            <div
              className={cls(
                "p-5 flex items-center justify-between relative overflow-hidden rounded-t-[28px] md:rounded-t-3xl bg-gradient-to-r",
                primaryColor
              )}
            >
              <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
              <div className="flex items-center space-x-4 relative z-10">
                <div className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                  <div
                    className={cls(
                      "w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br",
                      primaryColor
                    )}
                  >
                    <div className="flex items-center space-x-1">
                      <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      <div className="w-2.5 h-2.5 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg tracking-tight">
                    {botName}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-sm animate-pulse" />
                    <span className="text-white/90 text-sm font-medium">
                      Online
                    </span>
                  </div>
                  {/* Saved location display just under Online */}
                  {where && !editingLocation && (
                    <div className="mt-1 text-white/90 text-xs">
                      Delivering to:{" "}
                      <span className="font-semibold">
                        {formatWhere(where)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="relative z-10 text-white/80 hover:text-white hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 hover:scale-110"
                aria-label="Minimize chat"
              >
                <Minus className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white"
              style={{ height: "calc(100% - 200px)" }}
              aria-live="polite"
            >
              <div className="p-5 space-y-6">
                {/* Summary chips (optional small recap) */}
                <SummaryChips />

                {/* Chat bubbles */}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cls(
                      "flex",
                      m.type === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cls(
                        "flex items-end space-x-3 max-w-[85%]",
                        m.type === "user"
                          ? "flex-row-reverse space-x-reverse"
                          : ""
                      )}
                    >
                      <div className="w-9 h-9 rounded-full flex-shrink-0 shadow-sm">
                        {m.type === "bot" ? (
                          <div
                            className={cls(
                              "w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br",
                              secondaryColor
                            )}
                          >
                            <div className="w-6 h-6 bg-white rounded-full" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-white text-sm font-bold">
                              U
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col">
                        <div
                          className={cls(
                            "px-5 py-4 text-sm leading-relaxed max-w-xs",
                            m.type === "bot"
                              ? m.special
                                ? cls(
                                    "text-white rounded-[20px] rounded-bl-md shadow-lg bg-gradient-to-br",
                                    secondaryColor
                                  )
                                : "bg-gray-100 text-gray-800 rounded-[20px] rounded-bl-md shadow-sm border border-gray-200/50"
                              : "bg-white text-gray-800 rounded-[20px] rounded-br-md shadow-md border border-gray-200"
                          )}
                        >
                          <p className="whitespace-pre-line">{m.text}</p>
                        </div>

                        <div
                          className={cls(
                            "flex items-center space-x-2 mt-2 px-2",
                            m.type === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          <span className="text-xs text-gray-500 font-medium">
                            {m.time}
                          </span>
                          {m.type === "user" && (
                            <div className="flex -space-x-1.75">
                              <CheckIcon />
                              <CheckIcon />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing */}
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

                {/* >>> Inline questions appear here, always after the latest bot/user message <<< */}
                <InlineQuestions />

                {/* Products */}
                <ProductGrid />

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-gray-100 p-5 rounded-b-[28px] md:rounded-b-3xl">
              <div className="flex flex-wrap gap-2 mb-4">
                {/* Change location control shows only when a location exists */}
                {where && !editingLocation && (
                  <button
                    onClick={() => {
                      setEditingLocation(true);
                      setStep("WHERE");
                      addBotMessage(CHANGE_LOCATION_PROMPT);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="inline-flex items-center px-4 py-2.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-full transition-all"
                  >
                    Change location
                  </button>
                )}

                {[
                  "Track my order",
                  "Browse by category",
                  "Talk to a human",
                ].map((action) => (
                  <button
                    key={action}
                    onClick={() => {
                      if (action === "Apply discount code") {
                        setStep("FOLLOW_UP");
                        addBotMessage(
                          "Type your discount code and press Enter."
                        );
                        setTimeout(() => inputRef.current?.focus(), 0);
                      } else if (action === "Browse by category") {
                        addBotMessage(
                          "Choose a category to browse (hook your modal here).",
                          true
                        );
                      } else if (action === "Talk to a human") {
                        addBotMessage(
                          `Connecting you to a human with context: What=${
                            what || "-"
                          }, When=${when || "-"}, Where=${
                            formatWhere(where) || "-"
                          }`
                        );
                      } else {
                        addBotMessage("Opening order tracking…");
                      }
                    }}
                    className="inline-flex items-center px-4 py-2.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-full transition-all"
                  >
                    {action}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex items-center space-x-3 bg-gray-50 rounded-full p-3 border border-gray-200/50 shadow-sm">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={
                    step === "WHAT"
                      ? "Type what you’re looking for…"
                      : step === "WHERE"
                      ? "Type your city, e.g., Dubai, UAE"
                      : "Type a message…"
                  }
                  className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-500 px-2"
                />

                <button
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-2 rounded-full transition-all duration-200"
                  onClick={() => addBotMessage("👍 Noted!")}
                  aria-label="Quick thumbs up"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>

                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim()}
                  className={cls(
                    "text-white rounded-full p-3 transition-all duration-200 hover:scale-110 hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none bg-gradient-to-r",
                    inputValue.trim()
                      ? primaryColor
                      : "from-gray-300 to-gray-400"
                  )}
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
