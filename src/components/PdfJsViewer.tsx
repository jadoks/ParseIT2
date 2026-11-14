import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, TouchableOpacity, View } from 'react-native';

// Native PDF viewer that works in Expo Go (no native modules besides
// react-native-webview, which the app already uses).
//
// Why it exists: Android's WebView cannot display PDFs, and routing them through
// Google's Docs viewer (docs.google.com/gview) fails at random with
// "File wasn't available on site". Instead we download the PDF in the app,
// then render it with PDF.js inside a WebView. Nothing is fetched by a third
// party server, and no CORS setup is needed on the storage bucket.
//
// Place this file at: components/PdfJsViewer.tsx

let WebView: any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch (_) {}

const PDFJS_VERSION = '3.11.174';
const PDFJS_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('Empty file'));
      else resolve(result.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.readAsDataURL(blob);
  });
}

// NOTE: the script below is plain JS inside a template literal, so it must not
// contain backticks or "${".
function buildHtml(base64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=0.5, maximum-scale=5, user-scalable=yes"/>
<style>
  html, body { margin: 0; padding: 0; background: #525659; }
  #pages { display: flex; flex-direction: column; align-items: center; padding: 8px 0 0; }
  canvas { display: block; width: 100%; height: auto; margin: 0 0 8px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.4); }
  #msg { color: #fff; font: 14px sans-serif; text-align: center; padding: 24px; }
</style>
</head>
<body>
<div id="msg">Rendering document...</div>
<div id="pages"></div>
<script src="${PDFJS_BASE}/pdf.min.js"></script>
<script>
(function () {
  function post(o) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) {}
  }
  var B64 = "${base64}";
  var WORKER = "${PDFJS_BASE}/pdf.worker.min.js";

  async function main() {
    if (!window.pdfjsLib) { post({ type: 'error', message: 'Could not load the PDF engine. Check your connection.' }); return; }

    // Cross-origin workers are blocked, so load the worker source as text and run it from a Blob URL.
    var wres = await fetch(WORKER);
    var wtxt = await wres.text();
    pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([wtxt], { type: 'text/javascript' }));

    var bin = atob(B64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    var pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    var container = document.getElementById('pages');
    document.getElementById('msg').style.display = 'none';

    var cssWidth = Math.min(window.innerWidth || 360, 1000);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    for (var n = 1; n <= pdf.numPages; n++) {
      var page = await pdf.getPage(n);
      var base = page.getViewport({ scale: 1 });
      var vp = page.getViewport({ scale: (cssWidth * dpr) / base.width });
      var canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      container.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      if (n === 1) post({ type: 'ready' });
    }
  }

  main().catch(function (e) {
    post({ type: 'error', message: String((e && e.message) || e) });
  });
})();
</script>
</body>
</html>`;
}

type Props = {
  url: string;
  height: number;
  fileName?: string | null;
};

export default function PdfJsViewer({ url, height, fileName }: Props) {
  const [base64, setBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBase64(null);
    setError(null);
    setRendering(true);

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Download failed (${res.status}). The link may have expired.`);
        const blob = await res.blob();
        const b64 = await blobToBase64(blob);
        if (!cancelled) setBase64(b64);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not load the PDF.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, attempt]);

  const openExternally = () => {
    void Linking.openURL(url).catch(() => {});
  };

  if (error || !WebView) {
    return (
      <View style={{ flex: 1, height, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#F0F0F0' }}>
        <Text style={{ color: '#666', textAlign: 'center', marginBottom: 12 }}>
          {error || 'Install react-native-webview to preview PDFs.'}
        </Text>
        {!!WebView && (
          <TouchableOpacity
            onPress={() => setAttempt((a) => a + 1)}
            style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#8B0000', borderRadius: 6, marginBottom: 8 }}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Try Again</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={openExternally} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ color: '#8B0000', fontWeight: 'bold' }}>
            {fileName ? `Open ${fileName} in browser` : 'Open in browser'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, width: '100%', height, backgroundColor: '#525659' }}>
      {base64 && (
        <WebView
          key={`${url}|${attempt}`}
          originWhitelist={['*']}
          source={{ html: buildHtml(base64), baseUrl: 'https://localhost' }}
          style={{ flex: 1, backgroundColor: '#525659' }}
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit
          mixedContentMode="always"
          onMessage={(event: any) => {
            try {
              const msg = JSON.parse(event.nativeEvent.data);
              if (msg.type === 'ready') setRendering(false);
              if (msg.type === 'error') {
                setRendering(false);
                setError(msg.message || 'Could not display the PDF.');
              }
            } catch (_) {}
          }}
        />
      )}
      {rendering && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F0F0F0',
          }}
        >
          <ActivityIndicator size="large" color="#8B0000" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading document...</Text>
        </View>
      )}
    </View>
  );
}