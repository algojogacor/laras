import "server-only"
import { db } from "@/lib/db"
import { AuthorizationError } from "@/lib/authorization"
import { emitEvent } from "@/lib/activity"
import { createNotification } from "@/lib/notifications"

// ============================================================================
// Professional Messaging Service — Phase 6A
// ============================================================================
// Manages conversations, messages, message requests (gate-kept by connection
// status), and user blocking. Only accepted connections can message directly;
// otherwise a message request must be sent first.
//
// Blocking is bidirectional — if either user has blocked the other, no
// messages can be exchanged.
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Connection check helpers
// ---------------------------------------------------------------------------

/**
 * Check whether two users are connected (accepted Connection in either direction).
 */
async function areConnected(userAId: string, userBId: string): Promise<boolean> {
  const conn = await db.connection.findFirst({
    where: {
      OR: [
        { requesterId: userAId, addresseeId: userBId, status: "accepted" },
        { requesterId: userBId, addresseeId: userAId, status: "accepted" },
      ],
    },
  })
  return conn !== null
}

// ---------------------------------------------------------------------------
// Blocking
// ---------------------------------------------------------------------------

/**
 * Check whether either user has blocked the other (bidirectional).
 * If userA blocked userB OR userB blocked userA, returns true.
 */
export async function isBlocked(
  userProfileId: string,
  otherProfileId: string
): Promise<boolean> {
  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: userProfileId, blockedId: otherProfileId },
        { blockerId: otherProfileId, blockedId: userProfileId },
      ],
    },
  })
  return block !== null
}

/**
 * Block a user. Removes any existing Connection between the two users.
 * Self-block is not allowed.
 */
export async function blockUser(
  blockerId: string,
  blockedId: string,
  reason?: string
): Promise<void> {
  if (blockerId === blockedId) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  // Verify blocked user exists
  const target = await db.userProfile.findUnique({
    where: { id: blockedId },
    select: { id: true },
  })
  if (!target) {
    throw new AuthorizationError("NOT_FOUND")
  }

  // Check for existing block (idempotent)
  const existing = await db.block.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  })
  if (existing) {
    return // Already blocked — idempotent
  }

  await db.$transaction(async (tx) => {
    // Create block
    await tx.block.create({
      data: { blockerId, blockedId, reason: reason ?? null },
    })

    // Remove any connection between the two users (both directions)
    await tx.connection.deleteMany({
      where: {
        OR: [
          { requesterId: blockerId, addresseeId: blockedId },
          { requesterId: blockedId, addresseeId: blockerId },
        ],
      },
    })
  })

  // Emit activity event (fire-and-forget)
  emitEvent({
    userProfileId: blockerId,
    type: "profile.update",
    resourceType: "Block",
    metadata: { action: "block", blockedId },
  })
}

/**
 * Unblock a user. Only the blocker can unblock.
 */
export async function unblockUser(
  blockerId: string,
  blockedId: string
): Promise<void> {
  const result = await db.block.deleteMany({
    where: { blockerId, blockedId },
  })

  if (result.count === 0) {
    throw new AuthorizationError("NOT_FOUND")
  }
}

// ---------------------------------------------------------------------------
// Conversation management
// ---------------------------------------------------------------------------

/**
 * Start a new conversation. Creates the conversation, adds participants,
 * and sends the initial message in a single transaction.
 *
 * Requirements:
 * - Creator must be connected to all participants
 * - No blocks between any participants
 * - At least one other participant
 * - Self-conversation not allowed
 */
export async function startConversation(
  creatorProfileId: string,
  participantIds: string[],
  initialMessage: string
): Promise<{ conversation: { id: string }; message: { id: string } }> {
  if (!initialMessage || initialMessage.trim().length === 0) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  // Deduplicate and filter out self
  const uniqueIds = [...new Set(participantIds)].filter(
    (id) => id !== creatorProfileId
  )

  if (uniqueIds.length === 0) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  // Verify all participants exist
  const profiles = await db.userProfile.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  })
  if (profiles.length !== uniqueIds.length) {
    throw new AuthorizationError("NOT_FOUND")
  }

  // Check: are all participants connected to creator?
  for (const pid of uniqueIds) {
    const connected = await areConnected(creatorProfileId, pid)
    if (!connected) {
      throw new AuthorizationError("FORBIDDEN")
    }
  }

  // Check: no blocks between creator and any participant
  for (const pid of uniqueIds) {
    const blocked = await isBlocked(creatorProfileId, pid)
    if (blocked) {
      throw new AuthorizationError("FORBIDDEN")
    }
  }

  // Check: no blocks between participants themselves
  for (let i = 0; i < uniqueIds.length; i++) {
    for (let j = i + 1; j < uniqueIds.length; j++) {
      const blocked = await isBlocked(uniqueIds[i], uniqueIds[j])
      if (blocked) {
        throw new AuthorizationError("FORBIDDEN")
      }
    }
  }

  const allParticipantIds = [creatorProfileId, ...uniqueIds]
  const isGroup = uniqueIds.length > 1

  const result = await db.$transaction(async (tx) => {
    // Create conversation
    const conversation = await tx.conversation.create({
      data: {
        type: isGroup ? "group" : "direct",
        title: isGroup ? null : undefined,
      },
    })

    // Add all participants
    await tx.conversationParticipant.createMany({
      data: allParticipantIds.map((pid) => ({
        conversationId: conversation.id,
        userProfileId: pid,
        lastReadAt: pid === creatorProfileId ? new Date() : null,
      })),
    })

    // Add initial message
    const message = await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: creatorProfileId,
        body: initialMessage.trim(),
      },
    })

    return { conversation, message }
  })

  // Emit activity event for the creator
  emitEvent({
    userProfileId: creatorProfileId,
    type: "connection.accept", // reuse — conversation creation is a connection activity
    resourceType: "Conversation",
    resourceId: result.conversation.id,
    metadata: { action: "conversation_start", type: isGroup ? "group" : "direct" },
  })

  // Notify other participants
  for (const pid of uniqueIds) {
    createNotification({
      userProfileId: pid,
      type: "system",
      title: "Percakapan Baru",
      body: initialMessage.trim().slice(0, 100),
      resourceType: "Conversation",
      resourceId: result.conversation.id,
    })
  }

  return {
    conversation: { id: result.conversation.id },
    message: { id: result.message.id },
  }
}

// ---------------------------------------------------------------------------
// Sending messages
// ---------------------------------------------------------------------------

/**
 * Send a message in a conversation.
 *
 * Requirements:
 * - Sender must be a participant
 * - Sender must not be blocked by any other participant
 * - Message body must be non-empty
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string
): Promise<{ id: string }> {
  if (!body || body.trim().length === 0) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  // Verify conversation exists
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  })
  if (!conversation) {
    throw new AuthorizationError("NOT_FOUND")
  }

  // Verify sender is a participant
  const participation = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userProfileId: {
        conversationId,
        userProfileId: senderId,
      },
    },
  })
  if (!participation) {
    throw new AuthorizationError("FORBIDDEN")
  }

  // Check blocks: sender must not be blocked by any other participant
  const otherParticipants = await db.conversationParticipant.findMany({
    where: {
      conversationId,
      userProfileId: { not: senderId },
    },
    select: { userProfileId: true },
  })

  for (const p of otherParticipants) {
    const blocked = await isBlocked(senderId, p.userProfileId)
    if (blocked) {
      throw new AuthorizationError("FORBIDDEN")
    }
  }

  // Create message and update sender's read state
  const message = await db.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId,
        senderId,
        body: body.trim(),
      },
    })

    // Update sender's lastReadAt
    await tx.conversationParticipant.update({
      where: {
        conversationId_userProfileId: {
          conversationId,
          userProfileId: senderId,
        },
      },
      data: { lastReadAt: new Date() },
    })

    // Update conversation updatedAt
    await tx.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    return msg
  })

  // Emit activity event (fire-and-forget)
  emitEvent({
    userProfileId: senderId,
    type: "profile.update",
    resourceType: "Message",
    resourceId: message.id,
    metadata: { action: "message_send", conversationId },
  })

  return { id: message.id }
}

// ---------------------------------------------------------------------------
// Reading conversations
// ---------------------------------------------------------------------------

/**
 * Get all conversations for a user, ordered by most recent activity.
 * Includes last message preview and unread count.
 */
export async function getConversations(
  userProfileId: string
): Promise<ConversationWithMeta[]> {
  // Find all conversations where the user is a participant
  const participations = await db.conversationParticipant.findMany({
    where: { userProfileId },
    select: {
      conversationId: true,
      lastReadAt: true,
    },
  })

  if (participations.length === 0) return []

  const conversationIds = participations.map((p) => p.conversationId)
  const readMap = new Map(
    participations.map((p) => [p.conversationId, p.lastReadAt])
  )

  // Load conversations with participants and last message
  const conversations = await db.conversation.findMany({
    where: { id: { in: conversationIds } },
    include: {
      participants: {
        include: {
          userProfile: {
            select: { id: true, fullName: true, photoUrl: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, body: true, createdAt: true, senderId: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  // Count unread messages for each conversation
  const unreadCounts = new Map<string, number>()
  for (const conv of conversations) {
    const lastReadAt = readMap.get(conv.id)
    const count = await db.message.count({
      where: {
        conversationId: conv.id,
        senderId: { not: userProfileId },
        ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
      },
    })
    unreadCounts.set(conv.id, count)
  }

  return conversations.map((conv) => ({
    id: conv.id,
    title: conv.title,
    type: conv.type,
    updatedAt: conv.updatedAt,
    participants: conv.participants.map((p) => ({
      id: p.userProfile.id,
      fullName: p.userProfile.fullName,
      photoUrl: p.userProfile.photoUrl,
    })),
    lastMessage:
      conv.messages.length > 0
        ? {
            body: conv.messages[0].body,
            createdAt: conv.messages[0].createdAt,
            senderId: conv.messages[0].senderId,
          }
        : null,
    unreadCount: unreadCounts.get(conv.id) ?? 0,
  }))
}

/**
 * Get paginated messages for a conversation.
 * Marks messages as read for the current user.
 */
export async function getMessages(
  conversationId: string,
  userProfileId: string,
  cursor?: string
): Promise<{ items: MessageItem[]; nextCursor: string | null }> {
  // Verify user is a participant
  const participation = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userProfileId: {
        conversationId,
        userProfileId,
      },
    },
  })
  if (!participation) {
    throw new AuthorizationError("FORBIDDEN")
  }

  const limit = 50

  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      body: true,
      senderId: true,
      createdAt: true,
      editedAt: true,
    },
  })

  const hasMore = messages.length > limit
  const result = hasMore ? messages.slice(0, limit) : messages

  // Mark as read: update lastReadAt for this conversation
  await db.conversationParticipant.update({
    where: {
      conversationId_userProfileId: {
        conversationId,
        userProfileId,
      },
    },
    data: { lastReadAt: new Date() },
  })

  return {
    items: result.map((m) => ({
      id: m.id,
      body: m.body,
      senderId: m.senderId,
      createdAt: m.createdAt,
      editedAt: m.editedAt,
    })),
    nextCursor: hasMore ? result[result.length - 1].id : null,
  }
}

// ---------------------------------------------------------------------------
// Message requests (for non-connected users)
// ---------------------------------------------------------------------------

/**
 * Send a message request to a recipient.
 *
 * Requirements:
 * - Sender and recipient must not be connected (otherwise use startConversation)
 * - No blocks between sender and recipient
 * - Self-request not allowed
 * - No existing pending request from the same sender to the same recipient
 */
export async function sendMessageRequest(
  senderId: string,
  recipientId: string,
  body: string
): Promise<{ id: string }> {
  if (senderId === recipientId) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  if (!body || body.trim().length === 0) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  // Verify recipient exists
  const recipient = await db.userProfile.findUnique({
    where: { id: recipientId },
    select: { id: true },
  })
  if (!recipient) {
    throw new AuthorizationError("NOT_FOUND")
  }

  // Check: not already connected?
  const connected = await areConnected(senderId, recipientId)
  if (connected) {
    throw new AuthorizationError("CONFLICT")
  }

  // Check: not blocked?
  const blocked = await isBlocked(senderId, recipientId)
  if (blocked) {
    throw new AuthorizationError("FORBIDDEN")
  }

  // Check: no existing pending request from this sender to this recipient
  const existing = await db.messageRequest.findFirst({
    where: {
      senderId,
      recipientId,
      status: "pending",
    },
  })
  if (existing) {
    throw new AuthorizationError("CONFLICT")
  }

  const request = await db.messageRequest.create({
    data: {
      senderId,
      recipientId,
      body: body.trim(),
      status: "pending",
    },
  })

  // Notify recipient
  createNotification({
    userProfileId: recipientId,
    type: "system",
    title: "Permintaan Pesan Baru",
    body: body.trim().slice(0, 100),
    resourceType: "MessageRequest",
    resourceId: request.id,
  })

  // Emit activity for sender
  emitEvent({
    userProfileId: senderId,
    type: "profile.update",
    resourceType: "MessageRequest",
    resourceId: request.id,
    metadata: { action: "request_sent" },
  })

  return { id: request.id }
}

/**
 * Accept a message request. Creates a conversation between the two users.
 * Only the recipient can accept.
 */
export async function acceptMessageRequest(
  requestId: string,
  recipientId: string
): Promise<{ conversationId: string }> {
  // Find the request
  const request = await db.messageRequest.findUnique({
    where: { id: requestId },
    select: { id: true, senderId: true, recipientId: true, status: true, body: true },
  })

  if (!request) {
    throw new AuthorizationError("NOT_FOUND")
  }

  if (request.recipientId !== recipientId) {
    throw new AuthorizationError("FORBIDDEN")
  }

  if (request.status !== "pending") {
    throw new AuthorizationError("CONFLICT")
  }

  // Check blocks again (may have changed since request was sent)
  const blocked = await isBlocked(request.senderId, request.recipientId)
  if (blocked) {
    throw new AuthorizationError("FORBIDDEN")
  }

  // Create conversation and update request in a transaction
  const result = await db.$transaction(async (tx) => {
    // Create conversation
    const conversation = await tx.conversation.create({
      data: { type: "direct" },
    })

    // Add both participants
    await tx.conversationParticipant.createMany({
      data: [
        {
          conversationId: conversation.id,
          userProfileId: request.senderId,
          lastReadAt: null,
        },
        {
          conversationId: conversation.id,
          userProfileId: request.recipientId,
          lastReadAt: new Date(), // recipient has read the request message
        },
      ],
    })

    // Copy the request message as the first conversation message
    await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: request.senderId,
        body: request.body,
      },
    })

    // Update request status
    await tx.messageRequest.update({
      where: { id: requestId },
      data: { status: "accepted", acceptedAt: new Date() },
    })

    return conversation
  })

  // Notify the sender that their request was accepted
  createNotification({
    userProfileId: request.senderId,
    type: "system",
    title: "Permintaan Pesan Diterima",
    body: "Percakapan telah dimulai",
    resourceType: "Conversation",
    resourceId: result.id,
  })

  // Emit activity
  emitEvent({
    userProfileId: recipientId,
    type: "connection.accept",
    resourceType: "MessageRequest",
    resourceId: requestId,
    metadata: { action: "request_accepted", conversationId: result.id },
  })

  return { conversationId: result.id }
}

/**
 * Decline a message request. Only the recipient can decline.
 */
export async function declineMessageRequest(
  requestId: string,
  recipientId: string
): Promise<void> {
  const request = await db.messageRequest.findUnique({
    where: { id: requestId },
    select: { id: true, recipientId: true, status: true },
  })

  if (!request) {
    throw new AuthorizationError("NOT_FOUND")
  }

  if (request.recipientId !== recipientId) {
    throw new AuthorizationError("FORBIDDEN")
  }

  if (request.status !== "pending") {
    throw new AuthorizationError("CONFLICT")
  }

  await db.messageRequest.update({
    where: { id: requestId },
    data: { status: "declined", declinedAt: new Date() },
  })
}

/**
 * Get pending incoming message requests for a user.
 */
export async function getMessageRequests(
  userProfileId: string
): Promise<MessageRequestItem[]> {
  const requests = await db.messageRequest.findMany({
    where: { recipientId: userProfileId, status: "pending" },
    include: {
      sender: {
        select: { id: true, fullName: true, photoUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return requests.map((r) => ({
    id: r.id,
    senderId: r.senderId,
    senderName: r.sender.fullName,
    senderPhotoUrl: r.sender.photoUrl,
    body: r.body,
    status: r.status,
    createdAt: r.createdAt,
  }))
}

/**
 * Find or create a direct conversation between two connected users.
 * Used when navigating from a profile page — if a conversation already
 * exists, return it; otherwise create one.
 */
export async function findOrCreateConversation(
  userAId: string,
  userBId: string
): Promise<{ conversationId: string }> {
  if (userAId === userBId) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  // Must be connected
  const connected = await areConnected(userAId, userBId)
  if (!connected) {
    throw new AuthorizationError("FORBIDDEN")
  }

  // Must not be blocked
  const blocked = await isBlocked(userAId, userBId)
  if (blocked) {
    throw new AuthorizationError("FORBIDDEN")
  }

  // Find existing direct conversation between these two users
  // A direct conversation is one where both users are participants and type=direct
  const existingParticipation = await db.conversationParticipant.findFirst({
    where: {
      userProfileId: userAId,
      conversation: {
        type: "direct",
        participants: {
          some: { userProfileId: userBId },
        },
      },
    },
    select: { conversationId: true },
  })

  if (existingParticipation) {
    return { conversationId: existingParticipation.conversationId }
  }

  // Create new conversation
  const conversation = await db.$transaction(async (tx) => {
    const conv = await tx.conversation.create({
      data: { type: "direct" },
    })

    await tx.conversationParticipant.createMany({
      data: [
        { conversationId: conv.id, userProfileId: userAId },
        { conversationId: conv.id, userProfileId: userBId },
      ],
    })

    return conv
  })

  return { conversationId: conversation.id }
}
