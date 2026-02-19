import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all branches
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("branches")
            .order("desc")
            .collect();
    },
});

// Create a new branch
export const create = mutation({
    args: {
        name: v.string(),
        address: v.string(),
        phone: v.optional(v.string()),
        managerId: v.optional(v.id("users")),
    },
    handler: async (ctx, args) => {
        const branchId = await ctx.db.insert("branches", {
            name: args.name,
            address: args.address,
            phone: args.phone,
            managerId: args.managerId,
            createdAt: Date.now(),
        });
        return branchId;
    },
});

// Update branch details
export const update = mutation({
    args: {
        id: v.id("branches"),
        name: v.optional(v.string()),
        address: v.optional(v.string()),
        phone: v.optional(v.string()),
        managerId: v.optional(v.id("users")),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const filteredUpdates: Record<string, any> = {};
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                filteredUpdates[key] = value;
            }
        }
        await ctx.db.patch(id, filteredUpdates);
    },
});

// Delete branch
export const remove = mutation({
    args: { id: v.id("branches") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
