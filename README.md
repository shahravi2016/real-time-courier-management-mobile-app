# 📦 Real-Time Courier Management App

A fast, cross-platform courier management mobile app built with **React Native (Expo)** and **Convex** for real-time data synchronization. Changes reflect in under 1 second across all connected devices.

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![Convex](https://img.shields.io/badge/Convex-FF6B6B?style=for-the-badge&logo=convex&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

## ✨ Features

- **Real-time Updates** - Changes sync instantly across all devices (<1 second)
- **Full CRUD Operations** - Create, Read, Update, Delete couriers
- **Status Tracking** - 6 status types: Pending, Picked Up, In Transit, Out for Delivery, Delivered, Cancelled
- **Search & Filter** - Search by tracking ID, name, or phone; filter by status
- **Cross-Platform** - Works on Android, iOS, and Web
- **Minimalist Dark UI** - Clean, modern interface

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React Native + Expo |
| Backend | Convex (Realtime Database) |
| Navigation | Expo Router |
| Language | TypeScript |

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Expo Go](https://expo.dev/client) app on your phone (for mobile testing)
- [Convex](https://convex.dev) account (free tier available)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/shahravi2016/real-time-courier-management-mobile-app.git
cd real-time-courier-management-mobile-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Convex Backend

```bash
npx convex dev
```

This will:
- Prompt you to log in or create a Convex account
- Create a new project and deploy the schema
- Generate TypeScript types
- Create `.env.local` with your Convex URL

Keep this terminal running for live backend updates.

## 🏃 Running the App

### Start Both Servers

You need **two terminals** running:

**Terminal 1 - Convex Backend:**
```bash
npx convex dev
```

**Terminal 2 - Expo Dev Server:**
```bash
npx expo start
```

Or with tunnel for remote device testing:
```bash
npx expo start --tunnel
```

### Access the App

| Platform | How to Access |
|----------|---------------|
| **Android** | Scan QR code with Expo Go app |
| **iOS** | Scan QR code with Camera app |
| **Web** | Open [http://localhost:8081](http://localhost:8081) |

## 📱 Using the App

### Dashboard
- View real-time statistics (Total, Pending, Delivered, In Transit, etc.)
- Quick actions to add courier or view list

### Add Courier
1. Tap **"+ Add New Courier"**
2. Fill in sender, receiver, phone, and addresses
3. Tap **"Create Courier"**
4. A unique tracking ID is auto-generated

### Courier List
- View all couriers with real-time updates
- Use the **search bar** to find by tracking ID, name, or phone
- Tap **filter chips** to filter by status
- Tap any courier to view details

### Courier Details
- View full courier information
- **Edit** - Tap "Edit" to modify details
- **Change Status** - Tap "Change Status" to update
- **Delete** - Tap "Delete" to remove (with confirmation)

## 📂 Project Structure

```
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout + Convex provider
│   ├── index.tsx           # Dashboard screen
│   └── couriers/
│       ├── index.tsx       # Courier list
│       ├── add.tsx         # Add courier form
│       └── [id].tsx        # Courier details
├── convex/                 # Backend
│   ├── schema.ts           # Database schema
│   └── couriers.ts         # Queries & mutations
├── src/
│   ├── components/         # UI components
│   └── styles/theme.ts     # Design system
└── .env.local              # Convex environment variables
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npx expo start --tunnel` | Start with tunnel (for remote devices) |
| `npx expo start --android` | Start and open on Android |
| `npx expo start --ios` | Start and open on iOS |
| `npx expo start --web` | Start and open on Web |
| `npx convex dev` | Start Convex in dev mode |
| `npx convex deploy` | Deploy Convex to production |

## 🧪 Testing Real-Time Updates

1. Open the app on **two devices** (or browser windows)
2. Add a courier on Device A
3. Watch it appear instantly on Device B
4. Update status on Device A → reflects on Device B in <1 second

## 📊 Database Schema

```typescript
couriers: {
  _id: Id<"couriers">       // Auto-generated
  trackingId: string        // e.g., "CRR-XXXX-YYYY"
  senderName: string
  receiverName: string
  receiverPhone: string
  pickupAddress: string
  deliveryAddress: string
  currentStatus: "pending" | "picked_up" | "in_transit" | 
                 "out_for_delivery" | "delivered" | "cancelled"
  notes?: string
  expectedDeliveryDate?: string
  createdAt: number
  updatedAt: number
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ using React Native, Expo, and Convex
