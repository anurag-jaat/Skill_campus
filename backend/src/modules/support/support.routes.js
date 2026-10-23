import { Router } from 'express';
import { z } from 'zod';
import { db, TABLES } from '../../db/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';

/**
 * Express API routes for support and helpdesk module.
 * @author = kruthinraj
 * @date = 2026-10-15
 */

const router = Router();

const requireAdmin = (req, res, next) => {
  if (req.user?.email !== 'kruthin123@gmail.com') {
    return next(ApiError.forbidden('Admin access only'));
  }
  next();
};

const ticketSchema = z.object({
  category: z.enum([
    'general',
    'account',
    'payment_dispute',
    'bug_report',
    'feature_request',
    'listing_help',
    'other',
  ]),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(150),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  proof_url: z.string().max(500000, 'Image is too large').nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

const messageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(2000),
  attachment_url: z.string().max(500000).nullable().optional(),
});

const statusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
});

/** POST /api/support/tickets - Submit a new support ticket */
router.post(
  '/tickets',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = ticketSchema.parse(req.body);

    const now = new Date().toISOString();
    const ticket = await db.insert(TABLES.support_tickets, {
      user_id: req.user.id,
      category: payload.category,
      subject: payload.subject,
      description: payload.description,
      proof_url: payload.proof_url || null,
      status: 'open',
      priority: payload.priority,
      created_at: now,
      updated_at: now,
    });

    // Automatically create the opening message in support_messages
    await db.insert(TABLES.support_messages, {
      ticket_id: ticket.id,
      sender_id: req.user.id,
      is_admin: false,
      content: payload.description,
      attachment_url: payload.proof_url || null,
      created_at: now,
    });

    res.status(201).json({ ticket });
  })
);

/** GET /api/support/tickets/mine - Retrieve all tickets created by current user */
router.get(
  '/tickets/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tickets = await db.findMany(
      TABLES.support_tickets,
      { user_id: req.user.id },
      { orderBy: 'updated_at', ascending: false, limit: 100 }
    );

    // Enrich with message counts and last message info
    const enriched = await Promise.all(
      tickets.map(async (t) => {
        const messages = await db.findMany(
          TABLES.support_messages,
          { ticket_id: t.id },
          { orderBy: 'created_at', ascending: true, limit: 100 }
        );
        const lastMsg = messages[messages.length - 1];
        return {
          ...t,
          message_count: messages.length,
          last_message: lastMsg ? lastMsg.content : t.description,
          last_message_at: lastMsg ? lastMsg.created_at : t.created_at,
          has_admin_reply: messages.some((m) => m.is_admin),
        };
      })
    );

    res.json({ tickets: enriched });
  })
);

/** GET /api/support/tickets/:id/messages - Retrieve chat history for a support ticket */
router.get(
  '/tickets/:id/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const ticket = await db.findOne(TABLES.support_tickets, { id });
    if (!ticket) throw ApiError.notFound('Support ticket not found');

    const isAdmin = req.user.email === 'kruthin123@gmail.com';
    if (!isAdmin && ticket.user_id !== req.user.id) {
      throw ApiError.forbidden('You do not have access to this support ticket');
    }

    const messages = await db.findMany(
      TABLES.support_messages,
      { ticket_id: id },
      { orderBy: 'created_at', ascending: true, limit: 200 }
    );

    const ticketCreator = await db.findOne(TABLES.users, { id: ticket.user_id });

    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        let senderName = 'Support Team';
        let senderAvatar = null;

        if (!msg.is_admin) {
          senderName = ticketCreator?.full_name || 'Student';
          senderAvatar = ticketCreator?.avatar_url || null;
        }

        return {
          ...msg,
          sender: {
            id: msg.sender_id,
            full_name: senderName,
            avatar_url: senderAvatar,
            is_admin: msg.is_admin,
          },
        };
      })
    );

    res.json({
      ticket: {
        ...ticket,
        creator: {
          id: ticketCreator?.id,
          full_name: ticketCreator?.full_name || 'Student',
          email: ticketCreator?.email,
          roll_number: ticketCreator?.roll_number,
          avatar_url: ticketCreator?.avatar_url,
        },
      },
      messages: enrichedMessages,
    });
  })
);

/** POST /api/support/tickets/:id/messages - Send a message in support ticket chat */
router.post(
  '/tickets/:id/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content, attachment_url } = messageSchema.parse(req.body);

    const ticket = await db.findOne(TABLES.support_tickets, { id });
    if (!ticket) throw ApiError.notFound('Support ticket not found');

    const isAdmin = req.user.email === 'kruthin123@gmail.com';
    if (!isAdmin && ticket.user_id !== req.user.id) {
      throw ApiError.forbidden('You do not have permission to message in this ticket');
    }

    const now = new Date().toISOString();
    const message = await db.insert(TABLES.support_messages, {
      ticket_id: id,
      sender_id: req.user.id,
      is_admin: isAdmin,
      content,
      attachment_url: attachment_url || null,
      created_at: now,
    });

    // Update ticket updated_at and move from 'open' to 'in_progress' if admin responds
    const updates = { updated_at: now };
    if (isAdmin && ticket.status === 'open') {
      updates.status = 'in_progress';
    } else if (!isAdmin && (ticket.status === 'resolved' || ticket.status === 'closed')) {
      // Reopen ticket if user messages again
      updates.status = 'in_progress';
    }

    await db.update(TABLES.support_tickets, { id }, updates);

    const sender = await db.findOne(TABLES.users, { id: req.user.id });

    res.status(201).json({
      message: {
        ...message,
        sender: {
          id: sender?.id,
          full_name: isAdmin ? 'Support Team' : sender?.full_name || 'Student',
          avatar_url: isAdmin ? null : sender?.avatar_url,
          is_admin: isAdmin,
        },
      },
    });
  })
);

/** PATCH /api/support/tickets/:id/status - Update support ticket status */
router.patch(
  '/tickets/:id/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = statusSchema.parse(req.body);

    const ticket = await db.findOne(TABLES.support_tickets, { id });
    if (!ticket) throw ApiError.notFound('Support ticket not found');

    const isAdmin = req.user.email === 'kruthin123@gmail.com';
    if (!isAdmin && ticket.user_id !== req.user.id) {
      throw ApiError.forbidden('You cannot modify this support ticket status');
    }

    const updated = await db.update(
      TABLES.support_tickets,
      { id },
      { status, updated_at: new Date().toISOString() }
    );

    res.json({ ticket: updated });
  })
);

/** GET /api/support/admin/tickets - Admin: List all platform support tickets */
router.get(
  '/admin/tickets',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const tickets = await db.findMany(
      TABLES.support_tickets,
      {},
      { orderBy: 'updated_at', ascending: false, limit: 150 }
    );

    const userIds = [...new Set(tickets.map((t) => t.user_id))];
    const users = await Promise.all(userIds.map((id) => db.findOne(TABLES.users, { id })));
    const userMap = users.reduce((acc, u) => {
      if (u) acc[u.id] = u;
      return acc;
    }, {});

    const enriched = await Promise.all(
      tickets.map(async (t) => {
        const messages = await db.findMany(
          TABLES.support_messages,
          { ticket_id: t.id },
          { orderBy: 'created_at', ascending: true, limit: 100 }
        );
        const lastMsg = messages[messages.length - 1];
        const user = userMap[t.user_id];
        return {
          ...t,
          user: user
            ? {
                id: user.id,
                full_name: user.full_name || 'Student',
                email: user.email,
                roll_number: user.roll_number,
                avatar_url: user.avatar_url,
              }
            : { full_name: 'Unknown User', email: 'deleted@user' },
          message_count: messages.length,
          last_message: lastMsg ? lastMsg.content : t.description,
          last_message_at: lastMsg ? lastMsg.created_at : t.created_at,
          last_message_is_admin: lastMsg ? lastMsg.is_admin : false,
        };
      })
    );

    res.json({ tickets: enriched });
  })
);

/** DELETE /api/support/admin/tickets/:id - Admin: Delete a support ticket */
router.delete(
  '/admin/tickets/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const ticket = await db.findOne(TABLES.support_tickets, { id });
    if (!ticket) throw ApiError.notFound('Support ticket not found');

    // Remove ticket messages and ticket
    await db.remove(TABLES.support_messages, { ticket_id: id });
    await db.remove(TABLES.support_tickets, { id });

    res.json({ success: true });
  })
);

export default router;
