import {UserAvatar as SharedUserAvatar} from '@legacy/src/UserAvatar.jsx';
export function UserAvatar(props:{name:string;size?:'header'|'profile'|'menu'}){return <SharedUserAvatar {...props}/>;}
