package com.mixline.studio.testing;

import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONException;
import org.json.JSONObject;
import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Offline assets stay on a secure, isolated origin. Remote iframes get no native bridge. */
public final class MainActivity extends ComponentActivity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String START_URL = ORIGIN + "/assets/index.html";
    private static final int PICK_MEDIA = 10;
    private static final int SAVE_EXPORT = 11;
    private static final int MAX_EXPORT_BYTES = 64 * 1024 * 1024;
    private WebView webView;
    private ValueCallback<Uri[]> pendingChooser;
    private byte[] pendingExport;
    private String pendingExportName;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private boolean ownsFocus;
    private boolean pickerActive;
    private boolean pauseDispatched;
    private final ExecutorService exportWorker = Executors.newSingleThreadExecutor();
    private final BroadcastReceiver noisyReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) { pausePlayback(); }
    };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(9, 11, 17));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(9, 11, 17));
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        root.requestApplyInsets();
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) controller.setSystemBarsAppearance(0,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                            | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
        }
        configureWebView();
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                .setAcceptsDelayedFocusGain(false)
                .setWillPauseWhenDucked(true)
                .setOnAudioFocusChangeListener(change -> {
                    if (change != AudioManager.AUDIOFOCUS_GAIN) runOnUiThread(this::pausePlayback);
                }).build();
        IntentFilter filter = new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(noisyReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(noisyReceiver, filter);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { handleBack(); }
        });
        // Session state is persisted by the web app. Never resume playback automatically.
        webView.loadUrl(START_URL);
    }

    @SuppressWarnings("SetJavaScriptEnabled")
    private void configureWebView() {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setSafeBrowsingEnabled(true);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                if (trustedOrigin(uri)) return false;
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) openExternal(uri);
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                       FileChooserParams params) {
                if (pendingChooser != null) pendingChooser.onReceiveValue(null);
                pendingChooser = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("*/*");
                picker.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"audio/*", "video/*"});
                picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                picker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
                openPicker(picker, PICK_MEDIA);
                return true;
            }
        });
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(webView, "MixlineAndroid", Collections.singleton(ORIGIN),
                    (view, message, sourceOrigin, isMainFrame, replyProxy) -> {
                        if (!isMainFrame || !trustedOrigin(sourceOrigin)) return;
                        String data = message.getData();
                        if (data == null || data.length() > MAX_EXPORT_BYTES * 4L / 3L + 4096) return;
                        try { handleNativeMessage(new JSONObject(data)); }
                        catch (JSONException | IllegalArgumentException e) {
                            nativeResult("error", "Invalid native request", null);
                        }
                    });
        }
    }

    private static boolean trustedOrigin(Uri uri) {
        return "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443);
    }

    private void handleNativeMessage(JSONObject message) {
        switch (message.optString("type")) {
            case "playback":
                if (message.optBoolean("playing")) {
                    pauseDispatched = false;
                    if (!ownsFocus) ownsFocus = audioManager.requestAudioFocus(focusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
                    if (ownsFocus) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    else pausePlayback();
                } else releaseFocus();
                break;
            case "haptic": webView.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP); break;
            case "export": beginExport(message); break;
            default: nativeResult("error", "Unsupported native request", null);
        }
    }

    private void beginExport(JSONObject message) {
        if (pendingExport != null) { nativeResult("error", "Finish or cancel the current save first.", null); return; }
        String mime = message.optString("mime", "audio/wav");
        if (!mime.equals("audio/wav") && !mime.equals("audio/webm") && !mime.equals("audio/ogg") && !mime.equals("audio/mp4")
                && !mime.equals("application/json")) {
            nativeResult("error", "Unsupported export format.", null); return;
        }
        byte[] bytes;
        try { bytes = Base64.decode(message.optString("base64"), Base64.DEFAULT); }
        catch (IllegalArgumentException e) { nativeResult("error", "The export could not be decoded.", null); return; }
        if (bytes.length == 0 || bytes.length > MAX_EXPORT_BYTES) {
            nativeResult("error", "Exports must be between 1 byte and 64 MB. Save a shorter recording.", null); return;
        }
        String name = message.optString("name", "Mixline-recording.wav").replaceAll("[\\\\/\\p{Cntrl}]", "_");
        if (name.length() > 120) name = name.substring(0, 120);
        pendingExport = bytes;
        pendingExportName = name;
        Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                .setType(mime).putExtra(Intent.EXTRA_TITLE, name);
        openPicker(save, SAVE_EXPORT);
    }

    private void openPicker(Intent intent, int requestCode) {
        pickerActive = true;
        // Wait for the JS flag before Android emits visibilitychange/onPause.
        // The frontend pauses video decks, while local mixing can continue during import/save.
        webView.evaluateJavascript("window.mixlinePickerActive=true;"
                + "if(typeof window.mixlineLifecycle==='function')window.mixlineLifecycle('picker');", ignored -> {
            try { startActivityForResult(intent, requestCode); }
            catch (ActivityNotFoundException e) {
                finishPicker();
                if (requestCode == PICK_MEDIA) {
                    if (pendingChooser != null) pendingChooser.onReceiveValue(null);
                    pendingChooser = null;
                    Toast.makeText(this, "No file picker is available on this device.", Toast.LENGTH_LONG).show();
                } else {
                    pendingExport = null; pendingExportName = null;
                    nativeResult("error", "No document save app is available.", null);
                }
            }
        });
    }

    private void finishPicker() {
        pickerActive = false;
        if (webView != null) webView.evaluateJavascript("window.mixlinePickerActive=false;", null);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_MEDIA || requestCode == SAVE_EXPORT) finishPicker();
        if (requestCode == PICK_MEDIA && pendingChooser != null) {
            List<Uri> selected = new ArrayList<>();
            if (resultCode == RESULT_OK && data != null) {
                ClipData clip = data.getClipData();
                if (clip != null) for (int i = 0; i < clip.getItemCount(); i++) selected.add(clip.getItemAt(i).getUri());
                else if (data.getData() != null) selected.add(data.getData());
                for (Uri uri : selected) {
                    try { getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION); }
                    catch (SecurityException ignored) { /* Some providers offer temporary access only. */ }
                }
            }
            pendingChooser.onReceiveValue(selected.isEmpty() ? null : selected.toArray(new Uri[0]));
            pendingChooser = null;
        } else if (requestCode == SAVE_EXPORT) {
            final byte[] bytes = pendingExport;
            final String filename = pendingExportName;
            pendingExport = null; pendingExportName = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null || bytes == null) {
                nativeResult("cancelled", "Save cancelled. Your recording remains in Mixline.", filename);
                return;
            }
            final Uri destination = data.getData();
            exportWorker.execute(() -> {
                try (OutputStream out = getContentResolver().openOutputStream(destination, "wt")) {
                    if (out == null) throw new IOException("Could not open the selected destination.");
                    out.write(bytes);
                    out.flush();
                    runOnUiThread(() -> nativeResult("saved", "Saved successfully.", filename));
                } catch (IOException | SecurityException e) {
                    runOnUiThread(() -> nativeResult("error", "Could not save the file. Choose another destination.", filename));
                }
            });
        }
    }

    private void nativeResult(String status, String message, String name) {
        if (webView == null || isDestroyed()) return;
        JSONObject response = new JSONObject();
        try {
            response.put("type", "export"); response.put("status", status);
            response.put("message", message); if (name != null) response.put("name", name);
        } catch (JSONException ignored) { return; }
        webView.evaluateJavascript("if(typeof window.mixlineNativeResult==='function')window.mixlineNativeResult(" + response + ");", null);
    }

    private void pausePlayback() {
        if (!pauseDispatched && webView != null) {
            pauseDispatched = true;
            webView.evaluateJavascript("if(typeof window.mixlineLifecycle==='function')window.mixlineLifecycle('pause');", null);
        }
        releaseFocus();
    }
    private void releaseFocus() {
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        boolean previouslyOwned = ownsFocus;
        ownsFocus = false;
        if (previouslyOwned && audioManager != null) audioManager.abandonAudioFocusRequest(focusRequest);
    }
    private void openExternal(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (ActivityNotFoundException e) { Toast.makeText(this, "No app can open this link.", Toast.LENGTH_LONG).show(); }
    }
    private void handleBack() {
        webView.evaluateJavascript("typeof window.mixlineBack==='function' && window.mixlineBack()===true", handled -> {
            if (!"true".equals(handled)) {
                if (webView.canGoBack()) webView.goBack();
                else moveTaskToBack(true);
            }
        });
    }
    @Override protected void onPause() {
        if (!pickerActive) pausePlayback();
        super.onPause();
    }
    @Override protected void onDestroy() {
        unregisterReceiver(noisyReceiver);
        releaseFocus();
        if (pendingChooser != null) pendingChooser.onReceiveValue(null);
        pendingExport = null;
        exportWorker.shutdown();
        webView.destroy(); webView = null;
        super.onDestroy();
    }
}
