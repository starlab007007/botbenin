import {useState,useEffect,useCallback,useRef} from 'react';
import {useWaouhResync} from '@/lib/waouh/resync';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {toast} from '@/hooks/use-toast';
export interface Notification{id:string;title:string;content:string;type:'message'|'action'|'link_click'|'share'|'bot_interaction'|'booking'|'system';read:boolean;metadata?:any;action_url?:string;created_at:string;}
export const useNotifications=()=>{
 const{user}=useAuth();const id=user?.id||null;const identity=useRef({id,epoch:0});if(identity.current.id!==id)identity.current={id,epoch:identity.current.epoch+1};const owner=identity.current;
 const[snapshot,setSnapshot]=useState<{owner:typeof owner;items:Notification[];loading:boolean}>({owner,items:[],loading:Boolean(id)});
 const notifications=snapshot.owner===owner&&id?snapshot.items:[],isLoading=Boolean(id)&&(snapshot.owner!==owner||snapshot.loading);
 const commit=useCallback((update:(items:Notification[])=>Notification[])=>{if(identity.current!==owner)return;setSnapshot(prev=>({owner,loading:false,items:update(prev.owner===owner?prev.items:[])}));},[owner]);
 const fetchNotifications=useCallback(async()=>{if(!id)return;try{const{data,error}=await supabase.from('notifications').select('*').eq('user_id',id).order('created_at',{ascending:false}).limit(50);if(error)throw error;commit(()=>(data||[]) as Notification[]);}catch{commit(items=>items);}},[id,commit]);
 const markAsRead=async(notificationId:string)=>{if(!id)return;const{error}=await supabase.from('notifications').update({read:true}).eq('id',notificationId).eq('user_id',id);if(!error)commit(items=>items.map(n=>n.id===notificationId?{...n,read:true}:n));};
 const markAllAsRead=async()=>{if(!id)return;const{error}=await supabase.rpc('mark_all_notifications_read',{p_user_id:id});if(!error)commit(items=>items.map(n=>({...n,read:true})));};
 const deleteNotification=async(notificationId:string)=>{if(!id)return;const{error}=await supabase.from('notifications').delete().eq('id',notificationId).eq('user_id',id);if(!error)commit(items=>items.filter(n=>n.id!==notificationId));};
 useEffect(()=>{try{localStorage.removeItem('notifications_backup');localStorage.removeItem('unread_count');}catch{}},[]);
 useWaouhResync(()=>{if(id)return fetchNotifications();});
 useEffect(()=>{if(!id)return;let cancelled=false;void fetchNotifications();
 const channel=supabase.channel(`notifications-changes-${id}-${Math.random().toString(36).slice(2,8)}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${id}`},payload=>{
 if(cancelled||identity.current!==owner)return;const notification=payload.new as Notification;commit(items=>[notification,...items.filter(n=>n.id!==notification.id)].slice(0,50));toast({title:notification.title,description:notification.content});
 if('Notification' in window&&window.Notification.permission==='granted'){try{new window.Notification(notification.title,{body:notification.content,icon:'/favicon.ico',tag:notification.id});}catch{}}
 }).subscribe();return()=>{cancelled=true;void supabase.removeChannel(channel);};},[id,owner,commit,fetchNotifications]);
 const requestNotificationPermission=async()=>{if(!('Notification' in window))return false;if(window.Notification.permission==='granted')return true;if(window.Notification.permission==='denied')return false;return await window.Notification.requestPermission()==='granted';};
 return{notifications,unreadCount:notifications.filter(n=>!n.read).length,isLoading,markAsRead,markAllAsRead,deleteNotification,requestNotificationPermission,refetch:fetchNotifications};
};
