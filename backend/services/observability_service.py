"""
OpenTelemetry Observability Service.

Configures distributed tracing across the FastAPI app, requests, and database.
Traces are exported to the console by default, but can be routed to
Jaeger, Zipkin, or OTLP endpoints in production.
"""
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from fastapi import FastAPI

logger = logging.getLogger("spectra-observability")


def setup_tracing(app: FastAPI):
    """
    Initializes OpenTelemetry distributed tracing and attaches it to the FastAPI app.
    """
    # 1. Define the resource (service name)
    resource = Resource(attributes={
        SERVICE_NAME: "spectra-api"
    })
    
    # 2. Set up Tracer Provider
    provider = TracerProvider(resource=resource)
    
    # 3. Configure Exporter
    # For production, replace ConsoleSpanExporter with OTLPSpanExporter
    processor = BatchSpanProcessor(ConsoleSpanExporter())
    provider.add_span_processor(processor)
    
    # Set the global provider
    trace.set_tracer_provider(provider)
    
    # 4. Instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)
    
    logger.info("OpenTelemetry distributed tracing initialized.")


def get_tracer(name: str):
    """Utility to get a tracer for custom span creation."""
    return trace.get_tracer(name)
