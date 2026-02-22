import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAgents = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "agent"))
            .collect();
    },
});

export const listManagers = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "branch_manager"))
            .collect();
    },
});

export const listAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("users").order("desc").collect();
    },
});

export const createManager = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        password: v.string(),
        phone: v.optional(v.string()),
        branchId: v.id("branches"),
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
            role: "branch_manager",
            phone: args.phone,
            branchId: args.branchId,
            createdAt: Date.now(),
        });

        // Update the branch to set this user as manager
        await ctx.db.patch(args.branchId, {
            managerId: userId,
        });

        return userId;
    },
});

export const createAgent = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        password: v.string(),
        phone: v.optional(v.string()),
        branchId: v.optional(v.id("branches")),
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
            role: "agent",
            phone: args.phone,
            branchId: args.branchId,
            createdAt: Date.now(),
        });

        return userId;
    },
});

export const updateProfile = mutation({
    args: {
        id: v.id("users"),
        name: v.string(),
        phone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Enforce that only the user themselves can update their profile
        // Since we're not using real auth context in this simplified version,
        // we'll just allow the patch for now. In a real app, verify ctx.auth.
        const user = await ctx.db.get(args.id);
        if (!user) {
            throw new Error("User not found");
        }

        await ctx.db.patch(args.id, {
            name: args.name,
            phone: args.phone,
        });

        return true;
    },
});

export const updateBranch = mutation({
    args: {
        id: v.id("users"),
        branchId: v.id("branches"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            branchId: args.branchId,
        });
        return true;
    },
});

export const removeUser = mutation({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.id);
        if (!user) return;

        // If it's a branch manager, clear the managerId from the branch
        if (user.role === "branch_manager" && user.branchId) {
            await ctx.db.patch(user.branchId, {
                managerId: undefined,
            });
        }

        await ctx.db.delete(args.id);
    },
});
