# Writers Guild - Social Writing Platform

## Overview

Writers Guild is a sophisticated social platform designed specifically for writers and authors. It provides a rich environment for sharing poetry, stories, and creative works with advanced formatting capabilities, multimedia integration, and community engagement features. The platform combines the social aspects of traditional social media with specialized tools tailored for the writing community.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built with modern React and TypeScript, leveraging a component-based architecture with the following key decisions:

- **React with TypeScript**: Provides type safety and better development experience for complex UI interactions
- **Wouter for Routing**: Lightweight alternative to React Router, chosen for its minimal footprint and simplicity
- **TanStack Query**: Handles server state management, caching, and data synchronization with automatic background updates
- **Shadcn/ui Components**: Provides a consistent design system built on Radix UI primitives and Tailwind CSS
- **Vite Build System**: Offers fast development server and optimized production builds

### Backend Architecture
The server-side follows an Express.js REST API pattern with the following architectural choices:

- **Express.js Framework**: Provides robust middleware support and familiar routing patterns
- **TypeScript**: Ensures type safety across the entire stack
- **Session-based Authentication**: Uses Replit's OpenID Connect integration for secure user authentication
- **Modular Route Organization**: Routes are organized by feature area with clear separation of concerns
- **Error Handling Middleware**: Centralized error processing with appropriate HTTP status codes

### Data Storage Solutions
The application uses PostgreSQL with Drizzle ORM for data persistence:

- **PostgreSQL Database**: Chosen for its robust relational features and JSON support for flexible data structures
- **Drizzle ORM**: Type-safe database queries with automatic TypeScript inference
- **Neon Serverless**: Cloud-hosted PostgreSQL solution for scalability and managed infrastructure
- **Schema-first Design**: Database schema defined in TypeScript with automatic migration generation

### Rich Content Creation
The platform supports advanced content creation through multiple specialized components:

- **TipTap Rich Text Editor**: Extensible editor with support for formatting, alignment, colors, and font families
- **Multiple Content Types**: Support for text posts, poetry, stories, and writing challenges
- **Image Upload System**: Multer-based file handling with Sharp for image processing and optimization
- **Content Categorization**: Genre-based tagging and privacy controls for content organization

### External Integrations
The platform integrates with several external services to enhance the user experience:

- **Spotify Integration**: Direct integration with Spotify Web API for music discovery and playlist embedding
- **Replit Authentication**: OAuth integration with Replit's identity system for seamless user management
- **File Storage**: Local file storage with plans for cloud storage integration
- **Real-time Features**: WebSocket support for future real-time collaboration features

### Mobile-Responsive Design
The UI architecture ensures cross-platform compatibility:

- **Responsive Layout**: Mobile-first design with adaptive navigation patterns
- **Progressive Enhancement**: Core functionality works across all device types
- **Touch-Optimized Interactions**: Gesture support and mobile-friendly component sizing

### Performance Considerations
Several architectural decisions optimize performance:

- **Code Splitting**: Automatic route-based code splitting through Vite
- **Image Optimization**: Sharp integration for automatic image compression and format conversion
- **Query Caching**: Intelligent caching strategies through TanStack Query
- **Bundle Optimization**: Tree-shaking and dead code elimination in production builds

## External Dependencies

### Authentication & User Management
- **Replit OpenID Connect**: Primary authentication provider with automatic user provisioning
- **Express Sessions**: Session management with PostgreSQL session storage
- **Passport.js**: Authentication middleware for OAuth flows

### Database & ORM
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations with migration support
- **Connection Pooling**: Optimized database connections through Neon's pooling service

### Content & Media Processing
- **Sharp**: High-performance image processing for uploads and optimization
- **Multer**: File upload middleware with memory storage for image handling
- **TipTap Extensions**: Rich text editing with multiple formatting extensions

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Radix UI**: Accessible component primitives for complex UI patterns
- **Shadcn/ui**: Pre-built component library with consistent theming

### Music Integration
- **Spotify Web API SDK**: Official Spotify integration for music search and playback
- **OAuth Credentials Management**: Secure token handling through Replit's connector system

### Development & Build Tools
- **Vite**: Fast development server with Hot Module Replacement
- **TypeScript**: Static type checking across the entire application
- **ESLint & Prettier**: Code quality and formatting enforcement
- **PostCSS**: CSS processing with Tailwind integration

### Monitoring & Error Handling
- **Custom Error Boundaries**: React error boundaries for graceful failure handling
- **Request Logging**: Comprehensive API request and response logging
- **Development Tools**: Replit-specific development plugins for enhanced debugging