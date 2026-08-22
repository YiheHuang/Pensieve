import { useEffect, useState } from 'react'
import { FileWarning, Image as ImageIcon, Music2, Video } from 'lucide-react'
import type { Attachment } from '../types'
import { isDesktop, nativeBridge } from '../services/nativeBridge'

function MediaItem({ attachment }: { attachment: Attachment }) {
  const [src,setSrc]=useState(attachment.url); const [failed,setFailed]=useState(false)
  useEffect(()=>{let active=true;if(isDesktop()&&attachment.encryptedPath){nativeBridge.getAttachmentData(attachment.encryptedPath).then(data=>{if(active)setSrc(`data:${attachment.mimeType};base64,${data}`)}).catch(()=>setFailed(true))}return()=>{active=false}},[attachment])
  if(failed)return <div className="media-failed"><FileWarning/><span>{attachment.name}</span></div>
  if(!src)return <div className="media-loading"><span className="shimmer"/>{attachment.kind==='image'?<ImageIcon/>:attachment.kind==='audio'?<Music2/>:<Video/>}<small>正在唤醒 {attachment.name}</small></div>
  if(attachment.kind==='image')return <figure><img src={src} alt={attachment.name}/><figcaption>{attachment.name}</figcaption></figure>
  if(attachment.kind==='audio')return <div className="audio-memory"><Music2/><div><strong>{attachment.name}</strong><audio controls src={src}/>{attachment.transcript&&<p>“{attachment.transcript}”</p>}</div></div>
  return <figure className="video-memory"><video controls src={src}/><figcaption>{attachment.name}</figcaption></figure>
}

export function AttachmentGallery({attachments}:{attachments:Attachment[]}){if(!attachments.length)return null;return <section className="attachment-gallery"><div className="eyebrow">MEMORY FRAGMENTS</div><h2>这一刻留下的声音与光</h2><div>{attachments.map(a=><MediaItem attachment={a} key={a.id}/>)}</div></section>}
