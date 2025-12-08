// ffi_callback.c - C helper for calling FFI event callbacks

#include <stddef.h>

typedef void (*EventCallback)(const char* eventJson);

// callEventCallback is called from Go to invoke the event callback
void callEventCallback(void* callback, const char* eventJson) {
    if (callback != NULL) {
        ((EventCallback)callback)(eventJson);
    }
}
