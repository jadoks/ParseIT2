import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { Image, ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';

// Avatar renderer for remote images.
//
// expo-image keeps a disk + memory cache keyed by `cacheKey`. Signed URLs
// change every hour, so keying the cache on the storage path (instead of the
// full URL) means an avatar is downloaded once, not once per new signature.
// Local assets (e.g. the bundled default avatar) fall through to RN's Image.

export const thumbCacheKey = (storagePath?: string | null) =>
  storagePath ? `${storagePath}#thumb` : undefined;

interface AvatarImageProps {
  source?: ImageSourcePropType;
  cacheKey?: string | null;
  style?: StyleProp<ImageStyle>;
  onError?: () => void;
}

const AvatarImage: React.FC<AvatarImageProps> = ({ source, cacheKey, style, onError }) => {
  const uri =
    source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source
      ? source.uri
      : undefined;

  if (uri) {
    return (
      <ExpoImage
        source={{ uri, cacheKey: cacheKey || undefined }}
        style={style}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={cacheKey || uri}
        transition={120}
        onError={onError}
      />
    );
  }

  return <Image source={source} style={style} resizeMode="cover" onError={onError} />;
};

export default React.memo(AvatarImage);