/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
  // Configuration pour les uploads
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  // Variables d'environnement publiques
  env: {
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
  },
}

module.exports = nextConfig