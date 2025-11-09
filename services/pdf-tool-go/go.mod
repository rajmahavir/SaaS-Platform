module github.com/rajmahavir/taskmanager/services/pdf-tool-go

go 1.21

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/pdfcpu/pdfcpu v0.6.0
	github.com/unidoc/unipdf/v3 v3.51.0
	github.com/otiai10/gosseract/v2 v2.4.1
	github.com/disintegration/imaging v1.6.2
	github.com/spf13/viper v1.17.0
	github.com/sirupsen/logrus v1.9.3
	github.com/stretchr/testify v1.8.4
	go.opentelemetry.io/otel v1.21.0
	go.opentelemetry.io/otel/trace v1.21.0
	go.opentelemetry.io/otel/sdk v1.21.0
	go.opentelemetry.io/otel/exporters/prometheus v0.44.0
	go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin v0.46.1
	github.com/prometheus/client_golang v1.17.0
	google.golang.org/grpc v1.59.0
	google.golang.org/protobuf v1.31.0
	github.com/google/uuid v1.5.0
	github.com/rs/cors v1.10.1
)
