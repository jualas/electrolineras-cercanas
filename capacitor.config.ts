import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'es.jualas.electrolinerascercanas',
  appName: 'Electrolineras Cercanas',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Peticiones por la pila HTTP nativa: la cookie de sesión del login TOTP de
    // electro.jualas.es (SameSite=Lax) no la guarda el WebView desde https://localhost.
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorCookies: {
      enabled: true,
    },
    Geolocation: {
      // Permisos se declaran en AndroidManifest vía Capacitor
    },
  },
}

export default config
