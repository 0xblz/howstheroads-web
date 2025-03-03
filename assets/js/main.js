/**
 * Main application script for How's The Roads
 * This script handles:
 * 1. Fetching and displaying traffic camera feeds
 * 2. Camera and map lightbox functionality
 * 3. Search functionality for cameras
 */

// ===== TRAFFIC CAMERA FUNCTIONALITY =====

/**
 * Fetch traffic camera data from JSON endpoint and populate the video container
 * The JSON contains an array of camera objects with name, URL, latitude, and longitude
 */
fetch('https://0xblz.github.io/docs/kansascity_all.json')
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
                loadVideos(isSearchActive ? filteredVideos : allVideos);
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