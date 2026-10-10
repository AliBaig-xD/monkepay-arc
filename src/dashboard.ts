type Info = { factory: string; vault: string; seller: string; relayer: string; price: string; explorer: string }

export const dashboardHtml = (i: Info) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MonkePay on Arc</title>
<style>
:root{--bg:#0b0d10;--card:#13171c;--line:#232a32;--fg:#e8edf2;--mut:#8b96a3;--acc:#5be3a6}
@media (prefers-color-scheme: light){:root{--bg:#f6f7f9;--card:#fff;--line:#e3e7ec;--fg:#11161c;--mut:#5b6672;--acc:#0a8f5a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:920px;margin:0 auto;padding:40px 16px 64px}
h1{font-size:28px;margin:0 0 4px}p.lead{color:var(--mut);margin:0 0 28px;max-width:640px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px}
.k{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}.k b{display:block;font-size:24px;font-variant-numeric:tabular-nums}.k span{color:var(--mut);font-size:13px}
section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:16px;overflow-x:auto}
h2{font-size:15px;margin:0 0 10px}code,.mono{font:13px ui-monospace,SFMono-Regular,Menlo,monospace}
a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:7px 8px;border-top:1px solid var(--line);white-space:nowrap}th{color:var(--mut);font-weight:500;border-top:0}
pre{margin:0;white-space:pre-wrap;word-break:break-all}.mut{color:var(--mut)}
</style></head><body><main>
<h1>MonkePay on Arc</h1>
<p class="lead">Pay-per-request APIs for AI agents, settled in USDC on Arc mainnet over x402. Each payment is pulled into the seller's
<b>MonkeVault</b> and split between seller and platform in the same transaction. Gas is paid in USDC, so the facilitator holds a single asset.</p>
<div class="kpis">
 <div class="k"><b id="n">–</b><span>payments settled</span></div>
 <div class="k"><b id="v">–</b><span>USDC volume</span></div>
 <div class="k"><b id="p">–</b><span>unique payers</span></div>
 <div class="k"><b>${i.price}</b><span>price per call</span></div>
</div>
<section><h2>Recent settlements</h2><table><thead><tr><th>When</th><th>Payer</th><th>Amount</th><th>Tx</th></tr></thead><tbody id="rows"><tr><td colspan="4" class="mut">Loading…</td></tr></tbody></table></section>
<section><h2>Contracts (Arc mainnet, chain 5042)</h2><table>
<tr><td>MonkeVaultFactory</td><td class="mono"><a href="${i.explorer}/address/${i.factory}">${i.factory}</a></td></tr>
<tr><td>Seller vault (pay-to)</td><td class="mono"><a href="${i.explorer}/address/${i.vault}">${i.vault}</a></td></tr>
<tr><td>Facilitator relayer</td><td class="mono"><a href="${i.explorer}/address/${i.relayer}">${i.relayer}</a></td></tr>
</table></section>
<section><h2>Try it</h2><pre class="mono">curl -i /api/wallet/0x… # → 402 Payment Required (x402 v2, eip155:5042)

# pay automatically with any x402 client:
npx tsx scripts/agent.ts 0xSomeArcAddress</pre>
<p class="mut" style="margin:10px 0 0">Public facilitator: <code>GET /facilitator/supported</code>, <code>POST /facilitator/verify</code>, <code>POST /facilitator/settle</code></p></section>
</main>
<script>
const ex=${JSON.stringify(i.explorer)},s=a=>a.slice(0,6)+'…'+a.slice(-4),ago=t=>{const d=(Date.now()-t)/1e3;return d<60?Math.round(d)+'s ago':d<3600?Math.round(d/60)+'m ago':d<86400?Math.round(d/3600)+'h ago':Math.round(d/86400)+'d ago'};
async function load(){try{const r=await fetch('/api/stats').then(r=>r.json());
n.textContent=r.payments;v.textContent='$'+r.volumeUsdc;p.textContent=r.payers;
rows.innerHTML=r.recent.length?r.recent.map(x=>'<tr><td>'+ago(x.at)+'</td><td class="mono"><a href="'+ex+'/address/'+x.payer+'">'+s(x.payer)+'</a></td><td>$'+(Number(x.amount)/1e6).toFixed(3)+'</td><td class="mono"><a href="'+ex+'/tx/'+x.tx+'">'+s(x.tx)+'</a></td></tr>').join(''):'<tr><td colspan="4" class="mut">No payments yet.</td></tr>'}catch(e){}}
load();setInterval(load,5000);
</script></body></html>`
