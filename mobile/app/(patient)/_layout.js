import { Stack } from 'expo-router';

export default function PatientLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#38bdf8',
        headerTitleStyle: { fontWeight: '700', color: '#f8fafc' },
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Stack.Screen name="hospitals" options={{ title: 'Hospitals & Clinics', headerShown: false }} />
      <Stack.Screen name="hospital/[id]" options={{ title: 'Hospital Details' }} />
      <Stack.Screen name="active-token" options={{ title: 'Live Token Tracker', headerShown: false }} />
      <Stack.Screen name="history" options={{ title: 'Booking History' }} />
      <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
    </Stack>
  );
}
