
import { registerRootComponent } from 'expo';
import { initializeApp } from '@capacitor/core';
import App from './client/src/App';

// Initialize Capacitor
initializeApp();

// Register the main App component
registerRootComponent(App);
