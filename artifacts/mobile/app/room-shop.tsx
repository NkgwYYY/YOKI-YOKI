import React from 'react';
import {Redirect,useLocalSearchParams} from 'expo-router';
export default function RoomShop(){const {product}=useLocalSearchParams<{product?:string}>();return <Redirect href={{pathname:'/shop',params:{...(product?{product}:{}),tab:'sets'}}}/>;}
