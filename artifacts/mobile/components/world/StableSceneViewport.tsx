import React, {useState} from 'react';
import {View, useWindowDimensions} from 'react-native';

/** The camera always receives the full screen geometry. A loaded ad clips a
 * little foreground instead of resizing the room or its resident. */
export function StableSceneViewport({children, overlay, rail}: {
  children: React.ReactNode; overlay?: React.ReactNode; rail?: React.ReactNode;
}) {
  const window = useWindowDimensions();
  const [height, setHeight] = useState(window.height);
  return <View style={{flex: 1}} onLayout={event => {
    const next = event.nativeEvent.layout.height;
    if (next > 0) setHeight(next);
  }}>
    <View testID="home-world-scene" style={{flex: 1, overflow: 'hidden'}}>
      <View testID="home-world-canvas" style={{height, width: '100%'}}>{children}</View>
      {overlay}
    </View>
    {rail}
  </View>;
}
