/** In-place radix-2 FFT magnitude. Input length must be a power of two. */
export function fftMagnitude(input: Float32Array): Float32Array {
  const n = input.length;
  if (n < 2 || (n & (n - 1)) !== 0) throw new Error('FFT length must be a power of two');
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = input[i];

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const temp = re[i]; re[i] = re[j]; re[j] = temp;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = -2 * Math.PI / len;
    const wLenRe = Math.cos(angle);
    const wLenIm = Math.sin(angle);
    for (let start = 0; start < n; start += len) {
      let wRe = 1;
      let wIm = 0;
      const half = len >> 1;
      for (let j = 0; j < half; j++) {
        const even = start + j;
        const odd = even + half;
        const oddRe = re[odd] * wRe - im[odd] * wIm;
        const oddIm = re[odd] * wIm + im[odd] * wRe;
        re[odd] = re[even] - oddRe;
        im[odd] = im[even] - oddIm;
        re[even] += oddRe;
        im[even] += oddIm;
        const nextWRe = wRe * wLenRe - wIm * wLenIm;
        wIm = wRe * wLenIm + wIm * wLenRe;
        wRe = nextWRe;
      }
    }
  }

  const magnitude = new Float32Array(n / 2 + 1);
  for (let i = 0; i < magnitude.length; i++) {
    magnitude[i] = Math.hypot(re[i], im[i]) / n;
  }
  return magnitude;
}

