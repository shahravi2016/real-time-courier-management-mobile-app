# 📦 Enterprise Courier & Logistics Management

A premium, high-performance courier management ecosystem built with **React Native (Expo)** and **Convex**. Designed for precision, speed, and real-time reliability in logistics operations.

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![Convex](https://img.shields.io/badge/Convex-FF6B6B?style=for-the-badge&logo=convex&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

---

## 🚀 Key Capabilities

### 🛡️ Role-Based Access Control (RBAC)
- **Admin Console**: Full fleet oversight, branch management (CRUD), real-time revenue analytics, and agent fleet assignment.
- **Branch Manager**: localized hub oversight, managing parcels specific to their branch, and tracking local performance.
- **Agent Console**: Focused job queue, monthly delivery targets, earnings tracking (10% commission model), and status management.
- **Customer Console**: Personal tracking hub for incoming/outgoing parcels with real-time status updates and OTP access.

### 🏢 Logistics & Hub Management
- **Branch Hubs**: Admin can create, edit, and delete branch hubs. Each hub tracks its own parcel flow and revenue.
- **Manager Profiles**: Detailed management of branch managers, including profile editing and branch reassignment.
- **Agent Fleet**: Comprehensive fleet management with the ability to assign/re-assign agents to specific hubs.

### 🧾 Enterprise Billing & Invoicing
- **Dynamic Pricing**: Automatic price calculation based on weight (kg) and distance (km).
- **Pro Invoice Generation**: Automated PDF generation with professional branding and sharing capabilities.
- **Automated Lifecycle**: Payment status automatically transitions to **"PAID"** upon successful delivery completion.

### ✍️ Advanced Proof of Delivery (POD)
- **OTP Verification**: Secure 4-digit OTP required for delivery completion, ensuring packages reach the correct recipient.
- **Signature Capture**: High-fidelity digital signature pad for recipients.
- **Photo Verification**: Integrated camera support to document package condition on arrival.
- **Audit Logs**: Immutable activity trails for every courier update, providing a complete chain of custody.

---

## 🎨 Design System: "True Black"
The app features a professional **True Black** aesthetic designed for high-contrast visibility and reduced eye strain:
- **Background**: Pure `#000000` for OLED efficiency.
- **Branding**: Custom adaptive icons and splash screens for a native enterprise feel.
- **Interactive UI**: Fluid transitions, role-specific dashboards, and interactive analytics charts.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native + Expo (SDK 51+) |
| **Backend** | Convex (Full-stack Realtime Database) |
| **Styling** | Centralized Theme System (True Black) |
| **Charts** | Custom Responsive Analytics Components |
| **State** | React Context + Convex Typed Queries |

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
│   └── index.tsx           # Multi-Tenant Dashboard (Admin/Manager/Agent/Customer)
├── convex/                 # Enterprise Backend Implementation
│   ├── schema.ts           # Strictly Typed Data Model
│   ├── couriers.ts         # Business Logic, Stats & Security
│   ├── branches.ts         # Hub & Logistics Management
│   └── users.ts            # RBAC & Profile Management
└── src/
    ├── components/         # Reusable Premium UI Blocks (Charts, Stats, POD)
    └── styles/theme.ts     # Centralized "True Black" Tokens
```

---

## 📈 Database Intelligence

### Courier Entity
```typescript
{
  trackingId: string,       // TRK-XXXXXX
  currentStatus: "booked" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "cancelled",
  billing: { weight, distance, price, paymentStatus, method },
  logistics: { assignedTo, branchId, invoiceId, podId, otpCode },
  participants: { senderName, receiverName, receiverPhone, addresses }
}
```

Built for the **Mobile App Competition** with ❤️ using React Native, Expo, and Convex.
