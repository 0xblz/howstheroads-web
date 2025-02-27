/**
 * Main application script for How's The Roads
 * This script handles:
 * 1. Fetching and displaying traffic camera feeds
 * 2. Implementing the load more functionality
 * 3. Fetching and displaying current weather conditions
 */

// ===== TRAFFIC CAMERA FUNCTIONALITY =====

/**
 * Fetch traffic camera data from JSON endpoint and populate the video container
 * The JSON contains an array of camera objects with name, URL, latitude, and longitude
 */
fetch('https://0xblz.github.io/docs/kansascity.json')
    .then(response => response.json())
    .then(data => {
        // Extract the videos array from the response
        const videos = data.videos || data; // Handle different possible JSON structures
        
        // Validate that we received proper video data
        if (!videos || !Array.isArray(videos)) {
            throw new Error('Invalid video data format');
        }

        // Get DOM references
        const videoContainer = document.getElementById('video-container');
        const loadingMessage = document.getElementById('loading-message');
        const loadMoreContainer = document.getElementById('load-more-container');
        const loadMoreBtn = document.getElementById('load-more-btn');
        
        // Store all videos for pagination
        const allVideos = [...videos];
        
        // Pagination configuration
        const videosPerLoad = 9; // Number of videos to show initially and on each "Load More" click
        let videosLoaded = 0; // Track how many videos have been loaded so far
        
        /**
         * Load a batch of videos into the container
         * @param {number} start - Starting index in the videos array
         * @param {number} count - Number of videos to load
         */
        function loadVideos(start, count) {
            // Get the subset of videos to load in this batch
            const videosToLoad = allVideos.slice(start, start + count);
            
            // Create and append video elements for each camera
            videosToLoad.forEach(video => {
                // Create container for this video
                const videoItem = document.createElement('div');
                videoItem.className = 'video-item';
                
                // Create Google Maps link with the camera's coordinates
                const mapsUrl = `https://www.google.com/maps?q=${video.latitude},${video.longitude}`;
                
                // Build the HTML for this camera item
                videoItem.innerHTML = `
                    <h2><a href="#" data-maps-url="${mapsUrl}" data-location-name="${video.name}" class="map-link" title="View on map"><i class="fa-solid fa-location-dot"></i> ${video.name}</a></h2>
                    <video controls crossorigin playsinline autoplay muted>
                        <source src="${video.url}" type="application/x-mpegURL">
                    </video>
                `;
                videoContainer.appendChild(videoItem);
                
                // Initialize video player for this camera
                const videoElement = videoItem.querySelector('video');
                initializeVideoPlayer(videoElement);
                
                // Add click event for the map link
                const mapLink = videoItem.querySelector('.map-link');
                mapLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    openMapModal(this.getAttribute('data-maps-url'), this.getAttribute('data-location-name'));
                });
            });
            
            // Update the count of loaded videos
            videosLoaded += videosToLoad.length;
            
            // Show/hide "Load More" button based on whether all videos are loaded
            if (videosLoaded >= allVideos.length) {
                loadMoreContainer.style.display = 'none'; // All videos loaded, hide button
            } else {
                loadMoreContainer.style.display = 'flex'; // More videos available, show button
            }
        }
        
        /**
         * Initialize the Plyr video player with HLS.js for streaming support
         * @param {HTMLVideoElement} video - The video element to initialize
         */
        function initializeVideoPlayer(video) {
            if (Hls.isSupported()) {
                // Use HLS.js for browsers that don't natively support HLS streams
                const hls = new Hls();
                hls.loadSource(video.querySelector('source').src);
                hls.attachMedia(video);
                
                // Initialize Plyr once HLS manifest is parsed
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    new Plyr(video, {
                        controls: ['play', 'mute', 'volume', 'fullscreen'],
                        hideControls: true,
                        resetOnEnd: true,
                        keyboard: false
                    });
                });
            } else {
                // Fallback for browsers with native HLS support
                new Plyr(video, {
                    controls: ['play', 'mute', 'volume', 'fullscreen'],
                    hideControls: true,
                    resetOnEnd: true,
                    keyboard: false
                });
            }
        }
        
        // Load the initial batch of videos
        loadVideos(0, videosPerLoad);
        
        // Hide loading message and show video container
        loadingMessage.style.display = 'none';
        videoContainer.style.display = 'flex';
        
        // Add event listener to "Load More" button
        loadMoreBtn.addEventListener('click', () => {
            loadVideos(videosLoaded, videosPerLoad);
        });
    })
    .catch(error => {
        // Handle errors in fetching or processing video data
        console.error('Error fetching video data:', error);
        document.getElementById('loading-message').textContent = "Error loading videos.";
    });

// ===== WEATHER FUNCTIONALITY =====

/**
 * Fetch current weather data from NOAA API for Kansas City
 * Implementation matches the iOS app's WeatherService
 */

// Kansas City coordinates (matching iOS app)
const lat = "39.2976";
const lon = "-94.7139";

// Step 1: Get the grid points for our location
fetch(`https://api.weather.gov/points/${lat},${lon}`, {
    headers: {
        'User-Agent': '(howstheroads.com, contact@howstheroads.com)'
    }
})
.then(response => response.json())
.then(pointsData => {
    console.log('Points API Response:', pointsData);
    
    // Extract the forecast endpoint from the response (matching iOS app)
    const forecastHourlyUrl = pointsData.properties.forecastHourly;
    
    // Step 2: Get the hourly forecast (matching iOS app)
    return fetch(forecastHourlyUrl, {
        headers: {
            'User-Agent': '(howstheroads.com, contact@howstheroads.com)'
        }
    })
    .then(response => response.json())
    .then(forecastData => {
        console.log('Forecast API Response:', forecastData);
        
        // Get the current period (matching iOS app)
        const currentPeriod = forecastData.properties.periods[0];
        const tempF = currentPeriod.temperature;
        const isNight = !currentPeriod.isDaytime;
        
        // Get weather condition from the forecast (matching iOS app's determineWeatherEmoji function)
        const emoji = determineWeatherEmoji(
            currentPeriod.shortForecast,
            isNight
        );
        
        console.log('Weather data processed:', {
            period: currentPeriod,
            tempF: tempF,
            shortForecast: currentPeriod.shortForecast,
            emoji: emoji,
            isNight: isNight
        });
        
        // Update the temperature display with the same format as iOS
        document.getElementById('temperature-text').textContent = `${emoji} ${tempF}°f in KC`;
    });
})
.catch(error => {
    console.error('Weather API Error:', error);
    document.getElementById('temperature-text').textContent = "Unable to load temperature";
});

/**
 * Determine the appropriate weather emoji based on forecast conditions
 * This function exactly matches the iOS implementation's determineWeatherEmoji
 * 
 * @param {string} shortForecast - The short forecast text from the API
 * @param {boolean} isNight - Whether it's currently night time
 * @returns {string} - Weather emoji representing current conditions
 */
function determineWeatherEmoji(shortForecast, isNight) {
    const forecast = shortForecast.toLowerCase();
    
    if (forecast.includes('thunder')) {
        return '⛈️';
    } else if (forecast.includes('rain') || forecast.includes('shower')) {
        return '🌧️';
    } else if (forecast.includes('snow')) {
        return '❄️';
    } else if (forecast.includes('fog') || forecast.includes('mist')) {
        return '🌫️';
    } else if (forecast.includes('cloud') || forecast.includes('overcast')) {
        // Check if it's nighttime first
        if (isNight) {
            if (forecast.includes('partly')) {
                return '🌙'; // Moon with some clouds
            } else if (forecast.includes('mostly')) {
                return '☁️'; // Just clouds at night
            } else {
                return '☁️'; // Overcast at night
            }
        } else {
            // Daytime cloud conditions
            if (forecast.includes('partly')) {
                return '⛅';
            } else if (forecast.includes('mostly')) {
                return '🌥️';
            } else {
                return '☁️';
            }
        }
    } else {
        // Clear or sunny
        return isNight ? '🌙' : '☀️';
    }
}

// ===== MAP MODAL FUNCTIONALITY =====

/**
 * Open the map modal with the given URL and location name
 * @param {string} mapUrl - The Google Maps URL to load in the iframe
 * @param {string} locationName - The name of the location to display
 */
function openMapModal(mapUrl, locationName) {
    // Get modal elements
    const modal = document.getElementById('map-modal');
    const iframe = document.getElementById('map-iframe');
    const title = document.getElementById('map-modal-title');
    
    // Extract coordinates from the URL
    const urlParams = new URLSearchParams(mapUrl.split('?')[1]);
    const coordinates = urlParams.get('q');
    const [lat, lng] = coordinates.split(',');
    
    // Create a direct URL to Google Maps with a clean view
    // Using center parameter to focus on the location without a pin
    const embedUrl = `https://www.google.com/maps?ll=${lat},${lng}&z=15&output=embed`;
    
    // Set the iframe source and title
    iframe.src = embedUrl;
    title.textContent = locationName;
    
    // Show the modal
    modal.style.display = 'flex';
    
    // Prevent scrolling on the body
    document.body.style.overflow = 'hidden';
}

// Add event listener to close the modal
document.addEventListener('DOMContentLoaded', function() {
    const closeButton = document.getElementById('map-modal-close');
    const modal = document.getElementById('map-modal');
    
    // Close when the close button is clicked
    closeButton.addEventListener('click', function() {
        closeMapModal();
    });
    
    // Close when clicking outside the modal content
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeMapModal();
        }
    });
    
    // Close when pressing Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeMapModal();
        }
    });
});

/**
 * Close the map modal
 */
function closeMapModal() {
    const modal = document.getElementById('map-modal');
    const iframe = document.getElementById('map-iframe');
    
    // Hide the modal
    modal.style.display = 'none';
    
    // Clear the iframe source to stop loading
    iframe.src = '';
    
    // Restore scrolling on the body
    document.body.style.overflow = '';
}

// ===== WEATHER MODAL FUNCTIONALITY =====

/**
 * Open the weather modal with the NOAA forecast for Kansas City
 */
function openWeatherModal() {
    // Get modal elements
    const modal = document.getElementById('weather-modal');
    const iframe = document.getElementById('weather-iframe');
    
    // Set the iframe source to the NOAA forecast page for Kansas City
    iframe.src = 'https://forecast.weather.gov/MapClick.php?CityName=Kansas+City&state=MO&site=EAX&textField1=39.0904&textField2=-94.5837&e=0';
    
    // Show the modal
    modal.style.display = 'flex';
    
    // Prevent scrolling on the body
    document.body.style.overflow = 'hidden';
}

// Add event listener to close the weather modal
document.addEventListener('DOMContentLoaded', function() {
    const closeButton = document.getElementById('weather-modal-close');
    const modal = document.getElementById('weather-modal');
    
    if (closeButton && modal) {
        // Close when the close button is clicked
        closeButton.addEventListener('click', function() {
            closeWeatherModal();
        });
        
        // Close when clicking outside the modal content
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeWeatherModal();
            }
        });
        
        // Close when pressing Escape key (already handled by the map modal event listener)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeWeatherModal();
            }
        });
    }
});

/**
 * Close the weather modal
 */
function closeWeatherModal() {
    const modal = document.getElementById('weather-modal');
    const iframe = document.getElementById('weather-iframe');
    
    // Hide the modal
    modal.style.display = 'none';
    
    // Clear the iframe source to stop loading
    iframe.src = '';
    
    // Restore scrolling on the body
    document.body.style.overflow = '';
} 