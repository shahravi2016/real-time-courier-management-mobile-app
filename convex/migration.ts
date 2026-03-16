import { mutation } from "./_generated/server";

// Simulated Hashing (Must match auth.ts exactly)
const hashPassword = (p: string) => {
    const salt = "CONVEX_SALT_2026";
    const reversed = p.split('').reverse().join('');
    // Use a try-catch for environment compatibility
    try {
        return btoa(reversed + salt);
    } catch (e) {
        // Fallback for environments without btoa (like some Node versions)
        return Buffer.from(reversed + salt).toString('base64');
    }
};

const dehashPassword = (hashed: string) => {
    const salt = "CONVEX_SALT_2026";
    try {
        // 1. Decode Base64
        let decoded = "";
        if (typeof atob !== 'undefined') {
            decoded = atob(hashed);
        } else {
            decoded = Buffer.from(hashed, 'base64').toString('utf8');
        }

        // 2. Remove salt
        if (!decoded.endsWith(salt)) return hashed; // Not our hash format
        const unsalted = decoded.slice(0, -salt.length);

        // 3. Reverse back to original
        return unsalted.split('').reverse().join('');
    } catch (e) {
        return hashed; // Return as is if decoding fails
    }
};

/**
 * Run this mutation ONCE to secure all existing plain-text passwords.
 * It will detect if a password is already hashed and skip it.
 */
export const runPasswordMigration = mutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        let updatedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            // Heuristic: If it's already a base64 string of a certain length 
            // and contains our salt logic, skip it to avoid double-hashing.
            // (Most plain text passwords are short, btoa output is longer)
            if (user.password.length > 20 && user.password.endsWith('=')) {
                skippedCount++;
                continue;
            }

            const newHashedPassword = hashPassword(user.password);
            await ctx.db.patch(user._id, {
                password: newHashedPassword
            });
            updatedCount++;
        }

        return {
            success: true,
            message: `Migration complete. Updated: ${updatedCount}, Skipped: ${skippedCount}`,
        };
    },
});

/**
 * REVERT: Run this to turn "hashed" passwords back into plain text.
 */
export const revertPasswordHashing = mutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        let revertedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            // If it looks like a base64 hash from our logic
            if (user.password.length > 20 && user.password.endsWith('=')) {
                const plainText = dehashPassword(user.password);
                if (plainText !== user.password) {
                    await ctx.db.patch(user._id, {
                        password: plainText
                    });
                    revertedCount++;
                    continue;
                }
            }
            skippedCount++;
        }

        return {
            success: true,
            message: `Revert complete. Reverted: ${revertedCount}, Skipped: ${skippedCount}`,
        };
    },
});
