import{a6 as h}from"./index-BgW2-XI6.js";/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=h("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);function y(t,e,n){if(!e.length)return;const i=Object.keys(e[0]??{}).map(o=>({key:o,label:o})),d=i.map(o=>c(String(o.label))).join(","),l=e.map(o=>i.map(m=>c(String(o[m.key]??""))).join(",")),s="\uFEFF",p=new Blob([s+[d,...l].join(`
`)],{type:"text/csv;charset=utf-8;"}),r=URL.createObjectURL(p),a=document.createElement("a");a.href=r,a.download=t,document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(r)}function c(t){return/[",\n]/.test(t)?`"${t.replace(/"/g,'""')}"`:t}function f(t,e){const n=window.open("","_blank","width=900,height=700");n&&(n.document.write(`<!doctype html><html dir="rtl" lang="ar">
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
<body>${e}</body></html>`),n.document.close(),n.onload=()=>{setTimeout(()=>{n.focus(),n.print()},250)})}function u(t){return t.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}export{g as D,y as d,f as p};
