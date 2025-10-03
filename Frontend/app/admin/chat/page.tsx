"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  Search,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  Settings,
  Bell,
  Moon,
  Shield,
  Image as ImageIcon,
  Trash2,
  Eye,
  UserPlus,
  LogOut,
  Info,
  X,
  Check,
  CheckCheck,
  Users,
  ChevronDown,
  ChevronUp,
  Check as CheckIconLucide,
  Download,
  Ellipsis,
} from "lucide-react";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { toast, Toaster } from "react-hot-toast";

/**
 * Included:
 * - Delete for me / Delete for everyone (mobile friendly – tap/long-press)
 * - Cross-chat call simulation (A ↔ B mirrored): ring/answer/connect/ticker
 * - Docked call panel + full modal + sticky ongoing banner
 * - Unread logic fixed, persistence (localStorage), voice notes, attachments, multi-forward
 */

// ---------- Types ----------
interface Contact {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
  online?: boolean;
  unread?: number;
  lastMessagePreview?: string;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  url: string; // data: URL or https:
  isImage: boolean;
  isAudio?: boolean;
}

interface Message {
  id: string;
  senderId: string; // "me" or contact.id
  text?: string;
  createdAt: number;
  status?: "sent" | "delivered" | "read";
  attachments?: Attachment[];
  // deletions
  hiddenForMe?: boolean; // "delete for me"
  deletedForEveryone?: boolean; // shows tombstone text
}

interface Conversation {
  id: string;
  contactId: string;
  messages: Message[];
  pinnedMessageId?: string;
}

// ---- Calls ----
type CallType = "audio" | "video";
type CallStatus = "idle" | "dialing" | "ringing" | "connected" | "ended";
type CallDirection = "outgoing" | "incoming";

interface ActiveCall {
  id: string;
  withContactId: string;
  type: CallType;
  status: CallStatus;
  direction: CallDirection;
  startedAt?: number;
  acceptedAt?: number;
  endedAt?: number;
  micMuted?: boolean;
  camOff?: boolean;
  docked?: boolean;
}

// ---------- Mock Data ----------
const THEME = { maroon: "#891F1A" };

const MOCK_CONTACTS: Contact[] = [
  {
    id: "1",
    name: "Design Team",
    title: "Channel",
    online: true,
    unread: 2,
    lastMessagePreview: "Need the mockups by EOD",
  },
  {
    id: "2",
    name: "Production",
    title: "Channel",
    online: true,
    unread: 0,
    lastMessagePreview: "Machine A ready",
  },
  {
    id: "3",
    name: "Aisha Khan",
    title: "Sales",
    online: false,
    unread: 0,
    lastMessagePreview: "Sharing the brief…",
  },
  {
    id: "4",
    name: "Bilal Ahmed",
    title: "Designer",
    online: true,
    unread: 1,
    lastMessagePreview: "Logo v3 attached",
  },
];

const now = Date.now();
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    contactId: "1",
    pinnedMessageId: "m1",
    messages: [
      {
        id: "m1",
        senderId: "1",
        text: "Welcome to the Design Team channel!",
        createdAt: now - 1000 * 60 * 60 * 24,
        status: "read",
      },
      {
        id: "m2",
        senderId: "me",
        text: "Please drop all mockups here.",
        createdAt: now - 1000 * 60 * 60 * 23.5,
        status: "read",
      },
      {
        id: "m3",
        senderId: "1",
        text: "Need the mockups by EOD",
        createdAt: now - 1000 * 60 * 10,
        status: "delivered",
      },
    ],
  },
  {
    id: "c2",
    contactId: "3",
    messages: [
      {
        id: "m4",
        senderId: "3",
        text: "Sharing the brief…",
        createdAt: now - 1000 * 60 * 35,
        status: "read",
      },
      {
        id: "m5",
        senderId: "me",
        text: "Got it, thanks!",
        createdAt: now - 1000 * 60 * 30,
        status: "read",
      },
    ],
  },
];

// ---------- Utils ----------
type TabKey = "contacts" | "chat" | "settings";
const dayDivider = (ts: number) => new Date(ts).toLocaleDateString();
const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtSize = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const fileToDataURL = (f: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => res(String(r.result));
    r.readAsDataURL(f);
  });

// safe localStorage
function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function writeLS<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ---------- Small UI ----------
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full relative transition ${
        checked ? "bg-gray-900" : "bg-gray-300"
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
      type="button"
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ContactItem({
  contact,
  active,
  onClick,
}: {
  contact: Contact;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-all duration-200 border-l-4 ${
        active
          ? `bg-gray-50 border-[#891F1A] shadow-sm`
          : "border-transparent hover:border-gray-200"
      }`}
      type="button"
      data-contact-id={contact.id}
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center ring-2 ring-gray-100 shadow-sm">
          {contact.avatar ? (
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                if (nextElement) {
                  nextElement.style.display = "flex";
                }
              }}
            />
          ) : null}
          <div
            className="w-full h-full bg-[#891F1A] flex items-center justify-center text-white font-bold text-lg"
            style={{ display: contact.avatar ? "none" : "flex" }}
          >
            {contact.name.charAt(0).toUpperCase()}
          </div>
        </div>
        <span
          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
            contact.online ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span className="truncate">{contact.name}</span>
          {contact.title && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#891F1A] text-white font-medium">
              {contact.title}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-600 truncate font-medium">
          {contact.lastMessagePreview}
        </div>
      </div>
      {contact.unread ? (
        <span
          className="text-[10px] min-w-6 h-6 grid place-items-center rounded-full text-white font-bold shadow-sm"
          style={{ backgroundColor: THEME.maroon }}
        >
          {contact.unread}
        </span>
      ) : null}
    </button>
  );
}

function AddContactModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (c: Contact, firstMessage?: string) => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [avatar, setAvatar] = useState("");
  const [online, setOnline] = useState(true);
  const [firstMessage, setFirstMessage] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[92vw] max-w-md p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus size={18} />
          <h3 className="font-semibold">Add New Contact</h3>
          <button
            className="ml-auto p-1 rounded hover:bg-gray-100"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600">Name</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Zara Ali"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Title (optional)</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sales"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">
              Avatar URL (optional)
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://…/avatar.jpg"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Online</span>
            <Toggle checked={online} onChange={setOnline} />
          </div>
          <div>
            <label className="text-xs text-gray-600">
              First message (optional)
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder="Say hello…"
            />
          </div>
          <button
            className="w-full text-white rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: THEME.maroon }}
            type="button"
            onClick={() => {
              if (!name.trim()) return;
              const newContact: Contact = {
                id: Date.now().toString(),
                name: name.trim(),
                title: title.trim() || undefined,
                avatar: avatar.trim() || undefined,
                online,
                unread: 0,
                lastMessagePreview: firstMessage.trim() || "",
              };
              onCreate(newContact, firstMessage.trim() || undefined);
              onClose();
            }}
          >
            Create Contact
          </button>
        </div>
      </div>
    </div>
  );
}

/** MultiSelect with FIXED dropdown (not clipped). */
function MultiSelect({
  options,
  values,
  onChange,
  label = "Also send to",
}: {
  options: { id: string; label: string }[];
  values: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const recalc = () => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    const width = 260;
    const left = Math.min(b.left, window.innerWidth - width - 8);
    setMenuPos({ top: b.bottom + 6, left });
  };

  useEffect(() => {
    if (!open) return;
    recalc();
    const onScroll = () => recalc();
    const onResize = () => recalc();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const toggleValue = (id: string) => {
    if (values.includes(id)) onChange(values.filter((v) => v !== id));
    else onChange([...values, id]);
  };

  const selectedText =
    values.length === 0
      ? "No one else"
      : values.length === 1
      ? options.find((o) => o.id === values[0])?.label || "1 selected"
      : `${values.length} selected`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 text-sm border rounded-full px-3 py-1.5 hover:bg-gray-50"
      >
        {label}: <span className="font-medium">{selectedText}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[1000]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="fixed z-[1001] bg-white border rounded-xl shadow-xl p-2"
            style={{
              top: menuPos?.top ?? 100,
              left: menuPos?.left ?? 16,
              width: 260,
            }}
          >
            <div className="max-h-56 overflow-auto">
              {options.map((o) => {
                const active = values.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleValue(o.id)}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <span className="truncate">{o.label}</span>
                    {active && <CheckIconLucide size={16} />}
                  </button>
                );
              })}
            </div>
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                className="text-xs text-gray-600 hover:underline"
                onClick={() => onChange([])}
              >
                Clear
              </button>
              <button
                type="button"
                className="text-xs text-white px-2 py-1 rounded"
                style={{ backgroundColor: THEME.maroon }}
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ---------- Page ----------
export default function AdminChatPage() {
  const [initialized, setInitialized] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [conversations, setConversations] =
    useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeContactId, setActiveContactId] = useState<string>(
    MOCK_CONTACTS[0]?.id ?? "1"
  );

  // prefs
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [darkBubbles, setDarkBubbles] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);

  // ui
  const [tab, setTab] = useState<TabKey>("chat");
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");

  // compose
  const [messageDraft, setMessageDraft] = useState("");
  const [attachmentsPending, setAttachmentsPending] = useState<File[]>([]);
  const [extraRecipients, setExtraRecipients] = useState<string[]>([]);

  // voice note recorder
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recordStartedAt, setRecordStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // scroll navigation
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasScrolledUp, setHasScrolledUp] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(true);

  // ---- CALLS (multi-party) ----
  type CallsMap = Record<string, ActiveCall | undefined>;
  const [calls, setCalls] = useState<CallsMap>({});
  const [callTicker, setCallTicker] = useState(0);
  const callTimerRef = useRef<number | null>(null);
  const getPeerId = (cid: string) => calls[cid]?.withContactId;

  // message menu
  const [menuForMsgId, setMenuForMsgId] = useState<string | null>(null);

  // -------- Load from LS --------
  useEffect(() => {
    try {
      const savedContacts = readLS<Contact[]>("cc_contacts", MOCK_CONTACTS);
      const savedConvos = readLS<Conversation[]>(
        "cc_conversations",
        MOCK_CONVERSATIONS
      );
      const savedPrefs = readLS<any>("cc_prefs", {
        notifyEnabled: true,
        darkBubbles: false,
        readReceipts: true,
        activeContactId: savedContacts[0]?.id ?? "1",
        lastTab: "chat",
      });

      setContacts(savedContacts);
      setConversations(savedConvos);
      setNotifyEnabled(!!savedPrefs.notifyEnabled);
      setDarkBubbles(!!savedPrefs.darkBubbles);
      setReadReceipts(!!savedPrefs.readReceipts);
      setActiveContactId(
        savedPrefs.activeContactId || savedContacts[0]?.id || "1"
      );
      setTab((savedPrefs.lastTab as TabKey) || "chat");
    } finally {
      setInitialized(true);
    }
  }, []);

  // -------- Persist to LS --------
  useEffect(() => {
    if (initialized) writeLS("cc_contacts", contacts);
  }, [contacts, initialized]);
  useEffect(() => {
    if (initialized) writeLS("cc_conversations", conversations);
  }, [conversations, initialized]);
  useEffect(() => {
    if (!initialized) return;
    writeLS("cc_prefs", {
      notifyEnabled,
      darkBubbles,
      readReceipts,
      activeContactId,
      lastTab: tab,
    });
  }, [
    notifyEnabled,
    darkBubbles,
    readReceipts,
    activeContactId,
    tab,
    initialized,
  ]);

  // -------- Helpers --------
  const convByContact = (cid: string) =>
    conversations.find((c) => c.contactId === cid);

  // unread from conversations (incoming not-read)
  const recomputeUnread = (convos: Conversation[]): Record<string, number> => {
    const map: Record<string, number> = {};
    convos.forEach((c) => {
      const count = c.messages.reduce(
        (n, m) => n + (m.senderId !== "me" && m.status !== "read" ? 1 : 0),
        0
      );
      map[c.contactId] = count;
    });
    return map;
  };

  // mark incoming as read when opening chat
  const markConversationRead = (cid: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.contactId !== cid) return c;
        const msgs = c.messages.map((m) =>
          m.senderId !== "me" && m.status !== "read"
            ? { ...m, status: "read" as const }
            : m
        );
        return { ...c, messages: msgs };
      })
    );
    setContacts((prev) =>
      prev.map((ct) => (ct.id === cid ? { ...ct, unread: 0 } : ct))
    );
  };

  // Ensure conversation exists on switch + clear extras + mark as read when opening
  useEffect(() => {
    if (!initialized) return;
    setConversations((prev) =>
      prev.some((c) => c.contactId === activeContactId)
        ? prev
        : [
            ...prev,
            {
              id: `c-${activeContactId}`,
              contactId: activeContactId,
              messages: [],
            },
          ]
    );
    setExtraRecipients([]);
    markConversationRead(activeContactId);
  }, [activeContactId, initialized]);

  // Also mark active chat as read when tab becomes visible again
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible")
        markConversationRead(activeContactId);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [activeContactId]);

  // Recompute unread every time conversations change
  useEffect(() => {
    if (!initialized) return;
    const map = recomputeUnread(conversations);
    setContacts((prev) =>
      prev.map((ct) => ({ ...ct, unread: map[ct.id] ?? 0 }))
    );
  }, [conversations, initialized]);

  const activeConversation = useMemo(
    () => convByContact(activeContactId) as Conversation,
    [conversations, activeContactId]
  );
  const activeContact = useMemo(
    () => contacts.find((c) => c.id === activeContactId)!,
    [contacts, activeContactId]
  );

  const filteredContacts = useMemo(() => {
    if (!query) return contacts;
    return contacts.filter((c) =>
      (c.name + " " + (c.title ?? ""))
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [contacts, query]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Auto-scroll to bottom when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConversation?.messages.length, isAtBottom]);

  // Handle scroll position tracking
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottomNow = scrollHeight - scrollTop - clientHeight < 50;
      const hasScrolled = scrollTop > 100;

      setIsAtBottom(isAtBottomNow);
      setHasScrolledUp(hasScrolled);
      setScrollPosition(scrollTop);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsAtBottom(true);
    setHasScrolledUp(false);
  };

  // Scroll to top function
  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Keyboard shortcuts for scroll navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when chat tab is active
      if (tab !== "chat") return;

      // Ctrl/Cmd + Up: Scroll to top
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowUp") {
        e.preventDefault();
        scrollToTop();
      }
      // Ctrl/Cmd + Down: Scroll to bottom
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowDown") {
        e.preventDefault();
        scrollToBottom();
      }
      // Home: Scroll to top
      if (e.key === "Home" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        scrollToTop();
      }
      // End: Scroll to bottom
      if (e.key === "End" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        scrollToBottom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab]);

  // Ensure composer is always visible
  useEffect(() => {
    const ensureComposerVisible = () => {
      const composer = document.querySelector('[data-composer="true"]') as HTMLElement;
      if (composer) {
        composer.style.display = "block";
        composer.style.visibility = "visible";
        composer.style.opacity = "1";
        composer.style.height = "auto";
        composer.style.minHeight = "120px";
      }
    };

    // Check every second to ensure composer stays visible
    const interval = setInterval(ensureComposerVisible, 1000);

    // Also check on tab changes
    ensureComposerVisible();

    return () => clearInterval(interval);
  }, [tab, activeContactId]);

  // Force composer visibility on tab switch to chat
  useEffect(() => {
    if (tab === "chat") {
      setTimeout(() => {
        const composer = document.querySelector('[data-composer="true"]') as HTMLElement;
        if (composer) {
          composer.style.display = "block";
          composer.style.visibility = "visible";
          composer.style.opacity = "1";
        }
      }, 100);
    }
  }, [tab]);

  // -------- Core: append message (fix unread) --------
  const appendMessage = (contactId: string, msg: Message) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.contactId === contactId);
      const next = [...prev];
      if (idx === -1)
        next.push({ id: `c-${contactId}`, contactId, messages: [msg] });
      else next[idx] = { ...next[idx], messages: [...next[idx].messages, msg] };
      return next;
    });

    setContacts((prev) =>
      prev.map((ct) => {
        if (ct.id !== contactId) return ct;

        const preview =
          msg.text ||
          (msg.attachments?.[0]?.name
            ? msg.attachments[0].isAudio
              ? `🎤 ${msg.attachments[0].name}`
              : msg.attachments[0].isImage
              ? `🖼️ ${msg.attachments[0].name}`
              : msg.attachments[0].name
            : ct.lastMessagePreview);

        const isActive = contactId === activeContactId;
        const incoming = msg.senderId !== "me";
        const nextUnread =
          !isActive && incoming ? (ct.unread ?? 0) + 1 : ct.unread ?? 0;

        return { ...ct, lastMessagePreview: preview, unread: nextUnread };
      })
    );
  };

  // -------- Deletions --------
  const deleteForMe = (cid: string, mid: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.contactId !== cid) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === mid ? { ...m, hiddenForMe: true } : m
          ),
        };
      })
    );
  };

  const deleteForEveryone = (cid: string, mid: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.contactId !== cid) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === mid
              ? {
                  ...m,
                  text: "This message was deleted",
                  attachments: undefined,
                  deletedForEveryone: true,
                }
              : m
          ),
        };
      })
    );
  };

  // -------- Voice note --------
  useEffect(() => {
    if (!isRecording || !recordStartedAt) return;
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - recordStartedAt) / 1000)),
      250
    );
    return () => clearInterval(id);
  }, [isRecording, recordStartedAt]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-message-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setAttachmentsPending((prev) => [...prev, file]);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecordStartedAt(Date.now());
      setElapsed(0);
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      toast.error("Microphone permission denied or unsupported browser.");
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    try {
      mr.stop();
    } catch {}
    setIsRecording(false);
    setRecordStartedAt(null);
  };

  // -------- Send message --------
  const handleSend = async () => {
    const text = messageDraft.trim();
    if (!text && attachmentsPending.length === 0) return;

    try {
      const atts: Attachment[] = await Promise.all(
        attachmentsPending.map(async (f) => {
          const dataUrl = await fileToDataURL(f);
          return {
            id: Math.random().toString(36).slice(2),
            name: f.name,
            size: f.size,
            mime: f.type || "application/octet-stream",
            url: dataUrl,
            isImage: f.type.startsWith("image/"),
            isAudio: f.type.startsWith("audio/"),
          };
        })
      );

      const recipients = Array.from(
        new Set([activeContactId, ...extraRecipients])
      );

      const makeActiveMsg = (): Message => ({
        id: Math.random().toString(36).slice(2),
        senderId: "me",
        text: text || undefined,
        createdAt: Date.now(),
        status: "sent",
        attachments: atts.length ? atts : undefined,
      });

      const makeOtherMsg = (rid: string): Message => ({
        id: Math.random().toString(36).slice(2),
        senderId: rid,
        text: text || undefined,
        createdAt: Date.now(),
        status: "delivered",
        attachments: atts.length ? atts : undefined,
      });

      recipients.forEach((rid) => {
        if (rid === activeContactId) appendMessage(rid, makeActiveMsg());
        else appendMessage(rid, makeOtherMsg(rid));
      });

      // Clear form and ensure composer stays visible
      setMessageDraft("");
      setAttachmentsPending([]);
      setExtraRecipients([]);

      // Force re-render to ensure composer stays visible
      setTimeout(() => {
        const composer = document.querySelector('[data-composer="true"]') as HTMLElement;
        if (composer) {
          composer.style.display = "block";
          composer.style.visibility = "visible";
        }
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  };

  const onFilePick = (files: FileList | null) => {
    if (!files || !files.length) return;
    setAttachmentsPending((prev) => [...prev, ...Array.from(files)]);
  };
  const removePending = (name: string) =>
    setAttachmentsPending((prev) => prev.filter((f) => f.name !== name));

  const createContact = (c: Contact, firstMessage?: string) => {
    setContacts((prev) => [c, ...prev]);
    setConversations((prev) => [
      ...prev,
      {
        id: `c-${c.id}`,
        contactId: c.id,
        messages: firstMessage
          ? [
              {
                id: Math.random().toString(36).slice(2),
                senderId: c.id,
                text: firstMessage,
                createdAt: Date.now(),
                status: "delivered",
              },
            ]
          : [],
      },
    ]);
    setActiveContactId(c.id);
    setTab("chat");
    setExtraRecipients([]);
  };

  // Options for dropdown: all except active
  const recipientOptions = contacts
    .filter((c) => c.id !== activeContactId)
    .map((c) => ({
      id: c.id,
      label: `${c.name}${c.title ? ` — ${c.title}` : ""}`,
    }));

  // ------------- CALLS: helpers -------------
  const startCall = (
    type: CallType,
    fromCid: string,
    toCid: string,
    direction: CallDirection = "outgoing"
  ) => {
    // End existing calls for both parties if any
    const endExisting = (cid?: string) => {
      if (!cid) return;
      setCalls((prev) => {
        const copy = { ...prev };
        if (copy[cid] && copy[cid]!.status !== "ended")
          copy[cid] = { ...copy[cid]!, status: "ended", endedAt: Date.now() };
        return copy;
      });
    };

    endExisting(fromCid);
    endExisting(toCid);

    const callId = Math.random().toString(36).slice(2);
    const startedAt = Date.now();

    // Create mirrored calls
    setCalls((prev) => ({
      ...prev,
      [fromCid]: {
        id: callId,
        withContactId: toCid,
        type,
        status: direction === "outgoing" ? "dialing" : "ringing",
        direction: "outgoing",
        startedAt,
        micMuted: false,
        camOff: false,
        docked: true,
      },
      [toCid]: {
        id: callId,
        withContactId: fromCid,
        type,
        status: "ringing",
        direction: "incoming",
        startedAt,
        micMuted: false,
        camOff: false,
        docked: true,
      },
    }));

    // Simulate network: after 1.2s, outgoing switches to 'ringing'
    setTimeout(() => {
      setCalls((prev) => {
        const me = prev[fromCid];
        if (!me || me.id !== callId || me.status !== "dialing") return prev;
        return { ...prev, [fromCid]: { ...me, status: "ringing" } };
      });
    }, 1200);
  };

  const answerCall = (cid: string) => {
    const peer = getPeerId(cid);
    if (!peer) return;
    const acceptedAt = Date.now();

    // start ticker
    if (callTimerRef.current) window.clearInterval(callTimerRef.current);
    setCallTicker(0);
    callTimerRef.current = window.setInterval(
      () => setCallTicker((t) => t + 1),
      1000
    ) as unknown as number;

    setCalls((prev) => {
      const mine = prev[cid];
      const theirs = prev[peer];
      if (!mine || !theirs) return prev;
      return {
        ...prev,
        [cid]: { ...mine, status: "connected", acceptedAt },
        [peer]: { ...theirs, status: "connected", acceptedAt },
      };
    });
  };

  const endCall = (cid: string) => {
    const peer = getPeerId(cid);
    if (callTimerRef.current) {
      window.clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    setCalls((prev) => {
      const mine = prev[cid];
      const theirs = peer ? prev[peer] : undefined;
      const endedAt = Date.now();
      const acceptedAt = mine?.acceptedAt || theirs?.acceptedAt;
      const durSec = acceptedAt
        ? Math.max(0, Math.floor((endedAt - acceptedAt) / 1000))
        : 0;
      const dur = `${pad2(Math.floor(durSec / 60))}:${pad2(durSec % 60)}`;

      // call logs
      const label = (mine?.type || "audio") === "video" ? "Video" : "Audio";
      const whoName =
        contacts.find((c) => c.id === (peer || ""))?.name || "Unknown";
      if (peer) {
        appendMessage(cid, {
          id: Math.random().toString(36).slice(2),
          senderId: "me",
          text: `📞 ${label} call ended (${dur})`,
          createdAt: endedAt,
          status: "sent",
        });
        appendMessage(peer, {
          id: Math.random().toString(36).slice(2),
          senderId: peer,
          text: `📞 Missed ${label} call from ${whoName}`,
          createdAt: endedAt,
          status: "sent",
        });
      }

      const copy = { ...prev };
      if (mine) copy[cid] = { ...mine, status: "ended", endedAt };
      if (peer && theirs) copy[peer] = { ...theirs, status: "ended", endedAt };
      return copy;
    });

    // auto-clear
    setTimeout(
      () =>
        setCalls((prev) => {
          const copy = { ...prev };
          delete copy[cid];
          const p = peer;
          if (p) delete copy[p];
          return copy;
        }),
      400
    );
  };

  const toggleMute = (cid: string) =>
    setCalls((prev) => {
      const me = prev[cid];
      if (!me) return prev;
      return { ...prev, [cid]: { ...me, micMuted: !me.micMuted } };
    });

  const toggleCam = (cid: string) =>
    setCalls((prev) => {
      const me = prev[cid];
      if (!me) return prev;
      return { ...prev, [cid]: { ...me, camOff: !me.camOff } };
    });

  const dockToSide = (cid: string) =>
    setCalls((prev) => {
      const me = prev[cid];
      if (!me) return prev;
      return { ...prev, [cid]: { ...me, docked: true } };
    });
  const undockToModal = (cid: string) =>
    setCalls((prev) => {
      const me = prev[cid];
      if (!me) return prev;
      return { ...prev, [cid]: { ...me, docked: false } };
    });
  const formatTicker = (s: number) =>
    `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;

  // ---------- Render ----------
  const myCall = calls[activeContactId] || null;
  const callContact = myCall
    ? contacts.find((c) => c.id === myCall.withContactId)
    : null;

  return (
    <div className="min-h-screen bg-gray-100">
      <style jsx>{`
        .messages-container::-webkit-scrollbar {
          width: 6px;
        }
        .messages-container::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }
        .messages-container::-webkit-scrollbar-thumb {
          background: #891f1a;
          border-radius: 3px;
        }
        .messages-container::-webkit-scrollbar-thumb:hover {
          background: #6c1714;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
        <DashboardNavbar />
        <br />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#891F1A]">
              Team Communication
            </h1>
            <p className="text-gray-600">
              Chat with team members, share files, and manage conversations
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-4 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  {contacts.filter((c) => c.online).length} online
                </span>
              </div>
              <div className="w-px h-6 bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {contacts.filter((c) => !c.online).length} offline
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* ONGOING CALL STICKY BANNER (when connected) */}
        {myCall && myCall.status === "connected" && callContact && (
          <div className="sticky top-0 z-[1200]">
            <div className="mx-auto mb-2 max-w-5xl flex items-center gap-3 rounded-xl border bg-emerald-50 px-3 py-2 shadow">
              <div className="text-xs text-emerald-800">
                On call with{" "}
                <span className="font-semibold">{callContact.name}</span> •{" "}
                {formatTicker(callTicker)}
              </div>
              <button
                className="ml-auto px-3 py-1.5 rounded-lg border text-sm"
                onClick={() => dockToSide(activeContactId)}
                title="Return to call panel"
              >
                Return
              </button>
              <button
                className="px-3 py-1.5 rounded-lg text-white text-sm bg-rose-600"
                onClick={() => endCall(activeContactId)}
              >
                End
              </button>
            </div>
          </div>
        )}

        {/* INCOMING CALL BANNER */}
        {myCall &&
          myCall.direction === "incoming" &&
          myCall.status === "ringing" &&
          callContact && (
            <div className="sticky top-0 z-[1100]">
              <div className="mx-auto mb-2 max-w-5xl flex items-center gap-3 rounded-xl border bg-white px-3 py-2 shadow">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                  {callContact.avatar ? (
                    <img
                      src={callContact.avatar}
                      alt={callContact.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (nextElement) {
                          nextElement.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full bg-gray-200 flex items-center justify-center text-[#891F1A] font-semibold text-xs"
                    style={{ display: callContact.avatar ? "none" : "flex" }}
                  >
                    {callContact.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    {callContact.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {myCall.type === "video"
                      ? "Incoming video call…"
                      : "Incoming audio call…"}
                  </div>
                </div>
                <button
                  className="px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: THEME.maroon }}
                  onClick={() => answerCall(activeContactId)}
                >
                  Answer
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg border"
                  onClick={() => endCall(activeContactId)}
                >
                  Decline
                </button>
              </div>
            </div>
          )}

        {/* Tab Navigation */}
        <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="flex">
            <button
              type="button"
              onClick={() => setTab("contacts")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-all duration-200 ${
                tab === "contacts"
                  ? "bg-[#891F1A] text-white shadow-md"
                  : "text-gray-600 hover:text-[#891F1A]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Users size={16} />
                <span>Contacts</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("chat")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-all duration-200 ${
                tab === "chat"
                  ? "bg-[#891F1A] text-white shadow-md"
                  : "text-gray-600 hover:text-[#891F1A]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <MessageCircle size={16} />
                <span>Chat</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("settings")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-all duration-200 ${
                tab === "settings"
                  ? "bg-[#891F1A] text-white shadow-md"
                  : "text-gray-600 hover:text-[#891F1A]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Settings size={16} />
                <span>Settings</span>
              </span>
            </button>
          </div>
        </div>

        {/* Main Chat Container */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[calc(100vh-14rem)] min-h-[600px]">
          <div className="grid grid-cols-12 gap-0 h-full">
            {/* Contacts */}
            <aside
              className={`col-span-12 ${
                tab === "contacts" ? "" : "hidden"
              } bg-gradient-to-b from-white to-gray-50 flex flex-col h-full`}
            >
              <div className="p-8 bg-gradient-to-br from-[#891F1A] via-[#6c1714] to-[#4a1010] relative overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                <div className="relative flex items-center gap-6 text-white">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-white/20 bg-white flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
                    <img
                      src="/logo.png"
                      alt="Admin"
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (nextElement) {
                          nextElement.style.display = "flex";
                        }
                      }}
                    />
                    <div
                      className="w-12 h-12 bg-[#891F1A] rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
                      style={{ display: "none" }}
                    >
                      A
                    </div>
                  </div>
                  <div className="flex-1 leading-tight">
                    <div className="font-bold text-2xl">Admin User</div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="relative">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-30"></div>
                      </div>
                      <div className="text-white/90 text-base font-semibold">
                        Online
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="bg-white/20 hover:bg-white/30 rounded-2xl p-4 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                      type="button"
                      onClick={() => setAddOpen(true)}
                      title="Add Contact"
                    >
                      <UserPlus size={24} />
                    </button>
                    <button
                      className="bg-white/20 hover:bg-white/30 rounded-2xl p-4 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                      type="button"
                      title="Settings"
                    >
                      <Settings size={24} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-b border-gray-200 bg-white flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#891F1A] focus:border-[#891F1A] transition-all duration-200"
                      placeholder="Search contacts or channels..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <button
                    className="bg-[#891F1A] hover:bg-[#6c1714] text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2"
                    type="button"
                    onClick={() => setAddOpen(true)}
                  >
                    <UserPlus size={16} />
                    New Contact
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto pr-2 flex-1 min-h-0 bg-white">
                {filteredContacts.map((c) => (
                  <ContactItem
                    key={c.id}
                    contact={c}
                    active={c.id === activeContactId}
                    onClick={() => {
                      setActiveContactId(c.id);
                      setTab("chat");
                    }}
                  />
                ))}
              </div>
            </aside>

            {/* Chat */}
            <main
              className={`col-span-12 ${
                tab === "chat" ? "flex" : "hidden"
              } bg-white flex-col h-full`}
            >
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-4 flex-shrink-0 w-full">
                <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center ring-4 ring-gray-200 shadow-lg">
                  {activeContact.avatar ? (
                    <img
                      src={activeContact.avatar}
                      alt={activeContact.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (nextElement) {
                          nextElement.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full bg-[#891F1A] flex items-center justify-center text-white font-bold text-lg"
                    style={{ display: activeContact.avatar ? "none" : "flex" }}
                  >
                    {activeContact.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-2xl text-gray-900 truncate">
                    {activeContact.name}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="relative">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          activeContact.online
                            ? "bg-green-500 animate-pulse"
                            : "bg-gray-400"
                        }`}
                      ></div>
                      {activeContact.online && (
                        <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-30"></div>
                      )}
                    </div>
                    <div className="text-base font-semibold text-gray-700">
                      {activeContact.online
                        ? "Online now"
                        : "Last seen recently"}
                    </div>
                  </div>
                </div>

                {/* Call buttons: call current contact */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    className="p-3 rounded-xl hover:bg-green-50 text-green-600 hover:text-green-700 transition-all duration-200 border border-green-200 hover:border-green-300 shadow-sm hover:shadow-md"
                    type="button"
                    title="Audio call"
                    onClick={() =>
                      startCall(
                        "audio",
                        activeContactId,
                        activeContactId,
                        "outgoing"
                      )
                    }
                  >
                    <Phone size={20} />
                  </button>
                  <button
                    className="p-3 rounded-xl hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-all duration-200 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md"
                    type="button"
                    title="Video call"
                    onClick={() =>
                      startCall(
                        "video",
                        activeContactId,
                        activeContactId,
                        "outgoing"
                      )
                    }
                  >
                    <Video size={20} />
                  </button>
                  <div className="relative">
                    <details className="group">
                      <summary
                        className="list-none p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                        title="Call someone else"
                      >
                        <ChevronDown size={16} className="text-gray-600" />
                      </summary>
                      <div className="absolute right-0 z-[1500] mt-1 w-48 max-h-60 overflow-auto bg-white border rounded-xl shadow-xl">
                        <div className="px-3 py-2 text-xs text-gray-500 font-medium">
                          Call someone else
                        </div>
                        {contacts
                          .filter((c) => c.id !== activeContactId)
                          .map((c) => (
                            <div
                              key={c.id}
                              className="px-3 py-2 border-t hover:bg-gray-50"
                            >
                              <div className="text-sm mb-1 font-medium">
                                {c.name}
                                {c.title ? ` — ${c.title}` : ""}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-100 transition-colors"
                                  onClick={() =>
                                    startCall(
                                      "audio",
                                      activeContactId,
                                      c.id,
                                      "outgoing"
                                    )
                                  }
                                  type="button"
                                >
                                  Audio
                                </button>
                                <button
                                  className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-100 transition-colors"
                                  onClick={() =>
                                    startCall(
                                      "video",
                                      activeContactId,
                                      c.id,
                                      "outgoing"
                                    )
                                  }
                                  type="button"
                                >
                                  Video
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </details>
                  </div>
                </div>
              </div>

              {/* Pinned */}
              {activeConversation?.pinnedMessageId && (
                <div className="px-6 py-3 bg-amber-50 text-amber-800 text-sm flex items-center gap-2 border-b">
                  <Info size={16} />
                  <span className="truncate">
                    Pinned:{" "}
                    {
                      activeConversation.messages.find(
                        (m) => m.id === activeConversation.pinnedMessageId
                      )?.text
                    }
                  </span>
                  <button
                    className="ml-auto text-amber-700/80 hover:text-amber-900 p-1 rounded-full hover:bg-amber-100 transition-colors"
                    type="button"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              )}

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className={`flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0 bg-gray-50 relative messages-container w-full ${
                  !showScrollbar ? "scrollbar-hide" : ""
                }`}
                style={{
                  scrollbarWidth: showScrollbar ? "auto" : "none",
                  scrollbarColor: showScrollbar
                    ? "#891F1A #f3f4f6"
                    : "transparent",
                  minHeight: "200px",
                  maxHeight: "calc(100vh - 300px)",
                }}
              >
                {activeConversation &&
                  Object.entries(
                    activeConversation.messages.reduce<
                      Record<string, Message[]>
                    >((acc, m) => {
                      const d = dayDivider(m.createdAt);
                      acc[d] = acc[d] || [];
                      acc[d].push(m);
                      return acc;
                    }, {})
                  ).map(([day, msgs]) => (
                    <div key={day}>
                      <div className="flex items-center justify-center my-6">
                        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            {day}
                          </span>
                        </div>
                      </div>
                      {msgs.map((m) => {
                        if (m.hiddenForMe) return null; // deleted for me
                        const mine = m.senderId === "me";
                        const tomb = m.deletedForEveryone;

                        return (
                          <div
                            key={m.id}
                            className={`group relative flex items-end gap-3 mb-4 ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            {!mine && (
                              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ring-2 ring-white shadow-sm">
                                {activeContact.avatar ? (
                                  <img
                                    src={activeContact.avatar}
                                    alt={activeContact.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (nextElement) {
                                        nextElement.style.display = "flex";
                                      }
                                    }}
                                  />
                                ) : null}
                                <div
                                  className="w-full h-full bg-[#891F1A] flex items-center justify-center text-white font-bold text-xs"
                                  style={{
                                    display: activeContact.avatar
                                      ? "none"
                                      : "flex",
                                  }}
                                >
                                  {activeContact.name.charAt(0).toUpperCase()}
                                </div>
                              </div>
                            )}

                            {/* Bubble (with mobile-friendly menu trigger) */}
                            <div
                              className={`relative max-w-[85%] rounded-3xl px-6 py-4 shadow-lg border-2 ${
                                mine
                                  ? "bg-[#891F1A] text-white"
                                  : "bg-white text-gray-800 border-gray-200"
                              }`}
                              style={{
                                borderColor: mine
                                  ? "rgba(255, 255, 255, 0.2)"
                                  : "rgba(137, 31, 26, 0.1)",
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setMenuForMsgId(m.id);
                              }}
                              onClick={() => {
                                if (menuForMsgId === m.id)
                                  setMenuForMsgId(null);
                              }}
                            >
                              {!tomb && (
                                <button
                                  className={`absolute -top-1 ${
                                    mine ? "left-2" : "right-2"
                                  } p-1.5 rounded-full hover:bg-black/10 focus:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuForMsgId(
                                      menuForMsgId === m.id ? null : m.id
                                    );
                                  }}
                                  title="Options"
                                  type="button"
                                  aria-label="Message options"
                                >
                                  <Ellipsis size={16} />
                                </button>
                              )}

                              {/* Deleted-for-everyone tombstone */}
                              {tomb ? (
                                <div
                                  className={`text-xs italic ${
                                    mine ? "text-white/90" : "text-gray-600"
                                  }`}
                                >
                                  This message was deleted
                                </div>
                              ) : (
                                <>
                                  {m.text && (
                                    <div
                                      className={`whitespace-pre-wrap text-sm leading-relaxed ${
                                        mine ? "text-white" : "text-gray-800"
                                      }`}
                                    >
                                      {m.text}
                                    </div>
                                  )}
                                  {m.attachments &&
                                    m.attachments.length > 0 && (
                                      <div className="mt-2 space-y-2">
                                        {m.attachments.map((a) => (
                                          <div
                                            key={a.id}
                                            className={`border rounded-lg ${
                                              mine
                                                ? "border-white/30"
                                                : "border-gray-200"
                                            } overflow-hidden`}
                                          >
                                            {a.isAudio ? (
                                              <div
                                                className={`px-3 py-2 ${
                                                  mine
                                                    ? "bg-white/10"
                                                    : "bg-gray-50"
                                                }`}
                                              >
                                                <div className="text-xs mb-1 flex items-center justify-between">
                                                  <span
                                                    className={`truncate ${
                                                      mine
                                                        ? "text-white"
                                                        : "text-gray-800"
                                                    }`}
                                                  >
                                                    {a.name} • {fmtSize(a.size)}
                                                  </span>
                                                  <a
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                                      mine
                                                        ? "bg-white/20 hover:bg-white/30 text-white"
                                                        : "bg-white hover:bg-gray-100 text-gray-800"
                                                    } border`}
                                                    href={a.url}
                                                    download={a.name}
                                                    rel="noopener"
                                                  >
                                                    <Download size={12} />{" "}
                                                    Download
                                                  </a>
                                                </div>
                                                <audio
                                                  controls
                                                  src={a.url}
                                                  className="w-full"
                                                />
                                              </div>
                                            ) : a.isImage ? (
                                              <div className="bg-gray-50">
                                                <img
                                                  src={a.url}
                                                  alt={a.name}
                                                  className="max-h-60 object-contain w-full bg-white"
                                                />
                                                <div
                                                  className={`flex items-center justify-between px-2 py-1 text-xs ${
                                                    mine
                                                      ? "text-white/90"
                                                      : "text-gray-700"
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 truncate">
                                                    <ImageIcon size={14} />
                                                    <span className="truncate">
                                                      {a.name}
                                                    </span>
                                                    <span className="opacity-70">
                                                      • {fmtSize(a.size)}
                                                    </span>
                                                  </div>
                                                  <a
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                                                      mine
                                                        ? "bg-white/20 hover:bg-white/30"
                                                        : "bg-gray-100 hover:bg-gray-200"
                                                    }`}
                                                    href={a.url}
                                                    download={a.name}
                                                    rel="noopener"
                                                  >
                                                    <Download size={12} />{" "}
                                                    Download
                                                  </a>
                                                </div>
                                              </div>
                                            ) : (
                                              <div
                                                className={`flex items-center justify-between px-3 py-2 ${
                                                  mine
                                                    ? "bg-white/10"
                                                    : "bg-gray-50"
                                                }`}
                                              >
                                                <div className="flex items-center gap-2 text-xs truncate">
                                                  <Paperclip size={14} />
                                                  <span className="truncate font-medium">
                                                    {a.name}
                                                  </span>
                                                  <span className="opacity-70">
                                                    ({fmtSize(a.size)})
                                                  </span>
                                                </div>
                                                <a
                                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                                    mine
                                                      ? "bg-white/20 hover:bg-white/30 text-white"
                                                      : "bg-white hover:bg-gray-100 text-gray-800"
                                                  } border`}
                                                  href={a.url}
                                                  download={a.name}
                                                  rel="noopener"
                                                >
                                                  <Download size={12} />{" "}
                                                  Download
                                                </a>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                </>
                              )}

                              <div
                                className={`mt-2 text-xs flex items-center gap-1 ${
                                  mine ? "text-white" : "text-gray-400"
                                }`}
                              >
                                <span className="font-medium">
                                  {formatTime(m.createdAt)}
                                </span>
                                {mine && (
                                  <div className="flex items-center">
                                    {m.status === "read" ? (
                                      <CheckCheck
                                        size={14}
                                        className="text-blue-400"
                                      />
                                    ) : m.status === "delivered" ? (
                                      <CheckCheck
                                        size={14}
                                        className="text-white/60"
                                      />
                                    ) : (
                                      <Check
                                        size={14}
                                        className="text-white/60"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Message menu */}
                              {menuForMsgId === m.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-[2000]"
                                    onClick={() => setMenuForMsgId(null)}
                                  />
                                  <div
                                    className="absolute z-[2001] bg-white border rounded-xl shadow-xl p-1 w-44"
                                    style={
                                      {
                                        [m.senderId === "me"
                                          ? "left"
                                          : "right"]: "0.5rem",
                                        top: "-0.25rem",
                                      } as React.CSSProperties
                                    }
                                  >
                                    <button
                                      className="w-full text-left text-sm text-gray-800 px-2 py-2 rounded hover:bg-gray-50"
                                      onClick={() => {
                                        deleteForMe(activeContactId, m.id);
                                        setMenuForMsgId(null);
                                      }}
                                      type="button"
                                    >
                                      Delete for me
                                    </button>
                                    <button
                                      className="w-full text-left text-sm text-gray-800 px-2 py-2 rounded hover:bg-gray-50"
                                      onClick={() => {
                                        if (
                                          confirm(
                                            "Delete this message for everyone?"
                                          )
                                        ) {
                                          deleteForEveryone(
                                            activeContactId,
                                            m.id
                                          );
                                        }
                                        setMenuForMsgId(null);
                                      }}
                                      type="button"
                                    >
                                      Delete for everyone
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                <div ref={messagesEndRef} />

                {/* Scroll to bottom button */}
                {hasScrolledUp && !isAtBottom && (
                  <div className="fixed bottom-32 right-8 z-50">
                    <button
                      onClick={scrollToBottom}
                      className="bg-[#891F1A] hover:bg-[#6c1714] text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 animate-bounce"
                      title="Scroll to bottom"
                    >
                      <ChevronDown size={20} />
                      <span className="text-sm font-medium">New messages</span>
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </button>
                  </div>
                )}

                {/* Scroll to top button */}
                {scrollPosition > 200 && (
                  <div className="fixed top-40 right-8 z-50">
                    <button
                      onClick={scrollToTop}
                      className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                      title="Scroll to top"
                    >
                      <ChevronUp size={20} />
                      <span className="text-sm font-medium">
                        Older messages
                      </span>
                    </button>
                  </div>
                )}

                {/* Scroll position indicator - integrated in chat container */}
                <div className="absolute top-2 right-2 z-10">
                  <div className="bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg p-2 shadow-md">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-600 font-medium">
                        Scroll
                      </div>
                      <button
                        onClick={() => setShowScrollbar(!showScrollbar)}
                        className="text-xs text-[#891F1A] hover:text-[#6c1714] transition-colors"
                        title={
                          showScrollbar ? "Hide scrollbar" : "Show scrollbar"
                        }
                      >
                        {showScrollbar ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#891F1A] transition-all duration-300 rounded-full shadow-sm"
                        style={{
                          width: `${Math.min(
                            100,
                            (scrollPosition /
                              (messagesContainerRef.current?.scrollHeight ||
                                1)) *
                              100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Scroll hint when there are more messages */}
                {scrollPosition > 50 && (
                  <div className="absolute top-2 left-2 z-10">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 shadow-sm">
                      <div className="text-xs text-blue-700 font-medium">
                        ↑ Older messages above
                      </div>
                    </div>
                  </div>
                )}

                {!isAtBottom && activeConversation?.messages.length > 10 && (
                  <div className="absolute bottom-2 left-2 z-10">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 shadow-sm">
                      <div className="text-xs text-green-700 font-medium">
                        ↓ New messages below
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pending attachments & recording */}
              {(attachmentsPending.length > 0 || isRecording) && (
                <div className="px-6 pt-4 bg-white border-t shadow-sm">
                  {isRecording && (
                    <div className="mb-4 flex items-center justify-between rounded-xl px-4 py-3 border-2 border-rose-200 bg-rose-50 text-rose-800 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse"></div>
                        <div className="text-sm font-semibold">
                          Recording… {pad2(Math.floor(elapsed / 60))}:
                          {pad2(elapsed % 60)}
                        </div>
                      </div>
                      <button
                        className="text-sm px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors font-medium shadow-sm"
                        type="button"
                        onClick={stopRecording}
                        title="Stop"
                      >
                        Stop
                      </button>
                    </div>
                  )}

                  {attachmentsPending.length > 0 && (
                    <div className="flex gap-3 flex-wrap max-h-32 overflow-auto">
                      {attachmentsPending.map((f) => (
                        <div
                          key={f.name + f.size}
                          className="flex items-center gap-2 text-xs bg-gray-100 rounded-xl px-3 py-2 border border-gray-200 shadow-sm"
                        >
                          <div className="flex items-center gap-2">
                            {f.type.startsWith("image/") ? (
                              <ImageIcon size={16} className="text-blue-600" />
                            ) : f.type.startsWith("audio/") ? (
                              <Mic size={16} className="text-green-600" />
                            ) : (
                              <Paperclip size={16} className="text-gray-600" />
                            )}
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800 max-w-[180px] truncate">
                                {f.name}
                              </span>
                              <span className="text-gray-500 text-[10px]">
                                {fmtSize(f.size)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => removePending(f.name)}
                            className="hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                            type="button"
                            title="Remove"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Composer - Always Visible */}
              <div
                data-composer="true"
                className="px-6 py-4 bg-white border-t border-gray-200 flex-shrink-0 w-full relative z-10"
                style={{
                  display: "block",
                  visibility: "visible",
                  minHeight: "80px",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-gray-700">
                      Sending to:
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ring-2 ring-[#891F1A]">
                        {activeContact.avatar ? (
                          <img
                            src={activeContact.avatar}
                            alt={activeContact.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                              if (nextElement) {
                                nextElement.style.display = "flex";
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className="w-full h-full bg-[#891F1A] flex items-center justify-center text-white font-bold text-xs"
                          style={{
                            display: activeContact.avatar ? "none" : "flex",
                          }}
                        >
                          {activeContact.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#891F1A] text-white text-sm font-semibold">
                        {activeContact.name}
                        {activeContact.title && (
                          <span className="text-xs opacity-90">
                            — {activeContact.title}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <MultiSelect
                    options={recipientOptions}
                    values={extraRecipients}
                    onChange={setExtraRecipients}
                    label="Also send to"
                  />
                </div>

                <div className="flex items-end gap-4 w-full">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label
                      className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-all duration-200 cursor-pointer border border-blue-200 hover:border-blue-400"
                      title="Attach files"
                    >
                      <Paperclip size={18} />
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        onChange={(e) => onFilePick(e.target.files)}
                      />
                    </label>
                    {!isRecording ? (
                      <button
                        className="p-2 rounded-lg hover:bg-green-50 text-green-600 hover:text-green-700 transition-all duration-200 border border-green-200 hover:border-green-400"
                        type="button"
                        title="Record voice"
                        onClick={startRecording}
                      >
                        <Mic size={18} />
                      </button>
                    ) : (
                      <button
                        className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all duration-200 border border-red-500 animate-pulse"
                        type="button"
                        title="Stop recording"
                        onClick={stopRecording}
                      >
                        <Mic size={18} />
                      </button>
                    )}
                    <button
                      className="p-2 rounded-lg hover:bg-yellow-50 text-yellow-600 hover:text-yellow-700 transition-all duration-200 border border-yellow-200 hover:border-yellow-400"
                      type="button"
                      title="Emoji"
                    >
                      <Smile size={18} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="relative w-full">
                      <textarea
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#891F1A] focus:border-[#891F1A] resize-none transition-all duration-200 min-h-[40px] max-h-[100px]"
                        rows={1}
                        placeholder={
                          extraRecipients.length === 0
                            ? `Message ${activeContact.name}…`
                            : `Message ${activeContact.name} + ${extraRecipients.length} more…`
                        }
                        value={messageDraft}
                        onChange={(e) => {
                          setMessageDraft(e.target.value);
                          // Auto-resize textarea
                          e.target.style.height = "auto";
                          e.target.style.height =
                            Math.min(e.target.scrollHeight, 100) + "px";
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                      <div className="absolute bottom-2 right-3 text-xs text-gray-500 pointer-events-none">
                        {messageDraft.length}/1000
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSend}
                    className="px-4 py-2 rounded-lg bg-[#891F1A] hover:bg-[#6c1714] text-white flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    type="button"
                    title="Send"
                    disabled={
                      !messageDraft.trim() && attachmentsPending.length === 0
                    }
                  >
                    <Send size={16} />
                    <span>Send</span>
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 rounded-md border border-gray-300 bg-gray-100 font-mono">
                        Enter
                      </kbd>
                      <span>to send</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 rounded-md border border-gray-300 bg-gray-100 font-mono">
                        Shift
                      </kbd>
                      <span>+</span>
                      <kbd className="px-2 py-1 rounded-md border border-gray-300 bg-gray-100 font-mono">
                        Enter
                      </kbd>
                      <span>for new line</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 rounded-md border border-gray-300 bg-gray-100 font-mono">
                        Ctrl
                      </kbd>
                      <span>+</span>
                      <kbd className="px-2 py-1 rounded-md border border-gray-300 bg-gray-100 font-mono">
                        ↑
                      </kbd>
                      <span>scroll to top</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 rounded-md border border-gray-300 bg-gray-100 font-mono">
                        Ctrl
                      </kbd>
                      <span>+</span>
                      <kbd className="px-2 py-1 rounded-md border border-gray-300 bg-gray-100 font-mono">
                        ↓
                      </kbd>
                      <span>scroll to bottom</span>
                    </div>
                  </div>
                </div>
              </div>
            </main>

            {/* Settings */}
            <aside
              className={`col-span-12 ${
                tab === "settings" ? "" : "hidden"
              } bg-white flex flex-col h-full`}
            >
              <div className="p-6 bg-gradient-to-r from-[#891F1A] to-[#6c1714] relative overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>
                <div className="relative flex items-center gap-4 text-white">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Settings size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-xl">Settings</div>
                    <div className="text-white/80 text-sm font-medium">
                      Customize your chat experience
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0 scroll-smooth bg-gray-50">
                <section className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Bell size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-bold text-lg text-gray-900">
                        Notifications
                      </div>
                      <div className="text-sm text-gray-500">
                        Manage your notification preferences
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm font-semibold text-gray-800">
                          Enable notifications
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          Desktop push, mention alerts, sound
                        </div>
                      </div>
                      <Toggle
                        checked={notifyEnabled}
                        onChange={setNotifyEnabled}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Moon size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="font-bold text-lg text-gray-900">
                        Appearance
                      </div>
                      <div className="text-sm text-gray-500">
                        Customize the visual appearance
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm font-semibold text-gray-800">
                          Use dark bubbles for me
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          Your messages use a darker shade vs. maroon
                        </div>
                      </div>
                      <Toggle checked={darkBubbles} onChange={setDarkBubbles} />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <Shield size={20} className="text-green-600" />
                    </div>
                    <div>
                      <div className="font-bold text-lg text-gray-900">
                        Privacy
                      </div>
                      <div className="text-sm text-gray-500">
                        Control your privacy settings
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-sm font-semibold text-gray-800">
                          Read receipts
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          Show double-check when messages are read
                        </div>
                      </div>
                      <Toggle
                        checked={readReceipts}
                        onChange={setReadReceipts}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <Trash2 size={20} className="text-red-600" />
                    </div>
                    <div>
                      <div className="font-bold text-lg text-gray-900">
                        Chat Management
                      </div>
                      <div className="text-sm text-gray-500">
                        Manage your chat data and history
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        className="text-sm border border-gray-300 rounded-lg px-4 py-3 hover:bg-red-50 hover:border-red-300 shadow-sm transition-all duration-200 font-semibold text-gray-700 hover:text-red-700"
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to clear the current chat?"
                            )
                          ) {
                            setConversations((prev) =>
                              prev.map((c) =>
                                c.contactId === activeContactId
                                  ? { ...c, messages: [] }
                                  : c
                              )
                            );
                          }
                        }}
                      >
                        <Trash2 size={16} className="inline mr-2" />
                        Clear current chat
                      </button>
                      <button
                        className="text-sm border border-gray-300 rounded-lg px-4 py-3 hover:bg-blue-50 hover:border-blue-300 shadow-sm transition-all duration-200 font-semibold text-gray-700 hover:text-blue-700"
                        type="button"
                        onClick={() => {
                          const conv = conversations.find(
                            (c) => c.contactId === activeContactId
                          );
                          const dataStr =
                            "data:text/json;charset=utf-8," +
                            encodeURIComponent(
                              JSON.stringify(conv ?? {}, null, 2)
                            );
                          const a = document.createElement("a");
                          a.href = dataStr;
                          a.download = `chat-${activeContact.name}.json`;
                          a.click();
                        }}
                      >
                        <Download size={16} className="inline mr-2" />
                        Export chat (.json)
                      </button>
                    </div>

                    {/* DEV helper: simulate incoming call on current chat */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Development Tools
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                          className="text-sm border border-gray-300 rounded-lg px-4 py-3 hover:bg-green-50 hover:border-green-300 shadow-sm transition-all duration-200 font-semibold text-gray-700 hover:text-green-700"
                          type="button"
                          onClick={() => {
                            // Simulate peer = some other contact (first different)
                            const peer = contacts.find(
                              (c) => c.id !== activeContactId
                            )?.id;
                            if (!peer) return;
                            startCall(
                              "audio",
                              peer,
                              activeContactId,
                              "outgoing"
                            ); // peer -> me
                          }}
                        >
                          <Phone size={16} className="inline mr-2" />
                          Simulate Incoming Audio
                        </button>
                        <button
                          className="text-sm border border-gray-300 rounded-lg px-4 py-3 hover:bg-blue-50 hover:border-blue-300 shadow-sm transition-all duration-200 font-semibold text-gray-700 hover:text-blue-700"
                          type="button"
                          onClick={() => {
                            const peer = contacts.find(
                              (c) => c.id !== activeContactId
                            )?.id;
                            if (!peer) return;
                            startCall(
                              "video",
                              peer,
                              activeContactId,
                              "outgoing"
                            );
                          }}
                        >
                          <Video size={16} className="inline mr-2" />
                          Simulate Incoming Video
                        </button>
                      </div>
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-xs text-yellow-800 font-medium">
                          ℹ️ Development Note: Real calling requires WebRTC
                          implementation; UI is ready.
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </div>

        {/* ======== DOCKED CALL PANEL (right side) ======== */}
        {myCall &&
          myCall.status !== "ended" &&
          myCall.docked &&
          callContact && (
            <div className="fixed right-3 bottom-3 z-[1300] w-[320px] rounded-2xl overflow-hidden bg-white shadow-2xl border">
              {/* Header */}
              <div
                className="px-3 py-2 border-b flex items-center gap-2"
                style={{ backgroundColor: THEME.maroon }}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/40 flex items-center justify-center">
                  {callContact.avatar ? (
                    <img
                      src={callContact.avatar}
                      alt={callContact.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (nextElement) {
                          nextElement.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full bg-white flex items-center justify-center text-[#891F1A] font-semibold text-xs"
                    style={{ display: callContact.avatar ? "none" : "flex" }}
                  >
                    {callContact.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="text-white text-sm leading-tight">
                  <div className="font-semibold">{callContact.name}</div>
                  <div className="text-[11px] text-white/80">
                    {myCall.status === "dialing" && "Calling…"}
                    {myCall.status === "ringing" && "Ringing…"}
                    {myCall.status === "connected" &&
                      `Connected • ${formatTicker(callTicker)}`}
                  </div>
                </div>
                <button
                  className="ml-auto bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition"
                  onClick={() => undockToModal(activeContactId)}
                  title="Open full"
                >
                  <MoreVertical size={14} className="text-white" />
                </button>
              </div>

              {/* Body */}
              {myCall.type === "video" ? (
                <div className="bg-black h-48 relative">
                  <div className="absolute inset-0 grid place-items-center text-white/80 text-xs">
                    {myCall.status === "connected"
                      ? "Remote video (simulated)"
                      : "Waiting…"}
                  </div>
                  <div className="absolute bottom-2 right-2 w-20 h-28 bg-black/60 rounded-lg grid place-items-center text-white/80 text-[10px]">
                    {myCall.camOff ? "Camera off" : "You"}
                  </div>
                </div>
              ) : (
                <div className="h-28 bg-gray-50 grid place-items-center text-gray-600 text-sm">
                  {myCall.status === "connected" ? "On call…" : "Ringing…"}
                </div>
              )}

              {/* Controls */}
              <div className="p-2 border-t flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    className={`px-2.5 py-1.5 rounded-lg border text-xs ${
                      myCall.micMuted ? "bg-gray-100" : "bg-white"
                    }`}
                    onClick={() => toggleMute(activeContactId)}
                  >
                    {myCall.micMuted ? "Unmute" : "Mute"}
                  </button>
                  {myCall.type === "video" && (
                    <button
                      className={`px-2.5 py-1.5 rounded-lg border text-xs ${
                        myCall.camOff ? "bg-gray-100" : "bg-white"
                      }`}
                      onClick={() => toggleCam(activeContactId)}
                    >
                      {myCall.camOff ? "Cam On" : "Cam Off"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {myCall.status !== "connected" &&
                    myCall.direction === "outgoing" && (
                      <button
                        className="px-2.5 py-1.5 rounded-lg border text-xs"
                        onClick={() => answerCall(activeContactId)}
                      >
                        Simulate Answer
                      </button>
                    )}
                  {myCall.status === "ringing" &&
                    myCall.direction === "incoming" && (
                      <button
                        className="px-2.5 py-1.5 rounded-lg text-white text-xs"
                        style={{ backgroundColor: THEME.maroon }}
                        onClick={() => answerCall(activeContactId)}
                      >
                        Answer
                      </button>
                    )}
                  <button
                    className="px-2.5 py-1.5 rounded-lg text-white text-xs bg-rose-600"
                    onClick={() => endCall(activeContactId)}
                  >
                    End
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* ======== FULL CALL MODAL (optional) ======== */}
        {myCall &&
          myCall.status !== "ended" &&
          !myCall.docked &&
          callContact && (
            <div className="fixed inset-0 z-[1400] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative w-[92vw] max-w-md rounded-2xl overflow-hidden bg-white shadow-2xl">
                <div
                  className="px-4 py-3 border-b flex items-center gap-3"
                  style={{ backgroundColor: THEME.maroon }}
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/40 flex items-center justify-center">
                    {callContact.avatar ? (
                      <img
                        src={callContact.avatar}
                        alt={callContact.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                          if (nextElement) {
                            nextElement.style.display = "flex";
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full bg-white flex items-center justify-center text-[#891F1A] font-semibold text-sm"
                      style={{ display: callContact.avatar ? "none" : "flex" }}
                    >
                      {callContact.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="text-white">
                    <div className="font-semibold leading-tight">
                      {callContact.name}
                    </div>
                    <div className="text-xs text-white/80">
                      {myCall.status === "dialing" && "Calling…"}
                      {myCall.status === "ringing" && "Ringing…"}
                      {myCall.status === "connected" &&
                        `Connected • ${formatTicker(callTicker)}`}
                    </div>
                  </div>
                  <button
                    className="ml-auto bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
                    onClick={() => dockToSide(activeContactId)}
                    title="Dock"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>

                {myCall.type === "video" ? (
                  <div className="bg-black h-64 relative">
                    <div className="absolute inset-0 grid place-items-center text-white/80 text-sm">
                      {myCall.status === "connected"
                        ? "Remote video (simulated)"
                        : "Waiting for answer…"}
                    </div>
                    <div className="absolute bottom-3 right-3 w-28 h-40 bg-black/60 rounded-xl grid place-items-center text-white/80 text-xs">
                      {myCall.camOff ? "Camera off" : "You"}
                    </div>
                  </div>
                ) : (
                  <div className="h-40 bg-gray-50 grid place-items-center text-gray-600 text-sm">
                    {myCall.status === "connected" ? "On call…" : "Ringing…"}
                  </div>
                )}

                <div className="p-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        myCall.micMuted ? "bg-gray-100" : "bg-white"
                      }`}
                      onClick={() => toggleMute(activeContactId)}
                    >
                      {myCall.micMuted ? "Unmute" : "Mute"}
                    </button>
                    {myCall.type === "video" && (
                      <button
                        className={`px-3 py-2 rounded-lg border text-sm ${
                          myCall.camOff ? "bg-gray-100" : "bg-white"
                        }`}
                        onClick={() => toggleCam(activeContactId)}
                      >
                        {myCall.camOff ? "Camera On" : "Camera Off"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {myCall.status === "ringing" &&
                      myCall.direction === "incoming" && (
                        <button
                          className="px-3 py-2 rounded-lg text-white text-sm"
                          style={{ backgroundColor: THEME.maroon }}
                          onClick={() => answerCall(activeContactId)}
                        >
                          Answer
                        </button>
                      )}
                    {myCall.status !== "connected" &&
                      myCall.direction === "outgoing" && (
                        <button
                          className="px-3 py-2 rounded-lg border text-sm"
                          onClick={() => answerCall(activeContactId)}
                        >
                          Simulate Answer
                        </button>
                      )}
                    <button
                      className="px-3 py-2 rounded-lg text-white text-sm bg-rose-600"
                      onClick={() => endCall(activeContactId)}
                    >
                      End
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        <div className="mt-3 text-xs text-gray-600 flex items-center gap-2">
          <MessageCircle size={14} />
          Tip: Press{" "}
          <kbd className="px-1.5 py-0.5 rounded border bg-gray-50">
            Enter
          </kbd>{" "}
          to send,&nbsp;
          <kbd className="px-1.5 py-0.5 rounded border bg-gray-50">Shift</kbd>+
          <kbd className="px-1.5 py-0.5 rounded border bg-gray-50">Enter</kbd>{" "}
          for new line.
        </div>

        <AddContactModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreate={createContact}
        />
        <Toaster position="top-center" />
      </div>
    </div>
  );
}
