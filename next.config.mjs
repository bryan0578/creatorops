/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // The Dorsyth Digital wordmark on /about is an SVG; Next's image
    // optimizer requires extra allowlisting for SVGs, so this app opts out
    // of optimization entirely rather than special-case one logo.
    unoptimized: true,
  },
}

export default nextConfig
