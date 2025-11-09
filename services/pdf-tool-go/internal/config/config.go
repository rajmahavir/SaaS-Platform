/**
 * Configuration Module
 *
 * Handles application configuration loading from environment variables
 * and configuration files using Viper.
 */

package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

// Config holds all application configuration
type Config struct {
	Environment string         `mapstructure:"environment"`
	Port        int            `mapstructure:"port"`
	LogLevel    string         `mapstructure:"log_level"`
	LogFormat   string         `mapstructure:"log_format"`
	RateLimit   RateLimitConfig `mapstructure:"rate_limit"`
	Server      ServerConfig    `mapstructure:"server"`
	PDF         PDFConfig       `mapstructure:"pdf"`
	Storage     StorageConfig   `mapstructure:"storage"`
	CORS        CORSConfig      `mapstructure:"cors"`
	Telemetry   TelemetryConfig `mapstructure:"telemetry"`
}

// RateLimitConfig configures rate limiting
type RateLimitConfig struct {
	Enabled        bool  `mapstructure:"enabled"`
	RequestsPerMin int   `mapstructure:"requests_per_minute"`
	Burst          int   `mapstructure:"burst"`
}

// ServerConfig holds HTTP server settings
type ServerConfig struct {
	ReadTimeout    int `mapstructure:"read_timeout"`
	WriteTimeout   int `mapstructure:"write_timeout"`
	IdleTimeout    int `mapstructure:"idle_timeout"`
	MaxHeaderBytes int `mapstructure:"max_header_bytes"`
}

// PDFConfig holds PDF processing settings
type PDFConfig struct {
	MaxFileSize      int64    `mapstructure:"max_file_size"`
	AllowedFormats   []string `mapstructure:"allowed_formats"`
	TempDir          string   `mapstructure:"temp_dir"`
	MaxPages         int      `mapstructure:"max_pages"`
	OCREnabled       bool     `mapstructure:"ocr_enabled"`
	OCRLanguages     []string `mapstructure:"ocr_languages"`
	CompressionLevel int      `mapstructure:"compression_level"`
}

// StorageConfig holds storage settings
type StorageConfig struct {
	Type      string `mapstructure:"type"`
	LocalPath string `mapstructure:"local_path"`
	S3Bucket  string `mapstructure:"s3_bucket"`
	S3Region  string `mapstructure:"s3_region"`
}

// CORSConfig holds CORS settings
type CORSConfig struct {
	AllowedOrigins []string `mapstructure:"allowed_origins"`
}

// TelemetryConfig holds observability settings
type TelemetryConfig struct {
	Enabled       bool   `mapstructure:"enabled"`
	OTLPEndpoint  string `mapstructure:"otlp_endpoint"`
	SamplingRatio float64 `mapstructure:"sampling_ratio"`
}

// Load reads configuration from environment and files
func Load() (*Config, error) {
	v := viper.New()

	// Set defaults
	setDefaults(v)

	// Read from environment
	v.SetEnvPrefix("PDF_TOOL")
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// Read from config file if exists
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")
	v.AddConfigPath("./config")

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Validate configuration
	if err := validate(&cfg); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return &cfg, nil
}

// setDefaults sets default configuration values
func setDefaults(v *viper.Viper) {
	v.SetDefault("environment", "development")
	v.SetDefault("port", 8080)
	v.SetDefault("log_level", "info")
	v.SetDefault("log_format", "json")

	// Rate limiting
	v.SetDefault("rate_limit.enabled", true)
	v.SetDefault("rate_limit.requests_per_minute", 60)
	v.SetDefault("rate_limit.burst", 10)

	// Server
	v.SetDefault("server.read_timeout", 30)
	v.SetDefault("server.write_timeout", 30)
	v.SetDefault("server.idle_timeout", 60)
	v.SetDefault("server.max_header_bytes", 1048576) // 1MB

	// PDF
	v.SetDefault("pdf.max_file_size", 52428800) // 50MB
	v.SetDefault("pdf.allowed_formats", []string{"pdf"})
	v.SetDefault("pdf.temp_dir", "/tmp/pdf-tool")
	v.SetDefault("pdf.max_pages", 1000)
	v.SetDefault("pdf.ocr_enabled", true)
	v.SetDefault("pdf.ocr_languages", []string{"eng"})
	v.SetDefault("pdf.compression_level", 1)

	// Storage
	v.SetDefault("storage.type", "local")
	v.SetDefault("storage.local_path", "./storage")

	// CORS
	v.SetDefault("cors.allowed_origins", []string{"*"})

	// Telemetry
	v.SetDefault("telemetry.enabled", true)
	v.SetDefault("telemetry.otlp_endpoint", "localhost:4318")
	v.SetDefault("telemetry.sampling_ratio", 1.0)
}

// validate checks if configuration is valid
func validate(cfg *Config) error {
	if cfg.Port < 1 || cfg.Port > 65535 {
		return fmt.Errorf("invalid port: %d", cfg.Port)
	}

	if cfg.PDF.MaxFileSize <= 0 {
		return fmt.Errorf("max_file_size must be positive")
	}

	if cfg.PDF.MaxPages <= 0 {
		return fmt.Errorf("max_pages must be positive")
	}

	validLogLevels := map[string]bool{
		"debug": true,
		"info":  true,
		"warn":  true,
		"error": true,
	}

	if !validLogLevels[cfg.LogLevel] {
		return fmt.Errorf("invalid log level: %s", cfg.LogLevel)
	}

	return nil
}
