import {Redirect} from 'expo-router';

/** Keep old bookmarks and notification links pointing at the shared notebook. */
export default function RecordScreen(){return <Redirect href="/exchange-diary"/>;}
