import React from "react";
import {Redirect} from "expo-router";
export default function Bowling(){return <Redirect href={{pathname:"/(tabs)",params:{place:"bowling"}}}/>;}
