import{as as c,ar as d}from"./index-BxsKEPDn.js";/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=c("Wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]),e="qhub_payment_cards",o=[{id:"card-1",brand:"Visa",last4:"4242",expiry:"12/27",isDefault:!0},{id:"card-2",brand:"Mastercard",last4:"8831",expiry:"09/26",isDefault:!1}];function l(){try{const a=localStorage.getItem(e);if(a)return JSON.parse(a)}catch{}return o}const u=d((a,r)=>({cards:l(),setCards:t=>{const s=typeof t=="function"?t(r().cards):t;a({cards:s});try{localStorage.setItem(e,JSON.stringify(s))}catch{}},defaultCard:()=>r().cards.find(t=>t.isDefault)??r().cards[0]??null})),f=a=>`${a.brand} •••• ${a.last4}`;export{i as W,f as c,u};
