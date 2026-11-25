import React, { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Lightweight mount transition used to give each screen a calm, premium
 * entrance. Runs entirely on the native driver.
 */
export default function FadeIn({ children, delay = 0, distance = 14, duration = 460, style }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();

    return () => animation.stop();
  }, [delay, duration, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
