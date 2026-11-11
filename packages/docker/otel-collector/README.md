# OpenTelemetry Collector

Starter OpenTelemetry Collector configuration for Depose.

## Included

- OTLP gRPC and HTTP receivers
- Prometheus scrape receiver
- Batch and memory limiter processors
- Prometheus Remote Write exporter
- Debug exporters for traces and logs (remove in production)

## Usage

Point your app's OTLP exporter at the Collector:

- OTLP gRPC: `otel-collector:4317`
- OTLP HTTP: `otel-collector:4318`

## Notes

- Replace the debug exporters with real backends when wiring observability in production.
- Mimir is referenced as a Prometheus-compatible remote write endpoint in the starter config.
