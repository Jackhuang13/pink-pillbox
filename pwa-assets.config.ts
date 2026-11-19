import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// 從 public/logo.svg 產出 pwa-64/192/512、maskable-512、apple-touch-icon-180
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { fit: 'contain', background: '#ffe3ef' }
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: { fit: 'contain', background: '#ffe3ef' }
    }
  },
  images: ['public/logo.svg']
});
