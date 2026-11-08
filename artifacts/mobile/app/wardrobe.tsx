import React from 'react';
import {Redirect} from 'expo-router';
export default function Wardrobe(){return <Redirect href={{pathname:'/shop',params:{tab:'costumes'}}}/>;}
