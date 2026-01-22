package com.tsyne.phonetop;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.os.Bundle;
import android.system.Os;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.MotionEvent;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.io.*;
import java.nio.ByteBuffer;

public class MainActivity extends Activity {
    private static final String TAG = "Phonetop";
    private static boolean librariesLoaded = false;
    private static String loadError = null;

    // Libraries are loaded in onCreate after setting environment variables

    // Native methods from JNI wrapper
    public static native int StartBridgeMsgpackUDS(int testMode);
    public static native int TsyneInit(int headless);
    public static native int startNode(String scriptPath);
    public static native int startBridgeInBackground(int testMode, String socketDir);
    public static native String getBridgeSocketPath();

    // Embedded mode native methods
    public static native int startEmbeddedBridge(float width, float height, String socketDir, Object renderTarget);
    public static native void setScreenSize(float width, float height);
    public static native void sendTouchDown(float x, float y, int pointerId);
    public static native void sendTouchMove(float x, float y, int pointerId);
    public static native void sendTouchUp(float x, float y, int pointerId);

    // Render surface for embedded mode
    private TsyneRenderView renderView;
    private TextView statusView;

    private void loadNativeLibraries() {
        if (librariesLoaded) return;

        try {
            // Load tsyne-bridge first (Go shared library)
            System.loadLibrary("tsyne-bridge");
            Log.i(TAG, "libtsyne-bridge.so loaded successfully!");

            // Load Node.js
            System.loadLibrary("node");
            Log.i(TAG, "libnode.so loaded successfully!");

            // Load our JNI wrapper that calls into tsyne-bridge and node
            System.loadLibrary("phonetop-jni");
            Log.i(TAG, "libphonetop-jni.so loaded successfully!");

            librariesLoaded = true;
        } catch (UnsatisfiedLinkError e) {
            loadError = "Failed to load native library: " + e.getMessage();
            Log.e(TAG, loadError);
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Create a FrameLayout to hold both render view and status overlay
        FrameLayout rootLayout = new FrameLayout(this);

        // Create render view for Fyne output
        renderView = new TsyneRenderView(this);
        rootLayout.addView(renderView);

        // Create status text overlay
        statusView = new TextView(this);
        statusView.setTextSize(18);
        statusView.setPadding(20, 20, 20, 20);
        statusView.setBackgroundColor(0xCC000000); // Semi-transparent black
        statusView.setTextColor(0xFFFFFFFF);
        statusView.setText("Setting up environment...");
        rootLayout.addView(statusView);

        setContentView(rootLayout);

        // Set environment variables BEFORE loading libraries
        try {
            String cacheDir = getCacheDir().getAbsolutePath();

            // Set TSYNE_SOCKET_DIR for msgpack server socket path
            Os.setenv("TSYNE_SOCKET_DIR", cacheDir, true);
            Log.i(TAG, "Set TSYNE_SOCKET_DIR to: " + cacheDir);

            // Set TMPDIR as well
            Os.setenv("TMPDIR", cacheDir, true);
            Log.i(TAG, "Set TMPDIR to: " + cacheDir);

            // Set FILESDIR for Fyne
            Os.setenv("FILESDIR", getFilesDir().getAbsolutePath(), true);
            Log.i(TAG, "Set FILESDIR to: " + getFilesDir().getAbsolutePath());
        } catch (Exception e) {
            Log.e(TAG, "Failed to set environment variables", e);
            statusView.setText("Failed to set environment: " + e.getMessage());
            return;
        }

        // Now load native libraries
        loadNativeLibraries();

        if (!librariesLoaded) {
            statusView.setText("Library load failed:\n" + loadError);
            return;
        }

        statusView.setText("All libraries loaded!\n\nInitializing...");

        // Run initialization in background thread
        new Thread(() -> {
            try {
                // Copy Node.js assets if needed
                if (wasAPKUpdated()) {
                    Log.i(TAG, "APK updated, copying Node.js assets...");
                    copyNodeAssets();
                }

                String cacheDir = getCacheDir().getAbsolutePath();

                // Get screen dimensions
                DisplayMetrics dm = getResources().getDisplayMetrics();
                float screenWidth = dm.widthPixels;
                float screenHeight = dm.heightPixels;
                Log.i(TAG, "Screen size: " + screenWidth + "x" + screenHeight);

                // Start embedded bridge with rendering
                Log.i(TAG, "Starting embedded bridge with socketDir=" + cacheDir);
                int bridgeResult = startEmbeddedBridge(screenWidth, screenHeight, cacheDir, renderView);
                Log.i(TAG, "startEmbeddedBridge returned: " + bridgeResult);

                // Get socket path for Node.js
                String socketPath = getBridgeSocketPath();
                Log.i(TAG, "Bridge socket path: " + socketPath);

                // Write socket path to a file for Node.js to read
                String configPath = getFilesDir().getAbsolutePath() + "/nodejs-project/bridge-config.json";
                try (java.io.FileWriter fw = new java.io.FileWriter(configPath)) {
                    fw.write("{\"socketPath\":\"" + socketPath + "\"}");
                }
                Log.i(TAG, "Wrote bridge config to: " + configPath);

                // Start Node.js with main.js
                String scriptPath = getFilesDir().getAbsolutePath() + "/nodejs-project/main.js";
                Log.i(TAG, "Starting Node.js with: " + scriptPath);
                int nodeResult = startNode(scriptPath);
                Log.i(TAG, "startNode returned: " + nodeResult);

                final String status = "Bridge: " + bridgeResult + " | Node: " + nodeResult;

                // Hide status view after a brief delay if rendering starts
                runOnUiThread(() -> {
                    statusView.setText(status);
                    // Fade out status view after 3 seconds
                    statusView.postDelayed(() -> {
                        statusView.setVisibility(View.GONE);
                    }, 3000);
                });
            } catch (Exception e) {
                Log.e(TAG, "Initialization failed", e);
                runOnUiThread(() -> statusView.setText("Initialization failed:\n" + e.getMessage()));
            }
        }).start();
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        Log.i(TAG, "Activity dispatchTouchEvent: action=" + ev.getActionMasked() + " x=" + ev.getX() + " y=" + ev.getY());
        return super.dispatchTouchEvent(ev);
    }

    private boolean wasAPKUpdated() {
        SharedPreferences prefs = getPreferences(Context.MODE_PRIVATE);
        long lastUpdate = prefs.getLong("lastUpdateTime", 0);
        long currentUpdate = 0;

        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            currentUpdate = info.lastUpdateTime;
        } catch (PackageManager.NameNotFoundException e) {
            Log.e(TAG, "Package not found", e);
        }

        if (lastUpdate != currentUpdate) {
            prefs.edit().putLong("lastUpdateTime", currentUpdate).apply();
            return true;
        }
        return false;
    }

    private void copyNodeAssets() {
        String targetDir = getFilesDir().getAbsolutePath();
        deleteRecursive(new File(targetDir + "/nodejs-project"));
        copyAssetFolder(getAssets(), "nodejs-project", targetDir + "/nodejs-project");
        Log.i(TAG, "Node.js assets copied to " + targetDir);
    }

    private void deleteRecursive(File fileOrDirectory) {
        if (fileOrDirectory.isDirectory()) {
            File[] children = fileOrDirectory.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        fileOrDirectory.delete();
    }

    private void copyAssetFolder(AssetManager assetManager, String srcPath, String dstPath) {
        try {
            String[] files = assetManager.list(srcPath);
            if (files == null || files.length == 0) {
                copyAssetFile(assetManager, srcPath, dstPath);
            } else {
                new File(dstPath).mkdirs();
                for (String file : files) {
                    copyAssetFolder(assetManager, srcPath + "/" + file, dstPath + "/" + file);
                }
            }
        } catch (IOException e) {
            Log.e(TAG, "Failed to copy asset folder: " + srcPath, e);
        }
    }

    private void copyAssetFile(AssetManager assetManager, String srcPath, String dstPath) {
        try {
            InputStream in = assetManager.open(srcPath);
            OutputStream out = new FileOutputStream(dstPath);
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            in.close();
            out.close();
        } catch (IOException e) {
            Log.e(TAG, "Failed to copy asset: " + srcPath, e);
        }
    }

    /**
     * Custom SurfaceView that receives rendered frames from the Fyne embedded driver.
     * Frames are RGBA pixel data that we convert to a Bitmap and draw.
     */
    class TsyneRenderView extends SurfaceView implements SurfaceHolder.Callback {
        private static final String TAG = "TsyneRenderView";
        private Bitmap frameBitmap;
        private Paint paint = new Paint();
        private boolean surfaceReady = false;

        public TsyneRenderView(Context context) {
            super(context);
            getHolder().addCallback(this);
            // Make sure we can receive touch events
            setFocusable(true);
            setFocusableInTouchMode(true);
            setClickable(true);
            Log.i(TAG, "TsyneRenderView created, touch enabled");
        }

        @Override
        public void surfaceCreated(SurfaceHolder holder) {
            Log.i(TAG, "Surface created");
            surfaceReady = true;
        }

        @Override
        public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            Log.i(TAG, "Surface changed: " + width + "x" + height);
            // Notify Go about screen size change
            setScreenSize(width, height);
        }

        @Override
        public void surfaceDestroyed(SurfaceHolder holder) {
            Log.i(TAG, "Surface destroyed");
            surfaceReady = false;
        }

        /**
         * Called from native code when a frame is ready.
         * The ByteBuffer contains RGBA pixel data.
         */
        public void onFrame(ByteBuffer pixels, int width, int height, int stride) {
            if (!surfaceReady) {
                return;
            }

            // Create or resize bitmap if needed
            if (frameBitmap == null || frameBitmap.getWidth() != width || frameBitmap.getHeight() != height) {
                if (frameBitmap != null) {
                    frameBitmap.recycle();
                }
                frameBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                Log.i(TAG, "Created bitmap: " + width + "x" + height);
            }

            // Copy pixel data to bitmap
            pixels.rewind();
            frameBitmap.copyPixelsFromBuffer(pixels);

            // Draw to surface at native size (1:1 pixels, no scaling)
            Canvas canvas = null;
            try {
                canvas = getHolder().lockCanvas();
                if (canvas != null) {
                    // Clear with black first
                    canvas.drawColor(0xFF000000);
                    // Draw bitmap at native size - no scaling to avoid distortion
                    canvas.drawBitmap(frameBitmap, 0, 0, paint);
                }
            } finally {
                if (canvas != null) {
                    getHolder().unlockCanvasAndPost(canvas);
                }
            }
        }

        @Override
        public boolean onTouchEvent(MotionEvent event) {
            int action = event.getActionMasked();
            int pointerIndex = event.getActionIndex();
            int pointerId = event.getPointerId(pointerIndex);
            float x = event.getX(pointerIndex);
            float y = event.getY(pointerIndex);

            Log.i(TAG, "onTouchEvent: action=" + action + " x=" + x + " y=" + y);

            switch (action) {
                case MotionEvent.ACTION_DOWN:
                case MotionEvent.ACTION_POINTER_DOWN:
                    Log.i(TAG, "Sending touch down to native");
                    sendTouchDown(x, y, pointerId);
                    return true;

                case MotionEvent.ACTION_MOVE:
                    // Send move for all pointers
                    for (int i = 0; i < event.getPointerCount(); i++) {
                        sendTouchMove(event.getX(i), event.getY(i), event.getPointerId(i));
                    }
                    return true;

                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_POINTER_UP:
                    sendTouchUp(x, y, pointerId);
                    return true;

                case MotionEvent.ACTION_CANCEL:
                    for (int i = 0; i < event.getPointerCount(); i++) {
                        sendTouchUp(event.getX(i), event.getY(i), event.getPointerId(i));
                    }
                    return true;
            }

            return super.onTouchEvent(event);
        }
    }
}
