import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    couriers: defineTable({
        trackingId: v.string(),
        senderName: v.string(),
        senderPhone: v.optional(v.string()),
        receiverName: v.string(),
        receiverPhone: v.string(),
        pickupAddress: v.string(),
        deliveryAddress: v.string(),
        currentStatus: v.union(
            v.literal("booked"),
            v.literal("pending"),
            v.literal("picked_up"),
            v.literal("dispatched"),
            v.literal("in_transit"),
            v.literal("out_for_delivery"),
            v.literal("delivered"),
            v.literal("cancelled")
        ),
        deliveryType: v.optional(v.union(v.literal("normal"), v.literal("express"))),
        notes: v.optional(v.string()),
        expectedDeliveryDate: v.optional(v.string()),

        // Billing & Invoice Details
        weight: v.optional(v.number()), // in kg
        distance: v.optional(v.number()), // in km
        price: v.optional(v.number()),
        paymentStatus: v.optional(v.union(v.literal("paid"), v.literal("unpaid"), v.literal("pending"))),
        paymentMethod: v.optional(v.union(v.literal("cash"), v.literal("card"), v.literal("prepaid"))),

        assignedTo: v.optional(v.id("users")), // Agent ID
        branchId: v.optional(v.id("branches")), // Branch ID
        otpCode: v.optional(v.string()), // 4-digit OTP for delivery
        bookedBy: v.optional(v.id("users")), // User ID who booked

        // References
        invoiceId: v.optional(v.id("invoices")),
        podId: v.optional(v.id("proofOfDelivery")),

        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_trackingId", ["trackingId"])
        .index("by_status", ["currentStatus"])
        .index("by_createdAt", ["createdAt"])
        .index("by_assignedTo", ["assignedTo"])
        .index("by_branchId", ["branchId"]),

    branches: defineTable({
        name: v.string(),
        address: v.string(),
        phone: v.optional(v.string()),
        managerId: v.optional(v.id("users")),
        createdAt: v.number(),
    })
        .index("by_name", ["name"]),

    users: defineTable({
        name: v.string(),
        email: v.string(),
        password: v.string(), // Hashed (in real app) or simple fallback for competition
        role: v.union(v.literal("admin"), v.literal("agent"), v.literal("customer")),
        phone: v.optional(v.string()),
        avatarId: v.optional(v.string()), // Storage ID for avatar
        createdAt: v.number(),
    })
        .index("by_email", ["email"])
        .index("by_role", ["role"]),

    invoices: defineTable({
        courierId: v.id("couriers"),
        invoiceNumber: v.string(),
        amount: v.number(),
        customerName: v.string(),
        customerAddress: v.string(),
        status: v.union(v.literal("paid"), v.literal("unpaid"), v.literal("void")),
        generatedAt: v.number(),
        pdfUrl: v.optional(v.string()),
    })
        .index("by_courierId", ["courierId"])
        .index("by_invoiceNumber", ["invoiceNumber"]),

    proofOfDelivery: defineTable({
        courierId: v.id("couriers"),
        signatureId: v.optional(v.string()), // Storage ID
        photoId: v.optional(v.string()), // Storage ID
        signeeName: v.string(),
        location: v.optional(v.object({
            latitude: v.number(),
            longitude: v.number(),
        })),
        timestamp: v.number(),
    })
        .index("by_courierId", ["courierId"]),

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
