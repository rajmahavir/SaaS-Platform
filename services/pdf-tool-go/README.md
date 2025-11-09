# PDF Tool - Go Microservice

A high-performance PDF processing microservice written in Go with comprehensive features for PDF manipulation, conversion, and analysis.

## Features

- PDF to image conversion (PNG, JPEG, WebP)
- PDF merging and splitting
- Text extraction with OCR support
- PDF metadata extraction and modification
- PDF compression and optimization
- Watermarking
- PDF form filling
- Digital signature verification
- RESTful API with gRPC support
- OpenTelemetry instrumentation
- Comprehensive error handling and logging

## Technology Stack

- **Go**: 1.21+
- **PDF Processing**: pdfcpu, unipdf
- **OCR**: tesseract-go
- **Image Processing**: imaging
- **API**: Gin framework
- **gRPC**: Protocol Buffers
- **Observability**: OpenTelemetry, Prometheus
- **Testing**: Go testing, testify
- **Container**: Docker with multi-stage builds

## Quick Start

```bash
cd services/pdf-tool-go

# Install dependencies
go mod download

# Run locally
go run cmd/server/main.go

# Run with Docker
docker build -t pdf-tool-go .
docker run -p 8080:8080 pdf-tool-go
```

## API Documentation

See [API.md](./docs/API.md) for complete API documentation.
