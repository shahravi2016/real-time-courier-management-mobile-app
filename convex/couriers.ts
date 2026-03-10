import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// --- Helpers ---
const normalizePhone = (p: string) => p.replace(/\D/g, "");

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
const WEIGHT_RATE = 20; 
const DISTANCE_RATE = 10; 

function calculatePrice(weight?: number, distance?: number, type?: "normal" | "express") {
    let subtotal = BASE_RATE;
    if (weight) subtotal += weight * WEIGHT_RATE;
    if (distance) subtotal += distance * DISTANCE_RATE;
    
    let total = subtotal;
    if (type === "express") {
        total += subtotal * 0.5; // 50% express surcharge
    }
    
    // Add 12% GST
    total += total * 0.12;
    
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
                // NEW: Branch Manager Security
                if (courier.branchId && courier.branchId !== user.branchId) return null;
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

        return { ...courier, pod, invoice };
    },
});

export const getStats = query({
    args: { branchId: v.optional(v.id("branches")) },
    handler: async (ctx, args) => {
        let all = args.branchId 
            ? await ctx.db.query("couriers").withIndex("by_branchId", q => q.eq("branchId", args.branchId)).collect()
            : await ctx.db.query("couriers").collect();

        const needsAttention = all.filter(c => c.currentStatus === "booked" && !c.branchId).length;

        return {
            total: all.length,
            booked: all.filter(c => c.currentStatus === "booked").length,
            pickedUp: all.filter(c => c.currentStatus === "picked_up").length,
            dispatched: all.filter(c => c.currentStatus === "dispatched").length,
            delivered: all.filter(c => c.currentStatus === "delivered").length,
            needsAttention, 
            revenue: all.filter(c => c.currentStatus === "delivered").reduce((sum, c) => sum + (c.price || 0), 0),
        };
    },
});

export const getAdminDashboardStats = query({
    args: {},
    handler: async (ctx) => {
        const allCouriers = await ctx.db.query("couriers").collect();
        const allBranches = await ctx.db.query("branches").collect();
        const branchContribution = allBranches.map(b => {
            const branchCouriers = allCouriers.filter(c => c.branchId === b._id);
            return {
                name: b.name,
                count: branchCouriers.length,
                revenue: branchCouriers.filter(c => c.currentStatus === "delivered").reduce((sum, c) => sum + (c.price || 0), 0)
            };
        });
        
        const now = Date.now();
        const last30Days = now - (30 * 24 * 60 * 60 * 1000);
        
        const formatDate = (ts: number) => {
            const d = new Date(ts);
            return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
        };

        const ordersByDate = allCouriers.filter(c => c.createdAt >= last30Days).reduce((acc: any, c) => {
            const day = formatDate(c.createdAt);
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});

        const revenueByDate = allCouriers.filter(c => c.currentStatus === "delivered" && c.createdAt >= last30Days).reduce((acc: any, c) => {
            const day = formatDate(c.createdAt);
            acc[day] = (acc[day] || 0) + (c.price || 0);
            return acc;
        }, {});

        const monthlyOrders = Object.entries(ordersByDate).map(([label, value]) => ({ label, value: value as number }));
        const revenueTrends = Object.entries(revenueByDate).map(([label, value]) => ({ label, value: value as number }));

        return {
            global: {
                total: allCouriers.length,
                revenue: allCouriers.filter(c => c.currentStatus === "delivered").reduce((sum, c) => sum + (c.price || 0), 0),
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
        const myCouriers = await ctx.db.query("couriers").withIndex("by_branchId", q => q.eq("branchId", args.branchId)).collect();
        const now = Date.now();
        const last30Days = now - (30 * 24 * 60 * 60 * 1000);
        
        const formatDate = (ts: number) => {
            const d = new Date(ts);
            return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
        };

        const ordersByDate = myCouriers.filter(c => c.createdAt >= last30Days).reduce((acc: any, c) => {
            const day = formatDate(c.createdAt);
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});

        const revenueByDate = myCouriers.filter(c => c.currentStatus === "delivered" && c.createdAt >= last30Days).reduce((acc: any, c) => {
            const day = formatDate(c.createdAt);
            acc[day] = (acc[day] || 0) + (c.price || 0);
            return acc;
        }, {});

        return {
            statusCounts: {
                booked: myCouriers.filter(c => c.currentStatus === "booked").length,
                inTransit: myCouriers.filter(c => ["in_transit", "dispatched"].includes(c.currentStatus)).length,
                outForDelivery: myCouriers.filter(c => c.currentStatus === "out_for_delivery").length,
                delivered: myCouriers.filter(c => c.currentStatus === "delivered").length,
            },
            monthlyOrders: Object.entries(ordersByDate).map(([label, value]) => ({ label, value: value as number })),
            branchRevenue: myCouriers.filter(c => c.currentStatus === "delivered").reduce((sum, c) => sum + (c.price || 0), 0),
            revenueTrends: Object.entries(revenueByDate).map(([label, value]) => ({ label, value: value as number })),
        };
    },
});

export const getAgentStats = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const myJobs = await ctx.db.query("couriers").withIndex("by_assignedTo", q => q.eq("assignedTo", args.userId)).collect();
        const completed = myJobs.filter(j => j.currentStatus === "delivered");
        return {
            totalJobs: myJobs.length,
            activeJobs: myJobs.filter(j => !["delivered", "cancelled"].includes(j.currentStatus)).length,
            completedJobs: completed.length,
            earnings: completed.reduce((sum, j) => sum + ((j.price || 0) * 0.1), 0),
            target: completed.length + 10,
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
        bookedBy: v.optional(v.id("users")),
        deliveryType: v.optional(v.union(v.literal("normal"), v.literal("express"))),
        pickupLat: v.optional(v.number()),
        pickupLng: v.optional(v.number()),
        deliveryLat: v.optional(v.number()),
        deliveryLng: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
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
            branchId: args.branchId,
            bookedBy: args.bookedBy,
            deliveryType: args.deliveryType || "normal",
            trackingId,
            otpCode,
            currentStatus: "booked",
            paymentStatus: "pending",
            createdAt: now,
            updatedAt: now,
        });

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

        // 3. Link Invoice back to Courier (CRITICAL FIX)
        await ctx.db.patch(courierId, { invoiceId });

        await ctx.db.insert("logs", { 
            courierId, trackingId, action: "created", 
            description: `Courier created. Distance: ${distance || 0}km. Price: ₹${finalPrice}`, 
            timestamp: now 
        });
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
        
        if (isMoving && changingPriceFields) {
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
    args: { id: v.id("couriers"), branchId: v.id("branches") },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Not found");
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
    },
});

export const assignAgent = mutation({
    args: { 
        id: v.id("couriers"), 
        agentId: v.id("users"),
        userId: v.optional(v.id("users")) // ID of the person performing the assignment
    },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Not found");

        // Integrity Check: If requester is a branch manager, verify agent branch
        if (args.userId) {
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
        status: v.union(v.literal("booked"), v.literal("picked_up"), v.literal("pending"), v.literal("dispatched"), v.literal("in_transit"), v.literal("out_for_delivery"), v.literal("delivered"), v.literal("cancelled")),
    },
    handler: async (ctx, args) => {
        if (args.status === "delivered") throw new Error("Use POD flow");
        
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Not found");

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
        if (isRestoring) patch.assignedTo = undefined; // Clear agent on restoration (Item 4)

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
    args: { id: v.id("couriers") },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) throw new Error("Courier not found");
        
        const allowedStatuses = ["booked", "pending"];
        if (!allowedStatuses.includes(courier.currentStatus)) {
            throw new Error(`Cancellation not allowed. Parcel is already in '${courier.currentStatus}' state.`);
        }

        await ctx.db.patch(args.id, { currentStatus: "cancelled", updatedAt: Date.now(), assignedTo: undefined });
        
        await ctx.db.insert("logs", { 
            courierId: args.id, 
            trackingId: courier.trackingId, 
            action: "status_changed", 
            description: "Courier cancelled by user", 
            timestamp: Date.now() 
        });
    },
});

export const markAsPaid = mutation({
    args: { id: v.id("couriers") },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
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
    args: { ids: v.array(v.id("couriers")) },
    handler: async (ctx, args) => {
        const advancedStatuses = ["picked_up", "dispatched", "in_transit", "out_for_delivery", "delivered"];
        
        for (const id of args.ids) {
            const courier = await ctx.db.get(id);
            if (!courier) continue;

            if (advancedStatuses.includes(courier.currentStatus)) {
                throw new Error(`Cannot delete tracking ID ${courier.trackingId}. It is already in '${courier.currentStatus}' state.`);
            }
            
            // Item 2: Delete associated records (Logs, Invoices, POD)
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
    args: { id: v.id("couriers") },
    handler: async (ctx, args) => {
        const courier = await ctx.db.get(args.id);
        if (!courier) return;

        // Cleanup associated records (Item 2)
        const logs = await ctx.db.query("logs").withIndex("by_courierId", q => q.eq("courierId", args.id)).collect();
        for (const log of logs) await ctx.db.delete(log._id);

        const invoices = await ctx.db.query("invoices").withIndex("by_courierId", q => q.eq("courierId", args.id)).collect();
        for (const inv of invoices) await ctx.db.delete(inv._id);

        if (courier.podId) await ctx.db.delete(courier.podId);

        await ctx.db.delete(args.id);
    },
});
