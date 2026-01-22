#include <jni.h>
#include <android/log.h>
#include <dlfcn.h>
#include <pthread.h>
#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#define LOG_TAG "TsyneJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Function pointer types for Go exports
typedef int (*TsyneInitFunc)(int);
typedef int (*StartBridgeMsgpackUDSFunc)(int);
typedef int (*StartBridgeMsgpackUDSWithDirFunc)(int, const char*);
typedef int (*StartBridgeGrpcFunc)(int);
typedef int (*StartBridgeAndroidEmbeddedFunc)(float, float, const char*);
typedef void (*SetAndroidRenderCallbackFunc)(void*);
typedef void (*SetAndroidScreenSizeFunc)(float, float);
typedef void (*SendAndroidTouchDownFunc)(float, float, int);
typedef void (*SendAndroidTouchMoveFunc)(float, float, int);
typedef void (*SendAndroidTouchUpFunc)(float, float, int);

// Cached socket directory for bridge thread
static char g_socketDir[512] = {0};

// Cached function pointers
static void* g_bridgeHandle = NULL;
static TsyneInitFunc g_TsyneInit = NULL;
static StartBridgeMsgpackUDSFunc g_StartBridgeMsgpackUDS = NULL;
static StartBridgeMsgpackUDSWithDirFunc g_StartBridgeMsgpackUDSWithDir = NULL;
static StartBridgeGrpcFunc g_StartBridgeGrpc = NULL;
static StartBridgeAndroidEmbeddedFunc g_StartBridgeAndroidEmbedded = NULL;
static SetAndroidRenderCallbackFunc g_SetAndroidRenderCallback = NULL;
static SetAndroidScreenSizeFunc g_SetAndroidScreenSize = NULL;
static SendAndroidTouchDownFunc g_SendAndroidTouchDown = NULL;
static SendAndroidTouchMoveFunc g_SendAndroidTouchMove = NULL;
static SendAndroidTouchUpFunc g_SendAndroidTouchUp = NULL;

// For embedded mode rendering callback
static JavaVM* g_javaVM = NULL;
static jobject g_renderSurface = NULL;
static jmethodID g_onFrameMethod = NULL;
static float g_screenWidth = 0;
static float g_screenHeight = 0;

// Thread for msgpack server
static pthread_t g_bridgeThread;
static int g_bridgeTestMode = 0;

// JNI_OnLoad - capture JavaVM for callbacks
JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void* reserved) {
    g_javaVM = vm;
    LOGI("JNI_OnLoad: JavaVM captured");
    return JNI_VERSION_1_6;
}

// Native render callback that passes frame data to Java
static void nativeRenderCallback(uint8_t* pixels, int width, int height, int stride) {
    if (g_javaVM == NULL || g_renderSurface == NULL) {
        return;
    }

    JNIEnv* env = NULL;
    int attached = 0;

    // Get JNIEnv for this thread
    if ((*g_javaVM)->GetEnv(g_javaVM, (void**)&env, JNI_VERSION_1_6) != JNI_OK) {
        if ((*g_javaVM)->AttachCurrentThread(g_javaVM, &env, NULL) != JNI_OK) {
            LOGE("Failed to attach thread for render callback");
            return;
        }
        attached = 1;
    }

    // Create a ByteBuffer from the pixel data
    int dataSize = height * stride;
    jobject buffer = (*env)->NewDirectByteBuffer(env, pixels, dataSize);

    if (buffer != NULL && g_onFrameMethod != NULL) {
        (*env)->CallVoidMethod(env, g_renderSurface, g_onFrameMethod, buffer, width, height, stride);
    }

    if (buffer != NULL) {
        (*env)->DeleteLocalRef(env, buffer);
    }

    if (attached) {
        (*g_javaVM)->DetachCurrentThread(g_javaVM);
    }
}

// Thread function to run msgpack UDS server (blocking)
static void* bridgeThreadFunc(void* arg) {
    int testMode = *((int*)arg);

    // Use the new function that accepts socket directory directly
    if (g_socketDir[0] != '\0' && g_StartBridgeMsgpackUDSWithDir != NULL) {
        LOGI("Bridge thread started, calling StartBridgeMsgpackUDSWithDir(%d, %s)", testMode, g_socketDir);
        int result = g_StartBridgeMsgpackUDSWithDir(testMode, g_socketDir);
        LOGI("StartBridgeMsgpackUDSWithDir returned: %d", result);
    } else {
        LOGI("Bridge thread started, calling StartBridgeMsgpackUDS(%d)", testMode);
        int result = g_StartBridgeMsgpackUDS(testMode);
        LOGI("StartBridgeMsgpackUDS returned: %d", result);
    }
    return NULL;
}

// Initialize function pointers from tsyne-bridge library
static int initFunctionPointers() {
    if (g_TsyneInit != NULL) return 1; // Already initialized

    // Open libtsyne-bridge.so with RTLD_NOLOAD since it's already loaded by Java
    g_bridgeHandle = dlopen("libtsyne-bridge.so", RTLD_NOW | RTLD_NOLOAD);
    if (!g_bridgeHandle) {
        LOGE("Failed to get handle for libtsyne-bridge.so: %s", dlerror());
        return 0;
    }
    LOGI("Got handle to libtsyne-bridge.so");

    g_TsyneInit = (TsyneInitFunc)dlsym(g_bridgeHandle, "TsyneInit");
    if (!g_TsyneInit) {
        LOGE("Failed to find TsyneInit: %s", dlerror());
        return 0;
    }

    g_StartBridgeMsgpackUDS = (StartBridgeMsgpackUDSFunc)dlsym(g_bridgeHandle, "StartBridgeMsgpackUDS");
    if (!g_StartBridgeMsgpackUDS) {
        LOGE("Failed to find StartBridgeMsgpackUDS: %s", dlerror());
        return 0;
    }

    // This one is optional - for Android socket directory support
    g_StartBridgeMsgpackUDSWithDir = (StartBridgeMsgpackUDSWithDirFunc)dlsym(g_bridgeHandle, "StartBridgeMsgpackUDSWithDir");
    if (g_StartBridgeMsgpackUDSWithDir) {
        LOGI("Found StartBridgeMsgpackUDSWithDir (Android socket directory support)");
    }

    g_StartBridgeGrpc = (StartBridgeGrpcFunc)dlsym(g_bridgeHandle, "StartBridgeGrpc");
    if (!g_StartBridgeGrpc) {
        LOGE("Failed to find StartBridgeGrpc: %s", dlerror());
        return 0;
    }

    // Load embedded mode functions (optional - for Android embedded rendering)
    g_StartBridgeAndroidEmbedded = (StartBridgeAndroidEmbeddedFunc)dlsym(g_bridgeHandle, "StartBridgeAndroidEmbedded");
    if (g_StartBridgeAndroidEmbedded) {
        LOGI("Found StartBridgeAndroidEmbedded (embedded rendering support)");
    }

    g_SetAndroidRenderCallback = (SetAndroidRenderCallbackFunc)dlsym(g_bridgeHandle, "SetAndroidRenderCallback");
    g_SetAndroidScreenSize = (SetAndroidScreenSizeFunc)dlsym(g_bridgeHandle, "SetAndroidScreenSize");
    g_SendAndroidTouchDown = (SendAndroidTouchDownFunc)dlsym(g_bridgeHandle, "SendAndroidTouchDown");
    g_SendAndroidTouchMove = (SendAndroidTouchMoveFunc)dlsym(g_bridgeHandle, "SendAndroidTouchMove");
    g_SendAndroidTouchUp = (SendAndroidTouchUpFunc)dlsym(g_bridgeHandle, "SendAndroidTouchUp");

    LOGI("Successfully loaded all function pointers from tsyne-bridge");
    return 1;
}

// JNI wrapper for TsyneInit
JNIEXPORT jint JNICALL
Java_com_tsyne_phonetop_MainActivity_TsyneInit(JNIEnv *env, jclass clazz, jint headless) {
    if (!initFunctionPointers()) {
        return -1;
    }
    LOGI("JNI: Calling TsyneInit(%d)", headless);
    int result = g_TsyneInit(headless);
    LOGI("JNI: TsyneInit returned %d", result);
    return result;
}

// JNI wrapper for StartBridgeMsgpackUDS
JNIEXPORT jint JNICALL
Java_com_tsyne_phonetop_MainActivity_StartBridgeMsgpackUDS(JNIEnv *env, jclass clazz, jint testMode) {
    if (!initFunctionPointers()) {
        return -1;
    }
    LOGI("JNI: Calling StartBridgeMsgpackUDS(%d)", testMode);
    int result = g_StartBridgeMsgpackUDS(testMode);
    LOGI("JNI: StartBridgeMsgpackUDS returned %d", result);
    return result;
}

// JNI wrapper for StartBridgeGrpc
JNIEXPORT jint JNICALL
Java_com_tsyne_phonetop_MainActivity_StartBridgeGrpc(JNIEnv *env, jclass clazz, jint testMode) {
    if (!initFunctionPointers()) {
        return -1;
    }
    LOGI("JNI: Calling StartBridgeGrpc(%d)", testMode);
    int result = g_StartBridgeGrpc(testMode);
    LOGI("JNI: StartBridgeGrpc returned %d", result);
    return result;
}

// Start the msgpack-uds bridge in a background thread (non-blocking)
JNIEXPORT jint JNICALL
Java_com_tsyne_phonetop_MainActivity_startBridgeInBackground(JNIEnv *env, jclass clazz, jint testMode, jstring socketDir) {
    if (!initFunctionPointers()) {
        return -1;
    }

    // Store the socket directory for the bridge thread to use
    if (socketDir != NULL) {
        const char* dir = (*env)->GetStringUTFChars(env, socketDir, NULL);
        if (dir != NULL) {
            strncpy(g_socketDir, dir, sizeof(g_socketDir) - 1);
            g_socketDir[sizeof(g_socketDir) - 1] = '\0';
            (*env)->ReleaseStringUTFChars(env, socketDir, dir);
            LOGI("JNI: Socket directory set to: %s", g_socketDir);
        }
    }

    g_bridgeTestMode = testMode;
    LOGI("JNI: Starting bridge in background thread (testMode=%d)", testMode);

    int result = pthread_create(&g_bridgeThread, NULL, bridgeThreadFunc, &g_bridgeTestMode);
    if (result != 0) {
        LOGE("Failed to create bridge thread: %d", result);
        return -2;
    }

    // Give the bridge time to start and create the socket
    usleep(500000); // 500ms

    LOGI("JNI: Bridge thread started successfully");
    return 0;
}

// Get the socket path (uses cached g_socketDir if set, otherwise /data/local/tmp)
JNIEXPORT jstring JNICALL
Java_com_tsyne_phonetop_MainActivity_getBridgeSocketPath(JNIEnv *env, jclass clazz) {
    char socketPath[256];
    const char* socketDir = g_socketDir[0] != '\0' ? g_socketDir : "/data/local/tmp";
    snprintf(socketPath, sizeof(socketPath), "%s/tsyne-%d.sock", socketDir, getpid());
    LOGI("JNI: Socket path: %s", socketPath);
    return (*env)->NewStringUTF(env, socketPath);
}

// ============================================================================
// Embedded mode functions for rendering to Android SurfaceView
// ============================================================================

// Thread function to run embedded bridge (blocking)
static void* embeddedBridgeThreadFunc(void* arg) {
    LOGI("Embedded bridge thread starting (%.0fx%.0f)", g_screenWidth, g_screenHeight);

    // CRITICAL: Attach this thread to JNI BEFORE calling Go code
    // Go/Fyne's app.New() needs JNI access for the Android driver
    JNIEnv* env = NULL;
    if (g_javaVM != NULL) {
        if ((*g_javaVM)->AttachCurrentThread(g_javaVM, &env, NULL) != JNI_OK) {
            LOGE("Failed to attach embedded bridge thread to JVM");
            return NULL;
        }
        LOGI("Embedded bridge thread attached to JVM");
    } else {
        LOGE("JavaVM is NULL - cannot attach thread");
        return NULL;
    }

    // Set up the render callback first
    if (g_SetAndroidRenderCallback != NULL) {
        g_SetAndroidRenderCallback((void*)nativeRenderCallback);
        LOGI("Render callback registered");
    }

    // Start the embedded bridge (this blocks)
    if (g_StartBridgeAndroidEmbedded != NULL) {
        int result = g_StartBridgeAndroidEmbedded(g_screenWidth, g_screenHeight, g_socketDir);
        LOGI("StartBridgeAndroidEmbedded returned: %d", result);
    }

    // Detach thread when done (if bridge ever returns)
    if (g_javaVM != NULL) {
        (*g_javaVM)->DetachCurrentThread(g_javaVM);
        LOGI("Embedded bridge thread detached from JVM");
    }

    return NULL;
}

// Start embedded bridge with rendering support
JNIEXPORT jint JNICALL
Java_com_tsyne_phonetop_MainActivity_startEmbeddedBridge(JNIEnv *env, jclass clazz,
                                                          jfloat width, jfloat height,
                                                          jstring socketDir, jobject renderTarget) {
    if (!initFunctionPointers()) {
        return -1;
    }

    if (g_StartBridgeAndroidEmbedded == NULL) {
        LOGE("StartBridgeAndroidEmbedded not available");
        return -2;
    }

    // Store screen size
    g_screenWidth = width;
    g_screenHeight = height;
    LOGI("JNI: Screen size set to %.0fx%.0f", width, height);

    // Store the socket directory
    if (socketDir != NULL) {
        const char* dir = (*env)->GetStringUTFChars(env, socketDir, NULL);
        if (dir != NULL) {
            strncpy(g_socketDir, dir, sizeof(g_socketDir) - 1);
            g_socketDir[sizeof(g_socketDir) - 1] = '\0';
            (*env)->ReleaseStringUTFChars(env, socketDir, dir);
            LOGI("JNI: Socket directory set to: %s", g_socketDir);
        }
    }

    // Store global reference to render target for callbacks
    if (renderTarget != NULL) {
        g_renderSurface = (*env)->NewGlobalRef(env, renderTarget);
        jclass targetClass = (*env)->GetObjectClass(env, renderTarget);
        g_onFrameMethod = (*env)->GetMethodID(env, targetClass, "onFrame", "(Ljava/nio/ByteBuffer;III)V");
        if (g_onFrameMethod == NULL) {
            LOGE("Failed to find onFrame method");
            (*env)->DeleteGlobalRef(env, g_renderSurface);
            g_renderSurface = NULL;
            return -3;
        }
        LOGI("JNI: Render target registered with onFrame method");
    }

    // Start embedded bridge in background thread
    LOGI("JNI: Starting embedded bridge in background thread");
    int result = pthread_create(&g_bridgeThread, NULL, embeddedBridgeThreadFunc, NULL);
    if (result != 0) {
        LOGE("Failed to create embedded bridge thread: %d", result);
        return -4;
    }

    // Give the bridge time to start
    usleep(500000); // 500ms

    LOGI("JNI: Embedded bridge thread started");
    return 0;
}

// Update screen size (e.g., on rotation)
JNIEXPORT void JNICALL
Java_com_tsyne_phonetop_MainActivity_setScreenSize(JNIEnv *env, jclass clazz, jfloat width, jfloat height) {
    g_screenWidth = width;
    g_screenHeight = height;
    if (g_SetAndroidScreenSize != NULL) {
        g_SetAndroidScreenSize(width, height);
        LOGI("JNI: Screen size updated to %.0fx%.0f", width, height);
    }
}

// Touch event handling
JNIEXPORT void JNICALL
Java_com_tsyne_phonetop_MainActivity_sendTouchDown(JNIEnv *env, jclass clazz, jfloat x, jfloat y, jint pointerId) {
    LOGI("sendTouchDown: x=%.0f y=%.0f id=%d func=%p", x, y, pointerId, g_SendAndroidTouchDown);
    if (g_SendAndroidTouchDown != NULL) {
        g_SendAndroidTouchDown(x, y, pointerId);
    }
}

JNIEXPORT void JNICALL
Java_com_tsyne_phonetop_MainActivity_sendTouchMove(JNIEnv *env, jclass clazz, jfloat x, jfloat y, jint pointerId) {
    if (g_SendAndroidTouchMove != NULL) {
        g_SendAndroidTouchMove(x, y, pointerId);
    }
}

JNIEXPORT void JNICALL
Java_com_tsyne_phonetop_MainActivity_sendTouchUp(JNIEnv *env, jclass clazz, jfloat x, jfloat y, jint pointerId) {
    if (g_SendAndroidTouchUp != NULL) {
        g_SendAndroidTouchUp(x, y, pointerId);
    }
}
