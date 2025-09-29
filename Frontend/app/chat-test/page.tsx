"use client";

import { EnhancedChatBot } from "@/app/components/EnhancedChatBot";

export default function ChatTestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            CRM Chat System Test
          </h1>
          
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Features</h2>
            <ul className="space-y-2 text-gray-700">
              <li>✅ Real-time WebSocket communication</li>
              <li>✅ HTTP fallback for reliability</li>
              <li>✅ JWT authentication</li>
              <li>✅ Message persistence</li>
              <li>✅ Typing indicators</li>
              <li>✅ Read receipts</li>
              <li>✅ Bot prompts integration</li>
              <li>✅ Markdown rendering</li>
              <li>✅ Code block support</li>
              <li>✅ Copy to clipboard</li>
              <li>✅ Optimistic UI updates</li>
              <li>✅ Offline resilience</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">API Endpoints</h2>
            <div className="space-y-2 text-sm font-mono text-gray-700">
              <div>POST /api/user-response/ - Submit user message</div>
              <div>POST /api/bot-response/ - Get bot response</div>
              <div>GET /api/bot-prompts/ - Get quick-start prompts</div>
              <div>GET /api/chat/conversations/ - List conversations</div>
              <div>POST /api/chat/conversations/ - Create conversation</div>
              <div>GET /api/chat/conversations/{id}/messages/ - Get messages</div>
              <div>POST /api/chat/messages/{id}/read/ - Mark as read</div>
              <div>POST /api/chat/upload/ - Upload attachments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced ChatBot Component */}
      <EnhancedChatBot
        botName="CRM Assistant"
        position="bottom-right"
        onConversationChange={(conversationId) => {
          console.log('Conversation changed:', conversationId);
        }}
      />
    </div>
  );
}
