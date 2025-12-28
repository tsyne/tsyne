cmake_minimum_required(VERSION 3.18.1)
project("phonetop-jni")

# Create the JNI wrapper library with both tsyne-bridge and node wrappers
add_library(phonetop-jni SHARED
    jni-wrapper.c
    node-runner.cpp
)

# Link against log and dl libraries
# Both tsyne-bridge and libnode symbols are resolved at runtime via dlsym
find_library(log-lib log)
find_library(dl-lib dl)
target_link_libraries(phonetop-jni ${log-lib} ${dl-lib})
