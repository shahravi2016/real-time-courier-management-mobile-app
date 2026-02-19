import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    couriers: defineTable({
        trackingId: v.string(),
        senderName: v.string(),
        receiverName: v.string(),
        receiverPhone: v.string(),
        pickupAddress: v.string(),
        deliveryAddress: v.string(),
        currentStatus: v.union(
            v.literal("pending"),
            v.literal("picked_up"),
            v.literal("in_transit"),
            v.literal("out_for_delivery"),
            v.literal("delivered"),
            v.literal("cancelled")
        ),
        notes: v.optional(v.string()),
        expectedDeliveryDate: v.optional(v.string()),

        // Billing & Invoice Details
        weight: v.optional(v.number()), // in kg
        distance: v.optional(v.number()), // in km
        price: v.optional(v.number()),
        paymentStatus: v.optional(v.union(v.literal("paid"), v.literal("unpaid"), v.literal("pending"))),

        assignedTo: v.optional(v.id("users")), // Agent ID

        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_trackingId", ["trackingId"])
        .index("by_status", ["currentStatus"])
        .index("by_createdAt", ["createdAt"])
        .index("by_assignedTo", ["assignedTo"]),

    users: defineTable({
        name: v.string(),
        email: v.string(),
        password: v.string(), // Hashed (in real app) or simple fallback for competition
        role: v.union(v.literal("admin"), v.literal("agent"), v.literal("customer")),
        phone: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_email", ["email"])
        .index("by_role", ["role"]),

    logs: defineTable({
        courierId: v.optional(v.id("couriers")),
        trackingId: v.string(),
        action: v.string(), // 'created', 'updated', 'status_changed', 'deleted'
        description: v.string(),
        performedBy: v.optional(v.id("users")),
        timestamp: v.number(),
    })
        .index("by_courierId", ["courierId"])
        .index("by_trackingId", ["trackingId"])
        .index("by_timestamp", ["timestamp"]),
});
