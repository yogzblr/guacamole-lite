# Guacamole Bastion Server UI

A production-ready bastion server implementation with a modern React-based frontend for Apache Guacamole, featuring session recording, HTTP file transfers, and clipboard management.

## Features

- 🖥️ **Modern React Frontend** - Professional, responsive UI built with React 18 and TailwindCSS
- 🔒 **Token-Based Authentication** - Secure AES-256-CBC encrypted connection tokens
- 📹 **Session Recording** - Automatic recording to S3/MinIO storage
- 📁 **HTTP File Transfers** - Upload and download files with drag-and-drop support
- 📋 **Clipboard Manager** - Bidirectional clipboard synchronization
- 🐳 **Complete Docker Stack** - Ready-to-deploy with Docker Compose
- 🔧 **Token Generator** - Python utility for external app integration
- 🌐 **Multi-Protocol Support** - RDP, SSH, and VNC connections

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Client                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React UI (Port 3000)                                     │  │
│  │  - Guacamole Display                                      │  │
│  │  - Clipboard Manager                                      │  │
│  │  - HTTP File Upload/Download                              │  │
│  │  - Session Controls                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           │                              │
           │ WebSocket (guac protocol)    │ HTTP (file transfers)
           ↓                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               Node.js Server (Port 8080)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Express.js Application                                   │  │
│  │  - guacamole-lite (WebSocket tunnel)                      │  │
│  │  - Session recording to S3/MinIO                          │  │
│  │  - HTTP file upload/download endpoints                    │  │
│  │  - Token decryption & validation                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           │                              │
           │ Guacamole Protocol (TCP)     │ S3 API
           ↓                              ↓
┌─────────────────────┐        ┌──────────────────────┐
│   guacd (4822)      │        │  MinIO (9000)        │
│   - RDP             │        │  - Session recordings │
│   - SSH             │        │  - File storage       │
│   - VNC             │        │                       │
└─────────────────────┘        └──────────────────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.8+ (for token generator)
- Node.js 18+ (for local development)

### 1. Start the Stack

```bash
cd bastion
docker-compose up -d
```

This will start:
- **guacd**: Guacamole daemon on port 4822
- **MinIO**: S3-compatible storage on ports 9000 (API) and 9001 (Console)
- **Backend**: Node.js server on port 8080
- **Frontend**: React UI on port 3000

### 2. Generate a Connection Token

```bash
cd utils

# Install Python dependencies
pip install -r requirements.txt

# Generate RDP token
python generate_token.py \
  --protocol rdp \
  --host 192.168.1.100 \
  --user Administrator \
  --password YourPassword123 \
  --output-url

# Example output:
# http://localhost:3000/?token=eyJpdiI6IjhCMzNFRjY...
```

### 3. Access the UI

Open the generated URL in your browser. The UI will automatically connect to the remote desktop.

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
# Backend Server
PORT=8080
SECRET_KEY=MySuperSecretKeyForParamsToken12  # CHANGE THIS IN PRODUCTION!
LOG_LEVEL=INFO
NODE_ENV=production

# guacd
GUACD_HOST=guacd
GUACD_PORT=4822

# MinIO/S3
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=guacamole-recordings

# Recording
RECORDING_ENABLED=true
RECORDING_PATH=recordings/
```

### Security Considerations

⚠️ **IMPORTANT**: Change the default `SECRET_KEY` in production!

The secret key must be:
- Exactly 32 characters long
- Kept secret and secure
- The same across all token generators and servers
- Changed from the default value

## Token Generator Usage

### RDP Connection

```bash
python generate_token.py \
  --protocol rdp \
  --host 192.168.1.100 \
  --user Administrator \
  --password pass123 \
  --width 1920 \
  --height 1080 \
  --enable-drive \
  --enable-recording \
  --output-url
```

### SSH Connection

```bash
python generate_token.py \
  --protocol ssh \
  --host 192.168.1.101 \
  --user ubuntu \
  --password pass123 \
  --enable-sftp \
  --enable-recording \
  --output-url
```

### VNC Connection

```bash
python generate_token.py \
  --protocol vnc \
  --host 192.168.1.102 \
  --password vncpass \
  --port 5901 \
  --enable-recording \
  --output-url
```

### Join Existing Session

```bash
python generate_token.py \
  --join CONNECTION_ID \
  --read-only \
  --output-url
```

### Custom Secret Key

```bash
python generate_token.py \
  --key "YourCustom32CharacterSecretKey!" \
  --protocol rdp \
  --host 192.168.1.100 \
  --user Admin \
  --password pass
```

## API Endpoints

### File Upload

```
POST /api/tunnels/:tunnelId/streams/:streamIndex/:filename
Content-Type: multipart/form-data

Body: file (binary)
```

### File Download

```
GET /api/tunnels/:tunnelId/streams/:streamIndex/:filename

Response: Binary file stream
```

### Health Check

```
GET /health

Response: {"status": "ok", "timestamp": "2024-01-13T..."}
```

## Development

### Backend Development

```bash
cd server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Frontend Development

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend dev server will proxy API and WebSocket requests to the backend.

### Build for Production

```bash
# Backend
cd server
npm run build

# Frontend
cd client
npm run build
```

## File Structure

```
bastion/
├── server/                 # Backend Node.js server
│   ├── src/
│   │   ├── guacamole/     # Guacamole-specific logic
│   │   │   ├── recording.js
│   │   │   └── fileTransfer.js
│   │   ├── middleware/    # Express middleware
│   │   │   └── errorHandler.js
│   │   ├── utils/         # Utilities
│   │   │   ├── crypto.js
│   │   │   ├── logger.js
│   │   │   └── s3.js
│   │   └── server.js      # Main server file
│   ├── package.json
│   └── Dockerfile
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── GuacamoleClient.jsx
│   │   │   ├── ClipboardManager.jsx
│   │   │   ├── FileTransferPanel.jsx
│   │   │   ├── ConnectionControls.jsx
│   │   │   └── Layout.jsx
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── useGuacamole.js
│   │   │   ├── useClipboard.js
│   │   │   └── useFileTransfer.js
│   │   ├── services/      # API services
│   │   │   ├── guacamoleService.js
│   │   │   └── fileTransferService.js
│   │   ├── utils/         # Utilities
│   │   │   ├── constants.js
│   │   │   └── helpers.js
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── nginx.conf
│   └── Dockerfile
├── utils/                 # Token generator
│   ├── generate_token.py
│   └── requirements.txt
├── docker-compose.yml     # Docker Compose configuration
├── .env.example           # Environment variables template
├── .gitignore
└── README.md
```

## Features Explained

### Session Recording

All sessions are automatically recorded if `RECORDING_ENABLED=true`. Recordings are:

- Saved in Guacamole's native `.guac` format
- Compressed with gzip
- Uploaded to MinIO/S3
- Named with pattern: `{username}_{connectionId}_{timestamp}.guac`
- Cleaned up from local storage after upload

Access recordings via MinIO Console at http://localhost:9001 (minioadmin/minioadmin).

### Clipboard Manager

The clipboard manager provides:

- **Auto-sync**: Automatically syncs clipboard between local and remote
- **Manual send**: Text area to manually send clipboard data
- **Manual receive**: Button to copy remote clipboard to local
- **Toggle**: Enable/disable auto-sync

### File Transfers

File transfers work via HTTP endpoints:

- **Upload**: Drag-and-drop or browse files, sent to remote desktop via HTTP
- **Download**: Files from remote are streamed via HTTP
- **Progress**: Real-time progress bars for uploads and downloads
- **Queue**: Multiple files can be uploaded simultaneously

### Keyboard Shortcuts

- **F11**: Toggle fullscreen
- **Ctrl+Alt+Shift+D**: Disconnect (requires confirmation)
- **Ctrl+Alt+Shift+M**: Show menu (future feature)

## Troubleshooting

### Connection Fails

1. Check guacd is running: `docker ps | grep guacd`
2. Check backend logs: `docker logs guacamole-backend`
3. Verify token is valid and not expired
4. Check network connectivity to remote host

### File Upload Fails

1. Check file size (max 100GB)
2. Verify backend has disk space
3. Check backend logs for errors
4. Ensure remote desktop supports file transfers

### Recording Not Saved

1. Check `RECORDING_ENABLED=true`
2. Verify MinIO is running: `docker ps | grep minio`
3. Check MinIO bucket exists: http://localhost:9001
4. Check backend logs for S3 errors

### MinIO Access Denied

1. Default credentials: minioadmin/minioadmin
2. Bucket should be created automatically
3. Check minio-init container logs

## Production Deployment

### Security Checklist

- [ ] Change `SECRET_KEY` to a random 32-character string
- [ ] Use strong MinIO credentials (not minioadmin)
- [ ] Enable HTTPS with SSL certificates
- [ ] Set `NODE_ENV=production`
- [ ] Configure firewall rules
- [ ] Enable token expiration (add `expiration` field to tokens)
- [ ] Use a production S3 service (AWS S3, DigitalOcean Spaces, etc.)
- [ ] Implement rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular security updates

### HTTPS Setup

For production, you should:

1. Use a reverse proxy (nginx, Traefik, Caddy)
2. Obtain SSL certificates (Let's Encrypt)
3. Configure WebSocket proxy for WSS
4. Update frontend URL to use HTTPS/WSS

### Scaling

For high availability:

- Run multiple backend instances behind a load balancer
- Use sticky sessions for WebSocket connections
- Use a production S3 service (not MinIO)
- Scale guacd horizontally if needed

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (with touch support)

## License

Apache-2.0

## Credits

- [guacamole-lite](https://github.com/vadimpronin/guacamole-lite) - Node.js Guacamole server
- [Apache Guacamole](https://guacamole.apache.org/) - Clientless remote desktop gateway
- [React](https://react.dev/) - UI framework
- [TailwindCSS](https://tailwindcss.com/) - CSS framework

## Support

For issues and questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review backend logs: `docker logs guacamole-backend`
- Review frontend logs: Browser DevTools Console
- Check guacamole-lite documentation

## Changelog

### Version 1.0.0 (2024-01-13)

- Initial release
- React frontend with modern UI
- Session recording to S3/MinIO
- HTTP file upload/download
- Clipboard manager
- Token-based authentication
- Docker Compose stack
- Python token generator

---

**Made with ❤️ for the Guacamole community**
