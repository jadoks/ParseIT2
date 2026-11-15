import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { FONT_BODY, WEIGHT_EMPHASIS } from '../theme/typography';
import { APK_DOWNLOAD_URL, canOfferApk, markAppDownloaded, useCanHover } from './downloadAppShared';

type Props = {
  /** The icon to render inside the button (each header passes its own icon set). */
  children: React.ReactNode;
  /** Style for the pressable — pass the header's `styles.navBtn` / `styles.navBtnHover`. */
  buttonStyle?: any;
  hoverStyle?: any;
  onBeforePress?: () => void;
};

const DownloadAppButton: React.FC<Props> = ({
  children,
  buttonStyle,
  hoverStyle,
  onBeforePress,
}) => {
  const canHover = useCanHover();
  const [hovered, setHovered] = useState(false);

  // Hide inside the native app (already installed) and on iOS browsers (APK can't install).
  if (!canOfferApk()) return null;

  const download = () => {
    onBeforePress?.();
    markAppDownloaded(); // they've got it → the auto prompt never shows again
    Linking.openURL(APK_DOWNLOAD_URL).catch(() => {});
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Download the Android app"
        onPress={download}
        onHoverIn={() => canHover && setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={(state: any) => [buttonStyle, (hovered || state.pressed) && hoverStyle]}
      >
        {children}
      </Pressable>

      {/* QR popup — only on PC/laptop while hovering */}
      {canHover && hovered && (
        <View style={styles.popup} pointerEvents="none">
          <View style={styles.qrBox}>
            <QRCode value={APK_DOWNLOAD_URL} size={150} color="#000" backgroundColor="#FFF" />
          </View>
          <Text style={styles.title}>Scan to download the app</Text>
          <Text style={styles.sub}>Android (.apk)</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { position: 'relative', alignItems: 'center', zIndex: 200 },
  popup: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1000,
    minWidth: 190,
  },
  qrBox: { padding: 8, backgroundColor: '#FFF', borderRadius: 10 },
  title: { marginTop: 10, fontSize: 13, fontWeight: WEIGHT_EMPHASIS, fontFamily: FONT_BODY, color: '#111' },
  sub: { marginTop: 2, fontSize: 11, fontFamily: FONT_BODY, color: '#888' },
});

export default DownloadAppButton;