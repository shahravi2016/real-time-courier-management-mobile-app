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
