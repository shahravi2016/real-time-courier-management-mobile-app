import { query } from "./_generated/server";
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
