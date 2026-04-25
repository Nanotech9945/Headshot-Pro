/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the rotated size of the image.
 */
export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * This function was adapted from the one in the react-easy-crop's example
 */
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central point to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  // croppedAreaPixels values are bounding box relative
  // extract the cropped image using these values
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired crop size - as pixelCrop has its own size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image with correct offsets for x,y crop values.
  ctx.putImageData(data, 0, 0);

  // As Base64 string
  // return canvas.toDataURL('image/jpeg');

  // As a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/jpeg');
  });
}

/**
 * Applies filters (brightness, contrast, saturation, exposure, sharpen, vignette) to an image
 */
export async function applyFilters(
  imageSrc: string,
  filters: { 
    brightness: number; 
    contrast: number; 
    saturation: number;
    exposure: number;
    sharpen: number;
    vignette: number;
  }
): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = image.width;
  canvas.height = image.height;

  // 1. Apply basic CSS-like filters first
  // Exposure can be combined with brightness for a better effect
  // brightness(100%) is neutral. exposure(100%) is neutral.
  const brightnessVal = filters.brightness * (filters.exposure / 100);
  ctx.filter = `brightness(${brightnessVal}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;
  ctx.drawImage(image, 0, 0);

  // 2. Apply Sharpening if needed (requires pixel manipulation)
  if (filters.sharpen > 0) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const sharpenedData = applySharpen(imageData, filters.sharpen / 100);
    ctx.putImageData(sharpenedData, 0, 0);
  }

  // 3. Apply Vignette if needed
  if (filters.vignette > 0) {
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, Math.sqrt(Math.pow(canvas.width/2, 2) + Math.pow(canvas.height/2, 2))
    );
    
    // Vignette strength (0 to 1)
    const strength = filters.vignette / 100;
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.6, `rgba(0,0,0,${strength * 0.2})`);
    gradient.addColorStop(1, `rgba(0,0,0,${strength * 0.8})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/jpeg');
  });
}

/**
 * Resizes and compresses an image to ensure it stays under a specific size (e.g. 1MB for Firestore)
 */
export async function optimizeImage(
  imageSrc: string,
  maxWidth = 1200,
  quality = 0.8
): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // Calculate new dimensions maintain aspect ratio
  let width = image.width;
  let height = image.height;

  if (width > maxWidth) {
    height = (maxWidth / width) * height;
    width = maxWidth;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  return new Promise((resolve) => {
    // Try JPEG first with quality
    canvas.toBlob((blob) => {
      if (blob) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
      } else {
        resolve(null);
      }
    }, 'image/jpeg', quality);
  });
}

/**
 * Basic sharpening convolution filter
 */
function applySharpen(imageData: ImageData, amount: number): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outData = output.data;
  
  // Convolution kernel for sharpening
  // [ 0  -1   0]
  // [-1   5  -1]
  // [ 0  -1   0]
  // Adjusted by amount
  
  const kernel = [
    0, -amount, 0,
    -amount, 1 + 4 * amount, -amount,
    0, -amount, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      for (let c = 0; c < 3; c++) { // R, G, B
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const kidx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[kidx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        outData[idx + c] = sum;
      }
    }
  }
  
  return output;
}
