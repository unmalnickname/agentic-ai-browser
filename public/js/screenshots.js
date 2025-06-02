document.addEventListener('DOMContentLoaded', () => {
    const screenshotContainer = document.getElementById('screenshot-container');
    const btnFullscreen = document.getElementById('btn-fullscreen-screenshot');
    const btnZoomIn = document.getElementById('btn-zoom-in-screenshot');
    const btnZoomOut = document.getElementById('btn-zoom-out-screenshot');
    const btnResetZoom = document.getElementById('btn-reset-zoom-screenshot');

    let currentScale = 1;
    const scaleStep = 0.1;
    const maxScale = 3;
    const minScale = 0.5;

    function getScreenshotImage() {
        return screenshotContainer ? screenshotContainer.querySelector('.screenshot-img') : null;
    }

    // --- Fullscreen Functionality ---
    function toggleFullscreen() {
        const img = getScreenshotImage();
        if (!img) {
            console.warn('No screenshot image found to toggle fullscreen.');
            return;
        }

        if (!document.fullscreenElement) {
            if (img.requestFullscreen) {
                img.requestFullscreen();
            } else if (img.mozRequestFullScreen) { /* Firefox */
                img.mozRequestFullScreen();
            } else if (img.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
                img.webkitRequestFullscreen();
            } else if (img.msRequestFullscreen) { /* IE/Edge */
                img.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    // --- Zoom Functionality ---
    function applyZoom() {
        const img = getScreenshotImage();
        if (img) {
            img.style.transform = `scale(${currentScale})`;
            img.style.transition = 'transform 0.2s ease-out'; // Smooth zoom
            // Ensure the container can handle overflow if image becomes larger
            screenshotContainer.style.overflow = currentScale > 1 ? 'auto' : 'hidden';
        }
    }

    function zoomIn() {
        const img = getScreenshotImage();
        if (!img) return;
        if (currentScale < maxScale) {
            currentScale += scaleStep;
            // Clamp to maxScale
            currentScale = Math.min(currentScale, maxScale);
            applyZoom();
        }
    }

    function zoomOut() {
        const img = getScreenshotImage();
        if (!img) return;
        if (currentScale > minScale) {
            currentScale -= scaleStep;
            // Clamp to minScale
            currentScale = Math.max(currentScale, minScale);
            applyZoom();
        }
    }

    function resetZoom() {
        const img = getScreenshotImage();
        if (!img) return;
        currentScale = 1;
        applyZoom();
        // Reset container overflow as well if needed
        screenshotContainer.style.overflow = 'hidden';
    }

    // --- Event Listeners ---
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', toggleFullscreen);
    }

    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', zoomIn);
    }

    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', zoomOut);
    }

    if (btnResetZoom) {
        btnResetZoom.addEventListener('click', resetZoom);
    }

    // Optional: Mouse wheel zoom on the image (if present)
    // This needs careful handling as the image is dynamic.
    // We can delegate from the container.
    if (screenshotContainer) {
        screenshotContainer.addEventListener('wheel', (event) => {
            const img = getScreenshotImage();
            if (!img || !event.target.classList.contains('screenshot-img')) {
                return; // Only zoom if wheel is over the image
            }

            event.preventDefault(); // Prevent page scroll

            if (event.deltaY < 0) {
                // Scroll up, zoom in
                zoomIn();
            } else {
                // Scroll down, zoom out
                zoomOut();
            }
        }, { passive: false }); // passive: false to allow preventDefault
    }
    
    // When a new screenshot is loaded by the main script, reset its zoom.
    // We can use a MutationObserver on screenshotContainer for this,
    // or the main script can call a reset function from here.
    // For simplicity, we'll assume the main script might call resetZoomForNewImage if needed.
    // Alternatively, the user implicitly resets by interacting with a new image.
    // A more robust way is to observe changes to the screenshotContainer's children.
    if (screenshotContainer && window.MutationObserver) {
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.tagName === 'IMG' && node.classList.contains('screenshot-img')) {
                            // New image added, reset its transform and our scale state
                            currentScale = 1;
                            node.style.transform = 'scale(1)';
                            node.style.transition = 'none'; // No transition for initial set
                            screenshotContainer.style.overflow = 'hidden';
                        }
                    });
                }
            }
        });
        observer.observe(screenshotContainer, { childList: true });
    }

    // Expose a function to be called by the main script if needed, e.g., after loading a new screenshot
    window.resetScreenshotZoomAndPan = resetZoom;

});
