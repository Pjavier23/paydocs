/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfmake and pdfkit need access to their font/data files via real filesystem
  // paths. Keeping them external (not webpack-bundled) ensures pdfkit resolves
  // the Helvetica AFM files from node_modules at runtime rather than from the
  // compiled webpack chunk directory where they don't exist.
  serverExternalPackages: ['pdfmake', 'pdfkit'],
}

export default nextConfig
