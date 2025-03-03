/**
 * Main application script for How's The Roads
 * This script handles:
 * 1. Fetching and displaying traffic camera feeds
 * 2. Camera and map lightbox functionality
 * 3. Search functionality for cameras
 * 4. Map view for cameras
 */

// ===== TRAFFIC CAMERA FUNCTIONALITY =====

/**
 * Fetch traffic camera data from JSON endpoint and populate the map
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

        // Store videos globally for URL parameter handling
        globalAllVideos = [...videos];
        window.allVideos = globalAllVideos; // Make it available on the window object

        // Get DOM references
        const videoContainer = document.getElementById('video-container');
        const mapContainer = document.getElementById('map-container');
        const loadingMessage = document.getElementById('loading-message');
        
        // If we're not on the cameras page, don't proceed
        if (!mapContainer || !loadingMessage) {
            return;
        }
        
        // Create camera modal elements
        const cameraModal = document.createElement('div');
        cameraModal.className = 'camera-modal';
        cameraModal.style.display = 'none';
        cameraModal.style.position = 'fixed';
        cameraModal.style.top = '0';
        cameraModal.style.left = '0';
        cameraModal.style.width = '100%';
        cameraModal.style.height = '100%';
        cameraModal.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        cameraModal.style.zIndex = '1000';
        cameraModal.style.display = 'none';
        cameraModal.style.justifyContent = 'center';
        cameraModal.style.alignItems = 'center';
        cameraModal.style.padding = '1rem';
        
        const cameraModalContent = document.createElement('div');
        cameraModalContent.className = 'camera-modal-content';
        cameraModalContent.style.backgroundColor = 'black';
        cameraModalContent.style.borderRadius = '0.75rem';
        cameraModalContent.style.width = '100%';
        cameraModalContent.style.maxWidth = '900px';
        cameraModalContent.style.maxHeight = '90vh';
        cameraModalContent.style.overflow = 'hidden';
        cameraModalContent.style.position = 'relative';
        cameraModalContent.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.5)';
        cameraModalContent.style.display = 'flex';
        cameraModalContent.style.flexDirection = 'column';
        
        const cameraModalClose = document.createElement('span');
        cameraModalClose.className = 'camera-modal-close';
        cameraModalClose.innerHTML = '&times;';
        cameraModalClose.style.position = 'absolute';
        cameraModalClose.style.top = '0.5rem';
        cameraModalClose.style.right = '0.75rem';
        cameraModalClose.style.fontSize = '2rem';
        cameraModalClose.style.color = 'white';
        cameraModalClose.style.cursor = 'pointer';
        cameraModalClose.style.zIndex = '10';
        cameraModalClose.style.transition = 'all 0.15s ease-in-out';
        cameraModalClose.addEventListener('click', function() {
            closeModal(cameraModal, cameraModalVideo);
        });
        
        const cameraModalTitle = document.createElement('h2');
        cameraModalTitle.className = 'camera-modal-title';
        cameraModalTitle.style.padding = '1rem';
        cameraModalTitle.style.margin = '0';
        cameraModalTitle.style.backgroundColor = 'rgb(0, 0, 0)';
        cameraModalTitle.style.color = 'white';
        cameraModalTitle.style.fontSize = '1.2rem';
        cameraModalTitle.style.textAlign = 'center';
        
        const cameraModalVideo = document.createElement('video');
        cameraModalVideo.className = 'camera-modal-video';
        cameraModalVideo.style.width = '100%';
        cameraModalVideo.style.height = '60vh';
        cameraModalVideo.style.display = 'block';
        cameraModalVideo.style.backgroundColor = '#000';
        cameraModalVideo.style.minHeight = '50vh';
        cameraModalVideo.style.objectFit = 'contain';
        cameraModalVideo.setAttribute('controls', '');
        cameraModalVideo.setAttribute('autoplay', '');
        cameraModalVideo.setAttribute('playsinline', '');
        cameraModalVideo.setAttribute('muted', '');
        
        cameraModalContent.appendChild(cameraModalClose);
        cameraModalContent.appendChild(cameraModalTitle);
        cameraModalContent.appendChild(cameraModalVideo);
        cameraModal.appendChild(cameraModalContent);
        
        // Add camera modal to the document body
        document.body.appendChild(cameraModal);
        
        /**
         * Close the specified modal and clean up resources
         * @param {HTMLElement} modal - The modal element to close
         * @param {HTMLVideoElement|HTMLIFrameElement} mediaElement - The media element to clear
         */
        function closeModal(modal, mediaElement) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            
            // Clear the media source
            if (mediaElement.tagName === 'IFRAME') {
                mediaElement.src = '';
            } else if (mediaElement.tagName === 'VIDEO') {
                mediaElement.pause();
                mediaElement.src = '';
                mediaElement.load();
            }
            
            // Remove any message that might have been added
            const existingMessage = modal.querySelector('.camera-modal-message');
            if (existingMessage) {
                existingMessage.parentNode.removeChild(existingMessage);
            }
            
            // Reset URL when closing modal
            window.history.pushState({}, '', window.location.pathname);
        }
        
        /**
         * Open the camera modal with the specified video
         * @param {Object} video - The video object containing name and URL
         */
        function openCameraModal(video) {
            cameraModalTitle.textContent = video.name;
            
            // Set the video source directly from the JSON
            cameraModalVideo.style.display = 'block';
            cameraModalVideo.src = video.url;
            cameraModalVideo.load(); // Important to reload the video with the new source
            
            // Try to play the video (may be blocked by browser autoplay policies)
            const playPromise = cameraModalVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Autoplay prevented:', error);
                    // Show play button or message if needed
                });
            }
            
            // Remove any message that might have been added
            const existingMessage = cameraModalContent.querySelector('.camera-modal-message');
            if (existingMessage) {
                cameraModalContent.removeChild(existingMessage);
            }
            
            // Update URL with camera name for sharing
            const cameraId = encodeURIComponent(video.name);
            window.history.pushState({type: 'camera', id: cameraId}, '', `?camera=${cameraId}`);
            
            cameraModal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
        }
        
        // Initialize the map
        function initMap(videos) {
            // Show map container - no need to change display since it's now visible by default
            // mapContainer.style.display = 'block';
            
            // Create map centered on Kansas City
            const map = L.map('map-container').setView([39.0997, -94.5786], 11);
            
            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            
            // Filter videos with valid coordinates
            const videosWithCoords = videos.filter(video => 
                video.latitude && video.longitude && 
                !isNaN(parseFloat(video.latitude)) && 
                !isNaN(parseFloat(video.longitude))
            );
            
            // Add markers for each camera
            videosWithCoords.forEach(video => {
                const lat = parseFloat(video.latitude);
                const lng = parseFloat(video.longitude);
                
                // Create custom marker icon
                const cameraIcon = L.divIcon({
                    className: 'camera-marker',
                    html: '<i class="fa-solid fa-video"></i>',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });
                
                // Create marker
                const marker = L.marker([lat, lng], { icon: cameraIcon }).addTo(map);
                
                // Create popup content
                const popupContent = document.createElement('div');
                popupContent.className = 'map-popup';
                
                const title = document.createElement('h3');
                title.textContent = video.name;
                popupContent.appendChild(title);
                
                const viewButton = document.createElement('button');
                viewButton.className = 'map-popup-button';
                viewButton.innerHTML = '<i class="fa-solid fa-play"></i> View Camera';
                viewButton.addEventListener('click', function() {
                    openCameraModal(video);
                });
                popupContent.appendChild(viewButton);
                
                // Bind popup to marker
                marker.bindPopup(popupContent);
            });
            
            // Store map and videos with coordinates in global variables for later use
            window.map = map;
            window.videosWithCoords = videosWithCoords;
            
            // Hide loading message
            loadingMessage.style.display = 'none';
            
            // Check URL parameters on page load
            checkUrlForCamera();
        }
        
        /**
         * Check URL parameters for camera
         */
        function checkUrlForCamera() {
            const urlParams = new URLSearchParams(window.location.search);
            
            // Check for camera parameter
            const cameraId = urlParams.get('camera');
            if (cameraId && typeof allVideos !== 'undefined') {
                const video = allVideos.find(v => v.name === decodeURIComponent(cameraId));
                if (video) {
                    openCameraModal(video);
                }
            }
        }
        
        // Initialize the map with camera data
        initMap(videos);
    })
    .catch(error => {
        console.error('Error fetching or processing video data:', error);
        
        // Show error message
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.innerHTML = '<h3>Error loading cameras. Please try again later.</h3>';
        }
    });

/**
 * Thumbnail Gallery and Lightbox Functionality
 * Handles opening images in a lightbox when thumbnails are clicked
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get all thumbnail elements
    const thumbnails = document.querySelectorAll('.thumbnail');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.querySelector('.lightbox-close');
    
    // Add click event to each thumbnail
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            const imgSrc = this.getAttribute('data-img');
            const imgId = this.getAttribute('data-id') || this.getAttribute('id') || imgSrc.split('/').pop();
            openLightbox(imgSrc, imgId);
        });
    });
    
    // Function to open lightbox with URL update
    function openLightbox(imgSrc, imgId) {
        lightboxImg.src = imgSrc;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when lightbox is open
        
        // Update URL with image ID for sharing
        window.history.pushState({type: 'image', id: imgId}, '', `?image=${encodeURIComponent(imgId)}`);
    }
    
    // Function to close lightbox
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
        
        // Reset URL when closing lightbox
        window.history.pushState({}, '', window.location.pathname);
    }
    
    // Close lightbox when clicking the close button
    if (lightboxClose) {
        lightboxClose.addEventListener('click', function() {
            closeLightbox();
        });
    }
    
    // Close lightbox when clicking outside the image
    if (lightbox) {
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }
    
    // Close lightbox with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
    
    // Check URL parameters on page load to open lightbox if needed
    function checkUrlForLightbox() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check for image parameter
        const imageId = urlParams.get('image');
        if (imageId) {
            // Find the thumbnail with matching ID or data-id
            const thumbnail = document.querySelector(`.thumbnail[id="${imageId}"], .thumbnail[data-id="${imageId}"]`);
            if (thumbnail) {
                const imgSrc = thumbnail.getAttribute('data-img');
                openLightbox(imgSrc, imageId);
            } else {
                // If no matching thumbnail found, try to find by image source
                const thumbnails = document.querySelectorAll('.thumbnail');
                for (const thumb of thumbnails) {
                    const src = thumb.getAttribute('data-img');
                    if (src && src.includes(imageId)) {
                        openLightbox(src, imageId);
                        break;
                    }
                }
            }
        }
        
        // Check for camera parameter (for traffic cameras)
        const cameraId = urlParams.get('camera');
        if (cameraId && typeof allVideos !== 'undefined') {
            const video = allVideos.find(v => v.name === decodeURIComponent(cameraId));
            if (video) {
                openCameraModal(video);
            }
        }
        
        // Check for map parameter (for traffic camera maps)
        const mapId = urlParams.get('map');
        if (mapId && typeof allVideos !== 'undefined') {
            const video = allVideos.find(v => v.name === decodeURIComponent(mapId));
            if (video && video.latitude && video.longitude) {
                openMapModal(video);
            }
        }
    }
    
    // Run URL check after a short delay to ensure all data is loaded
    setTimeout(checkUrlForLightbox, 500);
});

/**
 * Feedback Lightbox Functionality
 * Handles opening the feedback form in a lightbox
 */
document.addEventListener('DOMContentLoaded', function() {
    const feedbackLink = document.getElementById('feedback-link');
    const feedbackLightbox = document.getElementById('feedback-lightbox');
    const feedbackLightboxClose = feedbackLightbox?.querySelector('.lightbox-close');
    
    // Function to open feedback lightbox
    function openFeedbackLightbox() {
        if (feedbackLightbox) {
            feedbackLightbox.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling when lightbox is open
            
            // Update URL for sharing
            window.history.pushState({type: 'feedback'}, '', '?feedback=true');
        }
    }
    
    // Function to close feedback lightbox
    function closeFeedbackLightbox() {
        if (feedbackLightbox) {
            feedbackLightbox.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
            
            // Reset URL when closing lightbox
            window.history.pushState({}, '', window.location.pathname);
        }
    }
    
    // Add click event to feedback link
    if (feedbackLink && feedbackLightbox) {
        feedbackLink.addEventListener('click', function(e) {
            e.preventDefault();
            openFeedbackLightbox();
        });
        
        // Close lightbox when clicking the close button
        if (feedbackLightboxClose) {
            feedbackLightboxClose.addEventListener('click', function() {
                closeFeedbackLightbox();
            });
        }
        
        // Close lightbox when clicking outside the content
        feedbackLightbox.addEventListener('click', function(e) {
            if (e.target === feedbackLightbox) {
                closeFeedbackLightbox();
            }
        });
        
        // Close lightbox with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && feedbackLightbox.classList.contains('active')) {
                closeFeedbackLightbox();
            }
        });
    }
    
    // Check URL parameters for feedback lightbox
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('feedback') === 'true') {
        // Open feedback lightbox if parameter is present
        setTimeout(openFeedbackLightbox, 300);
    }
});

/**
 * Global URL parameter handling
 * This ensures URL parameters work even when directly pasting a URL
 */
window.addEventListener('load', function() {
    // This runs after everything else has loaded
    const urlParams = new URLSearchParams(window.location.search);
    
    // Handle image lightbox URLs
    if (urlParams.has('image')) {
        const imageId = urlParams.get('image');
        const thumbnail = document.querySelector(`.thumbnail[id="${imageId}"], .thumbnail[data-id="${imageId}"]`);
        
        if (thumbnail) {
            const imgSrc = thumbnail.getAttribute('data-img');
            // Find the lightbox elements
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            
            if (lightbox && lightboxImg) {
                lightboxImg.src = imgSrc;
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        } else {
            // Try to find by image source if no direct match
            const thumbnails = document.querySelectorAll('.thumbnail');
            for (const thumb of thumbnails) {
                const src = thumb.getAttribute('data-img');
                if (src && src.includes(imageId)) {
                    const lightbox = document.getElementById('lightbox');
                    const lightboxImg = document.getElementById('lightbox-img');
                    
                    if (lightbox && lightboxImg) {
                        lightboxImg.src = src;
                        lightbox.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    }
                    break;
                }
            }
        }
    }
    
    // Handle camera lightbox URLs
    if (urlParams.has('camera')) {
        const cameraId = urlParams.get('camera');
        
        // If allVideos is not defined yet, we need to wait for it
        if (typeof allVideos === 'undefined') {
            // Create a function to check for allVideos and retry
            const checkForVideos = function() {
                if (typeof allVideos !== 'undefined') {
                    const video = allVideos.find(v => v.name === decodeURIComponent(cameraId));
                    if (video) {
                        // Find the camera modal elements
                        const cameraModal = document.querySelector('.camera-modal:not(.map-modal)');
                        const cameraModalVideo = cameraModal?.querySelector('.camera-modal-video');
                        const cameraModalTitle = cameraModal?.querySelector('.camera-modal-title');
                        
                        if (cameraModal && cameraModalVideo && cameraModalTitle) {
                            cameraModalTitle.textContent = video.name;
                            cameraModalVideo.style.display = 'block';
                            cameraModalVideo.src = video.url;
                            cameraModalVideo.load();
                            cameraModalVideo.play().catch(e => console.log('Autoplay prevented:', e));
                            cameraModal.style.display = 'flex';
                            document.body.style.overflow = 'hidden';
                        }
                    }
                } else {
                    // Retry after a short delay
                    setTimeout(checkForVideos, 500);
                }
            };
            
            // Start checking
            checkForVideos();
        } else {
            // allVideos is already defined, proceed normally
            const video = allVideos.find(v => v.name === decodeURIComponent(cameraId));
            if (video) {
                // Find the camera modal elements
                const cameraModal = document.querySelector('.camera-modal:not(.map-modal)');
                const cameraModalVideo = cameraModal?.querySelector('.camera-modal-video');
                const cameraModalTitle = cameraModal?.querySelector('.camera-modal-title');
                
                if (cameraModal && cameraModalVideo && cameraModalTitle) {
                    cameraModalTitle.textContent = video.name;
                    cameraModalVideo.style.display = 'block';
                    cameraModalVideo.src = video.url;
                    cameraModalVideo.load();
                    cameraModalVideo.play().catch(e => console.log('Autoplay prevented:', e));
                    cameraModal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                }
            }
        }
    }
    
    // Handle map lightbox URLs
    if (urlParams.has('map')) {
        const mapId = urlParams.get('map');
        
        // If allVideos is not defined yet, we need to wait for it
        if (typeof allVideos === 'undefined') {
            // Create a function to check for allVideos and retry
            const checkForVideos = function() {
                if (typeof allVideos !== 'undefined') {
                    const video = allVideos.find(v => v.name === decodeURIComponent(mapId));
                    if (video && video.latitude && video.longitude) {
                        // Find the map modal elements
                        const mapModal = document.querySelector('.map-modal');
                        const mapModalIframe = mapModal?.querySelector('.camera-modal-iframe');
                        const mapModalTitle = mapModal?.querySelector('.camera-modal-title');
                        
                        if (mapModal && mapModalIframe && mapModalTitle) {
                            mapModalTitle.textContent = `${video.name} - Map Location`;
                            const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${video.latitude},${video.longitude}&zoom=15`;
                            mapModalIframe.src = mapUrl;
                            mapModal.style.display = 'flex';
                            document.body.style.overflow = 'hidden';
                        }
                    }
                } else {
                    // Retry after a short delay
                    setTimeout(checkForVideos, 500);
                }
            };
            
            // Start checking
            checkForVideos();
        } else {
            // allVideos is already defined, proceed normally
            const video = allVideos.find(v => v.name === decodeURIComponent(mapId));
            if (video && video.latitude && video.longitude) {
                // Find the map modal elements
                const mapModal = document.querySelector('.map-modal');
                const mapModalIframe = mapModal?.querySelector('.camera-modal-iframe');
                const mapModalTitle = mapModal?.querySelector('.camera-modal-title');
                
                if (mapModal && mapModalIframe && mapModalTitle) {
                    mapModalTitle.textContent = `${video.name} - Map Location`;
                    const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${video.latitude},${video.longitude}&zoom=15`;
                    mapModalIframe.src = mapUrl;
                    mapModal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                }
            }
        }
    }
    
    // Handle feedback lightbox URLs
    if (urlParams.get('feedback') === 'true') {
        const feedbackLightbox = document.getElementById('feedback-lightbox');
        if (feedbackLightbox) {
            feedbackLightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
});

// Make allVideos globally accessible for URL parameter handling
let globalAllVideos = null;

// Modify the fetch callback to store videos globally
fetch('https://0xblz.github.io/docs/kansascity_all.json')
    .then(response => response.json())
    .then(data => {
        // Extract the videos array from the response
        const videos = data.videos || data; // Handle different possible JSON structures
        
        // Validate that we received proper video data
        if (!videos || !Array.isArray(videos)) {
            throw new Error('Invalid video data format');
        }

        // Store videos globally for URL parameter handling
        globalAllVideos = [...videos];
        window.allVideos = globalAllVideos; // Make it available on the window object

        // Get DOM references
        const videoContainer = document.getElementById('video-container');
        const loadingMessage = document.getElementById('loading-message');
        const searchInput = document.getElementById('camera-search');
        const clearSearchBtn = document.getElementById('clear-search');
        
        // If we're not on the test page, don't proceed
        if (!videoContainer || !loadingMessage) {
            return;
        }
        
        // Create camera modal elements
        const cameraModal = document.createElement('div');
        cameraModal.className = 'camera-modal';
        cameraModal.style.display = 'none';
        cameraModal.style.position = 'fixed';
        cameraModal.style.top = '0';
        cameraModal.style.left = '0';
        cameraModal.style.width = '100%';
        cameraModal.style.height = '100%';
        cameraModal.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        cameraModal.style.zIndex = '1000';
        cameraModal.style.display = 'none';
        cameraModal.style.justifyContent = 'center';
        cameraModal.style.alignItems = 'center';
        cameraModal.style.padding = '1rem';
        
        const cameraModalContent = document.createElement('div');
        cameraModalContent.className = 'camera-modal-content';
        cameraModalContent.style.backgroundColor = 'black';
        cameraModalContent.style.borderRadius = '0.75rem';
        cameraModalContent.style.width = '100%';
        cameraModalContent.style.maxWidth = '900px';
        cameraModalContent.style.maxHeight = '90vh';
        cameraModalContent.style.overflow = 'hidden';
        cameraModalContent.style.position = 'relative';
        cameraModalContent.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.5)';
        cameraModalContent.style.display = 'flex';
        cameraModalContent.style.flexDirection = 'column';
        
        const cameraModalClose = document.createElement('span');
        cameraModalClose.className = 'camera-modal-close';
        cameraModalClose.innerHTML = '&times;';
        cameraModalClose.style.position = 'absolute';
        cameraModalClose.style.top = '0.5rem';
        cameraModalClose.style.right = '0.75rem';
        cameraModalClose.style.fontSize = '2rem';
        cameraModalClose.style.color = 'white';
        cameraModalClose.style.cursor = 'pointer';
        cameraModalClose.style.zIndex = '10';
        cameraModalClose.style.transition = 'all 0.15s ease-in-out';
        cameraModalClose.addEventListener('click', function() {
            closeModal(cameraModal, cameraModalVideo);
        });
        
        const cameraModalTitle = document.createElement('h2');
        cameraModalTitle.className = 'camera-modal-title';
        cameraModalTitle.style.padding = '1rem';
        cameraModalTitle.style.margin = '0';
        cameraModalTitle.style.backgroundColor = 'rgb(0, 0, 0)';
        cameraModalTitle.style.color = 'white';
        cameraModalTitle.style.fontSize = '1.2rem';
        cameraModalTitle.style.textAlign = 'center';
        
        const cameraModalVideo = document.createElement('video');
        cameraModalVideo.className = 'camera-modal-video';
        cameraModalVideo.style.width = '100%';
        cameraModalVideo.style.height = '60vh';
        cameraModalVideo.style.display = 'block';
        cameraModalVideo.style.backgroundColor = '#000';
        cameraModalVideo.style.minHeight = '50vh';
        cameraModalVideo.style.objectFit = 'contain';
        cameraModalVideo.setAttribute('controls', '');
        cameraModalVideo.setAttribute('autoplay', '');
        cameraModalVideo.setAttribute('playsinline', '');
        cameraModalVideo.setAttribute('muted', '');
        
        cameraModalContent.appendChild(cameraModalClose);
        cameraModalContent.appendChild(cameraModalTitle);
        cameraModalContent.appendChild(cameraModalVideo);
        cameraModal.appendChild(cameraModalContent);
        
        // Add camera modal to the document body
        document.body.appendChild(cameraModal);
        
        // Create map modal elements
        const mapModal = document.createElement('div');
        mapModal.className = 'camera-modal map-modal'; // Reuse camera-modal styles
        mapModal.style.display = 'none';
        mapModal.style.position = 'fixed';
        mapModal.style.top = '0';
        mapModal.style.left = '0';
        mapModal.style.width = '100%';
        mapModal.style.height = '100%';
        mapModal.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        mapModal.style.zIndex = '1000';
        mapModal.style.display = 'none';
        mapModal.style.justifyContent = 'center';
        mapModal.style.alignItems = 'center';
        mapModal.style.padding = '1rem';
        
        const mapModalContent = document.createElement('div');
        mapModalContent.className = 'camera-modal-content';
        mapModalContent.style.backgroundColor = 'black';
        mapModalContent.style.borderRadius = '0.75rem';
        mapModalContent.style.width = '100%';
        mapModalContent.style.maxWidth = '900px';
        mapModalContent.style.maxHeight = '90vh';
        mapModalContent.style.overflow = 'hidden';
        mapModalContent.style.position = 'relative';
        mapModalContent.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.5)';
        mapModalContent.style.display = 'flex';
        mapModalContent.style.flexDirection = 'column';
        
        const mapModalClose = document.createElement('span');
        mapModalClose.className = 'camera-modal-close';
        mapModalClose.innerHTML = '&times;';
        mapModalClose.style.position = 'absolute';
        mapModalClose.style.top = '0.5rem';
        mapModalClose.style.right = '0.75rem';
        mapModalClose.style.fontSize = '2rem';
        mapModalClose.style.color = 'white';
        mapModalClose.style.cursor = 'pointer';
        mapModalClose.style.zIndex = '10';
        mapModalClose.style.transition = 'all 0.15s ease-in-out';
        mapModalClose.addEventListener('click', function() {
            closeModal(mapModal, mapModalIframe);
        });
        
        const mapModalTitle = document.createElement('h2');
        mapModalTitle.className = 'camera-modal-title';
        mapModalTitle.style.padding = '1rem';
        mapModalTitle.style.margin = '0';
        mapModalTitle.style.backgroundColor = 'rgb(0, 0, 0)';
        mapModalTitle.style.color = 'white';
        mapModalTitle.style.fontSize = '1.2rem';
        mapModalTitle.style.textAlign = 'center';
        
        const mapModalIframe = document.createElement('iframe');
        mapModalIframe.className = 'camera-modal-iframe';
        mapModalIframe.style.width = '100%';
        mapModalIframe.style.height = '60vh';
        mapModalIframe.style.border = 'none';
        mapModalIframe.style.display = 'block';
        mapModalIframe.style.backgroundColor = '#000';
        mapModalIframe.style.minHeight = '50vh';
        mapModalIframe.setAttribute('allowfullscreen', '');
        mapModalIframe.setAttribute('loading', 'lazy');
        
        mapModalContent.appendChild(mapModalClose);
        mapModalContent.appendChild(mapModalTitle);
        mapModalContent.appendChild(mapModalIframe);
        mapModal.appendChild(mapModalContent);
        
        // Add map modal to the document body
        document.body.appendChild(mapModal);
        
        // Close modal when clicking outside of the content
        cameraModal.addEventListener('click', function(event) {
            if (event.target === cameraModal) {
                closeModal(cameraModal, cameraModalVideo);
            }
        });
        
        // Close modal when clicking outside of the content
        mapModal.addEventListener('click', function(event) {
            if (event.target === mapModal) {
                closeModal(mapModal, mapModalIframe);
            }
        });
        
        /**
         * Close the specified modal and clean up resources
         * @param {HTMLElement} modal - The modal element to close
         * @param {HTMLVideoElement|HTMLIFrameElement} mediaElement - The media element to clear
         */
        function closeModal(modal, mediaElement) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            
            // Clear the media source
            if (mediaElement.tagName === 'IFRAME') {
                mediaElement.src = '';
            } else if (mediaElement.tagName === 'VIDEO') {
                mediaElement.pause();
                mediaElement.src = '';
                mediaElement.load();
            }
            
            // Remove any message that might have been added
            const existingMessage = modal.querySelector('.camera-modal-message');
            if (existingMessage) {
                existingMessage.parentNode.removeChild(existingMessage);
            }
            
            // Reset URL when closing modal
            window.history.pushState({}, '', window.location.pathname);
        }
        
        /**
         * Open the camera modal with the specified video
         * @param {Object} video - The video object containing name and URL
         */
        function openCameraModal(video) {
            cameraModalTitle.textContent = video.name;
            
            // Set the video source directly from the JSON
            cameraModalVideo.style.display = 'block';
            cameraModalVideo.src = video.url;
            cameraModalVideo.load(); // Important to reload the video with the new source
            
            // Try to play the video (may be blocked by browser autoplay policies)
            const playPromise = cameraModalVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Autoplay prevented:', error);
                    // Show play button or message if needed
                });
            }
            
            // Remove any message that might have been added
            const existingMessage = cameraModalContent.querySelector('.camera-modal-message');
            if (existingMessage) {
                cameraModalContent.removeChild(existingMessage);
            }
            
            // Update URL with camera name for sharing
            const cameraId = encodeURIComponent(video.name);
            window.history.pushState({type: 'camera', id: cameraId}, '', `?camera=${cameraId}`);
            
            cameraModal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
        }
        
        /**
         * Open the map modal with the specified location
         * @param {Object} video - The video object containing name, latitude, and longitude
         */
        function openMapModal(video) {
            mapModalTitle.textContent = `${video.name} - Map Location`;
            
            // Create Google Maps embed URL
            const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${video.latitude},${video.longitude}&zoom=15`;
            mapModalIframe.src = mapUrl;
            
            // Update URL with map location for sharing
            const cameraId = encodeURIComponent(video.name);
            window.history.pushState({type: 'map', id: cameraId}, '', `?map=${cameraId}`);
            
            mapModal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
        }
        
        // Store all videos for search
        const allVideos = [...videos];
        
        // Search configuration
        let isSearchActive = false; // Track if search is active
        let filteredVideos = []; // Store filtered videos when search is active
        
        /**
         * Filter videos based on search query
         * @param {string} query - The search query
         * @returns {Array} - Filtered array of videos
         */
        function filterVideos(query) {
            if (!query.trim()) {
                return allVideos;
            }
            
            const normalizedQuery = query.toLowerCase().trim();
            return allVideos.filter(video => 
                video.name.toLowerCase().includes(normalizedQuery)
            );
        }
        
        /**
         * Handle search input changes
         */
        function handleSearch() {
            const query = searchInput.value;
            
            // Show/hide clear button based on input
            clearSearchBtn.style.display = query ? 'flex' : 'none';
            
            // Filter videos
            filteredVideos = filterVideos(query);
            isSearchActive = !!query.trim();
            
            // Clear existing videos
            videoContainer.innerHTML = '';
            
            if (filteredVideos.length === 0 && isSearchActive) {
                // Show no results message
                const noResults = document.createElement('div');
                noResults.className = 'no-results';
                noResults.innerHTML = `
                    <p><small>No cameras found matching "${query}"</small></p>
                    <div class="no-results-actions">
                        <button class="highlight" id="reset-search">
                            <i class="fa-solid fa-arrow-rotate-left"></i> Show All Cameras
                        </button>
                    </div>
                `;
                videoContainer.appendChild(noResults);
                
                // Add event listener to reset button
                document.getElementById('reset-search').addEventListener('click', clearSearch);
                
                // Show video container
                videoContainer.style.display = 'grid';
                loadingMessage.style.display = 'none';
            } else {
                // Load filtered videos
                loadVideos(filteredVideos);
            }
        }
        
        /**
         * Clear the search input and reset to show all videos
         */
        function clearSearch() {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            isSearchActive = false;
            
            // Clear existing videos
            videoContainer.innerHTML = '';
            
            // Load all videos
            loadVideos(allVideos);
        }
        
        // Add event listeners for search
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
            clearSearchBtn.addEventListener('click', clearSearch);
        }
        
        /**
         * Load videos into the container
         * @param {Array} videosToLoad - The videos to display
         */
        function loadVideos(videosToLoad) {
            // Create and append video elements
            videosToLoad.forEach(video => {
                // Create video item container
                const videoItem = document.createElement('div');
                videoItem.className = 'video-item';
                
                // Create video title that's clickable
                const videoTitle = document.createElement('h3');
                videoTitle.textContent = video.name;
                videoTitle.className = 'video-title';
                videoTitle.addEventListener('click', function() {
                    openCameraModal(video);
                });
                videoItem.appendChild(videoTitle);
                
                // Create link container
                const linkContainer = document.createElement('div');
                linkContainer.className = 'link-container';
                
                // Add map link if coordinates are available
                if (video.latitude && video.longitude) {
                    const mapLink = document.createElement('a');
                    mapLink.href = 'javascript:void(0);'; // Use JavaScript void to prevent page navigation
                    mapLink.className = 'map-link';
                    mapLink.innerHTML = '<i class="fa-solid fa-map-location-dot"></i> Map';
                    mapLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        openMapModal(video);
                    });
                    linkContainer.appendChild(mapLink);
                }
                
                // Add the link container to the video item
                videoItem.appendChild(linkContainer);
                
                // Add the video item to the main container
                videoContainer.appendChild(videoItem);
            });
            
            // Hide loading message and show video container
            loadingMessage.style.display = 'none';
            videoContainer.style.display = 'flex';
        }
        
        // Load all videos initially
        loadVideos(allVideos);
    })
    .catch(error => {
        console.error('Error fetching or processing video data:', error);
        
        // Show error message
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.innerHTML = '<h3>Error loading cameras. Please try again later.</h3>';
        }
    }); 