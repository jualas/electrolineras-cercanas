import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'es.jualas.electrolinerascercanas',
  appName: 'Electrolineras Cercanas',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Geolocation: {
      // Permisos se declaran en AndroidManifest vía Capacitor
    },
  },
}

export default config
