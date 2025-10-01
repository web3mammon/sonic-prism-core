# AI Phone Agent Platform

A multi-tenant SaaS platform for AI-powered phone agents that provides call management, analytics, and business insights across different regions and industries.

## 🚀 Project Overview

This application is a comprehensive AI phone agent platform featuring:

- **Multi-tenant Architecture**: Region/Industry/Client-based routing (`/au/plmb/acmeplumbing`)
- **Role-based Access Control**: Client, Admin, and Team Member roles
- **Real-time Dashboard**: Credit management, call analytics, and business insights
- **Authentication System**: Powered by Supabase with profile management
- **Responsive Design**: Modern UI with dark/light theme support

**Live URL**: https://lovable.dev/projects/3d7f54e4-a87b-4051-ae8f-61fced5378ab

## 🏗️ Architecture & Page Hierarchy

### Marketing & Public Pages
- `/` - Marketing home page with pricing calculator
- `/pricing` - Detailed pricing information
- `/auth` - Authentication (login/signup)
- `/reset-password` - Password reset flow

### Dashboard Structure

#### Central HQ (Admin/Team Members Only)
- `/` - Central HQ dashboard for internal users
- `/analytics` - System-wide analytics
- `/logs` - Platform logs and monitoring
- `/system` - System configuration
- `/testing` - Testing tools and environments

#### Tenant-Specific Dashboards
**URL Pattern**: `/{region}/{industry}/{clientname}`
- `/au/plmb/acmeplumbing` - Example tenant dashboard
- `/au/plmb/acmeplumbing/analytics` - Tenant analytics
- `/au/plmb/acmeplumbing/call-data` - Call data management
- `/au/plmb/acmeplumbing/audio-files` - Audio file management

### Onboarding & Setup
- `/business-setup` - Business onboarding flow (post-registration)

## 🔐 Authentication & Roles

### User Roles
- **Client**: Access to their specific tenant dashboard only
- **Team Member**: Access to tenant dashboards + limited Central HQ access
- **Admin**: Full access to all areas including Central HQ

### Role-based Routing
- Clients are automatically redirected to their tenant dashboard
- Internal users (Admin/Team) can access both Central HQ and tenant areas
- Protected routes ensure proper access control

## 🎨 Design System

### Theme Support
- **Light/Dark Mode**: Automatic system detection with manual toggle
- **Semantic Color Tokens**: HSL-based color system in `src/index.css`
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### UI Components
- **shadcn/ui**: Modern component library with custom variants
- **Consistent Branding**: Purple/primary color scheme with gradients
- **Interactive Elements**: Animated buttons, cards, and navigation

## 📊 Key Features

### Dashboard Features
- **Credit Management**: Real-time balance tracking and usage alerts
- **Call Analytics**: Detailed call statistics and performance metrics
- **Business Insights**: Industry-specific recommendations and insights
- **Quick Actions**: Role-based action buttons and shortcuts

### Multi-tenant Support
- **Dynamic Routing**: Automatic tenant resolution from URL parameters
- **Tenant Isolation**: Secure data separation between clients
- **Regional Support**: Australia (AU) with room for expansion

### Business Intelligence
- **Live Demo Integration**: Interactive demo sessions for prospects
- **Performance Metrics**: Call success rates, costs, and efficiency
- **Activity Feeds**: Real-time updates and notifications

## 🛠️ Technical Stack

### Frontend Technologies
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Full type safety and developer experience
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing with protected routes

### Backend & Data
- **Supabase**: Authentication, database, and real-time subscriptions
- **Row Level Security**: Database-level security policies
- **Real-time Updates**: Live data synchronization

### UI/UX Libraries
- **shadcn/ui**: High-quality React components
- **Lucide React**: Beautiful icon library
- **React Hook Form**: Form handling with validation
- **Sonner**: Toast notifications

## 🚀 Getting Started

### Development Setup

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup
1. Set up Supabase project
2. Configure authentication providers
3. Set up database tables and RLS policies
4. Update environment variables

### Deployment
Deploy instantly via [Lovable](https://lovable.dev/projects/3d7f54e4-a87b-4051-ae8f-61fced5378ab) by clicking Share → Publish.

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── dashboard/       # Dashboard-specific components
│   └── ...              # Feature components
├── hooks/               # Custom React hooks
│   ├── useAuth.tsx      # Authentication hook
│   ├── useTenant.tsx    # Multi-tenant logic
│   └── ...
├── pages/               # Route components
│   ├── MarketingHome.tsx
│   ├── TenantDashboard.tsx
│   ├── CentralHQ.tsx
│   └── ...
├── lib/                 # Utilities and configurations
├── integrations/        # Third-party integrations
│   └── supabase/        # Supabase client and types
└── types/               # TypeScript type definitions
```

## 🔧 Custom Domain Setup

To connect a custom domain:
1. Navigate to Project → Settings → Domains in Lovable
2. Click "Connect Domain"
3. Follow the DNS configuration steps

*Note: Requires a paid Lovable plan*

## 📞 Support & Development

- **Lovable Project**: [Edit in Lovable](https://lovable.dev/projects/3d7f54e4-a87b-4051-ae8f-61fced5378ab)
- **Documentation**: [Lovable Docs](https://docs.lovable.dev)
- **Community**: [Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
