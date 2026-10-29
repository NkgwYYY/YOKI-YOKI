import React from 'react';
import {Redirect} from 'expo-router';
export default function Bank(){return <Redirect href={{pathname:'/(tabs)',params:{place:'bank'}}}/>;}
