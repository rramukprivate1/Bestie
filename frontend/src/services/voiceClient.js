// voiceClient.js
//
// Talks to the backend's /transcribe and /speak endpoints, and wraps the
// browser's MediaRecorder API for capturing microphone input. Kept
// separate from apiClient.js since these aren't part of the memory/RAG
// request shape at all - just audio in, text out, or text in, audio out.

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/** Records from the mic until stop() is called on the returned controller. */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];

  recorder.addEventListener('dataavailable', (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  });

  const stopped = new Promise((resolve) => {
    recorder.addEventListener('stop', () => {
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    });
  });

  recorder.start();

  return {
    stop: () => {
      recorder.stop();
      return stopped;
    },
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function transcribeAudio(blob) {
  const audioBase64 = await blobToBase64(blob);

  let response;
  try {
    response = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64: audioBase64, mime_type: blob.type || 'audio/webm' }),
    });
  } catch {
    throw new Error(`NETWORK_ERROR: Could not reach the backend at ${API_BASE}.`);
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.detail || `Request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}

/** Fetches speech audio for text and returns a ready-to-play Audio element. */
export async function speakText(text) {
  let response;
  try {
    response = await fetch(`${API_BASE}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new Error(`NETWORK_ERROR: Could not reach the backend at ${API_BASE}.`);
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.detail || `Request failed with status ${response.status}`);
  }

  const data = await response.json();
  const audio = new Audio(`data:${data.mime_type};base64,${data.audio_base64}`);
  return audio;
}
