# Phase 6A — Professional Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build professional messaging with conversations, message requests (gate-kept by connection status), blocking, and rate limiting.

**Architecture:** Server-side library (`src/lib/messaging.ts`) owns all business logic. API routes are thin wrappers that call the library. React Server Components fetch initial data; client components handle sending/receiving. Authorization gates every operation via `requireActor()`.

**Tech Stack:** Next.js App Router, Prisma (SQLite/Turso), server-only library, existing `notifications`, `activity`, `authorization`, `rate-limit` modules.

## Global Constraints

- 4-role auth with `requireActor()` from `@/lib/authorization`
- Only accepted connections can message directly (otherwise message request required)
- Blocked users cannot message each other (bidirectional)
- Rate limit: 30 messages per minute per user
- 30 days session token
- All API responses include `Cache-Control: private, no-store`
- Indonesian/English i18n via `getLocaleAndDict()`

---

### Task 1: Messaging Service Library

**Files:**
- Create: `src/lib/messaging.ts`

**Interfaces:**
- Produces: all messaging functions for API routes and integration

- [ ] **Step 1: Create `src/lib/messaging.ts`**

Write the complete messaging service library. This is the core of Phase 6A.

Key functions and their signatures:

```typescript
import "server-only"
import { db } from "@/lib/db"
import { AuthorizationError } from "@/lib/authorization"
import { emitEvent } from "@/lib/activity"
import { createNotification } from "@/lib/notifications"

// Types
export interface ConversationWithMeta {
  id: string
  title: string | null
  type: string
  updatedAt: Date
  participants: Array<{
    id: string
    fullName: string | null
    photoUrl: string | null
  }>
  lastMessage: { body: string; createdAt: Date; senderId: string } | null
  unreadCount: number
}

export interface MessageItem {
  id: string
  body: string
  senderId: string
  createdAt: Date
  editedAt: Date | null
}

export interface MessageRequestItem {
  id: string
  senderId: string
  senderName: string | null
  senderPhotoUrl: string | null
  body: string
  status: string
  createdAt: Date
}

// Core messaging
export async function startConversation(
  creatorProfileId: string,
  participantIds: string[],
  initialMessage: string
): Promise<{ conversation: { id: string }; message: { id: string } }> { ... }

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string
): Promise<{ id: string }> { ... }

export async function getConversations(
  userProfileId: string
): Promise<ConversationWithMeta[]> { ... }

export async function getMessages(
  conversationId: string,
  userProfileId: string,
  cursor?: string
): Promise<{ items: MessageItem[]; nextCursor: string | null }> { ... }

// Message requests (for non-connected users)
export async function sendMessageRequest(
  senderId: string,
  recipientId: string,
  body: string
): Promise<{ id: string }> { ... }

export async function acceptMessageRequest(
  requestId: string,
  recipientId: string
): Promise<{ conversationId: string }> { ... }

export async function declineMessageRequest(
  requestId: string,
  recipientId: string
): Promise<void> { ... }

export async function getMessageRequests(
  userProfileId: string
): Promise<MessageRequestItem[]> { ... }

// Blocking
export async function blockUser(
  blockerId: string,
  blockedId: string,
  reason?: string
): Promise<void> { ... }

export async function unblockUser(
  blockerId: string,
  blockedId: string
): Promise<void> { ... }

export async function isBlocked(
  userProfileId: string,
  otherProfileId: string
): Promise<boolean> { ... }
```

The full implementation follows the patterns in `connections.ts`:
- Self-checks: cannot message/block yourself
- Existence checks for all referenced entities
- Transactional writes where needed (startConversation creates both Conversation + Message + Participants in one tx)
- `sendMessage` checks: participant?, blocked?, updates lastReadAt for sender
- `startConversation` checks: participants are connected?, not blocked?
- `sendMessageRequest` checks: not already connected, not blocked, no existing pending request (throws CONFLICT)
- `isBlocked` checks bidirectionally (blockerId vs blockedId in either direction)
```

### Task 2: API Routes - Messages

**Files:**
- Create: `src/app/api/messages/route.ts`
- Create: `src/app/api/messages/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/messages/route.ts`**

GET returns conversations. POST starts a new conversation.

Pattern: same as `connections/route.ts` — `requireActor()`, `getRequiredProfileId()`, try/catch with `handleAuthorizationError()`.

POST body: `{ participantIds: string[], initialMessage: string }`
Rate-limit on POST via `applyRateLimit(request, "api", \`user:${actor.profileId}\`)`.

- [ ] **Step 2: Create `src/app/api/messages/[id]/route.ts`**

GET returns paginated messages. POST sends a message.

POST body: `{ body: string }`
Rate-limit POST: 30/min with custom preset.
ID validation via `isValidId()`.

### Task 3: API Routes - Message Requests

**Files:**
- Create: `src/app/api/messages/requests/route.ts`
- Create: `src/app/api/messages/requests/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/messages/requests/route.ts`**

GET returns pending incoming message requests. POST sends a message request.

POST body: `{ recipientId: string, body: string }`

- [ ] **Step 2: Create `src/app/api/messages/requests/[id]/route.ts`**

PATCH accepts or declines a message request.

PATCH body: `{ action: "accept" | "decline" }`

### Task 4: API Route - Blocks

**Files:**
- Create: `src/app/api/blocks/route.ts`

- [ ] **Step 1: Create `src/app/api/blocks/route.ts`**

GET lists blocks for current user. POST blocks a user. DELETE unblocks.

POST body: `{ blockedId: string, reason?: string }`
DELETE body: `{ blockedId: string }`

### Task 5: UI - Conversation List Page

**Files:**
- Create: `src/app/(app)/messages/page.tsx`

- [ ] **Step 1: Create `src/app/(app)/messages/page.tsx`**

Server component that loads conversations via `getConversations()`. Displays them in a sidebar-like list with:
- Participant name/photo
- Last message preview
- Unread count badge
- Search/filter
- "Pesan Baru" / "New Message" button
- Message request inbox section at top

### Task 6: UI - Message Thread Page

**Files:**
- Create: `src/app/(app)/messages/[id]/page.tsx`

- [ ] **Step 1: Create `src/app/(app)/messages/[id]/page.tsx`**

Server component that loads messages via `getMessages()`. Displays them in a chat thread with:
- Message bubbles (sent vs received)
- Timestamps
- Text input at bottom
- Block/unblock button
- Report button
- "Kembali" / "Back" link
- Real-time send via client component

### Task 7: Integration

**Files:**
- Modify: `src/app/api/connections/[id]/route.ts`
- Modify: `src/app/(app)/profile/page.tsx` (or public profile page)
- Create: `src/components/messaging/send-message-button.tsx`

- [ ] **Step 1: Connection acceptance auto-creates conversation**

In `connections/[id]/route.ts` PATCH handler, after successful acceptance, call `startConversation(profileId, [requesterId], "Halo! Sekarang kita terhubung. Silakan kirim pesan.")`.

- [ ] **Step 2: Add "Kirim Pesan" button to connection cards and public profile**

Create a `SendMessageButton` client component that checks connection status and navigates to the appropriate conversation or sends a message request.

- [ ] **Step 3: Block removes connection**

In `messaging.ts` `blockUser()`, after creating the block, also delete any existing `Connection` between the two users.

### Task 8: Tests

**Files:**
- Create: `tests/authorization/messaging.test.ts`

- [ ] **Step 1: Write messaging authorization tests**

Following the pattern from `connections.test.ts`:
- Use the same `testRuntime`, `fixtures`, `cleanDb`, `seedDb`, `setActor`
- Add conversation and message fixtures to seedDb
- Test scenarios:
  1. Connected users can message each other
  2. Non-connected user must send message request
  3. Message request accept creates conversation
  4. Blocked user cannot message
  5. Cannot read messages in conversations you're not part of
  6. Rate limiting works (30/min)
  7. Unauthenticated access returns 401
  8. Self-messaging returns 400
  9. Accepting already-accepted request returns 409
  10. Only the recipient can accept/decline a request

### Task 9: Commit

- [ ] **Step 1: Run tests**
```bash
cd D:\laras_new && npx bun test tests/authorization/messaging.test.ts
```

- [ ] **Step 2: Commit**
```bash
git add src/lib/messaging.ts src/app/api/messages/ src/app/api/blocks/ src/app/(app)/messages/ tests/authorization/messaging.test.ts
git commit -m "feat: add professional messaging system (Phase 6A)"
```
