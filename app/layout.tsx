import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'EPT · Cantina escolar',description:'Consulta a ementa semanal, escolhe as tuas refeições e ajuda a cantina a planear as quantidades.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,statusBarStyle:'default',title:'EPT Cantina'},icons:{icon:'/favicon.svg',apple:'/icons/apple-touch-icon.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#2268ba'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-PT"><body>{children}</body></html>}
