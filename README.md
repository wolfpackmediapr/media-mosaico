# Media Mosaico

A comprehensive media monitoring and transcription platform for tracking TV, radio, press, and social media coverage.

## Features

- 📺 **TV Monitoring**: Track and transcribe television programs
- 📻 **Radio Monitoring**: Monitor radio broadcasts
- 📰 **Press Monitoring**: Track written press and articles
- 📱 **Social Media Monitoring**: Monitor social media mentions
- 📊 **Reports & Analytics**: Generate comprehensive media reports
- 🔔 **Alerts**: Set up automated notifications for mentions

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Radix UI + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- A Supabase account and project

### Installation

1. Clone the repository:
```sh
git clone https://github.com/wolfpackmediapr/media-mosaico.git
cd media-mosaico
```

2. Install dependencies:
```sh
npm install
```

3. Set up environment variables:
```sh
cp .env.example .env
```

4. Edit `.env` with your Supabase credentials:
   - Get your Project ID, URL, and Publishable Key from [Supabase Dashboard](https://app.supabase.com)
   - Update the values in `.env`

5. Start the development server:
```sh
npm run dev
```

The app will be available at `http://localhost:5173`

## Build for Production

```sh
npm run build
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components (routes)
├── services/      # Business logic and API calls
│   ├── tv/       # TV monitoring services
│   ├── radio/    # Radio monitoring services
│   ├── press/    # Press monitoring services
│   └── ...
├── config/        # Configuration files
└── lib/          # Utility functions
```

## Deployment

This project can be deployed to:
- [Lovable](https://lovable.dev) (click Share → Publish)
- [Netlify](https://www.netlify.com/)
- [Vercel](https://vercel.com/)
- Any static hosting service

## Environment Variables

See `.env.example` for required environment variables.

⚠️ **Security Note**: Never commit `.env` files with real credentials to version control.

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes and commit: `git commit -m 'Add some feature'`
3. Push to the branch: `git push origin feature/your-feature-name`
4. Open a Pull Request

## License

Private - WolfPack Media PR

## Support

For questions or issues, contact the development team.
