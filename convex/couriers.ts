import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// --- Helpers ---
const normalizePhone = (p: string) => p.replace(/\D/g, "");

// Haversine Distance Formula (Returns KM)
function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Helper to generate 4-digit OTP
function generateOTP(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function generateTrackingId(): string {
    const prefix = "TRK";
    const random = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${random}`;
}

function generateInvoiceNumber(): string {
    return `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
}

// --- Pricing Engine ---
const BASE_RATE = 50; 
const WEIGHT_RATE = 10; 
const DISTANCE_RATE = 5; 

function calculatePrice(weight?: number, distance?: number, type?: "normal" | "express") {
    let price = BASE_RATE;
    if (weight) price += weight * WEIGHT_RATE;
    if (distance) price += distance * DISTANCE_RATE;
    if (type === "express") price *= 1.5; 
    return Math.round(price);
}

// --- Queries ---

// List couriers with Unassigned Filter support
export const list = query({
    args: { 
        branchId: v.optional(v.id("branches")),
        unassignedOnly: v.optional(v.boolean()) 
    },
    handler: async (ctx, args) => {
        if (args.unassignedOnly) {
            return await ctx.db
                .query("couriers")
                .filter(q => q.eq(q.field("branchId"), undefined))
                .order("desc")
                .collect();
        }
        if (args.branchId) {
            return await ctx.db
                .query("couriers")
                .withIndex("by_branchId", (q) => q.eq("branchId", args.branchId))
                .order("desc")
                .collect();
        }
        return await ctx.db.query("couriers").order("desc").collect();
    },
});

export const getById = query({
    args: { 
        id: v.id("couriers"),
        userId: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) return null;

        if (args.userId) {
            const user = await ctx.db.get(args.userId as Id<"users">);
            if (user && user.role === "customer") {
                const uPhone = normalizePhone(user.phone || "");
                const sPhone = normalizePhone(courier.senderPhone || "");
                const rPhone = normalizePhone(courier.receiverPhone);
                const isOwner = sPhone === uPhone || rPhone === uPhone || courier.senderName === user.name;
                if (!isOwner) return null;
            } else if (user && user.role === "agent") {
                if (courier.assignedTo !== args.userId && courier.branchId !== user.branchId) return null;
            }
        }

        let pod = courier.podId ? await ctx.db.get(courier.podId) : null;
        let invoice = courier.invoiceId ? await ctx.db.get(courier.invoiceId) : null;
        return { ...courier, pod, invoice };
    },
});

// Stats with "Needs Attention" (Orphaned) support
export const getStats = query({
    args: { branchId: v.optional(v.id("branches")) },
    handler: async (ctx, args) => {
        let all = args.branchId 
            ? await ctx.db.query("couriers").withIndex("by_branchId", q => q.eq("branchId", args.branchId)).collect()
            : await ctx.db.query("couriers").collect();

        // Needs Attention = Booked but no branch assigned (orphaned customer bookings)
        const needsAttention = all.filter(c => c.currentStatus === "booked" && !c.branchId).length;

        return {
            total: all.length,
            booked: all.filter(c => c.currentStatus === "booked").length,
            outForDelivery: all.filter(c => c.currentStatus === "out_for_delivery").length,
            delivered: all.filter(c => c.currentStatus === "delivered").length,
            needsAttention, 
            revenue: all.filter(c => c.currentStatus === "delivered").reduce((sum, c) => sum + (c.price || 0), 0),
        };
    },
});

export const getMyCouriers = query({
    args: {
        userId: v.id("users"),
        role: v.union(v.literal("admin"), v.literal("agent"), v.literal("customer")),
    },
    handler: async (ctx, args) => {
        if (args.role === "agent") {
            return await ctx.db.query("couriers").withIndex("by_assignedTo", (q) => q.eq("assignedTo", args.userId)).order("desc").collect();
        } else if (args.role === "customer") {
            const user = await ctx.db.get(args.userId);
            if (!user || !user.phone) return [];
            const phone = user.phone;
            const sent = await ctx.db.query("couriers")
                .withIndex("by_senderPhone", q => q.eq("senderPhone", phone))
                .collect();
            const received = await ctx.db.query("couriers")
                .withIndex("by_receiverPhone", q => q.eq("receiverPhone", phone))
                .collect();
            const byName = await ctx.db.query("couriers")
                .withIndex("by_senderName", q => q.eq("senderName", user.name))
                .collect();
            const map = new Map<Id<"couriers">, any>();
            [...sent, ...received, ...byName].forEach(c => map.set(c._id, c));
            return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
        }
        return [];
    },
});

// --- Mutations ---

export const create = mutation({
    args: {
        senderName: v.string(),
        senderPhone: v.string(),
        receiverName: v.string(),
        receiverPhone: v.string(),
        pickupAddress: v.string(),
        deliveryAddress: v.string(),
        notes: v.optional(v.string()),
        weight: v.optional(v.number()),
        distance: v.optional(v.number()),
        price: v.optional(v.number()),
        branchId: v.optional(v.id("branches")),
        bookedBy: v.optional(v.id("users")),
        deliveryType: v.optional(v.union(v.literal("normal"), v.literal("express"))),
        // Coordinates for Haversine calculation
        pickupLat: v.optional(v.number()),
        pickupLng: v.optional(v.number()),
        deliveryLat: v.optional(v.number()),
        deliveryLng: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const trackingId = generateTrackingId();
        const otpCode = generateOTP();

        // 1. Logic for Haversine distance
        let distance = args.distance;
        if (!distance && args.pickupLat && args.pickupLng && args.deliveryLat && args.deliveryLng) {
            distance = calculateHaversine(args.pickupLat, args.pickupLng, args.deliveryLat, args.deliveryLng);
            // Add a small 20% multiplier for road-distance approximation over crow-flies
            distance = Math.round(distance * 1.2); 
        }

        // 2. Final Price Calculation
        const finalPrice = args.price || calculatePrice(args.weight, distance, args.deliveryType || "normal");

        const courierId = await ctx.db.insert("couriers", {
            senderName: args.senderName,
            senderPhone: args.senderPhone,
            receiverName: args.receiverName,
            receiverPhone: args.receiverPhone,
            pickupAddress: args.pickupAddress,
            deliveryAddress: args.deliveryAddress,
            notes: args.notes,
            weight: args.weight,
            distance: distance,
            price: finalPrice,
            branchId: args.branchId,
            bookedBy: args.bookedBy,
            deliveryType: args.deliveryType || "normal",
            trackingId,
            otpCode,
            currentStatus: "booked",
            paymentStatus: "pending",
            createdAt: now,
            updatedAt: now,
        });

        await ctx.db.insert("invoices", {
            courierId,
            invoiceNumber: generateInvoiceNumber(),
            amount: finalPrice,
            customerName: args.senderName,
            customerAddress: args.pickupAddress,
            status: "unpaid",
            generatedAt: now,
        });

        await ctx.db.insert("logs", { 
            courierId, 
            trackingId, 
            action: "created", 
            description: `Courier created. Distance: ${distance || 0}km. Price: ₹${finalPrice}`, 
            timestamp: now 
        });
        
        return courierId;
    },
});

export const update = mutation({
    args: {
        id: v.id("couriers"),
        senderName: v.optional(v.string()),
        receiverName: v.optional(v.string()),
        receiverPhone: v.optional(v.string()),
        pickupAddress: v.optional(v.string()),
        deliveryAddress: v.optional(v.string()),
        notes: v.optional(v.string()),
        weight: v.optional(v.number()),
        distance: v.optional(v.number()),
        price: v.optional(v.number()),
        branchId: v.optional(v.id("branches")),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const courier = await ctx.db.get(id);
        if (!courier) throw new Error("Not found");

        if (args.weight !== undefined || args.distance !== undefined) {
            const newPrice = calculatePrice(args.weight ?? courier.weight, args.distance ?? courier.distance, courier.deliveryType);
            (updates as any).price = newPrice;
        }

        const filtered: any = {};
        for (const [k, v] of Object.entries(updates)) if (v !== undefined) filtered[k] = v;

        await ctx.db.patch(id, { ...filtered, updatedAt: Date.now() });
        await ctx.db.insert("logs", { courierId: id, trackingId: courier.trackingId, action: "updated", description: "Courier details updated", timestamp: Date.now() });
    },
});

export const assignBranch = mutation({
    args: { id: v.id("couriers"), branchId: v.id("branches") },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Not found");
        await ctx.db.patch(args.id, { branchId: args.branchId, updatedAt: Date.now() });
        await ctx.db.insert("logs", { courierId: args.id, trackingId: courier.trackingId, action: "assigned", description: "Assigned to branch hub", timestamp: Date.now() });
    },
});

export const completeDelivery = mutation({
    args: {
        id: v.id("couriers"),
        signatureId: v.optional(v.string()),
        photoId: v.optional(v.string()),
        signeeName: v.string(),
        otpCode: v.string(),
    },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Not found");
        if (courier.otpCode && courier.otpCode !== args.otpCode) throw new Error("Invalid OTP");

        const podId = await ctx.db.insert("proofOfDelivery", {
            courierId: args.id,
            signatureId: args.signatureId,
            photoId: args.photoId,
            signeeName: args.signeeName,
            timestamp: Date.now(),
        });

        await ctx.db.patch(args.id, { currentStatus: "delivered", paymentStatus: "paid", podId, updatedAt: Date.now() });
    },
});

export const updateStatus = mutation({
    args: {
        id: v.id("couriers"),
        status: v.union(v.literal("booked"), v.literal("picked_up"), v.literal("pending"), v.literal("dispatched"), v.literal("in_transit"), v.literal("out_for_delivery"), v.literal("delivered"), v.literal("cancelled")),
    },
    handler: async (ctx, args) => {
        if (args.status === "delivered") throw new Error("Use POD flow");
        await ctx.db.patch(args.id, { currentStatus: args.status, updatedAt: Date.now() });
    },
});

export const cancelCourier = mutation({
    args: { id: v.id("couriers") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { currentStatus: "cancelled", updatedAt: Date.now() });
    },
});

export const markAsPaid = mutation({
    args: { id: v.id("couriers") },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        await ctx.db.patch(args.id, { paymentStatus: "paid", updatedAt: Date.now() });
    },
});

export const remove = mutation({
    args: { id: v.id("couriers") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
