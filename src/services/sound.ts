import { useAppStore } from '../stores/appStore'

export function playMemoryChime(kind:'store'|'retrieve'){
  if(!useAppStore.getState().soundEnabled)return
  try{const AudioContextClass=window.AudioContext||(window as typeof window&{webkitAudioContext:typeof AudioContext}).webkitAudioContext;const context=new AudioContextClass();const notes=kind==='store'?[523.25,659.25,783.99]:[659.25,783.99,1046.5];notes.forEach((frequency,index)=>{const oscillator=context.createOscillator();const gain=context.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,context.currentTime);gain.gain.linearRampToValueAtTime(.045,context.currentTime+.03+index*.08);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.6+index*.09);oscillator.connect(gain).connect(context.destination);oscillator.start(context.currentTime+index*.08);oscillator.stop(context.currentTime+.7+index*.08)});setTimeout(()=>void context.close(),1200)}catch{/* 静音环境保持记录流程正常 */}
}
