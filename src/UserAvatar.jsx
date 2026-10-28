import React from 'react';
import styles from './user-avatar.module.css';
export function UserAvatar({name,size='header'}) {
 const initial=(Array.from(name.trim())[0]||'U').toLocaleUpperCase();
 return <span className={[styles.avatar,size==='profile'?styles.profile:size==='menu'?styles.menu:''].filter(Boolean).join(' ')} data-user-avatar data-avatar-size={size} aria-hidden="true">{initial}</span>;
}
