#include <jni.h>
#include <android/log.h>
#include <dlfcn.h>
#include <pthread.h>
#include <string>
#include <cstring>

#define LOG_TAG "NodeRunner"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Function pointer type for node::Start
typedef int (*NodeStartFunc)(int argc, char* argv[]);

// Cached handle and function
static void* g_nodeHandle = NULL;
static NodeStartFunc g_nodeStart = NULL;
static pthread_t g_nodeThread;
static char* g_scriptPath = NULL;

// Thread function to run Node.js
static void* nodeThreadFunc(void* arg) {
    char* scriptPath = (char*)arg;
    LOGI("Node.js thread started, running: %s", scriptPath);

    // Build argc/argv for node
    const char* argv[] = {"node", scriptPath, NULL};
    int argc = 2;

    // Call node::Start
    int result = g_nodeStart(argc, (char**)argv);
    LOGI("Node.js exited with code: %d", result);

    free(scriptPath);
    return NULL;
}

// Initialize Node.js library
static int initNode() {
    if (g_nodeStart != NULL) return 1; // Already initialized

    // Load libnode.so with RTLD_NOLOAD since Java loads it first
    g_nodeHandle = dlopen("libnode.so", RTLD_NOW | RTLD_NOLOAD);
    if (!g_nodeHandle) {
        LOGE("Failed to get handle for libnode.so: %s", dlerror());
        return 0;
    }
    LOGI("Got handle to libnode.so");

    // Get node::Start function (mangled C++ name)
    g_nodeStart = (NodeStartFunc)dlsym(g_nodeHandle, "_ZN4node5StartEiPPc");
    if (!g_nodeStart) {
        LOGE("Failed to find node::Start (_ZN4node5StartEiPPc): %s", dlerror());
        return 0;
    }

    LOGI("Successfully loaded node::Start function");
    return 1;
}

extern "C" {

// JNI function to start Node.js with a script
JNIEXPORT jint JNICALL
Java_com_tsyne_phonetop_MainActivity_startNode(JNIEnv *env, jclass clazz, jstring scriptPath) {
    if (!initNode()) {
        return -1;
    }

    // Convert Java string to C string
    const char* path = env->GetStringUTFChars(scriptPath, NULL);
    if (!path) {
        LOGE("Failed to get script path string");
        return -2;
    }

    // Copy path for the thread (will be freed by thread)
    g_scriptPath = strdup(path);
    env->ReleaseStringUTFChars(scriptPath, path);

    LOGI("Starting Node.js thread with script: %s", g_scriptPath);

    // Start Node.js in a new thread
    int result = pthread_create(&g_nodeThread, NULL, nodeThreadFunc, g_scriptPath);
    if (result != 0) {
        LOGE("Failed to create Node.js thread: %d", result);
        free(g_scriptPath);
        g_scriptPath = NULL;
        return -3;
    }

    LOGI("Node.js thread created successfully");
    return 0;
}

} // extern "C"
