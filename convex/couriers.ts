import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Generate a unique tracking ID
function generateTrackingId(): string {
    const prefix = "CRR";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// Generate Invoice Number
function generateInvoiceNumber(): string {
    return `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
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

// Get courier by ID (with relations)
export const getById = query({
    args: { id: v.id("couriers") },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) return null;

        let pod = null;
        if (courier.podId) {
            pod = await ctx.db.get(courier.podId);
        }

        let invoice = null;
        if (courier.invoiceId) {
            invoice = await ctx.db.get(courier.invoiceId);
        }

        return { ...courier, pod, invoice };
    },
});

// Get couriers for specific user (Agent or Customer)
export const getMyCouriers = query({
    args: {
        userId: v.id("users"),
        role: v.union(v.literal("agent"), v.literal("customer")),
    },
    handler: async (ctx, args) => {
        if (args.role === "agent") {
            return await ctx.db
                .query("couriers")
                .withIndex("by_assignedTo", (q) => q.eq("assignedTo", args.userId))
                .order("desc")
                .collect();
        } else {
            // For customer: return all couriers for demo purposes
            // In production, filter by createdBy or senderName matching user
            return await ctx.db
                .query("couriers")
                .order("desc")
                .collect();
        }
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
            revenue: all.reduce((sum, c) => sum + (c.price || 0), 0),
        };

        return stats;
    },
});

// Get recent couriers for dashboard
export const getRecent = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("couriers")
            .order("desc")
            .take(5);
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

// Get logs
export const getLogs = query({
    args: { courierId: v.optional(v.id("couriers")) },
    handler: async (ctx, args) => {
        if (args.courierId) {
            return await ctx.db
                .query("logs")
                .withIndex("by_courierId", (q) => q.eq("courierId", args.courierId))
                .order("desc")
                .collect();
        }
        return await ctx.db
            .query("logs")
            .withIndex("by_timestamp")
            .order("desc")
            .take(50);
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
        weight: v.optional(v.number()),
        distance: v.optional(v.number()),
        price: v.optional(v.number()),
        paymentMethod: v.optional(v.union(v.literal("cash"), v.literal("card"), v.literal("prepaid"))),
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
            weight: args.weight,
            distance: args.distance,
            price: args.price,
            paymentStatus: "pending",
            paymentMethod: args.paymentMethod || "cash",
            createdAt: now,
            updatedAt: now,
        });

        // Log creation
        await ctx.db.insert("logs", {
            courierId,
            trackingId,
            action: "created",
            description: "Courier created",
            timestamp: now,
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
        weight: v.optional(v.number()),
        distance: v.optional(v.number()),
        price: v.optional(v.number()),
        paymentMethod: v.optional(v.union(v.literal("cash"), v.literal("card"), v.literal("prepaid"))),
        paymentStatus: v.optional(v.union(v.literal("paid"), v.literal("unpaid"), v.literal("pending"))),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const courier = await ctx.db.get(id);
        if (!courier) throw new Error("Courier not found");

        // Filter out undefined values
        const filteredUpdates: Record<string, any> = {};
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                filteredUpdates[key] = value;
            }
        }

        await ctx.db.patch(id, {
            ...filteredUpdates,
            updatedAt: Date.now(),
        });

        await ctx.db.insert("logs", {
            courierId: id,
            trackingId: courier.trackingId,
            action: "updated",
            description: "Courier details updated",
            timestamp: Date.now(),
        });
    },
});

// Assign Courier
export const assignCourier = mutation({
    args: {
        id: v.id("couriers"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Courier not found");

        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");

        await ctx.db.patch(args.id, {
            assignedTo: args.userId,
            updatedAt: Date.now(),
        });

        await ctx.db.insert("logs", {
            courierId: args.id,
            trackingId: courier.trackingId,
            action: "assigned",
            description: `Assigned to agent: ${user.name}`,
            timestamp: Date.now(),
        });
    },
});

// Complete Delivery (POD)
export const completeDelivery = mutation({
    args: {
        id: v.id("couriers"),
        signatureId: v.optional(v.string()),
        photoId: v.optional(v.string()),
        signeeName: v.string(),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Courier not found");

        const podId = await ctx.db.insert("proofOfDelivery", {
            courierId: args.id,
            signatureId: args.signatureId,
            photoId: args.photoId,
            signeeName: args.signeeName,
            location: args.latitude && args.longitude ? {
                latitude: args.latitude,
                longitude: args.longitude,
            } : undefined,
            timestamp: Date.now(),
        });

        await ctx.db.patch(args.id, {
            currentStatus: "delivered",
            podId,
            updatedAt: Date.now(),
        });

        await ctx.db.insert("logs", {
            courierId: args.id,
            trackingId: courier.trackingId,
            action: "status_changed",
            description: `Delivery Completed (POD Captured). Signed by: ${args.signeeName}`,
            timestamp: Date.now(),
        });
    },
});

// Generate Invoice
export const generateInvoice = mutation({
    args: {
        id: v.id("couriers"),
    },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Courier not found");

        const invoiceId = await ctx.db.insert("invoices", {
            courierId: args.id,
            invoiceNumber: generateInvoiceNumber(),
            amount: courier.price || 0,
            customerName: courier.senderName, // Billing to sender usually
            customerAddress: courier.pickupAddress, // Billing address
            status: courier.paymentStatus === "paid" ? "paid" : "unpaid",
            generatedAt: Date.now(),
        });

        await ctx.db.patch(args.id, {
            invoiceId,
        });

        return invoiceId;
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
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Courier not found");

        const oldStatus = courier.currentStatus;

        await ctx.db.patch(args.id, {
            currentStatus: args.status,
            updatedAt: Date.now(),
        });

        const formatStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

        await ctx.db.insert("logs", {
            courierId: args.id,
            trackingId: courier.trackingId,
            action: "status_changed",
            description: `Status changed: ${formatStatus(oldStatus)} → ${formatStatus(args.status)}`,
            timestamp: Date.now(),
        });
    },
});


// Delete courier
export const remove = mutation({
    args: { id: v.id("couriers") },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Courier not found");

        await ctx.db.delete(args.id);

        await ctx.db.insert("logs", {
            trackingId: courier.trackingId,
            action: "deleted",
            description: "Courier deleted",
            timestamp: Date.now(),
            courierId: args.id,
        });
    },
});
