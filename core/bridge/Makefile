.PHONY: build clean proto check android android-arm64 android-arm clean-android

# Correct output location - core/bin/tsyne-bridge
OUTPUT := ../bin/tsyne-bridge

# Android output directory
ANDROID_OUT := ../../android-native/app/libs

# Android NDK - set ANDROID_NDK_HOME or use default location
ANDROID_NDK_HOME ?= $(HOME)/Android/Sdk/ndk/25.1.8937393
NDK_TOOLCHAIN := $(ANDROID_NDK_HOME)/toolchains/llvm/prebuilt/linux-x86_64

# Android API level (minimum supported)
ANDROID_API := 24

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

# Build for Android (both architectures)
android: android-arm64 android-arm
	@echo "✓ Built Android libraries for arm64-v8a and armeabi-v7a"

# Build for Android arm64-v8a (64-bit ARM)
android-arm64:
	@mkdir -p $(ANDROID_OUT)/arm64-v8a
	@echo "Building for Android arm64-v8a..."
	CGO_ENABLED=1 \
	GOOS=android \
	GOARCH=arm64 \
	CC=$(NDK_TOOLCHAIN)/bin/aarch64-linux-android$(ANDROID_API)-clang \
	CXX=$(NDK_TOOLCHAIN)/bin/aarch64-linux-android$(ANDROID_API)-clang++ \
	go build -buildmode=c-shared \
		-o $(ANDROID_OUT)/arm64-v8a/libtsyne-bridge.so .
	@echo "✓ Built: $(ANDROID_OUT)/arm64-v8a/libtsyne-bridge.so"

# Build for Android armeabi-v7a (32-bit ARM)
android-arm:
	@mkdir -p $(ANDROID_OUT)/armeabi-v7a
	@echo "Building for Android armeabi-v7a..."
	CGO_ENABLED=1 \
	GOOS=android \
	GOARCH=arm \
	GOARM=7 \
	CC=$(NDK_TOOLCHAIN)/bin/armv7a-linux-androideabi$(ANDROID_API)-clang \
	CXX=$(NDK_TOOLCHAIN)/bin/armv7a-linux-androideabi$(ANDROID_API)-clang++ \
	go build -buildmode=c-shared \
		-o $(ANDROID_OUT)/armeabi-v7a/libtsyne-bridge.so .
	@echo "✓ Built: $(ANDROID_OUT)/armeabi-v7a/libtsyne-bridge.so"

# Clean Android builds
clean-android:
	rm -rf $(ANDROID_OUT)/arm64-v8a/libtsyne-bridge.* $(ANDROID_OUT)/armeabi-v7a/libtsyne-bridge.*

# Build for Linux aarch64 (postmarketOS, Raspberry Pi, etc.)
linux-arm64:
	@mkdir -p ../bin
	@echo "Building for Linux aarch64..."
	CGO_ENABLED=1 \
	GOOS=linux \
	GOARCH=arm64 \
	CC=aarch64-linux-gnu-gcc \
	CXX=aarch64-linux-gnu-g++ \
	go build -o ../bin/tsyne-bridge-linux-arm64 .
	@echo "✓ Built: ../bin/tsyne-bridge-linux-arm64"
