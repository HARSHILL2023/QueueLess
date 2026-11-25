import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function PatientLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="hospitals" />
      <Stack.Screen name="hospital/[id]" />
      <Stack.Screen name="active-token" options={{ animation: 'fade' }} />
      <Stack.Screen name="history" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
