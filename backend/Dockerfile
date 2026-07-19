# Note: this image can't be test-built inside the sandbox that generated
# this project (no network access to Docker Hub there), so build it for
# the first time yourself with: docker build -t companion-backend .
# The Python app itself (via uvicorn) was fully tested before delivery -
# this Dockerfile just packages that same, already-working app.

FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Cloud Run (and most container hosts) inject a PORT env var and expect
# the container to listen on it - default to 8080 for local `docker run`.
ENV PORT=8080
EXPOSE 8080

# `exec` here matters: without it, `sh` stays as PID 1 and doesn't forward
# Ctrl+C/stop signals to uvicorn, so Docker has to wait out a timeout and
# force-kill the container instead of stopping it cleanly. `exec` replaces
# the shell with uvicorn directly, so it receives and handles the signal
# immediately.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
