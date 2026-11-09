import { Stack } from 'expo-router';

export default function StaffLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#38bdf8',
        headerTitleStyle: { fontWeight: '700', color: '#f8fafc' },
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Stack.Screen name="queue" options={{ title: 'Staff Queue Console', headerShown: false }} />
    </Stack>
  );
}
