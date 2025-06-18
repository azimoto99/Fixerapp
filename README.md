# Fixer - Your Ultimate Gig Economy Solution

![Fixer Logo](./fixer.png)

## Discover the Power of Fixer

Fixer is your go-to platform for connecting freelancers and employers in the gig economy. Whether you're looking to hire skilled workers or find local job opportunities, Fixer empowers you with tools to manage jobs, payments, and communications effortlessly. Here's what you can do with Fixer:

## App Capabilities

- **Find Local Jobs or Workers**: Use geolocation technology to discover job opportunities or skilled workers within your chosen radius, making it easy to connect with the right people nearby.
- **Manage Your Workforce or Gigs**: Break down projects into manageable tasks, track progress, and ensure everything stays on schedule with our intuitive task management system.
- **Secure Payments with Ease**: Handle transactions confidently with Stripe Connect integration. Pay for services, receive earnings, or manage escrow payments—all within the app.
- **Communicate Seamlessly**: Stay in touch with clients or workers through our advanced messaging system. Send texts, share file attachments, or initiate calls directly from the app.
- **Personalize Your Profile**: Stand out by customizing your profile with avatars—choose from predefined options or upload your own for a unique touch.
- **Build Your Reputation**: Earn ratings and reviews based on your performance, helping you establish trust and credibility in the Fixer community.
- **Stay Informed in Real-Time**: Get instant notifications about new job postings, applications, messages, or payment updates, so you never miss an opportunity.
- **Navigate with Interactive Maps**: Visualize job locations and opportunities with enhanced maps, complete with custom controls for a smooth experience.
- **Manage Everything as an Admin**: If you're overseeing the platform, use the comprehensive admin panel to monitor users, jobs, payments, and analytics—all from one dashboard.
- **Access Anywhere**: Enjoy a mobile-first design that works flawlessly on any device, ensuring you can connect and work on the go.

## Technology Behind Fixer

- **Frontend**: React Native with Expo, TypeScript, and Tailwind CSS for a responsive, user-friendly interface.
- **Backend**: Node.js with Express for robust server-side operations.
- **Database**: Neon PostgreSQL with Drizzle ORM for reliable data management.
- **Authentication**: Passport.js with local strategy for secure access.
- **Maps**: Mapbox GL JS for interactive, traffic-aware mapping.
- **Payments**: Stripe Connect API for seamless transaction processing.
- **Real-time Updates**: WebSockets for instant notifications.
- **UI Components**: Shadcn/UI for polished, consistent design.

## Documentation

Comprehensive guides are available in the `docs` directory:

- [User Guide](./docs/user-guide.md) - Complete instructions for end users
- [API Documentation](./docs/api-documentation.md) - Details of all API endpoints
- [Environment Configuration](./docs/environment-configuration.md) - Setup and configuration guide
- [Android Build Guide](./docs/android-build-guide.md) - Build the app for Android devices
- [Expo Android Guide](./docs/expo-android-guide.md) - Connect to Android with Expo Go

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- Stripe account for payment processing
- Android SDK (for building mobile app)

### Mobile App Builds

You can build Fixer as a native Android application using our build script:

```bash
# Make the script executable
chmod +x build-android.sh

# Run the build script
./build-android.sh
```

The script will:
1. Build the web application
2. Initialize or update the Android project
3. Build an Android APK file
4. Create a QR code for downloading the APK (optional)

The resulting APK will be available at `./fixer-app.apk` for installation on Android devices.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/the-job.git
   cd the-job
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment variables (see [Environment Configuration](./docs/environment-configuration.md)):
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. Set up the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. The application will be available at `http://localhost:5000`

## Development

- The frontend is built with Vite and React
- The backend uses Express
- Database interactions use Drizzle ORM
- The project uses a monorepo structure with shared types

### Project Structure

```
├── client/            # Frontend code
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions
│   │   ├── pages/       # Page components
│   │   └── types/       # TypeScript type definitions
├── server/            # Backend code
│   ├── api/           # API module endpoints
│   ├── types/         # Server-specific types
│   ├── routes.ts      # API routes
│   ├── storage.ts     # Data storage interface
│   ├── auth.ts        # Authentication logic
│   ├── db.ts          # Database connection
│   └── database-storage.ts # Database implementation
├── shared/            # Shared code between frontend and backend
│   └── schema.ts      # Database schema and shared types
├── public/            # Static assets
├── migrations/        # Database migrations
├── scripts/           # Utility scripts
└── docs/              # Documentation
```

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](./CONTRIBUTING.md) for details on the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- OpenStreetMap for map data
- Stripe for payment processing
- All open-source libraries used in this project