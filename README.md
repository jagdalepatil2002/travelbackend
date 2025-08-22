# TravelAI - Full Stack Travel Guide Application

A full-stack AI-powered travel application that helps users discover top attractions in any city with rich details, images, and text-to-speech functionality.

## Features

- 🌍 **Smart City Search**: Get top 10 attractions within city limits using AI
- 🖼️ **Rich Media**: High-quality images from Wikipedia and Unsplash
- 🎤 **Text-to-Speech**: Natural narration with voice controls and styles
- 💾 **Smart Caching**: PostgreSQL database caching for faster responses
- 🎨 **Modern UI**: Responsive design with interactive modals and carousels
- 🤖 **AI-Powered**: Uses Google Gemini AI for comprehensive travel information

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database (Railway hosting)
- **Google Gemini AI** API
- **Wikipedia & Unsplash APIs** for images

### Frontend
- **Vanilla JavaScript**
- **Web Speech API** for text-to-speech
- **Modern CSS** with responsive design

## Project Structure

```
NewTravel/
├── backend/
│   ├── index.js              # Express server and API endpoints
│   ├── package.json          # Backend dependencies
│   ├── .env.example          # Environment variables template
│   └── .env                  # Environment variables (not in repo)
├── frontend/
│   ├── index.html            # Main HTML file
│   ├── app.js                # Frontend JavaScript
│   └── style.css             # Styling
├── .gitignore                # Git ignore rules
└── README.md                 # This file
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- Google Gemini API key

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=your_postgresql_connection_string
PORT=3000
```

5. Start the backend server:
```bash
npm start
```

### Frontend Setup

1. Open `frontend/index.html` in a web browser, or
2. Use a local server (recommended):
```bash
# Using Python
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server frontend -p 8000
```

## API Endpoints

### POST /api/search
Search for top attractions in a city.
```json
{
  "location": "Delhi"
}
```

### POST /api/details
Get detailed information about a specific place.
```json
{
  "location": "Delhi",
  "name": "Red Fort"
}
```

## Environment Variables

Create a `.env` file in the backend directory with:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini AI API key |
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (default: 3000) |

## Features in Detail

### AI-Powered Search
- Uses Google Gemini 1.5-flash for intelligent content generation
- Enforces city-only results (no nearby cities)
- Versioned caching to prevent stale data

### Rich Details
Each attraction includes:
- Why it's famous
- Best time to visit
- Historical significance
- Sightseeing highlights
- Nearby attractions
- Must-try local food

### Text-to-Speech
- Multiple voice options with quality prioritization
- Adjustable speed and pitch controls
- Style presets (Conversational, Calm, Energetic, Storyteller)
- Natural paragraph and sentence chunking
- Clean text processing (removes markdown artifacts)

### Caching System
- PostgreSQL tables: `places_cache` and `place_details`
- Versioned cache keys for prompt updates
- Efficient image enrichment with fallbacks

## Railway Deployment

This project is configured for easy deployment to Railway.

### Step 1: Create Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up using your GitHub account

### Step 2: Deploy Backend
1. **Connect GitHub Repository**:
   - Click "New Project" → "Deploy from GitHub repo"
   - Select this repository (`travelbackend`)

2. **Configure Environment Variables**:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   DATABASE_URL=postgresql://user:pass@host:port/db  (Railway will provide this)
   PORT=3000
   ```

3. **Add PostgreSQL Database**:
   - In your Railway project, click "Add Service" → "Database" → "PostgreSQL"
   - Railway will automatically provide the `DATABASE_URL`

### Step 3: Update Frontend
1. After deployment, Railway will provide a URL like: `https://your-app-name.railway.app`
2. Update `frontend/app.js` line 2:
   ```javascript
   const API_BASE_URL = 'https://your-railway-app.railway.app';
   ```

### Step 4: Deploy Frontend
**Option A: Deploy on Railway**
- Create a separate Railway service for the frontend
- Connect the same GitHub repo but deploy from `/frontend` folder

**Option B: Deploy on Netlify/Vercel (Recommended)**
- Connect your GitHub repo to Netlify or Vercel
- Set build directory to `frontend`
- Update the API_BASE_URL in `app.js` with your Railway backend URL

### Environment Variables for Railway
| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini AI API key | Yes |
| `DATABASE_URL` | PostgreSQL connection (auto-provided by Railway) | Yes |
| `PORT` | Server port (auto-set by Railway) | No |

### Railway Configuration Files
- `railway.toml` - Railway deployment configuration
- `backend/package.json` - Node.js version and scripts
- Health check endpoint available at `/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the GitHub repository.
