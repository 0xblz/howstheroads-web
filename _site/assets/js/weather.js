/**
 * Weather Service for How's The Roads
 * Fetches current weather conditions for Kansas City and displays them in the weather pill
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a page that should not display weather (like cameras page)
    const isNotHomepage = document.documentElement.classList.contains('not-homepage');
    
    // Only initialize weather on the homepage
    if (!isNotHomepage) {
        // Initialize weather service
        fetchWeather();
        
        // Refresh weather data every 15 minutes
        setInterval(fetchWeather, 15 * 60 * 1000);
    } else {
        // Hide weather pill on non-homepage pages
        const weatherPill = document.getElementById('weather-pill');
        if (weatherPill) {
            weatherPill.style.display = 'none';
        }
    }
});

/**
 * Fetch weather data from the National Weather Service website
 */
function fetchWeather() {
    // First try to get current conditions from the NWS website
    fetchCurrentConditionsFromWebsite();
    
    // Also fetch from API as a backup (will only be used if website fetch fails)
    fetchFromAPI();
}

/**
 * Fetch current weather conditions from the NWS website
 */
function fetchCurrentConditionsFromWebsite() {
    const url = 'https://forecast.weather.gov/MapClick.php?CityName=Kansas+City&state=MO&site=EAX&textField1=39.0904&textField2=-94.5837&e=0';
    
    fetch(url)
        .then(response => response.text())
        .then(html => {
            parseCurrentConditions(html);
        })
        .catch(error => {
            console.error('Error fetching current conditions:', error);
        });
}

/**
 * Parse current weather conditions from the NWS website HTML
 */
function parseCurrentConditions(html) {
    // Extract current temperature
    const temperaturePattern = /<p class="myforecast-current-lrg">(.*?)<\/p>/;
    const temperatureMatch = html.match(temperaturePattern);
    let temperature = temperatureMatch ? temperatureMatch[1] : 'N/A';
    
    // Extract weather description
    const descriptionPattern = /<p class="myforecast-current">(.*?)<\/p>/;
    const descriptionMatch = html.match(descriptionPattern);
    let description = descriptionMatch ? descriptionMatch[1] : 'N/A';
    
    // Decode HTML entities
    temperature = decodeHTMLEntities(temperature);
    description = decodeHTMLEntities(description);
    
    // Determine if it's night time based on current hour
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 18;
    
    // Determine weather emoji
    const weatherEmoji = determineWeatherEmoji(description, isNight);
    
    // Update the weather pill
    updateWeatherPill(`${weatherEmoji} ${temperature} in KC`);
}

/**
 * Fetch weather data from the NWS API as a backup
 */
function fetchFromAPI() {
    const lat = '39.2976';
    const lon = '-94.7139';
    const pointsUrl = `https://api.weather.gov/points/${lat},${lon}`;
    
    fetch(pointsUrl, {
        headers: {
            'User-Agent': '(howstheroads.com, contact@howstheroads.com)'
        }
    })
        .then(response => response.json())
        .then(pointsData => {
            const forecastHourlyUrl = pointsData.properties.forecastHourly;
            return fetch(forecastHourlyUrl, {
                headers: {
                    'User-Agent': '(howstheroads.com, contact@howstheroads.com)'
                }
            });
        })
        .then(response => response.json())
        .then(forecastData => {
            // Get the current period
            const currentPeriod = forecastData.properties.periods[0];
            if (!currentPeriod) return;
            
            const tempF = currentPeriod.temperature;
            const isNight = !currentPeriod.isDaytime;
            
            // Get weather condition from the forecast
            const emoji = determineWeatherEmoji(currentPeriod.shortForecast, isNight);
            
            // Only update if we don't already have temperature data
            const weatherText = document.getElementById('weather-text');
            if (weatherText.textContent.includes('--')) {
                updateWeatherPill(`${emoji} ${tempF}°F in KC`);
            }
        })
        .catch(error => {
            console.error('Weather API Error:', error);
        });
}

/**
 * Update the weather pill with the current weather data
 */
function updateWeatherPill(weatherText) {
    const weatherElement = document.getElementById('weather-text');
    if (weatherElement) {
        weatherElement.textContent = weatherText;
    }
}

/**
 * Determine the appropriate weather emoji based on the forecast description
 */
function determineWeatherEmoji(shortForecast, isNight = false) {
    // Convert to lowercase for case-insensitive matching
    const forecast = shortForecast.toLowerCase();
    
    // SPECIAL CASE: If it's daytime and the forecast contains "clear" or "sunny", 
    // immediately return the sun emoji without further processing
    if (!isNight && (forecast.includes('clear') || forecast.includes('sunny'))) {
        return '☀️';
    }
    
    // STEP 1: Handle precipitation conditions (these override day/night)
    if (forecast.includes('thunder')) {
        return '⛈️'; // Thunderstorm
    }
    
    if (forecast.includes('rain') || forecast.includes('shower')) {
        return '🌧️'; // Rain
    }
    
    if (forecast.includes('snow') || forecast.includes('flurries')) {
        return '❄️'; // Snow
    }
    
    if (forecast.includes('fog') || forecast.includes('mist')) {
        return '🌫️'; // Fog
    }
    
    // STEP 2: Handle cloud conditions based on day/night
    const hasClouds = forecast.includes('cloud') || 
                    forecast.includes('overcast') || 
                    forecast.includes('partly') || 
                    forecast.includes('mostly');
    
    if (hasClouds) {
        if (isNight) {
            // Nighttime cloud conditions - NEVER show moon with clouds
            return '☁️'; // Just clouds at night
        } else {
            // Daytime cloud conditions
            if (forecast.includes('partly')) {
                return '⛅'; // Sun with some clouds
            } else if (forecast.includes('mostly')) {
                return '🌥️'; // Sun mostly covered by clouds
            } else {
                return '☁️'; // Completely cloudy
            }
        }
    }
    
    // STEP 3: Handle clear/sunny conditions
    const isClear = forecast.includes('clear') || forecast.includes('sunny');
    
    if (isClear) {
        if (isNight) {
            return '🌙'; // Moon at night
        } else {
            return '☀️'; // Sun during day
        }
    }
    
    // STEP 4: Default fallback based on time of day
    // If we get here, we couldn't determine the weather from the forecast
    return isNight ? '🌙' : '☀️';
}

/**
 * Decode HTML entities in a string
 */
function decodeHTMLEntities(string) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = string;
    return textarea.value;
} 