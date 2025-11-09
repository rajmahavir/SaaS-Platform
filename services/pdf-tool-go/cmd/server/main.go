/**
 * PDF Tool Go - Main Server
 *
 * High-performance PDF processing microservice with comprehensive features.
 * Implements RESTful API, gRPC, OpenTelemetry instrumentation, and Prometheus metrics.
 *
 * @author rajmahavir
 * @version 1.0.0
 */

package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rajmahavir/taskmanager/services/pdf-tool-go/internal/config"
	"github.com/rajmahavir/taskmanager/services/pdf-tool-go/internal/handlers"
	"github.com/rajmahavir/taskmanager/services/pdf-tool-go/internal/middleware"
	"github.com/rajmahavir/taskmanager/services/pdf-tool-go/internal/service"
	"github.com/rajmahavir/taskmanager/services/pdf-tool-go/pkg/logger"
	"github.com/rajmahavir/taskmanager/services/pdf-tool-go/pkg/telemetry"
	"github.com/rs/cors"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
)

const (
	serviceName    = "pdf-tool-go"
	serviceVersion = "1.0.0"
)

func main() {
	// Initialize configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	log := logger.New(cfg.LogLevel, cfg.LogFormat)
	log.Info("Starting PDF Tool Go service", "version", serviceVersion)

	// Initialize OpenTelemetry
	shutdown, err := telemetry.InitTracer(serviceName, serviceVersion)
	if err != nil {
		log.Error("Failed to initialize telemetry", "error", err)
		os.Exit(1)
	}
	defer shutdown(context.Background())

	// Initialize Prometheus metrics
	metricsProvider := telemetry.InitMetrics()
	defer metricsProvider.Shutdown(context.Background())

	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize Gin router
	router := gin.New()

	// Middleware
	router.Use(gin.Recovery())
	router.Use(middleware.Logger(log))
	router.Use(otelgin.Middleware(serviceName))
	router.Use(middleware.Metrics())
	router.Use(middleware.RateLimiter(cfg.RateLimit))

	// CORS configuration
	corsMiddleware := cors.New(cors.Options{
		AllowedOrigins:   cfg.CORS.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposedHeaders:   []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	router.Use(func(c *gin.Context) {
		corsMiddleware.HandlerFunc(c.Writer, c.Request)
		c.Next()
	})

	// Initialize PDF service
	pdfService := service.NewPDFService(log, cfg)

	// Initialize handlers
	pdfHandler := handlers.NewPDFHandler(pdfService, log)
	healthHandler := handlers.NewHealthHandler(log)

	// Health check endpoints
	router.GET("/health", healthHandler.Health)
	router.GET("/ready", healthHandler.Ready)

	// Metrics endpoint
	router.GET("/metrics", handlers.PrometheusHandler())

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// PDF operations
		pdf := v1.Group("/pdf")
		{
			pdf.POST("/convert/image", pdfHandler.ConvertToImage)
			pdf.POST("/merge", pdfHandler.MergePDFs)
			pdf.POST("/split", pdfHandler.SplitPDF)
			pdf.POST("/extract/text", pdfHandler.ExtractText)
			pdf.POST("/extract/metadata", pdfHandler.ExtractMetadata)
			pdf.POST("/compress", pdfHandler.CompressPDF)
			pdf.POST("/watermark", pdfHandler.AddWatermark)
			pdf.POST("/rotate", pdfHandler.RotatePages)
			pdf.POST("/encrypt", pdfHandler.EncryptPDF)
			pdf.POST("/decrypt", pdfHandler.DecryptPDF)
		}

		// Batch operations
		batch := v1.Group("/batch")
		{
			batch.POST("/process", pdfHandler.BatchProcess)
			batch.GET("/status/:id", pdfHandler.BatchStatus)
		}
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:           fmt.Sprintf(":%d", cfg.Port),
		Handler:        router,
		ReadTimeout:    time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout:   time.Duration(cfg.Server.WriteTimeout) * time.Second,
		IdleTimeout:    time.Duration(cfg.Server.IdleTimeout) * time.Second,
		MaxHeaderBytes: cfg.Server.MaxHeaderBytes,
	}

	// Start server in a goroutine
	go func() {
		log.Info("Server starting", "port", cfg.Port, "environment", cfg.Environment)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("Server failed to start", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error("Server forced to shutdown", "error", err)
		os.Exit(1)
	}

	log.Info("Server exited gracefully")
}
