import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'child_process'
import path from 'path'

function backendPlugin() {
  let backendProcess = null
  return {
    name: 'start-backend',
    buildStart() {
      const backendDir = path.resolve(__dirname, '../backend')
      const isWin = process.platform === 'win32'
      const python = isWin
        ? path.join(backendDir, '.venv', 'Scripts', 'python.exe')
        : path.join(backendDir, '.venv', 'bin', 'python')

      backendProcess = spawn(
        python,
        ['-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000'],
        { cwd: backendDir, stdio: 'inherit', shell: false }
      )

      backendProcess.on('error', (err) => {
        console.error('[backend] Failed to start:', err.message)
      })

      console.log('[backend] Started on http://localhost:8000')
    },
    closeBundle() {
      if (backendProcess) {
        backendProcess.kill()
        console.log('[backend] Stopped.')
      }
    },
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})