# Use a smaller base image to vastly reduce size ( ~1GB -> ~150MB base)
FROM python:3.9-slim

# Set working directory
WORKDIR /code

# Install system dependencies if needed (usually none for this stack, but good to have apt-get ready)
# We clean up apt cache to keep layer small
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY ./backend/requirements.txt /code/requirements.txt

# Install dependencies
# --no-cache-dir reduces image size
# cpu version of torch is already specified in requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the backend code
COPY ./backend /code/backend

# Create a writable directory for non-root users (Hugging Face requirement)
RUN mkdir -p /code/cache && chmod -R 777 /code/cache
ENV XDG_CACHE_HOME=/code/cache
ENV PYTHONUNBUFFERED=1

# Expose port 7860 (Hugging Face default)
EXPOSE 7860

# Start the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
