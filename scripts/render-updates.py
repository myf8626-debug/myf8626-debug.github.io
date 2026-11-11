"""Render the public activity log as static HTML; no browser JavaScript required."""
from datetime import date
from html import escape
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
START = '<!-- updates:start -->'
END = '<!-- updates:end -->'
entries = json.loads((ROOT / 'updates.json').read_text(encoding='utf-8'))
dates = [date.fromisoformat(entry['date']) for entry in entries]
if dates != sorted(dates, reverse=True):
    raise ValueError('Updates must be in reverse chronological order')

def render(entry):
    links = []
    for link in entry['links']:
        href = link['href']
        if href.startswith('#'):
            href = 'index.html' + href
        if ':' in href and not href.startswith('https://'):
            raise ValueError('Only local or HTTPS evidence links are supported')
        links.append(f'<a href="{escape(href, quote=True)}">{escape(link["label"])}</a>')
    visible_date = entry['date'][:7].replace('-', '.')
    return f'''<li class="update-entry">
<div class="update-meta"><time datetime="{entry['date']}">{visible_date}</time><span>{escape(entry['project'])}</span></div>
<h3>{escape(entry['title'])}</h3>
<p>{escape(entry['text'])}</p>
<p class="update-boundary">{escape(entry['boundary'])}</p>
<div class="update-links">{''.join(links)}</div>
</li>'''

latest = ''.join(render(entry) for entry in entries[:3])
earlier = ''.join(render(entry) for entry in entries[3:])
block = f'''{START}
<section class="updates-card" id="updates" aria-labelledby="updates-title">
<div class="section-heading"><h1 id="updates-title">更新日志</h1><p>做了什么，验证到哪一步。</p></div>
<p class="updates-intro">记录项目的开发、验证与发布进展。涉及团队与开源项目的部分，具体分工见对应详情。</p>
<ol class="updates-latest">{latest}</ol>
<details class="updates-history"><summary><span>展开更早的 {len(entries)-3} 条记录</span><span class="update-chevron" aria-hidden="true"></span></summary>
<ol class="updates-earlier">{earlier}</ol></details>
</section>
{END}'''
index = ROOT / 'updates.html'
content = index.read_text(encoding='utf-8')
if START in content:
    left, rest = content.split(START, 1)
    _, right = rest.split(END, 1)
    content = left + block + right
else:
    raise ValueError('Cannot find update markers in updates.html')
index.write_text(content, encoding='utf-8')
print(f'Rendered {len(entries)} updates; latest 3 visible by default.')
