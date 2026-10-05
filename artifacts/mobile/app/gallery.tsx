import React from 'react';
import { Redirect } from 'expo-router';
/** Public gallery now uses the encountered-only album. Developer rigs live in character-lab. */
export default function GalleryScreen() { return <Redirect href="/(tabs)/growth" />; }
