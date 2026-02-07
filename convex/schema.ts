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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_trackingId", ["trackingId"])
    .index("by_status", ["currentStatus"])
    .index("by_createdAt", ["createdAt"]),
});
