# 📦 Enterprise Courier & Logistics Management

A premium, high-performance courier management ecosystem built with **React Native (Expo)** and **Convex**. Designed for precision, speed, and real-time reliability in logistics operations.

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![Convex](https://img.shields.io/badge/Convex-FF6B6B?style=for-the-badge&logo=convex&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

---

## 🚀 Key Capabilities

### 🛡️ Role-Based Access Control (RBAC)
- **Admin Console**: Full fleet oversight, branch management, revenue analytics, and agent assignment.
- **Agent Console**: Focused job queue, monthly delivery targets, earnings tracking, and status management.
- **Customer Console**: Personal tracking hub for incoming/outgoing parcels with real-time status updates.

### 🧾 Enterprise Billing & Invoicing
- **Dynamic Pricing**: Automatic price calculation based on weight (kg) and distance (km).
- **Pro Invoice Generation**: Automated PDF generation with professional branding and sharing capabilities.
- **Payment Lifecycle**: Support for Paid/Unpaid/Pending states with multiple payment methods (Cash, Card, Prepaid).

### ✍️ Advanced Proof of Delivery (POD)
- **Signature Capture**: High-fidelity digital signature pad for recipients.
- **Photo Verification**: Integrated camera support to document package condition on arrival.
- **Audit Logs**: Immutable activity trails for every courier update.

---

## 🎨 Design System: "True Black"
The app features a professional **True Black** aesthetic designed for high-contrast visibility and reduced eye strain:
- **Background**: Pure `#000000` for OLED efficiency.
- **Contrast**: Optimized `#FFFFFF` primary text and `#9CA3AF` secondary cues.
- **Accents**: Vibrant primary branding for clear interactive calls to action.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native + Expo (SDK 51+) |
| **Backend** | Convex (Full-stack Realtime Database) |
| **State** | React Context + Convex Typed Queries |
| **Security** | Role-based authentication & Ownership checks |

---

## 🏃 Getting Started

### 1. Setup Environment
```bash
git clone https://github.com/shahravi2016/real-time-courier-management-mobile-app.git
npm install
```

### 2. Launch Backend
```bash
npx convex dev
```

### 3. Launch Application
```bash
npx expo start --tunnel
```

---

## 📂 Architecture Overview

```bash
├── app/                    # Expo Router Application Layers
│   ├── auth/               # Secure Login & Registration
│   ├── couriers/           # Courier Management Hub
│   │   ├── [id]/invoice.tsx# Dynamic Invoice Generation
│   │   └── [id].tsx        # Advanced Details & POD Flow
│   └── index.tsx           # Multi-Tenant Dashboard
├── convex/                 # Enterprise Backend Implementation
│   ├── schema.ts           # Strictly Typed Data Model
│   ├── couriers.ts         # Business Logic, Stats & Security
│   └── branches.ts         # Hub & Logistics Management
└── src/
    ├── components/         # Reusable Premium UI Blocks
    └── styles/theme.ts     # Centralized "True Black" Tokens
```

---

## 📈 Database Intelligence

### Courier Entity
```typescript
{
  trackingId: string,       // CRR-XXXX-YYYY
  currentStatus: "pending" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered",
  billing: { weight, distance, price, paymentStatus, method },
  logistics: { assignedTo, branchId, invoiceId, podId },
  participants: { senderName, receiverName, receiverPhone, addresses }
}
```

Built for the **Mobile App Competition** with ❤️ using React Native, Expo, and Convex.
