# Liberty Nordic Operations Dashboard

A web-based dashboard for managing operations at Liberty Nordic, built with Go and modern web technologies.

## Features

- File management with detailed client information
- Service tracking and management
- Task management with status tracking
- Real-time statistics and analytics
- Search functionality
- Responsive design

## Tech Stack

- Backend: Go
- Frontend: HTML, CSS, JavaScript
- UI Framework: Bootstrap 5
- Icons: Font Awesome

## Local Development

1. Install Go (version 1.16 or higher)
2. Clone the repository
3. Install dependencies:
   ```bash
   go mod tidy
   ```
4. Run the server:
   ```bash
   go run main.go
   ```
5. Access the dashboard at `http://localhost:8080`

## Deployment

This application is configured for deployment on Render.com. The `render.yaml` file contains the necessary configuration for automatic deployment.

## License

MIT License 