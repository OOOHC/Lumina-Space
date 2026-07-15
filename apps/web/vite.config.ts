import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 5174: the owner's other project (3D-RAMS) develops on 5173.
    port: 5174,
    strictPort: true,
  },
});
