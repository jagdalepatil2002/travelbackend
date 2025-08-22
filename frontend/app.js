
// API Configuration - automatically detects environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:5000'  // Local development
  : 'https://your-railway-app.railway.app';  // Production - Update this after deployment

const app = document.getElementById('app');
app.innerHTML = `
  <header class="header">
    <div class="container">
      <div class="logo">
        <i class="fas fa-globe-americas"></i>
        <span>TravelAI</span>
      </div>
      <nav class="nav">
        <a href="#" class="nav-link">Discover</a>
        <a href="#" class="nav-link">Popular</a>
        <a href="#" class="nav-link">About</a>
      </nav>
    </div>
  </header>

  <main class="main">
    <section class="hero">
      <div class="container">
        <div class="hero-content">
          <h1 class="hero-title">Discover Amazing Places</h1>
          <p class="hero-subtitle">Let AI guide you to the most incredible destinations around any location</p>
          
          <div class="search-container">
            <div class="search-box">
              <i class="fas fa-map-marker-alt search-icon"></i>
              <input id="locationInput" type="text" placeholder="Enter a destination..." class="search-input" />
              <button id="searchBtn" class="search-btn">
                <i class="fas fa-search"></i>
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="results-section">
      <div class="container">
        <div id="loadingState" class="loading-state" style="display:none;">
          <div class="loading-spinner"></div>
          <p>Discovering amazing places...</p>
        </div>
        
        <div id="resultsHeader" class="results-header" style="display:none;">
          <h2 id="resultsTitle">Top Places to Visit</h2>
          <p id="resultsSubtitle">Curated by AI, powered by local knowledge</p>
        </div>
        
        <div id="results" class="results-grid"></div>
      </div>
    </section>
  </main>

  <!-- Modal -->
  <div id="detailsModal" class="modal" style="display:none;">
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modalTitle" class="modal-title"></h2>
        <button id="closeModal" class="modal-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div id="modalDetails" class="modal-details"></div>
        <div class="modal-actions">
          <div class="voice-selector">
            <label for="voiceSelect">Choose Voice:</label>
            <select id="voiceSelect" class="voice-dropdown">
              <option value="">Loading voices...</option>
            </select>
          </div>
          <div class="voice-selector">
            <label for="voiceStyle">Style:</label>
            <select id="voiceStyle" class="voice-dropdown">
              <option value="conversational" selected>Conversational</option>
              <option value="calm">Calm narrator</option>
              <option value="energetic">Energetic</option>
              <option value="storyteller">Storyteller</option>
            </select>
          </div>
          <div class="tts-controls">
            <button id="ttsBtn" class="tts-btn">
              <i class="fas fa-volume-up"></i>
              <span>Listen to Guide</span>
            </button>
            <div class="tts-settings">
              <label>Speed: <input type="range" id="speechRate" min="0.5" max="2" step="0.1" value="0.85" class="speed-slider"></label>
              <label>Pitch: <input type="range" id="speechPitch" min="0.8" max="1.2" step="0.05" value="1.05" class="speed-slider"></label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

let currentLocation = '';

async function searchPlaces() {
  const location = document.getElementById('locationInput').value.trim();
  if (!location) return;
  
  currentLocation = location;
  showLoading();
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location })
    });
    
    const data = await res.json();
    hideLoading();
    
    if (!data.places || !Array.isArray(data.places)) {
      showError('No results found for this location');
      return;
    }
    
    displayResults(data.places, location);
  } catch (error) {
    hideLoading();
    showError('Something went wrong. Please try again.');
  }
}

function showLoading() {
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('resultsHeader').style.display = 'none';
  document.getElementById('results').innerHTML = '';
}

function hideLoading() {
  document.getElementById('loadingState').style.display = 'none';
}

function showError(message) {
  document.getElementById('results').innerHTML = `
    <div class="error-state">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${message}</p>
    </div>
  `;
}

function displayResults(places, location) {
  document.getElementById('resultsHeader').style.display = 'block';
  document.getElementById('resultsTitle').textContent = `Top Places in ${location}`;
  
  document.getElementById('results').innerHTML = places.map((place, i) => `
    <div class="place-card" data-idx="${i}">
      <div class="card-image">
        <div class="image-carousel" data-place="${i}">
          ${place.images ? place.images.map((img, imgIdx) => `
            <img src="${img}" 
                 alt="${place.name} - Image ${imgIdx + 1}" 
                 class="carousel-image ${imgIdx === 0 ? 'active' : ''}"
                 onerror="this.style.display='none'" />
          `).join('') : `
            <img src="${place.image || 'https://via.placeholder.com/300x200/6366f1/ffffff?text=No+Image'}" 
                 alt="${place.name}" 
                 class="carousel-image active"
                 onerror="this.src='https://via.placeholder.com/300x200/6366f1/ffffff?text=No+Image'" />
          `}
          ${place.images && place.images.length > 1 ? `
            <div class="image-nav">
              <button class="nav-btn prev-btn" onclick="previousImage(${i})">
                <i class="fas fa-chevron-left"></i>
              </button>
              <button class="nav-btn next-btn" onclick="nextImage(${i})">
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
            <div class="image-dots">
              ${place.images.map((_, dotIdx) => `
                <button class="dot ${dotIdx === 0 ? 'active' : ''}" onclick="showImage(${i}, ${dotIdx})"></button>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="card-overlay">
          <button class="details-btn" data-idx="${i}">
            <i class="fas fa-info-circle"></i>
            <span>View Details</span>
          </button>
        </div>
      </div>
      <div class="card-content">
        <h3 class="card-title">${place.name}</h3>
        <p class="card-description">${place.description}</p>
        <div class="card-footer">
          <button class="details-btn-mobile" data-idx="${i}">
            <i class="fas fa-arrow-right"></i>
            <span>Learn More</span>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Add click handlers for details
  document.querySelectorAll('.details-btn, .details-btn-mobile').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      showDetails(places[btn.dataset.idx], location, places);
    };
  });
  
  // Animate cards entrance
  const cards = document.querySelectorAll('.place-card');
  cards.forEach((card, i) => {
    setTimeout(() => {
      card.classList.add('animate-in');
    }, i * 100);
  });
}

async function showDetails(place, location, places) {
  document.getElementById('modalTitle').textContent = place.name;
  document.getElementById('modalDetails').innerHTML = `
    <div class="loading-details">
      <div class="loading-spinner small"></div>
      <span>Loading detailed information...</span>
    </div>
  `;
  document.getElementById('detailsModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, name: place.name })
    });
    
    const data = await res.json();
    
    // Get the place data for images
    const placeData = places.find(p => p.name === place.name);
    const images = placeData?.images || [place.image];
    
    document.getElementById('modalDetails').innerHTML = `
      ${images.length > 1 ? `
        <div class="modal-image-gallery">
          <div class="gallery-main">
            ${images.map((img, idx) => `
              <img src="${img}" 
                   alt="${place.name} - Image ${idx + 1}" 
                   class="gallery-image ${idx === 0 ? 'active' : ''}"
                   onerror="this.style.display='none'" />
            `).join('')}
            <div class="gallery-nav">
              <button class="gallery-btn prev" onclick="previousModalImage()">
                <i class="fas fa-chevron-left"></i>
              </button>
              <button class="gallery-btn next" onclick="nextModalImage()">
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
          <div class="gallery-thumbs">
            ${images.map((img, idx) => `
              <img src="${img}" 
                   alt="Thumbnail ${idx + 1}" 
                   class="thumb ${idx === 0 ? 'active' : ''}"
                   onclick="showModalImage(${idx})"
                   onerror="this.style.display='none'" />
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="details-content">
        ${data.details ? data.details.split('\n').map(paragraph => 
          paragraph.trim() ? `<p>${paragraph}</p>` : ''
        ).join('') : '<p>No detailed information available.</p>'}
      </div>
    `;
    
    // Add TTS functionality
    document.getElementById('ttsBtn').onclick = () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        updateTTSButton(false);
        return;
      }
      
      // Clean the text for better speech
      const cleanedText = applyVoiceStyle(cleanTextForTTS(data.details));
      const utter = new window.SpeechSynthesisUtterance(cleanedText);
      
      const voiceSelect = document.getElementById('voiceSelect');
      const selectedVoiceIndex = voiceSelect.value;
      
      if (selectedVoiceIndex) {
        const voices = window.speechSynthesis.getVoices();
        utter.voice = voices[selectedVoiceIndex];
      }
      
      // Speech settings for better quality
      const speechRate = document.getElementById('speechRate')?.value || 0.85;
      const speechPitch = document.getElementById('speechPitch')?.value || 1.05;
      utter.rate = Number.parseFloat(speechRate);
      utter.pitch = Number.parseFloat(speechPitch);
      utter.volume = 1.0;
      
      // Handle long text by breaking into chunks
      const maxLength = 280; // Characters per chunk
      if (cleanedText.length > maxLength) {
        speakLongText(cleanedText, utter.voice, utter.rate, utter.pitch, utter.volume);
      } else {
        utter.onstart = () => updateTTSButton(true);
        utter.onend = () => updateTTSButton(false);
        utter.onerror = () => updateTTSButton(false);
        
        window.speechSynthesis.speak(utter);
      }
    };
    
    // Populate voice selector
    populateVoiceSelector();
  } catch (error) {
    document.getElementById('modalDetails').innerHTML = `
      <div class="error-content">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load detailed information. Please try again.</p>
      </div>
    `;
  }
}

function updateTTSButton(speaking) {
  const btn = document.getElementById('ttsBtn');
  const icon = btn.querySelector('i');
  const text = btn.querySelector('span');
  
  if (speaking) {
    icon.className = 'fas fa-stop';
    text.textContent = 'Stop Reading';
    btn.classList.add('active');
  } else {
    icon.className = 'fas fa-volume-up';
    text.textContent = 'Listen to Guide';
    btn.classList.remove('active');
  }
}

function closeModal() {
  document.getElementById('detailsModal').style.display = 'none';
  document.body.style.overflow = 'auto';
  window.speechSynthesis.cancel();
  updateTTSButton(false);
}

// Image carousel functions
function nextImage(placeIndex) {
  const carousel = document.querySelector(`[data-place="${placeIndex}"]`);
  const images = carousel.querySelectorAll('.carousel-image');
  const dots = carousel.querySelectorAll('.dot');
  
  let currentIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
  const nextIndex = (currentIndex + 1) % images.length;
  
  images[currentIndex].classList.remove('active');
  images[nextIndex].classList.add('active');
  
  if (dots.length > 0) {
    dots[currentIndex].classList.remove('active');
    dots[nextIndex].classList.add('active');
  }
}

function previousImage(placeIndex) {
  const carousel = document.querySelector(`[data-place="${placeIndex}"]`);
  const images = carousel.querySelectorAll('.carousel-image');
  const dots = carousel.querySelectorAll('.dot');
  
  let currentIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
  const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
  
  images[currentIndex].classList.remove('active');
  images[prevIndex].classList.add('active');
  
  if (dots.length > 0) {
    dots[currentIndex].classList.remove('active');
    dots[prevIndex].classList.add('active');
  }
}

function showImage(placeIndex, imageIndex) {
  const carousel = document.querySelector(`[data-place="${placeIndex}"]`);
  const images = carousel.querySelectorAll('.carousel-image');
  const dots = carousel.querySelectorAll('.dot');
  
  images.forEach(img => img.classList.remove('active'));
  dots.forEach(dot => dot.classList.remove('active'));
  
  images[imageIndex].classList.add('active');
  dots[imageIndex].classList.add('active');
}

// Modal image gallery functions
function nextModalImage() {
  const images = document.querySelectorAll('.gallery-image');
  const thumbs = document.querySelectorAll('.thumb');
  
  let currentIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
  const nextIndex = (currentIndex + 1) % images.length;
  
  images[currentIndex].classList.remove('active');
  images[nextIndex].classList.add('active');
  thumbs[currentIndex].classList.remove('active');
  thumbs[nextIndex].classList.add('active');
}

function previousModalImage() {
  const images = document.querySelectorAll('.gallery-image');
  const thumbs = document.querySelectorAll('.thumb');
  
  let currentIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
  const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
  
  images[currentIndex].classList.remove('active');
  images[prevIndex].classList.add('active');
  thumbs[currentIndex].classList.remove('active');
  thumbs[prevIndex].classList.add('active');
}

function showModalImage(imageIndex) {
  const images = document.querySelectorAll('.gallery-image');
  const thumbs = document.querySelectorAll('.thumb');
  
  images.forEach(img => img.classList.remove('active'));
  thumbs.forEach(thumb => thumb.classList.remove('active'));
  
  images[imageIndex].classList.add('active');
  thumbs[imageIndex].classList.add('active');
}

// Function to speak long text in chunks
function speakLongText(text, voice, rate, pitch, volume) {
  // Split by paragraphs first for better rhythm
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);
  const sentences = paragraphs
    .flatMap(p => p.split(/(?<=[.!?])\s+/))
    .map(s => s.trim())
    .filter(Boolean);
  let currentIndex = 0;
  
  updateTTSButton(true);
  
  function speakNext() {
    if (currentIndex >= sentences.length) {
      updateTTSButton(false);
      return;
    }
    
    // Keep existing punctuation, add final period only if missing
    const raw = sentences[currentIndex];
    const sentence = /[.!?]$/.test(raw) ? raw : raw + '.';
    const utter = new window.SpeechSynthesisUtterance(sentence);
    
    if (voice) utter.voice = voice;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;
    
    utter.onend = () => {
      currentIndex++;
      // Slightly longer gaps after paragraph boundaries
      const isParagraphBreak = /\.$/.test(sentence) && (sentence.length > 120);
      setTimeout(speakNext, isParagraphBreak ? 450 : 220);
    };
    
    utter.onerror = () => {
      updateTTSButton(false);
    };
    
    window.speechSynthesis.speak(utter);
  }
  
  speakNext();
}

// Text cleaning function for better TTS
function cleanTextForTTS(text) {
  if (!text) return '';
  
  return text
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold**
    .replace(/\*(.*?)\*/g, '$1')     // Remove *italic*
    .replace(/__(.*?)__/g, '$1')     // Remove __underline__
    .replace(/`(.*?)`/g, '$1')       // Remove `code`
    
    // Replace problematic punctuation
    .replace(/\*\*/g, '')            // Remove remaining **
    .replace(/\*/g, '')              // Remove remaining *
    .replace(/_{2,}/g, '')           // Remove multiple underscores
    .replace(/#{1,6}\s*/g, '')       // Remove markdown headers
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert [text](link) to text
    
    // Fix punctuation for speech
    .replace(/\.\.\./g, '. pause. ') // Replace ellipsis
    .replace(/--/g, ', ')            // Replace dashes
    .replace(/—/g, ', ')             // Replace em dash
    .replace(/–/g, ', ')             // Replace en dash
    .replace(/:/g, '. ')             // Replace colons with periods
    .replace(/;/g, '. ')             // Replace semicolons
    .replace(/\(/g, ', ')            // Replace opening parentheses
    .replace(/\)/g, ', ')            // Replace closing parentheses
    .replace(/\[/g, ', ')            // Replace opening brackets
    .replace(/\]/g, ', ')            // Replace closing brackets
    .replace(/\{/g, ', ')            // Replace opening braces
    .replace(/\}/g, ', ')            // Replace closing braces
    .replace(/"/g, '')               // Remove quotes
    .replace(/'/g, '')               // Remove apostrophes in wrong places
    .replace(/`/g, '')               // Remove backticks
    
    // Clean up spacing and line breaks
    .replace(/\n\s*\n/g, '. ')       // Replace double line breaks
    .replace(/\n/g, '. ')            // Replace single line breaks
    .replace(/\s+/g, ' ')            // Replace multiple spaces
    .replace(/,\s*,/g, ',')          // Remove duplicate commas
    .replace(/\.\s*\./g, '.')        // Remove duplicate periods
    .replace(/,\s*\./g, '.')         // Remove comma before period
    .replace(/\s*,\s*/g, ', ')       // Normalize comma spacing
    .replace(/\s*\.\s*/g, '. ')      // Normalize period spacing
    
    // Clean up beginning and end
    .replace(/^[,.\s]+/, '')         // Remove punctuation from start
    .replace(/[,.\s]+$/, '')         // Remove punctuation from end
    .trim();
}

// Style presets inject subtle prosody cues using punctuation and spacing
function applyVoiceStyle(text) {
  const style = document.getElementById('voiceStyle')?.value || 'conversational';
  let t = text;
  switch (style) {
    case 'calm':
      // Slightly slower feel: add gentle pauses after commas and semicolons
      t = t.replace(/,\s*/g, ',  ').replace(/;\s*/g, '.  ');
      break;
    case 'energetic':
      // Shorten pauses, keep sentences snappy
      t = t.replace(/\.\s+/g, '. ').replace(/,\s+/g, ', ');
      break;
    case 'storyteller':
      // Longer pauses at ends; add soft breaks after "and"/"but"
      t = t
        .replace(/(\.)\s+/g, '$1   ')
        .replace(/\b(and|but)\b\s+/gi, '$1, ');
      break;
    default:
      // conversational: mild smoothing only
      t = t.replace(/\s{3,}/g, '  ');
  }
  return t;
}

// Voice management functions
function populateVoiceSelector() {
  const voiceSelect = document.getElementById('voiceSelect');
  if (!voiceSelect) return;
  
  const voices = window.speechSynthesis.getVoices();
  voiceSelect.innerHTML = '<option value="">Select a voice...</option>';
  
  // Filter and categorize voices
  const englishVoices = voices
    .filter(voice => /^en(-|$)/i.test(voice.lang))
    // Prefer higher quality voices by common vendors/names first
    .sort((a, b) => {
      const score = v => (
        (/(Microsoft|Google|Apple|Neural|Natural)/i.test(v.name) ? 4 : 0) +
        (/US|GB|AU/i.test(v.lang) ? 2 : 0) +
        (/female|molly|samantha|karen|zira/i.test(v.name) ? 1 : 0)
      );
      return score(b) - score(a);
    });
  const femaleVoices = englishVoices.filter(voice => 
    voice.name.toLowerCase().includes('female') || 
    voice.name.toLowerCase().includes('woman') ||
    voice.name.toLowerCase().includes('zira') ||
    voice.name.toLowerCase().includes('molly') ||
    voice.name.toLowerCase().includes('samantha') ||
    voice.name.toLowerCase().includes('karen')
  );
  const maleVoices = englishVoices.filter(voice => 
    voice.name.toLowerCase().includes('male') || 
    voice.name.toLowerCase().includes('man') ||
    voice.name.toLowerCase().includes('david') ||
    voice.name.toLowerCase().includes('mark') ||
    voice.name.toLowerCase().includes('alex')
  );
  const otherVoices = englishVoices.filter(voice => 
    !femaleVoices.includes(voice) && !maleVoices.includes(voice)
  );
  
  // Add grouped options
  if (femaleVoices.length > 0) {
    const femaleGroup = document.createElement('optgroup');
    femaleGroup.label = 'Female Voices';
    femaleVoices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = voices.indexOf(voice);
      option.textContent = `${voice.name} (${voice.lang})`;
      femaleGroup.appendChild(option);
    });
    voiceSelect.appendChild(femaleGroup);
  }
  
  if (maleVoices.length > 0) {
    const maleGroup = document.createElement('optgroup');
    maleGroup.label = 'Male Voices';
    maleVoices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = voices.indexOf(voice);
      option.textContent = `${voice.name} (${voice.lang})`;
      maleGroup.appendChild(option);
    });
    voiceSelect.appendChild(maleGroup);
  }
  
  if (otherVoices.length > 0) {
    const otherGroup = document.createElement('optgroup');
    otherGroup.label = 'Other Voices';
    otherVoices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = voices.indexOf(voice);
      option.textContent = `${voice.name} (${voice.lang})`;
      otherGroup.appendChild(option);
    });
    voiceSelect.appendChild(otherGroup);
  }
  
  // Auto-select first high-quality English voice if none selected
  const preferredIndex = voices.indexOf(englishVoices[0]);
  if (preferredIndex !== -1) voiceSelect.value = preferredIndex;
}

// Event listeners
document.getElementById('searchBtn').onclick = searchPlaces;
document.getElementById('locationInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchPlaces();
});
document.getElementById('closeModal').onclick = closeModal;
document.querySelector('.modal-overlay').onclick = closeModal;

// Load voices for TTS
window.speechSynthesis.addEventListener('voiceschanged', () => {
  populateVoiceSelector();
});

// Also try to load voices immediately
if (window.speechSynthesis.getVoices().length > 0) {
  populateVoiceSelector();
}
