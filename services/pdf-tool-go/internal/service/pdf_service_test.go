package service

import (
	"context"
	"testing"

	"github.com/rajmahavir/taskmanager/services/pdf-tool-go/internal/config"
	"github.com/rajmahavir/taskmanager/services/pdf-tool-go/pkg/logger"
	"github.com/stretchr/testify/assert"
)

func TestPDFService_ValidateRequest(t *testing.T) {
	cfg := &config.Config{
		PDF: config.PDFConfig{
			MaxFileSize: 1024 * 1024,
		},
	}
	log := logger.New("info", "text")
	svc := NewPDFService(log, cfg)

	t.Run("Valid PDF", func(t *testing.T) {
		pdfData := []byte("%PDF-1.4\ntest")
		err := svc.ValidateRequest(pdfData)
		assert.NoError(t, err)
	})

	t.Run("Empty Data", func(t *testing.T) {
		err := svc.ValidateRequest([]byte{})
		assert.Error(t, err)
	})

	t.Run("Invalid Format", func(t *testing.T) {
		err := svc.ValidateRequest([]byte("not a pdf"))
		assert.Error(t, err)
	})
}

func TestPDFService_MergePDFs(t *testing.T) {
	cfg := &config.Config{
		PDF: config.PDFConfig{
			MaxFileSize: 1024 * 1024,
			TempDir: "/tmp/pdf-tool-test",
		},
	}
	log := logger.New("info", "text")
	svc := NewPDFService(log, cfg)

	t.Run("Less Than 2 PDFs", func(t *testing.T) {
		req := &MergeRequest{
			PDFs: [][]byte{[]byte("%PDF-1.4")},
		}
		_, err := svc.MergePDFs(context.Background(), req)
		assert.Error(t, err)
	})
}
