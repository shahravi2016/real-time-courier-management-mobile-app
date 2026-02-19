import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Login action
export const login = query({
    args: {
        email: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (!user || user.password !== args.password) {
            return null;
        }

        return user;
    },
});

// Register action (for Admin usage or initial setup)
export const register = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        password: v.string(),
        role: v.union(v.literal("admin"), v.literal("agent"), v.literal("customer")),
        phone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existing) {
            throw new Error("Email already registered");
        }

        const userId = await ctx.db.insert("users", {
            name: args.name,
            email: args.email,
            password: args.password,
            role: args.role,
            phone: args.phone,
            createdAt: Date.now(),
        });

        return userId;
    },
});

// Get user by ID
export const getUser = query({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
