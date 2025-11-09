/**
 * PDF Handlers
 *
 * HTTP handlers for PDF operations endpoints.
 */

package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rajmahavir/taskmanager/services/pdf-tool-go/internal/service"
	"github.com/rajmahavir/taskmanager/services/pdf-tool-go/pkg/logger"
)

// PDFHandler handles PDF-related HTTP requests
type PDFHandler struct {
	service *service.PDFService
	log     logger.Logger
}

// NewPDFHandler creates a new PDF handler
func NewPDFHandler(svc *service.PDFService, log logger.Logger) *PDFHandler {
	return &PDFHandler{
		service: svc,
		log:     log,
	}
}

// ConvertToImage handles PDF to image conversion
func (h *PDFHandler) ConvertToImage(c *gin.Context) {
	file, err := c.FormFile("pdf")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PDF file required"})
		return
	}

	pdfData, err := readUploadedFile(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	if err := h.service.ValidateRequest(pdfData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req := &service.ConvertToImageRequest{
		PDFData: pdfData,
		Format:  c.DefaultQuery("format", "png"),
		DPI:     parseIntParam(c, "dpi", 150),
	}

	result, err := h.service.ConvertToImage(c.Request.Context(), req)
	if err != nil {
		h.log.Error("Failed to convert PDF to images", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Conversion failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"images":     result.Images,
		"page_count": result.PageCount,
		"format":     result.Format,
	})
}

// MergePDFs handles PDF merging
func (h *PDFHandler) MergePDFs(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid multipart form"})
		return
	}

	files := form.File["pdfs"]
	if len(files) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least 2 PDFs required"})
		return
	}

	pdfs := make([][]byte, len(files))
	for i, file := range files {
		data, err := readUploadedFile(file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
			return
		}
		pdfs[i] = data
	}

	req := &service.MergeRequest{
		PDFs: pdfs,
	}

	result, err := h.service.MergePDFs(c.Request.Context(), req)
	if err != nil {
		h.log.Error("Failed to merge PDFs", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Merge failed"})
		return
	}

	c.Data(http.StatusOK, "application/pdf", result)
}

// SplitPDF handles PDF splitting
func (h *PDFHandler) SplitPDF(c *gin.Context) {
	file, err := c.FormFile("pdf")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PDF file required"})
		return
	}

	pdfData, err := readUploadedFile(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	req := &service.SplitRequest{
		PDFData:   pdfData,
		PageRange: c.DefaultQuery("pages", "all"),
	}

	result, err := h.service.SplitPDF(c.Request.Context(), req)
	if err != nil {
		h.log.Error("Failed to split PDF", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Split failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"files": result,
		"count": len(result),
	})
}

// ExtractText handles text extraction
func (h *PDFHandler) ExtractText(c *gin.Context) {
	file, err := c.FormFile("pdf")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PDF file required"})
		return
	}

	pdfData, err := readUploadedFile(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	req := &service.ExtractTextRequest{
		PDFData: pdfData,
		UseOCR:  c.DefaultQuery("ocr", "false") == "true",
	}

	result, err := h.service.ExtractText(c.Request.Context(), req)
	if err != nil {
		h.log.Error("Failed to extract text", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Extraction failed"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ExtractMetadata handles metadata extraction
func (h *PDFHandler) ExtractMetadata(c *gin.Context) {
	file, err := c.FormFile("pdf")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PDF file required"})
		return
	}

	pdfData, err := readUploadedFile(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	result, err := h.service.ExtractMetadata(c.Request.Context(), pdfData)
	if err != nil {
		h.log.Error("Failed to extract metadata", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Extraction failed"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// CompressPDF handles PDF compression
func (h *PDFHandler) CompressPDF(c *gin.Context) {
	file, err := c.FormFile("pdf")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PDF file required"})
		return
	}

	pdfData, err := readUploadedFile(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	req := &service.CompressRequest{
		PDFData:          pdfData,
		CompressionLevel: parseIntParam(c, "level", 1),
	}

	result, err := h.service.CompressPDF(c.Request.Context(), req)
	if err != nil {
		h.log.Error("Failed to compress PDF", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Compression failed"})
		return
	}

	c.Data(http.StatusOK, "application/pdf", result)
}

// AddWatermark handles watermark addition
func (h *PDFHandler) AddWatermark(c *gin.Context) {
	file, err := c.FormFile("pdf")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PDF file required"})
		return
	}

	pdfData, err := readUploadedFile(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	req := &service.WatermarkRequest{
		PDFData:       pdfData,
		WatermarkText: c.DefaultQuery("text", "CONFIDENTIAL"),
		Opacity:       0.3,
		Rotation:      45,
		FontSize:      48,
	}

	result, err := h.service.AddWatermark(c.Request.Context(), req)
	if err != nil {
		h.log.Error("Failed to add watermark", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Watermark failed"})
		return
	}

	c.Data(http.StatusOK, "application/pdf", result)
}

// RotatePages, EncryptPDF, DecryptPDF, BatchProcess, BatchStatus
// These are placeholder implementations
func (h *PDFHandler) RotatePages(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Coming soon"})
}

func (h *PDFHandler) EncryptPDF(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Coming soon"})
}

func (h *PDFHandler) DecryptPDF(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Coming soon"})
}

func (h *PDFHandler) BatchProcess(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Coming soon"})
}

func (h *PDFHandler) BatchStatus(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Coming soon"})
}

// Helper functions
func readUploadedFile(file *multipart.FileHeader) ([]byte, error) {
	f, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return io.ReadAll(f)
}

func parseIntParam(c *gin.Context, key string, defaultValue int) int {
	value, err := strconv.Atoi(c.DefaultQuery(key, strconv.Itoa(defaultValue)))
	if err != nil {
		return defaultValue
	}
	return value
}

import (
	"io"
	"mime/multipart"
	"strconv"
)
