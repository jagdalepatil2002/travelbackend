import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import axios from 'axios';

// Load environment variables
dotenv.config();

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 5000;

// Cache versioning to bust older prompts
const SEARCH_PROMPT_VERSION = 'city-only-v1';
const DETAILS_PROMPT_VERSION = 'tts-rich-v2';

app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test DB connection
app.get('/api/ping', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint for Railway
app.get('/', (req, res) => {
  res.json({ 
    message: 'TravelAI Backend API is running!',
    status: 'healthy',
    version: '1.0.0',
    endpoints: [
      'POST /api/search - Search for places in a city',
      'POST /api/details - Get detailed information about a place',
      'GET /api/ping - Database health check'
    ]
  });
});



// Helper: fetch images from multiple sources
async function fetchPlaceImages(placeName, location) {
  console.log('🖼️ Fetching multiple images for:', placeName);
  const images = [];
  
  // Try Wikipedia first
  try {
    const wikiImage = await fetchWikipediaImage(placeName);
    if (wikiImage) {
      images.push(wikiImage);
      console.log('✅ Wikipedia image found');
    }
  } catch (err) {
    console.log('❌ Wikipedia failed:', err.message);
  }
  
  // Try Unsplash (free tier)
  try {
    const unsplashImages = await fetchUnsplashImages(placeName, location);
    images.push(...unsplashImages);
    console.log('✅ Unsplash images found:', unsplashImages.length);
  } catch (err) {
    console.log('❌ Unsplash failed:', err.message);
  }
  
  // Fallback to placeholder if no images found
  if (images.length === 0) {
    console.log('⚠️ No images found, using placeholder');
    images.push('https://via.placeholder.com/400x300/6366f1/ffffff?text=' + encodeURIComponent(placeName));
  }
  
  // Return max 3 images
  return images.slice(0, 3);
}

// Helper: fetch image from Wikipedia with better error handling
async function fetchWikipediaImage(title) {
  console.log('📷 Fetching Wikipedia image for:', title);
  try {
    // Try multiple variations of the title
    const variations = [
      title,
      title.replace(/\s+/g, '_'),
      title.split(',')[0].trim(), // Remove location part if exists
      title.replace(/\b(Fort|Palace|Temple|Museum|Garden|Market)\b/gi, '').trim()
    ];
    
    for (const variation of variations) {
      try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(variation)}`;
        const res = await axios.get(url);
        const imageUrl = res.data.thumbnail?.source;
        if (imageUrl) {
          console.log('🖼️ Wikipedia image found for variation:', variation);
          return imageUrl.replace(/\/\d+px-/, '/400px-'); // Get higher resolution
        }
      } catch (err) {
        console.log('⚠️ Wikipedia variation failed:', variation, err.response?.status);
      }
    }
    return null;
  } catch (err) {
    console.log('❌ Wikipedia image fetch error:', err.message);
    return null;
  }
}

// Helper: fetch images from Unsplash (free tier - no API key needed)
async function fetchUnsplashImages(placeName, location) {
  console.log('📸 Fetching Unsplash images for:', placeName);
  try {
    // Search for images related to the place
    const queries = [
      `${placeName} ${location}`,
      placeName,
      `${location} tourism`,
      `${placeName} architecture`
    ];
    
    const images = [];
    
    for (const query of queries) {
      if (images.length >= 2) break; // Limit to 2 from Unsplash
      
      try {
        const url = `https://source.unsplash.com/400x300/?${encodeURIComponent(query)}`;
        // Test if the URL returns a valid image
        const response = await axios.head(url);
        if (response.status === 200) {
          images.push(url);
          console.log('📸 Unsplash image found for query:', query);
        }
      } catch (err) {
        console.log('⚠️ Unsplash query failed:', query);
      }
    }
    
    return images;
  } catch (err) {
    console.log('❌ Unsplash fetch error:', err.message);
    return [];
  }
}

// Helper: fetch from Gemini API and enrich with Wikipedia images
async function fetchFromGemini(location) {
  console.log('🤖 Calling Gemini API for location:', location);
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('🔑 Using API key:', apiKey ? '***' + apiKey.slice(-4) : 'NOT SET');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = `You are a friendly travel guide. List the top 10 must-visit places located strictly within the city limits of ${location}.
Do NOT include nearby towns, suburbs, or satellite cities. If the location is Delhi, include only places within the National Capital Territory of Delhi; exclude Noida, Gurugram, Ghaziabad, Faridabad, Greater Noida, etc. If the input is a city, return only attractions inside that city’s administrative boundary.

Return ONLY valid JSON with this exact shape (no extra text):
[
  { "name": string, "description": string }
]

Guidance for descriptions:
- One or two sentences, conversational tone as if speaking to a traveler
- Avoid markdown, bullets, or emojis
- Keep it clear for text-to-speech (short sentences, natural phrasing)`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  
  console.log('📤 Sending request to Gemini...');
  const response = await axios.post(url, body);
  console.log('📥 Gemini response status:', response.status);
  console.log('📝 Gemini response data:', JSON.stringify(response.data, null, 2));
  
  // Try to extract JSON from Gemini's response
  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('📄 Extracted text from Gemini:', text);
  
  let places = [];
  try {
    places = JSON.parse(text);
    console.log('✅ Successfully parsed JSON from Gemini');
  } catch {
    // fallback: try to extract JSON from text
    console.log('⚠️ Failed to parse JSON, trying fallback...');
    const match = text.match(/\[.*\]/s);
    if (match) {
      try { 
        places = JSON.parse(match[0]); 
        console.log('✅ Successfully parsed JSON from fallback');
      } catch {
        console.log('❌ Fallback JSON parsing also failed');
      }
    }
  }
  
  console.log('📊 Places before image enrichment:', places?.length || 0);
  
  // Fetch multiple images for each place
  for (const place of places) {
    console.log('🖼️ Fetching images for:', place.name);
    place.images = await fetchPlaceImages(place.name, location);
    // Keep backward compatibility with single image
    place.image = place.images[0];
  }
  
  console.log('📊 Final places array:', places?.length || 0, 'items');
  return places;
}

// Search endpoint
app.post('/api/search', async (req, res) => {
  const { location } = req.body;
  console.log('🔍 Search request received for location:', location);
  
  if (!location) {
    console.log('❌ No location provided');
    return res.status(400).json({ error: 'Location required' });
  }
  
  try {
    console.log('📊 Checking database for cached results...');
    // 1. Check DB for cached results (versioned key to avoid stale wider-radius results)
    const cacheKey = `${location.toLowerCase()}::${SEARCH_PROMPT_VERSION}`;
    const dbRes = await pool.query('SELECT * FROM places_cache WHERE location = $1', [cacheKey]);
    if (dbRes.rows.length > 0) {
      console.log('✅ Found cached results, returning from DB');
      return res.json({ fromCache: true, places: dbRes.rows[0].places });
    }
    
    console.log('🌐 No cache found, fetching from Gemini API...');
    // 2. Fetch from Gemini
    const places = await fetchFromGemini(location);
    console.log('📝 Gemini API returned:', places?.length || 0, 'places');
    
    console.log('💾 Caching results in database...');
    // 3. Cache in DB
    await pool.query('INSERT INTO places_cache(location, places) VALUES($1, $2)', [cacheKey, JSON.stringify(places)]);
    console.log('✅ Results cached successfully');
    
    res.json({ fromCache: false, places });
  } catch (err) {
    console.error('💥 Error in search endpoint:', err.message);
    console.error('📋 Full error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Place details endpoint (for detailed info)
app.post('/api/details', async (req, res) => {
  const { location, name } = req.body;
  if (!location || !name) return res.status(400).json({ error: 'Location and name required' });
  try {
    // Check DB for cached details
    const detailsKey = `${location.toLowerCase()}::${DETAILS_PROMPT_VERSION}`;
    const dbRes = await pool.query('SELECT * FROM place_details WHERE location = $1 AND name = $2', [detailsKey, name]);
    if (dbRes.rows.length > 0) {
      return res.json({ fromCache: true, details: dbRes.rows[0].details });
    }
    // Fetch from Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = `You are a warm, engaging tour guide. Create a flowing, spoken-style travel guide for "${name}" in ${location}.

Constraints for text-to-speech:
- No markdown, no bullet lists, no emojis
- Use short to medium sentences (8–22 words each)
- Insert paragraph breaks every 3–5 sentences for natural pacing
- Conversational, friendly tone; avoid overly formal or robotic language

Depth and coverage requirements (we want all of this):
- Why it's famous and why travelers love it
- Historical significance: key eras and events that shaped it
- Architecture and standout features: style, materials, visual highlights
- Best time to visit: months/seasons, weather, crowds, lighting for photos
- Opening hours and entry fees if commonly known; otherwise advise to check official site
- How to get there: simple directions and approximate time from city center
- Facilities: parking, restrooms, accessibility, guided tours, on-site services
- What to see and do: main sightseeing highlights and signature experiences
- Estimated time to spend for a satisfying visit
- Insider tips: photo spots, etiquette, what to bring or wear, hidden gems
- Safety and etiquette notes: anything visitors should respect or watch out for
- Never-miss local foods nearby: name 3–5 iconic dishes and where to try them around the area
- Nearby attractions: mention 3–5 top spots with approximate distance or minutes away in parentheses
- A tiny sample itinerary suggestion that strings the visit with one or two nearby stops
- Accessibility notes if relevant (stairs, ramps, terrain)
- A few interesting facts or stories that make it memorable

Formatting:
- Do NOT use headers or lists; write in cohesive paragraphs.
- When naming nearby attractions or foods, weave them into sentences and separate with semicolons, including distance/time in parentheses where useful. Example: “The City Museum (10 minutes), Riverfront Gardens (15 minutes) …”
- Target total length around 600–900 words.

End with a friendly closing line encouraging the traveler.`;
    const body = { contents: [{ parts: [{ text: prompt }] }] };
    const response = await axios.post(url, body);
    const details = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Cache in DB
  await pool.query('INSERT INTO place_details(location, name, details) VALUES($1, $2, $3)', [detailsKey, name, details]);
    res.json({ fromCache: false, details });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Ensure tables exist
async function ensureTables() {
  console.log('🗄️ Ensuring database tables exist...');
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS places_cache (
      location TEXT PRIMARY KEY,
      places JSONB
    )`);
    console.log('✅ places_cache table ready');
    
    await pool.query(`CREATE TABLE IF NOT EXISTS place_details (
      id SERIAL PRIMARY KEY,
      location TEXT,
      name TEXT,
      details TEXT,
      UNIQUE(location, name)
    )`);
    console.log('✅ place_details table ready');
    
  } catch (err) {
    console.error('❌ Database table creation error:', err.message);
    throw err;
  }
}

ensureTables().then(() => {
  app.listen(port, () => {
    console.log(`🚀 Backend server running on port ${port}`);
    console.log(`📊 Database URL: ${process.env.DATABASE_URL ? 'Connected' : 'NOT SET'}`);
    console.log(`🔑 Gemini API Key: ${process.env.GEMINI_API_KEY ? 'Set' : 'NOT SET'}`);
  });
}).catch(err => {
  console.error('💥 Failed to start server:', err.message);
  process.exit(1);
});
