.PHONY: build clean proto check

# Correct output location - core/bin/tsyne-bridge
OUTPUT := ../bin/tsyne-bridge

# Build the bridge binary to the correct location
build:
	@mkdir -p ../bin
	CGO_ENABLED=1 go build -o $(OUTPUT) .
	@echo "✓ Built: $(OUTPUT)"

# Clean up binaries (including accidental ./bridge and wrong locations)
clean:
	rm -f bridge $(OUTPUT) ~/.tsyne/runtime/*/tsyne-bridge

# Verify bridge is in correct location
check:
	@if [ -f $(OUTPUT) ]; then \
		echo "✓ Bridge at correct location: $(OUTPUT)"; \
	else \
		echo "✗ Bridge NOT found at $(OUTPUT) - run 'make build'"; \
		exit 1; \
	fi
	@if [ -f bridge ]; then \
		echo "⚠ WARNING: Stale 'bridge' binary in current dir - run 'make clean'"; \
	fi

# Regenerate protobuf code
proto:
	protoc --go_out=. --go_opt=paths=source_relative \
	       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
	       proto/bridge.proto
