import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Generate a unique tracking ID
function generateTrackingId(): string {
    const prefix = "CRR";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// List all couriers (realtime subscription)
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("couriers")
            .order("desc")
            .collect();
    },
});

// Get courier by ID
export const getById = query({
    args: { id: v.id("couriers") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Get dashboard stats
export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const all = await ctx.db.query("couriers").collect();

        const stats = {
            total: all.length,
            pending: all.filter((c) => c.currentStatus === "pending").length,
            pickedUp: all.filter((c) => c.currentStatus === "picked_up").length,
            inTransit: all.filter((c) => c.currentStatus === "in_transit").length,
            outForDelivery: all.filter((c) => c.currentStatus === "out_for_delivery").length,
            delivered: all.filter((c) => c.currentStatus === "delivered").length,
            cancelled: all.filter((c) => c.currentStatus === "cancelled").length,
        };

        return stats;
    },
});

// Search couriers
export const search = query({
    args: { searchTerm: v.string() },
    handler: async (ctx, args) => {
        const all = await ctx.db.query("couriers").collect();
        const term = args.searchTerm.toLowerCase();

        return all.filter(
            (c) =>
                c.trackingId.toLowerCase().includes(term) ||
                c.receiverName.toLowerCase().includes(term) ||
                c.receiverPhone.includes(term)
        );
    },
});

// Filter by status
export const filterByStatus = query({
    args: {
        status: v.union(
            v.literal("pending"),
            v.literal("picked_up"),
            v.literal("in_transit"),
            v.literal("out_for_delivery"),
            v.literal("delivered"),
            v.literal("cancelled")
        ),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("couriers")
            .withIndex("by_status", (q) => q.eq("currentStatus", args.status))
            .collect();
    },
});

// Create a new courier
export const create = mutation({
    args: {
        senderName: v.string(),
        receiverName: v.string(),
        receiverPhone: v.string(),
        pickupAddress: v.string(),
        deliveryAddress: v.string(),
        notes: v.optional(v.string()),
        expectedDeliveryDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const trackingId = generateTrackingId();

        const courierId = await ctx.db.insert("couriers", {
            trackingId,
            senderName: args.senderName,
            receiverName: args.receiverName,
            receiverPhone: args.receiverPhone,
            pickupAddress: args.pickupAddress,
            deliveryAddress: args.deliveryAddress,
            currentStatus: "pending",
            notes: args.notes,
            expectedDeliveryDate: args.expectedDeliveryDate,
            createdAt: now,
            updatedAt: now,
        });

        return courierId;
    },
});

// Update courier details
export const update = mutation({
    args: {
        id: v.id("couriers"),
        senderName: v.optional(v.string()),
        receiverName: v.optional(v.string()),
        receiverPhone: v.optional(v.string()),
        pickupAddress: v.optional(v.string()),
        deliveryAddress: v.optional(v.string()),
        notes: v.optional(v.string()),
        expectedDeliveryDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;

        // Filter out undefined values
        const filteredUpdates: Record<string, string | number> = {};
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                filteredUpdates[key] = value;
            }
        }

        await ctx.db.patch(id, {
            ...filteredUpdates,
            updatedAt: Date.now(),
        });
    },
});

// Update courier status
export const updateStatus = mutation({
    args: {
        id: v.id("couriers"),
        status: v.union(
            v.literal("pending"),
            v.literal("picked_up"),
            v.literal("in_transit"),
            v.literal("out_for_delivery"),
            v.literal("delivered"),
            v.literal("cancelled")
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            currentStatus: args.status,
            updatedAt: Date.now(),
        });
    },
});

// Delete courier
export const remove = mutation({
    args: { id: v.id("couriers") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
