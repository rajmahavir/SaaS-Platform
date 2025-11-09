package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/rajmahavir/taskmanager/services/pdf-tool-go/internal/config"
	"github.com/rajmahavir/taskmanager/services/pdf-tool-go/pkg/logger"
	"time"
)

func Logger(log logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		latency := time.Since(start)
		log.Info("HTTP Request",
			"method", c.Request.Method,
			"path", path,
			"status", c.Writer.Status(),
			"latency", latency.String(),
		)
	}
}

func Metrics() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

func RateLimiter(cfg config.RateLimitConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}
