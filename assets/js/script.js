document.addEventListener('DOMContentLoaded', function() {
    const heroImage = document.querySelector('.hero img');
    if (!heroImage) return;
    
    let availableImages = [];
    let preloadedImages = [];
    let currentIndex = 0;
    let imagesLoaded = 0;
    
    // Detect available hero images based on naming pattern
    function detectHeroImages() {
        let imageIndex = 1;
        
        function checkNextImage() {
            const img = new Image();
            const path = `/assets/images/hero-${imageIndex}.png`;
            
            img.onload = () => {
                availableImages.push(path);
                preloadedImages.push(img);
                imageIndex++;
                
                // Continue checking for the next image
                checkNextImage();
            };
            
            img.onerror = () => {
                // Stop checking when we hit the first missing image
                if (availableImages.length > 1) {
                    startCycling();
                }
            };
            
            img.src = path;
        }
        
        // Start checking from hero-1.png
        checkNextImage();
    }
    
    function cycleImages() {
        // Fade out
        heroImage.style.opacity = '0';
        
        setTimeout(() => {
            // Change image source using preloaded image
            currentIndex = (currentIndex + 1) % availableImages.length;
            heroImage.src = preloadedImages[currentIndex].src;
            
            // Fade in
            heroImage.style.opacity = '1';
        }, 300); // Wait for fade out to complete
    }
    
    function startCycling() {
        // Set initial transition
        heroImage.style.transition = 'opacity 0.3s ease-in-out';
        
        // Start cycling every 3 seconds
        setInterval(cycleImages, 3000);
    }
    
    // Start detecting and preloading images
    detectHeroImages();
});
