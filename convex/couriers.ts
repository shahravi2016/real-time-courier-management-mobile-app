import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// --- Helpers ---
const normalizePhone = (p: string) => p.replace(/\D/g, "");

async function checkAuthority(ctx: any, userId: Id<"users"> | undefined, courier: any) {
    if (!userId) throw new Error("Authentication required");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    
    if (user.role === "admin") return true; // Admins have global access
    
    if (user.role === "branch_manager") {
        // Manager can touch parcels if they are current, origin, or destination
        const isCurrentBranch = courier.branchId && courier.branchId === user.branchId;
        const isOrigin = courier.originBranch && courier.originBranch === user.branchId;
        const isDestination = courier.destinationBranch && courier.destinationBranch === user.branchId;
        const isUnassigned = !courier.branchId;
        
        if (!isCurrentBranch && !isOrigin && !isDestination && !isUnassigned) {
            throw new Error("Security Violation: Access Denied. Parcel belongs to another branch.");
        }
        return true;
    }
    
    if (user.role === "agent") {
        if (courier.assignedTo !== userId) throw new Error("Access Denied: This parcel is not assigned to you.");
        return true;
    }

    throw new Error("Unauthorized action.");
}

function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

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

const BASE_RATE = 100; 
const WEIGHT_RATE = 10; 
const DISTANCE_RATE = 3; 

function calculatePrice(weight?: number, distance?: number, type?: "normal" | "express") {
    let subtotal = BASE_RATE;
    if (weight) subtotal += weight * WEIGHT_RATE;
    if (distance) subtotal += distance * DISTANCE_RATE;
    
    let total = subtotal;
    if (type === "express") {
        total += subtotal * 0.5; // 50% express surcharge
    }
    
    // Add 18% GST
    total += total * 0.18;
    
    return Math.round(total);
}

// --- Storage Logic ---

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

// --- Queries ---

export const list = query({
    args: { 
        branchId: v.optional(v.id("branches")),
        unassignedOnly: v.optional(v.boolean()),
        userId: v.optional(v.id("users")), // NEW: To identify requester role
    },
    handler: async (ctx, args) => {
        let requesterBranchId = args.branchId;

        // If a userId is provided, check if they are a Branch Manager to enforce security
        if (args.userId) {
            const user = await ctx.db.get(args.userId);
            if (user && user.role === "branch_manager") {
                requesterBranchId = user.branchId;
            }
        }

        if (args.unassignedOnly) {
            return await ctx.db
                .query("couriers")
                .filter(q => q.eq(q.field("branchId"), undefined))
                .order("desc")
                .collect();
        }

        if (requesterBranchId) {
            const myBranch = await ctx.db
                .query("couriers")
                .withIndex("by_branchId", (q) => q.eq("branchId", requesterBranchId))
                .collect();
            
            // Branch managers also need to see unassigned parcels to pick them up
            const unassigned = await ctx.db
                .query("couriers")
                .filter(q => q.eq(q.field("branchId"), undefined))
                .collect();

            // Combine and sort (manual sort because of filter/index combo)
            return [...myBranch, ...unassigned].sort((a, b) => b.createdAt - a.createdAt);
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
            if (!user) return null;

            if (user.role === "customer") {
                const uPhone = normalizePhone(user.phone || "");
                const sPhone = normalizePhone(courier.senderPhone || "");
                const rPhone = normalizePhone(courier.receiverPhone);
                const isOwner = sPhone === uPhone || rPhone === uPhone || courier.senderName === user.name;
                if (!isOwner) return null;
            } else if (user.role === "agent") {
                if (courier.assignedTo !== args.userId && courier.branchId !== user.branchId) return null;
            } else if (user.role === "branch_manager") {
                // Expanded Branch Manager Security: Current, Origin, or Destination
                const isCurrent = courier.branchId && courier.branchId === user.branchId;
                const isOrigin = courier.originBranch && courier.originBranch === user.branchId;
                const isDest = courier.destinationBranch && courier.destinationBranch === user.branchId;
                if (!isCurrent && !isOrigin && !isDest) return null;
            }
        }

        let pod = null;
        if (courier.podId) {
            const podData = await ctx.db.get(courier.podId);
            if (podData) {
                const getSafeUrl = async (idOrBase64?: string) => {
                    if (!idOrBase64) return null;
                    const val = idOrBase64.trim();
                    if (val.startsWith('data:image') || val.length > 500) return val;
                    try {
                        return await ctx.storage.getUrl(val);
                    } catch (e) {
                        return null;
                    }
                };
                pod = {
                    ...podData,
                    signatureUrl: await getSafeUrl(podData.signatureId),
                    photoUrl: await getSafeUrl(podData.photoId),
                };
            }
        }

        // Smart Invoice Search: Try to find by link first, then by courierId
        let invoice = courier.invoiceId ? await ctx.db.get(courier.invoiceId) : null;
        if (!invoice) {
            invoice = await ctx.db.query("invoices").withIndex("by_courierId", q => q.eq("courierId", args.id)).first();
        }

        let agentName = null;
        if (courier.assignedTo) {
            const agent = await ctx.db.get(courier.assignedTo);
            if (agent) agentName = agent.name;
        }

        return { ...courier, pod, invoice, agentName };
    },
});

export const getStats = query({
    args: { branchId: v.optional(v.id("branches")) },
    handler: async (ctx, args) => {
        let all;
        let revenue = 0;

        if (args.branchId) {
            const branchId = args.branchId;
            // Persistence: Origin or Destination or Current
            const originC = await ctx.db.query("couriers").withIndex("by_originBranch", q => q.eq("originBranch", branchId)).collect();
            const destC = await ctx.db.query("couriers").withIndex("by_destinationBranch", q => q.eq("destinationBranch", branchId)).collect();
            const currentC = await ctx.db.query("couriers").withIndex("by_branchId", q => q.eq("branchId", branchId)).collect();

            const map = new Map<Id<"couriers">, any>();
            [...originC, ...destC, ...currentC].forEach(c => map.set(c._id, c));
            all = Array.from(map.values());

            const earnings = await ctx.db.query("branchEarnings").withIndex("by_branchId", q => q.eq("branchId", branchId)).collect();
            revenue = earnings.reduce((sum, e) => sum + e.amount, 0);
        } else {
            all = await ctx.db.query("couriers").collect();
            revenue = all.filter(c => c.currentStatus === "delivered").reduce((sum, c) => sum + (c.price || 0), 0);
        }

        const needsAttention = all.filter(c => c.currentStatus === "booked" && !c.branchId).length;

        return {
            total: all.length,
            booked: all.filter(c => c.currentStatus === "booked").length,
            pickedUp: all.filter(c => c.currentStatus === "picked_up").length,
            dispatched: all.filter(c => c.currentStatus === "dispatched").length,
            delivered: all.filter(c => c.currentStatus === "delivered").length,
            needsAttention,
            revenue,
        };
    },
});

export const getAdminDashboardStats = query({
    args: {},
    handler: async (ctx) => {
        const allCouriers = await ctx.db.query("couriers").collect();
        const allBranches = await ctx.db.query("branches").collect();
        const allEarnings = await ctx.db.query("branchEarnings").collect();
        
        const branchContribution = allBranches.map(b => {
            const branchEarnings = allEarnings.filter(e => e.branchId === b._id);
            // Persistent count: Involved in any way
            const branchCouriers = allCouriers.filter(c => c.originBranch === b._id || c.destinationBranch === b._id || c.branchId === b._id);
            
            let revenue = branchEarnings.reduce((sum, e) => sum + e.amount, 0);
            
            // Fallback for branch contribution if NO earnings are recorded yet
            if (allEarnings.length === 0) {
                // Estimate 45% for origin branches and 45% for destination branches
                const asOrigin = allCouriers.filter(c => c.originBranch === b._id && c.currentStatus === "delivered");
                const asDest = allCouriers.filter(c => c.destinationBranch === b._id && c.currentStatus === "delivered");
                revenue = asOrigin.reduce((sum, c) => sum + (c.price || 0) * 0.45, 0) + 
                          asDest.reduce((sum, c) => sum + (c.price || 0) * 0.45, 0);
            }

            return {
                name: b.name,
                count: branchCouriers.length,
                revenue: Math.round(revenue)
            };
        });
        
        const now = Date.now();
        const last30Days = now - (30 * 24 * 60 * 60 * 1000);
        
        const formatDate = (ts: number) => {
            const d = new Date(ts);
            return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
        };

        // Standardized Day buckets (Last 7 days for mobile visibility)
        const dayLabels = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now - (6 - i) * 24 * 60 * 60 * 1000);
            return formatDate(d.getTime());
        });

        const ordersByDate = allCouriers.filter(c => c.createdAt >= (now - 7 * 24 * 60 * 60 * 1000)).reduce((acc: any, c) => {
            const day = formatDate(c.createdAt);
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});

        // Combine ledger earnings + historical estimates (if no ledger entries exist for a courier)
        const revenueByDate = dayLabels.reduce((acc: any, day) => {
            acc[day] = 0;
            return acc;
        }, {});

        // 1. Add from Ledger
        allEarnings.filter(e => e.timestamp >= (now - 7 * 24 * 60 * 60 * 1000)).forEach(e => {
            const day = formatDate(e.timestamp);
            if (revenueByDate[day] !== undefined) revenueByDate[day] += e.amount;
        });

        // 2. Fallback for historical (delivered but no ledger entries)
        // If there are NO ledger entries at all, use 100% of price as estimate for the graph
        if (allEarnings.length === 0) {
            allCouriers.filter(c => c.currentStatus === "delivered" && c.createdAt >= (now - 7 * 24 * 60 * 60 * 1000)).forEach(c => {
                const day = formatDate(c.createdAt);
                if (revenueByDate[day] !== undefined) revenueByDate[day] += (c.price || 0);
            });
        }

        const monthlyOrders = dayLabels.map(label => ({ label, value: ordersByDate[label] || 0 }));
        const revenueTrends = dayLabels.map(label => ({ label, value: revenueByDate[label] || 0 }));

        return {
            global: {
                total: allCouriers.length,
                revenue: allEarnings.length > 0 
                    ? allEarnings.reduce((sum, e) => sum + e.amount, 0)
                    : allCouriers.filter(c => c.currentStatus === "delivered").reduce((sum, c) => sum + (c.price || 0), 0),
            },
            branchContribution,
            monthlyOrders,
            revenueTrends
        };
    },
});

export const getBranchDashboardStats = query({
    args: { branchId: v.id("branches") },
    handler: async (ctx, args) => {
        // Persistence: Combine couriers where this branch was origin, destination, or current
        const originC = await ctx.db.query("couriers").withIndex("by_originBranch", q => q.eq("originBranch", args.branchId)).collect();
        const destC = await ctx.db.query("couriers").withIndex("by_destinationBranch", q => q.eq("destinationBranch", args.branchId)).collect();
        const currentC = await ctx.db.query("couriers").withIndex("by_branchId", q => q.eq("branchId", args.branchId)).collect();
        
        const map = new Map<Id<"couriers">, any>();
        [...originC, ...destC, ...currentC].forEach(c => map.set(c._id, c));
        const myCouriers = Array.from(map.values());

        const now = Date.now();
        
        const formatDate = (ts: number) => {
            const d = new Date(ts);
            return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
        };

        const dayLabels = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now - (6 - i) * 24 * 60 * 60 * 1000);
            return formatDate(d.getTime());
        });

        const ordersByDate = myCouriers.filter(c => c.createdAt >= (now - 7 * 24 * 60 * 60 * 1000)).reduce((acc: any, c) => {
            const day = formatDate(c.createdAt);
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});

        // Revenue from EARNINGS table (Persistent 45% share)
        const earnings = await ctx.db.query("branchEarnings")
            .withIndex("by_branchId", q => q.eq("branchId", args.branchId))
            .collect();
        
        const revenueByDate = dayLabels.reduce((acc: any, day) => {
            acc[day] = 0;
            return acc;
        }, {});

        earnings.filter(e => e.timestamp >= (now - 7 * 24 * 60 * 60 * 1000)).forEach(e => {
            const day = formatDate(e.timestamp);
            if (revenueByDate[day] !== undefined) revenueByDate[day] += e.amount;
        });

        // Fallback for historical (if no earnings recorded yet, show potential revenue from delivered)
        if (earnings.length === 0) {
            myCouriers.filter(c => c.currentStatus === "delivered" && c.createdAt >= (now - 7 * 24 * 60 * 60 * 1000)).forEach(c => {
                const day = formatDate(c.createdAt);
                if (revenueByDate[day] !== undefined) revenueByDate[day] += (c.price || 0) * 0.45; // Assume 45% origin share
            });
        }

        return {
            statusCounts: {
                booked: myCouriers.filter(c => c.currentStatus === "booked").length,
                inTransit: myCouriers.filter(c => ["in_transit", "dispatched"].includes(c.currentStatus)).length,
                outForDelivery: myCouriers.filter(c => c.currentStatus === "out_for_delivery").length,
                delivered: myCouriers.filter(c => c.currentStatus === "delivered").length,
            },
            monthlyOrders: dayLabels.map(label => ({ label, value: ordersByDate[label] || 0 })),
            branchRevenue: earnings.length > 0 
                ? earnings.reduce((sum, e) => sum + e.amount, 0)
                : myCouriers.filter(c => c.currentStatus === "delivered").reduce((sum, c) => sum + (c.price || 0) * 0.45, 0),
            revenueTrends: dayLabels.map(label => ({ label, value: revenueByDate[label] || 0 })),
        };
    },
});

export const getAgentStats = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const myJobs = await ctx.db.query("couriers").withIndex("by_assignedTo", q => q.eq("assignedTo", args.userId)).collect();
        const earnings = await ctx.db.query("agentEarnings").withIndex("by_agentId", q => q.eq("agentId", args.userId)).collect();
        const activeJobs = myJobs.filter(j => !["delivered", "cancelled"].includes(j.currentStatus));
        
        return {
            totalJobs: myJobs.length,
            activeJobs: activeJobs.length,
            completedJobs: myJobs.filter(j => j.currentStatus === "delivered").length,
            earnings: earnings.reduce((sum, e) => sum + e.amount, 0),
            pendingEarnings: activeJobs.reduce((sum, j) => sum + Math.floor((j.price || 0) * 0.10), 0),
            target: myJobs.filter(j => j.currentStatus === "delivered").length + 10,
        };
    },
});

export const getCustomerStats = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user || !user.phone) return { inTransit: 0, delivered: 0, pending: 0, total: 0 };
        const phone = user.phone;
        const sent = await ctx.db.query("couriers").withIndex("by_senderPhone", q => q.eq("senderPhone", phone)).collect();
        const received = await ctx.db.query("couriers").withIndex("by_receiverPhone", q => q.eq("receiverPhone", phone)).collect();
        const byName = await ctx.db.query("couriers").withIndex("by_senderName", q => q.eq("senderName", user.name)).collect();
        const map = new Map<Id<"couriers">, any>();
        [...sent, ...received, ...byName].forEach(c => map.set(c._id, c));
        const myParcels = Array.from(map.values());
        return {
            inTransit: myParcels.filter(c => ["in_transit", "dispatched", "out_for_delivery"].includes(c.currentStatus)).length,
            delivered: myParcels.filter(c => c.currentStatus === "delivered").length,
            pending: myParcels.filter(c => ["booked", "picked_up"].includes(c.currentStatus)).length,
            total: myParcels.length,
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
            const sent = await ctx.db.query("couriers").withIndex("by_senderPhone", q => q.eq("senderPhone", phone)).collect();
            const received = await ctx.db.query("couriers").withIndex("by_receiverPhone", q => q.eq("receiverPhone", phone)).collect();
            const byName = await ctx.db.query("couriers").withIndex("by_senderName", q => q.eq("senderName", user.name)).collect();
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
        originBranch: v.optional(v.id("branches")),
        destinationBranch: v.optional(v.id("branches")),
        bookedBy: v.optional(v.id("users")),
        deliveryType: v.optional(v.union(v.literal("normal"), v.literal("express"))),
        pickupLat: v.optional(v.number()),
        pickupLng: v.optional(v.number()),
        deliveryLat: v.optional(v.number()),
        deliveryLng: v.optional(v.number()),
        paymentMethod: v.optional(v.union(v.literal("cash"), v.literal("card"), v.literal("prepaid"))),
    },
    handler: async (ctx, args) => {
        // Validation: Unique phone and address
        const sPhone = normalizePhone(args.senderPhone);
        const rPhone = normalizePhone(args.receiverPhone);
        if (sPhone === rPhone) throw new Error("Sender and Receiver phone numbers cannot be the same.");
        
        if (args.pickupAddress.trim().toLowerCase() === args.deliveryAddress.trim().toLowerCase()) {
            throw new Error("Pickup and Delivery addresses cannot be the same.");
        }

        const now = Date.now();
        const trackingId = generateTrackingId();
        const otpCode = generateOTP();
        let distance = args.distance;
        if (!distance && args.pickupLat && args.pickupLng && args.deliveryLat && args.deliveryLng) {
            distance = calculateHaversine(args.pickupLat, args.pickupLng, args.deliveryLat, args.deliveryLng);
            distance = Math.round(distance * 1.2); 
        }
        const finalPrice = args.price || calculatePrice(args.weight, distance, args.deliveryType || "normal");
        
        // 1. Insert Courier
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
            paymentMethod: args.paymentMethod || "cash",
            branchId: args.originBranch || args.branchId, // Sync with origin
            originBranch: args.originBranch,
            destinationBranch: args.destinationBranch,
            currentBranch: args.originBranch || args.branchId,
            bookedBy: args.bookedBy,
            deliveryType: args.deliveryType || "normal",
            trackingId,
            otpCode,
            currentStatus: "booked",
            paymentStatus: "pending",
            createdAt: now,
            updatedAt: now,
        });

        // 1.5 Insert Created Log FIRST
        await ctx.db.insert("logs", { 
            courierId, trackingId, action: "created", 
            description: `Courier created. Distance: ${distance || 0}km. Price: ₹${finalPrice}`, 
            timestamp: now 
        });

        // 1.6 Auto-assign Agent for Pickup
        let assignedAgentId = undefined;
        let initialStatus: any = "booked";
        const currentBranchValue = args.originBranch || args.branchId;
        if (currentBranchValue) {
            const agents = await ctx.db.query("users")
                .withIndex("by_branchId", q => q.eq("branchId", currentBranchValue))
                .filter(q => q.eq(q.field("role"), "agent"))
                .collect();
            
            if (agents.length > 0) {
                const randomAgent = agents[Math.floor(Math.random() * agents.length)];
                assignedAgentId = randomAgent._id;
                initialStatus = "pickup_assigned";
                
                await ctx.db.patch(courierId, {
                    assignedTo: assignedAgentId,
                    currentStatus: initialStatus,
                });
                
                await ctx.db.insert("logs", {
                    courierId, trackingId, action: "assigned",
                    description: `Agent auto-assigned for pickup`,
                    timestamp: now + 1, // Ensure this appears after 'created'
                });
            }
        }

        // 2. Insert Invoice
        const invoiceId = await ctx.db.insert("invoices", {
            courierId,
            invoiceNumber: generateInvoiceNumber(),
            amount: finalPrice,
            customerName: args.senderName,
            customerAddress: args.pickupAddress,
            status: "unpaid",
            generatedAt: now,
        });

        // 3. Link Invoice back to Courier
        await ctx.db.patch(courierId, { invoiceId });

        return courierId;
    },
});

export const update = mutation({
    args: {
        id: v.id("couriers"),
        senderName: v.optional(v.string()),
        senderPhone: v.optional(v.string()),
        receiverName: v.optional(v.string()),
        receiverPhone: v.optional(v.string()),
        pickupAddress: v.optional(v.string()),
        deliveryAddress: v.optional(v.string()),
        notes: v.optional(v.string()),
        weight: v.optional(v.number()),
        distance: v.optional(v.number()),
        price: v.optional(v.number()),
        branchId: v.optional(v.id("branches")),
        deliveryType: v.optional(v.union(v.literal("normal"), v.literal("express"))),
        userId: v.optional(v.id("users")), // NEW: Requester ID
    },
    handler: async (ctx, args) => {
        const { id, userId, ...updates } = args;
        const courier = await ctx.db.get(id);
        if (!courier) throw new Error("Not found");

        // NEW: Security Check for Branch Managers
        if (userId) {
            const requester = await ctx.db.get(userId);
            if (requester && requester.role === "branch_manager") {
                if (courier.branchId && courier.branchId !== requester.branchId) {
                    throw new Error("Access Denied: You do not have permission to edit parcels from other branches.");
                }
            }
        }

        // Loophole Protection 1: Prevent any edits on Delivered parcels
        if (courier.currentStatus === "delivered") {
            throw new Error("Cannot edit details of a delivered parcel. Integrity Lock active.");
        }

        // Loophole Protection 2: Prevent price-affecting changes once parcel is in movement
        const isMoving = !["booked", "pending", "cancelled"].includes(courier.currentStatus);
        const changingPriceFields = args.weight !== undefined || args.deliveryType !== undefined || args.distance !== undefined;
        
        // ALLOW staff (Admins/Managers) to update weight even if moving
        const requester = userId ? await ctx.db.get(userId) : null;
        const isStaff = requester && (requester.role === "admin" || requester.role === "branch_manager");

        if (isMoving && changingPriceFields && !isStaff) {
            throw new Error(`Cannot change weight or service type once parcel is '${courier.currentStatus}'. Use 'Restoration' flow from Cancelled state if needed.`);
        }

        // Loophole Protection 3: Recalculate price if fields change
        if (changingPriceFields) {
            const newPrice = calculatePrice(
                args.weight ?? courier.weight, 
                args.distance ?? courier.distance, 
                args.deliveryType ?? courier.deliveryType
            );
            (updates as any).price = newPrice;

            // Sync with Invoices table (Item 1)
            const invoice = await ctx.db.query("invoices").withIndex("by_courierId", q => q.eq("courierId", id)).first();
            if (invoice) {
                await ctx.db.patch(invoice._id, { amount: newPrice });
            }
        }

        const filtered: any = {};
        for (const [k, v] of Object.entries(updates)) if (v !== undefined) filtered[k] = v;
        
        await ctx.db.patch(id, { ...filtered, updatedAt: Date.now() });
        
        await ctx.db.insert("logs", { 
            courierId: id, 
            trackingId: courier.trackingId, 
            action: "updated", 
            description: "Courier details modified by staff", 
            timestamp: Date.now() 
        });
    },
});

export const assignBranch = mutation({
    args: { 
        id: v.id("couriers"), 
        branchId: v.id("branches"),
        userId: v.optional(v.id("users"))
    },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Not found");
        
        if (args.userId) await checkAuthority(ctx, args.userId, courier);

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
        
        // Agent security check happens implicitly via assignedTo check if we added userId,
        // but for delivery completion, the OTP is the primary security factor.

        if (courier.otpCode && courier.otpCode !== args.otpCode) throw new Error("Invalid OTP");

        const podId = await ctx.db.insert("proofOfDelivery", {
            courierId: args.id,
            signatureId: args.signatureId,
            photoId: args.photoId,
            signeeName: args.signeeName,
            timestamp: Date.now(),
        });

        await ctx.db.patch(args.id, { 
            currentStatus: "delivered", 
            paymentStatus: "paid", 
            podId, 
            updatedAt: Date.now() 
        });
        
        if (courier.invoiceId) {
            await ctx.db.patch(courier.invoiceId, { status: "paid" });
        }
        
        await ctx.db.insert("logs", {
            courierId: args.id, trackingId: courier.trackingId, action: "status_changed",
            description: "Delivery completed successfully",
            timestamp: Date.now()
        });

        // Revenue Sharing Logic (45/45/10 split)
        const totalPrice = courier.price || 0;
        if (totalPrice > 0) {
            const branchShare = Math.floor(totalPrice * 0.45);
            const agentShare = Math.floor(totalPrice * 0.10);
            const now = Date.now();

            // Check existing earnings to avoid duplicates (Origin might be recorded at pickup)
            const existing = await ctx.db.query("branchEarnings")
                .withIndex("by_courierId", q => q.eq("courierId", args.id))
                .collect();
            
            const hasOrigin = existing.some(e => e.shareType === "origin");
            const hasDest = existing.some(e => e.shareType === "destination");

            // 1. Origin Branch Share (If missed during pickup flow)
            if (!hasOrigin) {
                const originId = courier.originBranch || courier.branchId;
                if (originId) {
                    await ctx.db.insert("branchEarnings", {
                        branchId: originId,
                        courierId: args.id,
                        amount: branchShare,
                        shareType: "origin",
                        timestamp: now,
                    });
                }
            }

            // 2. Destination Branch Share
            if (!hasDest) {
                const destId = courier.destinationBranch || courier.branchId;
                if (destId) {
                    await ctx.db.insert("branchEarnings", {
                        branchId: destId,
                        courierId: args.id,
                        amount: branchShare,
                        shareType: "destination",
                        timestamp: now,
                    });
                }
            }

            // 3. Agent Share (Always at delivery)
            if (courier.assignedTo) {
                await ctx.db.insert("agentEarnings", {
                    agentId: courier.assignedTo,
                    courierId: args.id,
                    amount: agentShare,
                    timestamp: now,
                });
            }
        }
    },
});

export const assignAgent = mutation({
    args: { 
        id: v.id("couriers"), 
        agentId: v.id("users"),
        userId: v.optional(v.id("users")) 
    },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Not found");

        if (args.userId) {
            await checkAuthority(ctx, args.userId, courier);
            
            const requester = await ctx.db.get(args.userId);
            if (requester && requester.role === "branch_manager") {
                const agent = await ctx.db.get(args.agentId);
                if (!agent || agent.branchId !== requester.branchId) {
                    throw new Error("Security Violation: Branch Managers can only assign agents from their own branch.");
                }
            }
        }

        await ctx.db.patch(args.id, { assignedTo: args.agentId, updatedAt: Date.now() });
        await ctx.db.insert("logs", { 
            courierId: args.id, 
            trackingId: courier.trackingId, 
            action: "assigned", 
            description: `Assigned to delivery agent`, 
            timestamp: Date.now() 
        });
    },
});

export const updateStatus = mutation({
    args: {
        id: v.id("couriers"),
        status: v.union(v.literal("booked"), v.literal("pickup_assigned"), v.literal("picked_up"), v.literal("pending"), v.literal("dispatched"), v.literal("in_transit"), v.literal("out_for_delivery"), v.literal("delivered"), v.literal("cancelled")),
        userId: v.optional(v.id("users")),
    },
    handler: async (ctx, args) => {
        if (args.status === "delivered") throw new Error("Use POD flow");
        
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Not found");

        if (args.userId) await checkAuthority(ctx, args.userId, courier);

        if (args.status === "cancelled") {
            const allowedStatuses = ["booked", "pending"];
            if (!allowedStatuses.includes(courier.currentStatus)) {
                throw new Error(`Cancellation not allowed. Parcel is already in '${courier.currentStatus}' state.`);
            }
        }

        const isRestoring = courier.currentStatus === "cancelled" && args.status === "booked";
        const description = isRestoring 
            ? "Booking restored and re-posted to system" 
            : `Status updated to ${args.status.replace('_', ' ')}`;

        const patch: any = { currentStatus: args.status, updatedAt: Date.now() };
        if (isRestoring) patch.assignedTo = undefined; 

        await ctx.db.patch(args.id, patch);
        
        await ctx.db.insert("logs", { 
            courierId: args.id, 
            trackingId: courier.trackingId, 
            action: isRestoring ? "restored" : "status_changed", 
            description, 
            timestamp: Date.now() 
        });
    },
});

export const cancelCourier = mutation({
    args: { 
        id: v.id("couriers"),
        userId: v.optional(v.id("users"))
    },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Courier not found");
        
        // If not explicit admin/manager, check if it's the customer owner
        if (args.userId) {
            const user = await ctx.db.get(args.userId);
            if (user && user.role !== "admin" && user.role !== "branch_manager") {
                const uPhone = normalizePhone(user.phone || "");
                const sPhone = normalizePhone(courier.senderPhone || "");
                if (uPhone !== sPhone && courier.senderName !== user.name) {
                    throw new Error("Access Denied: You can only cancel your own bookings.");
                }
            } else if (args.userId) {
                await checkAuthority(ctx, args.userId, courier);
            }
        }

        const allowedStatuses = ["booked", "pending"];
        if (!allowedStatuses.includes(courier.currentStatus)) {
            throw new Error(`Cancellation not allowed. Parcel is already in '${courier.currentStatus}' state.`);
        }

        await ctx.db.patch(args.id, { currentStatus: "cancelled", updatedAt: Date.now(), assignedTo: undefined });
        
        await ctx.db.insert("logs", { 
            courierId: args.id, 
            trackingId: courier.trackingId, 
            action: "status_changed", 
            description: "Courier cancelled", 
            timestamp: Date.now() 
        });
    },
});

export const markPickedUp = mutation({
    args: {
        id: v.id("couriers"),
        agentId: v.id("users")
    },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Not found");
        if (courier.assignedTo !== args.agentId) throw new Error("Not assigned to you");
        
        await ctx.db.patch(args.id, {
            currentStatus: "picked_up",
            updatedAt: Date.now()
        });

        // Incremental Revenue: Record Origin Share at Pickup
        const originId = courier.originBranch || courier.branchId;
        if (originId && (courier.price || 0) > 0) {
            // Safeguard: Check if already exists (highly unlikely at this stage but good for idempotent)
            const existing = await ctx.db.query("branchEarnings")
                .withIndex("by_courierId", q => q.eq("courierId", args.id))
                .collect();
            const hasOrigin = existing.some(e => e.shareType === "origin");
            
            if (!hasOrigin) {
                await ctx.db.insert("branchEarnings", {
                    branchId: originId,
                    courierId: args.id,
                    amount: Math.floor((courier.price || 0) * 0.45),
                    shareType: "origin",
                    timestamp: Date.now(),
                });
            }
        }
        
        await ctx.db.insert("logs", {
            courierId: args.id, trackingId: courier.trackingId, action: "status_changed",
            description: "Parcel picked up by agent",
            timestamp: Date.now(),
            performedBy: args.agentId
        });
    }
});

export const transferToDestination = mutation({
    args: {
        id: v.id("couriers"),
        managerId: v.optional(v.id("users"))
    },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Not found");
        if (args.managerId) await checkAuthority(ctx, args.managerId, courier);
        
        await ctx.db.patch(args.id, {
            currentBranch: courier.destinationBranch,
            branchId: courier.destinationBranch, // Keep legacy in sync
            assignedTo: undefined,
            currentStatus: "in_transit",
            updatedAt: Date.now()
        });
        
        await ctx.db.insert("logs", {
            courierId: args.id, trackingId: courier.trackingId, action: "status_changed",
            description: "Parcel transferred to destination branch hub",
            timestamp: Date.now(),
            performedBy: args.managerId
        });
    }
});

export const arriveAtDestinationHub = mutation({
    args: {
        id: v.id("couriers"),
        managerId: v.optional(v.id("users"))
    },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Not found");
        if (args.managerId) await checkAuthority(ctx, args.managerId, courier);
        
        const destination = courier.destinationBranch || courier.currentBranch;
        if (!destination) throw new Error("No destination branch set");
        
        let assignedAgentId = undefined;
        let status = "dispatched"; // Or pending assignment if no agent
        
        const agents = await ctx.db.query("users")
            .withIndex("by_branchId", q => q.eq("branchId", destination))
            .filter(q => q.eq(q.field("role"), "agent"))
            .collect();
            
        if (agents.length > 0) {
            const randomAgent = agents[Math.floor(Math.random() * agents.length)];
            assignedAgentId = randomAgent._id;
            status = "out_for_delivery";
        }
        
        await ctx.db.patch(args.id, {
            currentStatus: status as any,
            assignedTo: assignedAgentId,
            updatedAt: Date.now()
        });
        
        await ctx.db.insert("logs", {
            courierId: args.id, trackingId: courier.trackingId, action: "status_changed",
            description: assignedAgentId ? "Parcel arrived at hub. Auto-assigned out for delivery" : "Parcel arrived at hub. Awaiting agent assignment",
            timestamp: Date.now(),
            performedBy: args.managerId
        });
        if (assignedAgentId) {
            await ctx.db.insert("logs", {
                courierId: args.id, trackingId: courier.trackingId, action: "assigned",
                description: `Agent auto-assigned for delivery`,
                timestamp: Date.now()
            });
        }
    }
});

export const markAsPaid = mutation({
    args: { id: v.id("couriers"), userId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) return;
        if (args.userId) await checkAuthority(ctx, args.userId, courier);

        await ctx.db.patch(args.id, { paymentStatus: "paid", updatedAt: Date.now() });
        if (courier?.invoiceId) await ctx.db.patch(courier.invoiceId, { status: "paid" });
    },
});

export const getLogs = query({
    args: { courierId: v.optional(v.id("couriers")), trackingId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (args.courierId) {
            return await ctx.db
                .query("logs")
                .withIndex("by_courierId", (q) => q.eq("courierId", args.courierId))
                .order("desc")
                .collect();
        }
        if (args.trackingId) {
            const tid = args.trackingId;
            return await ctx.db
                .query("logs")
                .withIndex("by_trackingId", (q) => q.eq("trackingId", tid))
                .order("desc")
                .collect();
        }
        return await ctx.db.query("logs").order("desc").collect();
    },
});

export const removeMultiple = mutation({
    args: { ids: v.array(v.id("couriers")), userId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        const advancedStatuses = ["picked_up", "dispatched", "in_transit", "out_for_delivery", "delivered"];
        
        for (const id of args.ids) {
            const courier = await ctx.db.get(id);
            if (!courier) continue;

            if (args.userId) await checkAuthority(ctx, args.userId, courier);

            if (advancedStatuses.includes(courier.currentStatus)) {
                throw new Error(`Cannot delete tracking ID ${courier.trackingId}. It is already in '${courier.currentStatus}' state.`);
            }
            
            const logs = await ctx.db.query("logs").withIndex("by_courierId", q => q.eq("courierId", id)).collect();
            for (const log of logs) await ctx.db.delete(log._id);

            const invoices = await ctx.db.query("invoices").withIndex("by_courierId", q => q.eq("courierId", id)).collect();
            for (const inv of invoices) await ctx.db.delete(inv._id);

            if (courier.podId) await ctx.db.delete(courier.podId);
            
            await ctx.db.delete(id);
        }
    },
});

export const remove = mutation({
    args: { id: v.id("couriers"), userId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) return;

        if (args.userId) await checkAuthority(ctx, args.userId, courier);

        const logs = await ctx.db.query("logs").withIndex("by_courierId", q => q.eq("courierId", args.id)).collect();
        for (const log of logs) await ctx.db.delete(log._id);

        const invoices = await ctx.db.query("invoices").withIndex("by_courierId", q => q.eq("courierId", args.id)).collect();
        for (const inv of invoices) await ctx.db.delete(inv._id);

        if (courier.podId) await ctx.db.delete(courier.podId);

        await ctx.db.delete(args.id);
    },
});
