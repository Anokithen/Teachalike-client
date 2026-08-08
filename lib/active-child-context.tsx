'use client';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { activeChildApi, childrenApi } from '@/lib/endpoints';
import { clearChildSessionToken, getChildSessionToken, setChildSessionToken } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ActiveChildStatus, Child } from '@/lib/types';
interface Value { children: Child[]; activeChild: Child | null; status: ActiveChildStatus; expiresAt: string | null; activateChild: (id:number,pin:string)=>Promise<void>; lockChild:()=>Promise<void>; refreshActiveChild:()=>Promise<void>; openChildSelector:()=>void; }
const Context = createContext<Value|null>(null);
export function ActiveChildProvider({children: content}:{children:ReactNode}) {
 const {isParent,account}=useAuth(); const [children,setChildren]=useState<Child[]>([]); const [activeChild,setActive]=useState<Child|null>(null); const [status,setStatus]=useState<ActiveChildStatus>(isParent?'loading':'locked'); const [expiresAt,setExpires]=useState<string|null>(null);
 const refreshActiveChild=useCallback(async()=>{if(!isParent)return; try {const r=await activeChildApi.get();setActive(r.data.active_child);setExpires(r.data.expires_at||null);setStatus(r.data.active_child?'active':'locked');} catch {clearChildSessionToken();setActive(null);setStatus('expired');}},[isParent]);
 useEffect(()=>{if(!isParent||!account){setChildren([]);setActive(null);setStatus('locked');return;} (async()=>{try{const r=await childrenApi.list();setChildren(r.data.children);if(getChildSessionToken())await refreshActiveChild();else setStatus('locked');}catch{setStatus('locked');}})();},[account,isParent,refreshActiveChild]);
 const activateChild=useCallback(async(id:number,pin:string)=>{const r=await activeChildApi.activate(id,pin);setChildSessionToken(r.data.child_session_token);setActive(r.data.active_child);setExpires(r.data.expires_at);setStatus('active');},[]);
 const lockChild=useCallback(async()=>{try{await activeChildApi.lock();}finally{clearChildSessionToken();setActive(null);setExpires(null);setStatus('locked');}},[]);
 return <Context.Provider value={{children,activeChild,status,expiresAt,activateChild,lockChild,refreshActiveChild,openChildSelector:()=>{}}}>{content}</Context.Provider>;
}
export function useActiveChild(){const value=useContext(Context);if(!value)throw new Error('useActiveChild must be used within ActiveChildProvider');return value;}
