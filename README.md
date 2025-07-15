# Selzy PWA - Email Marketing Campaigns Dashboard

A Progressive Web App (PWA) for managing and viewing Selzy email marketing campaigns.

## Features

- 🔐 **Secure Authentication** with "Remember Me" functionality
- 📊 **Campaign Dashboard** with statistics and percentages
- 🔄 **Auto-relogin** when tokens expire
- 📱 **PWA Support** for mobile installation
- 🎨 **Modern UI** with Tailwind CSS styling
- ⚡ **Fast Performance** with Next.js 15

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS 4
- **PWA**: next-pwa
- **Deployment**: Vercel
- **API**: Selzy REST API

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   ```
   http://localhost:3000
   ```

## Deployment to Vercel

### Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect Next.js settings

3. **Configure Environment** (if needed):
   - No environment variables required for basic functionality
   - All API endpoints are configured in the code

4. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy automatically

### Option 2: Deploy with Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

## PWA Installation

Once deployed, users can install the app on their devices:

- **Desktop**: Look for the install icon in the browser address bar
- **Mobile**: Use "Add to Home Screen" from the browser menu
- **iOS**: Safari > Share > Add to Home Screen
- **Android**: Chrome > Menu > Add to Home Screen

## Project Structure

```
selzy_pwa/
├── src/
│   └── app/
│       ├── layout.tsx       # App layout with PWA metadata
│       ├── page.tsx         # Main dashboard component
│       └── globals.css      # Global styles
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── icon-*.png          # App icons
│   ├── sw.js               # Service worker (auto-generated)
│   └── robots.txt          # SEO robots file
├── next.config.ts          # Next.js configuration with PWA
├── vercel.json            # Vercel deployment config
└── package.json           # Dependencies and scripts
```

## Configuration Files

### PWA Configuration (`next.config.ts`)
- Enables PWA functionality in production
- Configures service worker and caching
- Optimizes for Vercel deployment

### Manifest (`public/manifest.json`)
- Defines app name, icons, and behavior
- Enables "Add to Home Screen" functionality
- Configures app appearance and theme

### Vercel Config (`vercel.json`)
- Optimizes caching headers
- Configures build settings
- Ensures proper PWA functionality

## Environment Variables

No environment variables are required for basic functionality. All API endpoints are hardcoded to use the Selzy production API.

## Performance Optimizations

- ✅ Service Worker for offline functionality
- ✅ API response caching (24 hours)
- ✅ Optimized images and assets
- ✅ Code splitting and lazy loading
- ✅ Minimal bundle size

## Security Features

- 🔐 Base64 credential storage (when "Remember Me" is enabled)
- 🔄 Automatic token refresh on expiry
- 🛡️ Secure API communication over HTTPS
- 🧹 Automatic cleanup of expired sessions

## Browser Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Mobile browsers (iOS Safari, Android Chrome)

## API Integration

The app integrates with the Selzy API:
- **Authentication**: `https://apig.selzy.com/auth/token`
- **Campaigns**: `https://apig.selzy.com/campaign`
- **Letters**: `https://apig.selzy.com/letter`
- **User Info**: `https://apig.selzy.com/user`

## Troubleshooting

### Build Issues
- Ensure Node.js 18+ is installed
- Clear cache: `rm -rf .next node_modules && npm install`

### PWA Issues
- Check if service worker is registered in browser DevTools
- Verify manifest.json is accessible
- Ensure HTTPS is used in production

### API Issues
- Check network tab for CORS errors
- Verify API endpoints are accessible
- Check authentication tokens in localStorage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Private project for Selzy platform.
