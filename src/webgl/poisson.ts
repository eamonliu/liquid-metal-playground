const POISSON_C = 0.01;
const POISSON_ITERATIONS = 300;
const ALPHA = 2.0;

export async function generatePoissonMask(svgUrl: string, size: number): Promise<{ width: number, height: number, data: Uint8Array }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            let width = size;
            let height = size;
            if (img.width > img.height) {
                height = Math.floor(size * (img.height / img.width));
            } else {
                width = Math.floor(size * (img.width / img.height));
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return reject("No 2D context");

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            const imgData = ctx.getImageData(0, 0, width, height);
            const pixels = imgData.data;
            const len = width * height;
            
            let u = new Float32Array(len);
            let isInside = new Uint8Array(len);
            let isBoundary = new Uint8Array(len);

            for (let i = 0; i < len; i++) {
                const r = pixels[i * 4];
                const g = pixels[i * 4 + 1];
                const b = pixels[i * 4 + 2];
                if (r < 250 || g < 250 || b < 250) {
                    isInside[i] = 1;
                }
            }

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    if (isInside[idx]) {
                        if (!isInside[idx - 1] || !isInside[idx + 1] || !isInside[idx - width] || !isInside[idx + width]) {
                            isBoundary[idx] = 1;
                        }
                    }
                }
            }

            let nextU = new Float32Array(len);
            for (let iter = 0; iter < POISSON_ITERATIONS; iter++) {
                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        const idx = y * width + x;
                        if (isInside[idx] && !isBoundary[idx]) {
                            nextU[idx] = (POISSON_C + u[idx + 1] + u[idx - 1] + u[idx + width] + u[idx - width]) / 4;
                        } else {
                            nextU[idx] = 0;
                        }
                    }
                }
                let temp = u;
                u = nextU;
                nextU = temp;
            }

            let maxU = 0;
            for (let i = 0; i < len; i++) {
                if (u[i] > maxU) maxU = u[i];
            }

            const outData = new Uint8Array(len * 4);
            for (let i = 0; i < len; i++) {
                if (isInside[i]) {
                    let val = maxU > 0 ? u[i] / maxU : 0;
                    let gray = 255 * (1.0 - Math.pow(val, ALPHA));
                    outData[i * 4] = gray;
                    outData[i * 4 + 1] = gray;
                    outData[i * 4 + 2] = gray;
                    outData[i * 4 + 3] = 255;
                } else {
                    outData[i * 4] = 255;
                    outData[i * 4 + 1] = 255;
                    outData[i * 4 + 2] = 255;
                    outData[i * 4 + 3] = 255;
                }
            }

            resolve({ width, height, data: outData });
        };
        img.onerror = reject;
        img.src = svgUrl;
    });
}
