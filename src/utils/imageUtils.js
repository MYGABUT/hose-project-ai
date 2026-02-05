
/**
 * Resize image data URL to specific dimensions/quality
 * @param {string} dataUrl - Source image data URL
 * @param {number} maxWidth - Max width in pixels
 * @param {number} quality - JPEG quality (0.0 - 1.0)
 * @returns {Promise<Blob>} Resized image blob
 */
export function resizeImage(dataUrl, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = dataUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob failed'));
                    }
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = (err) => reject(err);
    });
}
