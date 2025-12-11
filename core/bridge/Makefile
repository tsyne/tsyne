.PHONY: build clean proto

# Build the bridge binary to the correct location
build:
	go build -o ./bin/tsyne-bridge

# Clean up binaries (including accidental ./bridge)
clean:
	rm -f bridge ./bin/tsyne-bridge

# Regenerate protobuf code
proto:
	protoc --go_out=. --go_opt=paths=source_relative \
	       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
	       proto/bridge.proto
