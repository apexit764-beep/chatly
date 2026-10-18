import{ar as h}from"./index-OLYl0DIR.js";/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=h("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);function b(t,e,n){if(!e.length)return;const o=Object.keys(e[0]??{}).map(l=>({key:l,label:l})),a=o.map(l=>p(String(l.label))).join(","),r=e.map(l=>o.map(m=>p(String(l[m.key]??""))).join(",")),i="\uFEFF",s=new Blob([i+[a,...r].join(`
`)],{type:"text/csv;charset=utf-8;"}),d=URL.createObjectURL(s),c=document.createElement("a");c.href=d,c.download=t,document.body.appendChild(c),c.click(),document.body.removeChild(c),URL.revokeObjectURL(d)}function y(t){const e=t.replace(/^\uFEFF/,""),n=[];let o=[],a="",r=!1;for(let i=0;i<e.length;i++){const s=e[i];r?s==='"'&&e[i+1]==='"'?(a+='"',i++):s==='"'?r=!1:a+=s:s==='"'?r=!0:s===","?(o.push(a),a=""):s===`
`||s==="\r"?(s==="\r"&&e[i+1]===`
`&&i++,o.push(a),a="",o.some(d=>d.trim())&&n.push(o),o=[]):a+=s}return o.push(a),o.some(i=>i.trim())&&n.push(o),n}function p(t){return/[",\n]/.test(t)?`"${t.replace(/"/g,'""')}"`:t}function x(t,e){const n=window.open("","_blank","width=900,height=700");n&&(n.document.write(`<!doctype html><html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${u(t)}</title>
  <style>
    body { font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif; padding: 24px; color: #111827; }
    h1, h2, h3 { margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border-bottom: 1px solid #E5E7EB; padding: 8px 10px; text-align: start; font-size: 13px; }
    th { background: #F8F9FC; font-weight: 600; }
    .muted { color: #6B7280; font-size: 12px; }
    .right { text-align: end; }
    @media print { @page { margin: 12mm; } }
  </style>
</head>
<body>${e}</body></html>`),n.document.close(),n.onload=()=>{setTimeout(()=>{n.focus(),n.print()},250)})}function u(t){return t.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}export{g as D,x as a,b as d,y as p};
