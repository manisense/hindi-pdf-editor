import { useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';

import { getFontBase64 } from './src/lib/fontAsset';

/**
 * Phase 0 spike (spec Section 10) - NOT the real app. Proves the core architectural
 * assumption (Section 2-3) before any editor code is written: hardcoded Devanagari HTML,
 * with the font base64-embedded per Section 8, exported via Android's real print pipeline.
 *
 * Uses the same Devanagari sentences as fixtures/devanagari-fixture.html (conjuncts क्ष/ज्ञ/त्र/द्य,
 * a reph, matras above and below baseline) per AGENTS.md's "one fixed fixture" testing rule,
 * rather than different ad hoc text.
 *
 * This screen gets replaced entirely once Phase 0 passes - see spec Section 10 Phase 1.
 */
const SPIKE_HTML = (fontBase64: string) => `
<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'NotoSansDevanagari';
    src: url('data:font/ttf;base64,${fontBase64}') format('truetype');
    font-weight: 100 900;
  }
  body {
    font-family: 'NotoSansDevanagari', sans-serif;
    font-size: 28pt;
    line-height: 1.8;
    padding: 60pt;
    color: #111;
  }
  .label { font-family: sans-serif; font-size: 11pt; color: #666; margin-bottom: 30pt; }
  .callout { font-family: sans-serif; font-size: 10pt; color: #888; }
</style>
</head>
<body>
  <div class="label">Hindi PDF Editor — Phase 0 spike. See hindi-pdf-editor-spec.md Section 10.</div>
  <div>धर्म और क्षेत्र में गुरुजी ने ज्ञान दिया।</div>
  <div class="callout">धर्म → reph | क्षेत्र → क्ष conjunct + मात्रा | गुरुजी → matras below baseline | ज्ञान → ज्ञ conjunct</div>
  <div style="margin-top:40pt">विद्यालय में सूर्य की रोशनी आती है।</div>
  <div class="callout">विद्यालय → द्य conjunct | सूर्य → reph + मात्रा | रोशनी → मात्रा</div>
</body>
</html>
`;

type SpikeStatus =
  | { state: 'idle' }
  | { state: 'running' }
  | { state: 'done'; uri: string }
  | { state: 'error'; message: string };

export default function App() {
  const [status, setStatus] = useState<SpikeStatus>({ state: 'idle' });

  const runSpike = async () => {
    setStatus({ state: 'running' });
    try {
      const fontBase64 = await getFontBase64('NotoSansDevanagari');
      const { uri } = await Print.printToFileAsync({ html: SPIKE_HTML(fontBase64) });
      setStatus({ state: 'done', uri });
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const shareResult = async () => {
    if (status.state !== 'done') return;
    if (!(await Sharing.isAvailableAsync())) {
      setStatus({ state: 'error', message: 'Sharing is not available on this device.' });
      return;
    }
    await Sharing.shareAsync(status.uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Hindi PDF Editor — Phase 0 Spike</Text>
        <Text style={styles.body}>
          Renders hardcoded Devanagari (conjuncts, reph, matras) to a base64-embedded @font-face,
          exports via Print.printToFileAsync, and lets you share the result to open in an external
          PDF viewer. Record the result per spec Section 10.
        </Text>

        <Button title="Run spike" onPress={runSpike} disabled={status.state === 'running'} />

        {status.state === 'running' && <ActivityIndicator style={styles.spacerTop} />}

        {status.state === 'done' && (
          <View style={styles.spacerTop}>
            <Text style={styles.success}>Exported: {status.uri}</Text>
            <Button title="Share / open in a PDF viewer" onPress={shareResult} />
          </View>
        )}

        {status.state === 'error' && (
          <Text style={[styles.spacerTop, styles.error]}>Failed: {status.message}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    color: '#444',
  },
  spacerTop: {
    marginTop: 16,
  },
  success: {
    color: '#0a7a0a',
    marginBottom: 12,
  },
  error: {
    color: '#b00020',
  },
});
