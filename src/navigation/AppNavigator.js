import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import ImagePickerScreen from '../screens/ImagePickerScreen';
import CanvasEditorScreen from '../screens/CanvasEditorScreen';
import ExportScreen from '../screens/ExportScreen';
import BatchProcessingScreen from '../screens/BatchProcessingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ExportHistoryScreen from '../screens/ExportHistoryScreen';
import { CanvasRefProvider } from '../context/CanvasRefContext';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <CanvasRefProvider>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2563EB',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ImagePicker" 
          component={ImagePickerScreen}
          options={{ title: 'Select Images' }}
        />
        <Stack.Screen 
          name="CanvasEditor" 
          component={CanvasEditorScreen}
          options={{ title: 'Edit Canvas' }}
        />
        <Stack.Screen 
          name="Export" 
          component={ExportScreen}
          options={{ title: 'Export PDF' }}
        />
        <Stack.Screen 
          name="BatchProcessing" 
          component={BatchProcessingScreen}
          options={{ title: 'Batch Processing' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen 
          name="ExportHistory" 
          component={ExportHistoryScreen}
          options={{ title: 'Export History' }}
        />
      </Stack.Navigator>
    </CanvasRefProvider>
  );
};

export default AppNavigator; 