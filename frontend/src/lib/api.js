/**
 * CodeMind AI — API Client
 * Centralised Axios instance. Base URL read from VITE_API_URL env var,
 * falling back to the Vite proxy (same origin /api → localhost:8000).
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Kick off async repo analysis.
 * @param {string} repoUrl - GitHub repository URL
 * @returns {{ task_id: string, status: string }}
 */
export async function analyzeRepo(repoUrl) {
  const { data } = await api.post('/api/analyze', { repo_url: repoUrl })
  return data
}

/**
 * Poll indexing progress.
 * @param {string} taskId
 */
export async function getStatus(taskId) {
  const { data } = await api.get(`/api/status/${taskId}`)
  return data
}

/**
 * Ask a question about an indexed repo.
 * @param {string} taskId
 * @param {string} question
 * @returns {{ answer: string, sources: Array }}
 */
export async function chat(taskId, question) {
  const { data } = await api.post('/api/chat', { task_id: taskId, question })
  return data
}

export default api
