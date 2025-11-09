package telemetry

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

func InitTracer(serviceName, version string) (func(context.Context) error, error) {
	exporter := tracetest.NewNoopExporter()
	tp := trace.NewTracerProvider(
		trace.WithBatcher(exporter),
	)
	otel.SetTracerProvider(tp)
	return tp.Shutdown, nil
}

func InitMetrics() *metric.MeterProvider {
	exporter, _ := prometheus.New()
	provider := metric.NewMeterProvider(metric.WithReader(exporter))
	otel.SetMeterProvider(provider)
	return provider
}
